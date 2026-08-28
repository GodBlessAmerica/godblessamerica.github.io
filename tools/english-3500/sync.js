(() => {
'use strict';
const audio=document.getElementById('globalAudio'),dock=document.getElementById('audioDock');
const playBtn=document.getElementById('playPause'),progress=document.getElementById('audioProgress');
const timeEl=document.getElementById('audioTime'),titleEl=document.getElementById('audioTitle'),statusEl=document.getElementById('syncStatus');
const speed=document.getElementById('audioSpeed'),repeatBtn=document.getElementById('repeatSentence');
let currentId=0,currentButton=null,timing=null,words=[],active=-1,lastSentence=-1,repeatSentence=false,seeking=false;
const fmt=s=>{s=Math.max(0,Math.floor(Number(s)||0));return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`};
const norm=s=>(s||'').toLowerCase().replace(/[’]/g,"'").replace(/[^a-z0-9']/g,'');
function wrapArticle(article){
  if(article.dataset.syncReady==='1') return;
  const walker=document.createTreeWalker(article,NodeFilter.SHOW_TEXT,{acceptNode(n){
    const p=n.parentElement;if(!p||!p.closest('.para.en')||p.closest('script,style,button'))return NodeFilter.FILTER_REJECT;
    return /[A-Za-z0-9]/.test(n.nodeValue)?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT;
  }});const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
  const re=/([A-Za-z]+(?:[’'][A-Za-z]+)*(?:-[A-Za-z]+)*|\d+(?:\.\d+)?)/g;
  nodes.forEach(n=>{const f=document.createDocumentFragment();let last=0,m;re.lastIndex=0;while((m=re.exec(n.nodeValue))){f.append(n.nodeValue.slice(last,m.index));const sp=document.createElement('span');sp.className='sync-word';sp.textContent=m[0];f.append(sp);last=m.index+m[0].length;}f.append(n.nodeValue.slice(last));n.replaceWith(f)});
  article.dataset.syncReady='1';
}
function clearHighlight(){words.forEach(w=>w.classList.remove('sync-active','sync-read'));document.querySelectorAll('.sync-sentence-active').forEach(e=>e.classList.remove('sync-sentence-active'));active=-1;lastSentence=-1}
function mapWords(article){wrapArticle(article);const dom=[...article.querySelectorAll('.para.en .sync-word')];const ts=timing.tokens||[];words=[];let j=0;for(let i=0;i<ts.length;i++){while(j<dom.length&&norm(dom[j].textContent)!==norm(ts[i].text))j++;if(j<dom.length){words[i]=dom[j];j++;}else words[i]=null;}return words.filter(Boolean).length}
function findIndex(t){const a=timing?.tokens||[];let lo=0,hi=a.length-1,ans=-1;while(lo<=hi){const mid=(lo+hi)>>1;if(a[mid].start<=t){ans=mid;lo=mid+1}else hi=mid-1;}return ans>=0&&t<=a[ans].end+0.18?ans:ans}
function setActive(i,forceScroll=false){if(i===active||i<0||!timing)return;if(active>=0&&words[active])words[active].classList.remove('sync-active');active=i;for(let k=0;k<words.length;k++)if(words[k])words[k].classList.toggle('sync-read',k<i);const el=words[i];if(!el)return;el.classList.add('sync-active');const s=timing.tokens[i].sentence;if(s!==lastSentence){document.querySelectorAll('.sync-sentence-active').forEach(e=>e.classList.remove('sync-sentence-active'));el.closest('.para.en')?.classList.add('sync-sentence-active');lastSentence=s;}const r=el.getBoundingClientRect();if(forceScroll||r.top<90||r.bottom>innerHeight-135)el.scrollIntoView({behavior:'smooth',block:'center'});statusEl.textContent=`第 ${s+1} 句 · 第 ${i+1}/${timing.tokens.length} 词`}
async function loadArticle(id,button,autoplay=true){
  const article=document.getElementById('a'+id);if(!article)return;
  if(currentButton&&currentButton!==button)currentButton.textContent='▶ 播放 MP3';
  currentId=id;currentButton=button||article.querySelector('.mp3-btn');dock.classList.add('open');titleEl.textContent=article.querySelector('h2')?.innerText.replace(/▶.*|⏸.*|已掌握/g,'').trim()||`第 ${id} 篇`;statusEl.textContent='正在载入时间轴…';
  try{const r=await fetch(`timing/${String(id).padStart(2,'0')}.json`,{cache:'no-store'});if(!r.ok)throw new Error('时间轴文件不存在');timing=await r.json();clearHighlight();const mapped=mapWords(article);audio.src=`audio/${String(id).padStart(2,'0')}.mp3`;audio.load();statusEl.textContent=`已匹配 ${mapped}/${timing.tokens.length} 个单词`;if(autoplay)await audio.play();}
  catch(e){statusEl.textContent='载入失败：'+e.message;alert('无法载入第 '+id+' 篇音频或时间轴。请确认 audio/ 和 timing/ 文件夹已上传。')}
}
window.playMp3=function(id,button){if(currentId===id&&audio.src){if(audio.paused)audio.play();else audio.pause();return}loadArticle(id,button,true)};
playBtn.onclick=()=>{if(!currentId){loadArticle(1,document.querySelector('#a1 .mp3-btn'),true);return}audio.paused?audio.play():audio.pause()};
audio.addEventListener('play',()=>{playBtn.textContent='⏸';if(currentButton)currentButton.textContent='⏸ 暂停 MP3'});
audio.addEventListener('pause',()=>{playBtn.textContent='▶';if(currentButton&&!audio.ended)currentButton.textContent='▶ 继续播放'});
audio.addEventListener('ended',()=>{playBtn.textContent='▶';if(currentButton)currentButton.textContent='▶ 播放 MP3';statusEl.textContent='播放完成'});
audio.addEventListener('timeupdate',()=>{if(!timing)return;if(!seeking){progress.value=audio.duration?Math.round(audio.currentTime/audio.duration*1000):0;timeEl.textContent=`${fmt(audio.currentTime)} / ${fmt(audio.duration||timing.duration)}`;}const i=findIndex(audio.currentTime);setActive(i);if(repeatSentence&&i>=0){const s=timing.tokens[i].sentence;let last=i;while(last+1<timing.tokens.length&&timing.tokens[last+1].sentence===s)last++;if(audio.currentTime>=timing.tokens[last].end-0.03){let first=i;while(first>0&&timing.tokens[first-1].sentence===s)first--;audio.currentTime=timing.tokens[first].start;audio.play();}}});
progress.addEventListener('input',()=>{seeking=true;timeEl.textContent=`${fmt((audio.duration||0)*progress.value/1000)} / ${fmt(audio.duration)}`});progress.addEventListener('change',()=>{if(audio.duration)audio.currentTime=audio.duration*progress.value/1000;seeking=false;setActive(findIndex(audio.currentTime),true)});
speed.onchange=()=>audio.playbackRate=Number(speed.value);
repeatBtn.onclick=()=>{repeatSentence=!repeatSentence;repeatBtn.classList.toggle('on',repeatSentence);repeatBtn.textContent=repeatSentence?'🔁 循环中':'🔁 单句'};
function jumpSentence(dir){if(!timing)return;let i=Math.max(0,findIndex(audio.currentTime));const s=timing.tokens[i]?.sentence||0;let target=s+dir;if(dir<0&&audio.currentTime-timing.tokens[i].start>2)target=s;const t=timing.tokens.find(x=>x.sentence===Math.max(0,target));if(t){audio.currentTime=t.start;setActive(findIndex(t.start),true)}}
document.getElementById('prevSentence').onclick=()=>jumpSentence(-1);document.getElementById('nextSentence').onclick=()=>jumpSentence(1);
document.addEventListener('click',e=>{const w=e.target.closest('.sync-word');if(!w||!currentId)return;const idx=words.indexOf(w);if(idx>=0&&timing?.tokens[idx]){e.stopPropagation();audio.currentTime=timing.tokens[idx].start;audio.play();setActive(idx,true)}});
document.addEventListener('keydown',e=>{if(!dock.classList.contains('open')||/input|textarea|select/i.test(e.target.tagName))return;if(e.code==='Space'){e.preventDefault();audio.paused?audio.play():audio.pause()}else if(e.key==='ArrowLeft')audio.currentTime=Math.max(0,audio.currentTime-3);else if(e.key==='ArrowRight')audio.currentTime=Math.min(audio.duration||Infinity,audio.currentTime+3)});
})();
