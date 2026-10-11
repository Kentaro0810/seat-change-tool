"use strict";
const $=id=>document.getElementById(id);
const state={front:[],blocks:[],neighbors:[],last:null};
const els={names:$("names"),nameCount:$("nameCount"),columnMode:$("columnMode"),manualColumns:$("manualColumns"),manualColumnsWrap:$("manualColumnsWrap"),layoutPreview:$("layoutPreview"),message:$("message"),seatArea:$("seatArea"),reshuffle:$("reshuffle")};
function names(){return els.names.value.split(/\n/).map(v=>v.trim()).filter(Boolean)}
function duplicateNames(list){const s=new Set(),d=new Set();list.forEach(n=>s.has(n)?d.add(n):s.add(n));return [...d]}
function layoutFor(n){if(!n)return {cols:0,rows:0};if(els.columnMode.value==="manual"){const cols=Math.max(2,Math.min(12,+els.manualColumns.value||5));return {cols,rows:Math.ceil(n/cols)}}let best=null;for(let cols=2;cols<=Math.min(10,Math.max(2,n));cols++){const rows=Math.ceil(n/cols),empty=rows*cols-n,shape=Math.abs(cols-rows*1.25),score=empty*4+shape+(cols>7?2:0);if(!best||score<best.score)best={cols,rows,score}}return best}
function updateLayout(){const list=names(),d=duplicateNames(list);els.nameCount.textContent=`${list.length}人`;const l=layoutFor(list.length);els.layoutPreview.textContent=list.length?`${l.cols}列 × ${l.rows}行（${l.cols*l.rows-list.length}席が空席）`:"名前を入力すると配置を計算します。";syncPeople(list);syncFrontRows(l.rows);if(d.length)show(`同じ名前が重複しています：${d.join("、")}`,"error",false);else hideMessage()}
function optionHTML(list,placeholder="選択してください"){return `<option value="">${placeholder}</option>`+list.map(n=>`<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`).join("")}
function syncPeople(list){["frontPerson","blockA","blockB","neighborA","neighborB"].forEach(id=>{const old=$(id).value;$(id).innerHTML=optionHTML(list);if(list.includes(old))$(id).value=old})}
function syncFrontRows(rows){const old=+$("frontRows").value;$("frontRows").innerHTML=Array.from({length:rows},(_,i)=>`<option value="${i+1}">前から${i+1}列目まで</option>`).join("");if(old&&old<=rows)$("frontRows").value=old}
function escapeHtml(s){return s.replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function show(text,type="error",scroll=true){els.message.textContent=text;els.message.className=`message show ${type}`;if(scroll)els.message.scrollIntoView({behavior:"smooth",block:"nearest"})}
function hideMessage(){els.message.className="message";els.message.textContent=""}
function pairKey(a,b){return [a,b].sort().join("\u0000")}
function addFront(){const person=$("frontPerson").value,maxRow=+$("frontRows").value;if(!person)return show("前方指定する人を選んでください。");const found=state.front.find(r=>r.person===person);if(found)found.maxRow=maxRow;else state.front.push({person,maxRow});renderRules()}
function addPair(type,aId,bId){const a=$(aId).value,b=$(bId).value;if(!a||!b)return show("2人を選んでください。");if(a===b)return show("同じ人を2回選ぶことはできません。");const key=pairKey(a,b),other=type==="blocks"?state.neighbors:state.blocks;if(other.some(p=>pairKey(p.a,p.b)===key))return show("同じ2人をブロック指定と隣指定の両方には登録できません。");if(state[type].some(p=>pairKey(p.a,p.b)===key))return show("その組み合わせはすでに登録されています。");if(type==="neighbors"&&state.neighbors.some(p=>p.a===a||p.b===a||p.a===b||p.b===b))return show("隣指定では、1人を複数の組に登録できません。");state[type].push({a,b});renderRules()}
function removeRule(type,i){state[type].splice(i,1);renderRules()}
function renderRules(){hideMessage();const front=$("frontList"),block=$("blockList"),neighbor=$("neighborList");front.innerHTML=state.front.map((r,i)=>ruleHtml(`${r.person}：前から${r.maxRow}列目まで`,`front`,i)).join("");block.innerHTML=state.blocks.map((r,i)=>ruleHtml(`${r.a} ⇄ ${r.b}：周囲1席を空ける`,`blocks`,i)).join("");neighbor.innerHTML=state.neighbors.map((r,i)=>ruleHtml(`${r.a} ⇄ ${r.b}：左右に並べる`,`neighbors`,i)).join("");document.querySelectorAll("[data-remove]").forEach(b=>b.onclick=()=>removeRule(b.dataset.remove,+b.dataset.index))}
function ruleHtml(text,type,i){return `<div class="rule"><span>${escapeHtml(text)}</span><button type="button" data-remove="${type}" data-index="${i}" aria-label="削除">削除</button></div>`}
function shuffle(arr){const a=[...arr];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function applyPendingConditions(){
  const fp=$("frontPerson").value;
  if(fp){
    const maxRow=+$("frontRows").value;
    const found=state.front.find(r=>r.person===fp);
    if(found)found.maxRow=maxRow; else state.front.push({person:fp,maxRow});
  }
  for(const [type,aId,bId] of [["blocks","blockA","blockB"],["neighbors","neighborA","neighborB"]]){
    const a=$(aId).value,b=$(bId).value;
    if(!a&&!b)continue;
    if(!a||!b)throw new Error(`${type==="neighbors"?"隣":"ブロック"}条件は2人とも選んでください。`);
    if(a===b)throw new Error("同じ人を2回選ぶことはできません。");
    const key=pairKey(a,b), own=state[type], other=type==="blocks"?state.neighbors:state.blocks;
    if(other.some(p=>pairKey(p.a,p.b)===key))throw new Error("同じ2人をブロック指定と隣指定の両方には登録できません。");
    if(!own.some(p=>pairKey(p.a,p.b)===key)){
      if(type==="neighbors"&&state.neighbors.some(p=>p.a===a||p.b===a||p.a===b||p.b===b))throw new Error("隣指定では、1人を複数の組に登録できません。");
      own.push({a,b});
    }
  }
  renderRules();save();
}
function invalidateResult(){
  state.last=null;
  els.seatArea.className="seat-area empty-state";
  els.seatArea.removeAttribute("style");
  els.seatArea.innerHTML="<p>名簿または条件が変更されました。もう一度「席替えを実行」を押してください。</p>";
  els.reshuffle.disabled=true;
}
function verifyResult(result){
  const roster=names();
  const seated=result.seats.filter(Boolean);
  if(result.seats.length!==result.cols*result.rows)throw new Error("座席枠の数が正しくありません。");
  if(seated.length!==roster.length)throw new Error(`名簿は${roster.length}人ですが、座席表は${seated.length}人です。結果を破棄しました。`);
  if(new Set(seated).size!==seated.length)throw new Error("同じ名前が複数の席に配置されました。結果を破棄しました。");
  const missing=roster.filter(n=>!seated.includes(n));
  const unknown=seated.filter(n=>!roster.includes(n));
  if(missing.length||unknown.length)throw new Error(`名簿と座席表が一致しません。${missing.length?" 未配置："+missing.join("、"):""}${unknown.length?" 名簿外："+unknown.join("、"):""}`);
  const pos=new Map();
  result.seats.forEach((n,i)=>{if(n)pos.set(n,{row:Math.floor(i/result.cols),col:i%result.cols})});
  for(const r of state.front){const p=pos.get(r.person);if(!p||p.row>=r.maxRow)throw new Error(`前列指定が反映されませんでした：${r.person}`)}
  for(const p of state.blocks){const a=pos.get(p.a),b=pos.get(p.b);if(!a||!b||Math.abs(a.row-b.row)<=1&&Math.abs(a.col-b.col)<=1)throw new Error(`ブロック条件が反映されませんでした：${p.a}・${p.b}`)}
  for(const p of state.neighbors){const a=pos.get(p.a),b=pos.get(p.b);if(!a||!b||a.row!==b.row||Math.abs(a.col-b.col)!==1)throw new Error(`隣条件が反映されませんでした：${p.a}・${p.b}`)}
  return true;
}
function solve(){const list=names(),dups=duplicateNames(list);if(list.length<2)throw new Error("2人以上の名前を入力してください。");if(dups.length)throw new Error(`同じ名前が重複しています：${dups.join("、")}`);const {cols,rows}=layoutFor(list.length),total=cols*rows;const present=new Set(list);for(const r of [...state.front,...state.blocks.flatMap(p=>[{person:p.a},{person:p.b}]),...state.neighbors.flatMap(p=>[{person:p.a},{person:p.b}])])if(!present.has(r.person))throw new Error("条件に登録した名前が名簿から削除されています。条件を確認してください。");const frontMap=new Map(state.front.map(r=>[r.person,Math.min(r.maxRow,rows)]));const blockSet=new Set(state.blocks.map(p=>pairKey(p.a,p.b)));const neighborPeople=new Set(state.neighbors.flatMap(p=>[p.a,p.b]));const singles=list.filter(n=>!neighborPeople.has(n));const groups=[...state.neighbors.map(p=>[p.a,p.b]),...singles.map(n=>[n])];groups.sort((g1,g2)=>{const f=g=>g.reduce((s,n)=>s+(frontMap.has(n)?10:0)+state.blocks.filter(p=>p.a===n||p.b===n).length,0);return f(g2)-f(g1)});
 const seats=Array(total).fill(null),positions=new Map();
 function validPerson(person,index){const row=Math.floor(index/cols);if(frontMap.has(person)&&row>=frontMap.get(person))return false;for(const [other,oi] of positions){if(!blockSet.has(pairKey(person,other)))continue;const or=Math.floor(oi/cols),oc=oi%cols,c=index%cols;if(Math.abs(row-or)<=1&&Math.abs(c-oc)<=1)return false}return true}
 function candidates(group){if(group.length===2){const out=[];for(let i=0;i<total-1;i++){if(i%cols===cols-1||seats[i]||seats[i+1])continue;if(validPerson(group[0],i)&&validPerson(group[1],i+1))out.push([i,i+1]);if(validPerson(group[1],i)&&validPerson(group[0],i+1))out.push([i+1,i])}return shuffle(out)}const out=[];for(let i=0;i<total;i++)if(!seats[i]&&validPerson(group[0],i))out.push([i]);return shuffle(out)}
 let nodes=0;function backtrack(gi){if(++nodes>250000)return false;if(gi===groups.length)return true;const g=groups[gi];for(const idxs of candidates(g)){for(let k=0;k<g.length;k++){seats[idxs[k]]=g[k];positions.set(g[k],idxs[k])}if(backtrack(gi+1))return true;for(let k=0;k<g.length;k++){seats[idxs[k]]=null;positions.delete(g[k])}}return false}
 if(!backtrack(0))throw new Error("すべての条件を満たす席配置を作れませんでした。列数を変えるか、条件を減らしてください。");const result={seats,cols,rows,frontMap};verifyResult(result);return result}
function renderResult(result){
  state.last=result;
  state.selectedSeat=null;
  els.seatArea.classList.remove("empty-state");
  els.seatArea.innerHTML=result.seats.map((n,i)=>{
    const row=Math.floor(i/result.cols)+1,col=i%result.cols+1;
    if(!n)return `<button type="button" class="seat empty-seat" data-seat-index="${i}" aria-label="${row}-${col} 空席"><span class="seat-number">${row}-${col}</span>空席</button>`;
    const cls=result.frontMap.has(n)?"seat front-rule":"seat";
    return `<button type="button" class="${cls}" data-seat-index="${i}" aria-label="${row}-${col} ${escapeHtml(n)}"><span class="seat-number">${row}-${col}</span>${escapeHtml(n)}</button>`
  }).join("");
  els.seatArea.style.gridTemplateColumns=`repeat(${result.cols},minmax(0,1fr))`;
  els.seatArea.querySelectorAll(".seat").forEach(el=>{
    el.classList.toggle("compact",result.cols>=7);
    el.classList.toggle("very-compact",result.cols>=9);
  });
  els.reshuffle.disabled=false;
}
function handleSeatTap(event){
  const seat=event.target.closest("[data-seat-index]");
  if(!seat||!state.last)return;
  const index=Number(seat.dataset.seatIndex);
  if(state.selectedSeat===null){
    state.selectedSeat=index;
    seat.classList.add("swap-selected");
    const name=state.last.seats[index]||"空席";
    show(`${name}を選択しました。入れ替え先をタップしてください。`,"success",false);
    return;
  }
  const first=state.selectedSeat;
  if(first===index){
    state.selectedSeat=null;
    seat.classList.remove("swap-selected");
    show("選択を解除しました。","success",false);
    return;
  }
  const firstName=state.last.seats[first]||"空席";
  const secondName=state.last.seats[index]||"空席";
  [state.last.seats[first],state.last.seats[index]]=[state.last.seats[index],state.last.seats[first]];
  state.selectedSeat=null;
  renderResult(state.last);
  show(`${firstName}と${secondName}を入れ替えました。手動変更のため、必要に応じて条件を確認してください。`,"success",false);
}
async function clearBrowserCache(){
  if(!confirm("サイトのキャッシュを削除して最新版を読み込みますか？ 名簿と条件の端末保存データは残します。"))return;
  try{
    if("caches" in window){for(const key of await caches.keys())await caches.delete(key)}
    if("serviceWorker" in navigator){for(const reg of await navigator.serviceWorker.getRegistrations())await reg.unregister()}
    const url=new URL(location.href);url.searchParams.set("refresh",Date.now().toString());location.replace(url.toString());
  }catch(e){location.reload()}
}
function run(){
  try{
    applyPendingConditions();
    const result=solve();
    renderResult(result);
    const details=[];
    if(state.neighbors.length)details.push(`隣指定 ${state.neighbors.map(p=>`${p.a}・${p.b}`).join("、")}`);
    if(state.blocks.length)details.push(`ブロック ${state.blocks.length}組`);
    if(state.front.length)details.push(`前列指定 ${state.front.length}人`);
    show(`全${result.seats.filter(Boolean).length}人を配置し、条件を再検証しました。${details.length?"（"+details.join("／")+"）":""}`,"success",false);
  }catch(e){show(e.message,"error")}
}
function clearAll(){if(!confirm("名簿・条件・結果をすべて初期化しますか？"))return;els.names.value="";state.front=[];state.blocks=[];state.neighbors=[];state.last=null;els.seatArea.className="seat-area empty-state";els.seatArea.removeAttribute("style");els.seatArea.innerHTML="<p>名簿を入力して「席替えを実行」を押してください。</p>";els.reshuffle.disabled=true;renderRules();updateLayout();Object.keys(localStorage).filter(key=>key.startsWith("seatShuffleData_")).forEach(key=>localStorage.removeItem(key))}
function save(){}
function load(){
  Object.keys(localStorage).filter(key=>key.startsWith("seatShuffleData_")).forEach(key=>localStorage.removeItem(key));
}
els.names.addEventListener("input",()=>{invalidateResult();updateLayout();save()});els.columnMode.addEventListener("change",()=>{invalidateResult();els.manualColumnsWrap.classList.toggle("hidden",els.columnMode.value!=="manual");updateLayout();save()});els.manualColumns.addEventListener("input",()=>{invalidateResult();updateLayout();save()});$("addFront").onclick=()=>{addFront();save()};$("addBlock").onclick=()=>{addPair("blocks","blockA","blockB");save()};$("addNeighbor").onclick=()=>{addPair("neighbors","neighborA","neighborB");save()};$("shuffle").onclick=run;els.reshuffle.onclick=run;$("clearAll").onclick=clearAll;$("clearCache").onclick=clearBrowserCache;els.seatArea.addEventListener("click",handleSeatTap);document.querySelectorAll(".tab").forEach(t=>t.onclick=()=>{document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("active",x===t));document.querySelectorAll(".condition-panel").forEach(p=>p.classList.toggle("active",p.id===`${t.dataset.tab}Panel`))});window.addEventListener("beforeunload",save);load();els.manualColumnsWrap.classList.toggle("hidden",els.columnMode.value!=="manual");updateLayout();renderRules();
