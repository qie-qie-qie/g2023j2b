import {Battle,TEACHERS} from './combat-model.mjs';
import {Renderer} from './battle-renderer.mjs';
const $=id=>document.getElementById(id);
const atlas=new Image();atlas.src='teachers-atlas.png';
const canvas=$('actionCanvas');let renderer=null,battle=null,mode='fighter',selected=0,last=0,noticeEnd=0,gameRAF=0,soundOn=false,audio=null;
const input={left:false,right:false,attack:false};
const records={fighter:0,runner:0};
try{Object.assign(records,JSON.parse(localStorage.getItem('stellar-academy-records-v1')||'{}'));selected=Math.max(0,Math.min(5,Number(localStorage.getItem('stellar-academy-character'))||0));soundOn=localStorage.getItem('stellar-academy-sound')==='1';}catch{}
function toast(msg){$('toast').textContent=msg;$('toast').classList.add('visible');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').classList.remove('visible'),3000);}
function updateRecords(){$('fighterRecord').textContent=`最佳 ${Math.floor(Number(records.fighter)||0)}`;$('runnerRecord').textContent=`最佳 ${Math.floor(Number(records.runner)||0)}m`;}
updateRecords();
const theme=(el,t,i)=>{el.style.setProperty('--char-color',t.color);el.style.setProperty('--char-glow',t.glow);el.style.setProperty('--char-pos',`${i*20}%`);};
for(const [i,t] of TEACHERS.entries()){
 const card=document.createElement('button');card.className='faculty-card';theme(card,t,i);
 card.innerHTML=`<span class="faculty-index">0${i+1} / ${t.subject}</span><div class="teacher-art" role="img" aria-label="${t.name}原创二次元形象"></div><div class="teacher-info"><span>${t.subject} / ${i===0?'女':'男'}</span><h3>${t.name}</h3><p>${t.title} · ${t.skill}</p></div>`;
 card.addEventListener('click',()=>{selected=i;openSelect(mode);});$('facultyGrid').append(card);
 const select=document.createElement('button');select.className='select-card';theme(select,t,i);select.setAttribute('aria-label',`${t.name}，${t.subject}，${i===0?'女':'男'}`);select.innerHTML=`<div class="teacher-art"></div><b>${t.name} · ${t.subject}</b>`;select.addEventListener('click',()=>{selected=i;updateSelection();});$('selectGrid').append(select);
}
function updateSelection(){
 const t=TEACHERS[selected];[...$('selectGrid').children].forEach((c,i)=>{c.classList.toggle('active',i===selected);c.setAttribute('aria-pressed',String(i===selected));});
 $('selectedSubject').textContent=`${t.subject} / ${selected===0?'女':'男'}`;$('selectedName').textContent=`${t.name} · ${t.title}`;$('selectedDesc').textContent=t.desc;$('selectedSkill').textContent=t.skill;$('selectedUlt').textContent=t.ult;
 try{localStorage.setItem('stellar-academy-character',String(selected));}catch{}
}
function openSelect(nextMode){mode=nextMode;$('selectTitle').textContent=(mode==='fighter'?'六师对决':'星轨疾行')+' / 选择出战老师';$('briefing').textContent=mode==='fighter'?'任务：击败三波敌人和最终首领。A/D 移动，空格双跳，J 连续普攻，K 无敌闪避，E 学科技能，Q 满能量终结技。首领抬手时，跳跃或闪避躲开预警。':'任务：跑完1000米。角色自动前进，空格双段跳跨越断桥，K 冲刺穿透障碍，J 发射弹幕，E 清理前方障碍并释放学科异能，Q 终结技。每250米恢复生命。';updateSelection();$('selectDialog').showModal();}
for(const b of document.querySelectorAll('[data-mode]'))b.addEventListener('click',()=>openSelect(b.dataset.mode));
for(const b of document.querySelectorAll('[data-scroll]'))b.addEventListener('click',()=>$ (b.dataset.scroll).scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'}));
for(const b of document.querySelectorAll('[data-close]'))b.addEventListener('click',()=>b.closest('dialog').close());
$('deploy').addEventListener('click',async()=>{
 if(!atlas.complete||!atlas.naturalWidth){$('deploy').disabled=true;$('deploy').textContent='角色资源加载中…';try{await atlas.decode();}catch{toast('角色资源加载失败，请刷新后重试');$('deploy').disabled=false;$('deploy').textContent='确认出战 →';return;}}
 $('deploy').disabled=false;$('deploy').textContent='确认出战 →';$('selectDialog').close();start();
});
function start(){
 cancelAnimationFrame(gameRAF);battle=new Battle(mode,selected);input.left=input.right=input.attack=false;$('lobby').hidden=true;document.querySelector('.nav').classList.add('playing');$('playScreen').hidden=false;$('pausePanel').hidden=true;$('resultPanel').hidden=true;
 $('playMode').textContent=mode==='fighter'?'六师对决 / 实战教室':'星轨疾行 / 千米突围';$('hudName').textContent=`${TEACHERS[selected].name} · ${TEACHERS[selected].subject}`;$('skillName').textContent=TEACHERS[selected].skill;theme($('hudPortrait'),TEACHERS[selected],selected);
 $('controlHint').textContent=mode==='fighter'?'A / D 移动 · 空格双段跳 · J 普攻 · K 闪避 · E 技能 · Q 终结技 · P 暂停':'自动前进 · 空格双段跳 · J 射击 · K 冲刺破障 · E 技能清场 · Q 终结技 · P 暂停';
 document.querySelector('.direction-pad').style.opacity=mode==='runner'?'.25':'1';$('pauseButton').textContent='暂停 Ⅱ';updateAudioButton();renderer=new Renderer(canvas,atlas);window.scrollTo({top:0,behavior:'instant'});canvas.focus({preventScroll:true});last=performance.now();unlockAudio();gameRAF=requestAnimationFrame(frame);
}
function frame(now){
 if(!battle)return;let dt=Math.max(0,(now-last)/1000);last=now;dt=Math.min(.08,dt);
 // Substeps prevent fast dashes and projectiles from skipping collision targets.
 const steps=Math.max(1,Math.ceil(dt/(1/120)));for(let i=0;i<steps;i++)battle.update(dt/steps,input);
 for(const event of battle.events.splice(0)){
  if(event.type==='notice'){$('battleNotice').textContent=event.text;$('battleNotice').classList.add('show');noticeEnd=now+2200;}
  if(event.type==='finish')showResult();
  if(['attack','jump','dash','skill','ult','hurt','kill'].includes(event.type))sound(event.type);
 }
 if(now>noticeEnd)$('battleNotice').classList.remove('show');
 renderHud();renderer.draw(battle);gameRAF=requestAnimationFrame(frame);
}
function renderHud(){
 const p=battle.player;$('hpFill').style.width=`${p.hp}%`;$('hpText').textContent=`${Math.ceil(p.hp)} / 100`;$('energyFill').style.width=`${p.energy}%`;$('energyText').textContent=p.energy>=100?'READY / Q':`${Math.floor(p.energy)}%`;
 $('scoreText').textContent=String(Math.floor(battle.score)).padStart(5,'0');$('waveText').textContent=mode==='fighter'?`WAVE ${String(Math.max(1,battle.wave)).padStart(2,'0')} / 03`:`${Math.floor(battle.distance)} m`;$('dashCd').textContent=p.dashCd>0?`${p.dashCd.toFixed(1)}s`:'';$('skillCd').textContent=p.skillCd>0?`${p.skillCd.toFixed(1)}s`:'';
}
function showResult(){
 input.left=input.right=input.attack=false;const b=battle;
 $('resultKicker').textContent=b.won?'MISSION COMPLETE':'MISSION RETRY';$('resultTitle').textContent=b.won?(mode==='runner'?'千米突围，完成！':'这一课，满分收官！'):'再来一次，就会更强。';
 const value=mode==='fighter'?b.score:b.distance,previous=Number(records[mode])||0;if(value>previous){records[mode]=value;try{localStorage.setItem('stellar-academy-records-v1',JSON.stringify(records));}catch{toast('浏览器存储不可用，本次纪录未保存');}}
 $('resultStats').textContent=mode==='fighter'?`得分 ${b.score} · 击败 ${b.kills} · 最高 ${b.maxCombo} 连击${value>previous?' · 新纪录！':''}`:`距离 ${Math.floor(b.distance)}米 · 得分 ${b.score}${value>previous?' · 新纪录！':''}`;$('resultPanel').hidden=false;updateRecords();
}
function pause(force){if(!battle||battle.finished)return;battle.paused=typeof force==='boolean'?force:!battle.paused;input.left=input.right=input.attack=false;$('pausePanel').hidden=!battle.paused;$('pauseButton').textContent=battle.paused?'继续 ▶':'暂停 Ⅱ';last=performance.now();}
function exit(){cancelAnimationFrame(gameRAF);battle=null;input.left=input.right=input.attack=false;$('playScreen').hidden=true;$('lobby').hidden=false;document.querySelector('.nav').classList.remove('playing');$('battleNotice').classList.remove('show');updateRecords();$('games').scrollIntoView({behavior:'instant'});}
$('pauseButton').addEventListener('click',()=>pause());$('continueButton').addEventListener('click',()=>{pause(false);canvas.focus({preventScroll:true});});
for(const id of ['pauseExit','resultExit'])$(id).addEventListener('click',exit);
$('backToLobby').addEventListener('click',()=>{if(battle&&!battle.finished)pause(true);else exit();});
$('retryButton').addEventListener('click',start);
const keyMap={KeyJ:'attack',KeyK:'dash',KeyE:'skill',KeyQ:'ult',Space:'jump',ArrowUp:'jump',KeyW:'jump'};
window.addEventListener('keydown',event=>{
 if(!battle||$('playScreen').hidden)return;
 if(['Space','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.code))event.preventDefault();
 if(event.code==='KeyP'||event.code==='Escape'){if(!event.repeat)pause();return;}
 if(battle.paused||battle.finished)return;
 if(event.code==='KeyA'||event.code==='ArrowLeft')input.left=true;
 if(event.code==='KeyD'||event.code==='ArrowRight')input.right=true;
 if(event.code==='KeyJ')input.attack=true;
 if(keyMap[event.code]&&!event.repeat){unlockAudio();battle.action(keyMap[event.code]);}
});
window.addEventListener('keyup',event=>{if(event.code==='KeyA'||event.code==='ArrowLeft')input.left=false;if(event.code==='KeyD'||event.code==='ArrowRight')input.right=false;if(event.code==='KeyJ')input.attack=false;});
for(const button of document.querySelectorAll('[data-hold],[data-action]')){
 button.addEventListener('pointerdown',e=>{e.preventDefault();if(!battle||battle.paused||battle.finished)return;button.setPointerCapture(e.pointerId);unlockAudio();if(button.dataset.hold)input[button.dataset.hold]=true;else{battle.action(button.dataset.action);if(button.dataset.action==='attack')input.attack=true;}});
 const release=()=>{if(button.dataset.hold)input[button.dataset.hold]=false;if(button.dataset.action==='attack')input.attack=false;};
 button.addEventListener('pointerup',release);button.addEventListener('pointercancel',release);button.addEventListener('lostpointercapture',release);
}
window.addEventListener('blur',()=>{if(battle&&!battle.finished)pause(true);});document.addEventListener('visibilitychange',()=>{if(document.hidden&&battle&&!battle.finished)pause(true);});
window.addEventListener('resize',()=>{renderer?.resize();});
function updateAudioButton(){$('audioToggle').textContent=`音效 ${soundOn?'开':'关'}`;$('audioToggle').setAttribute('aria-pressed',String(soundOn));}
function unlockAudio(){if(!soundOn)return;try{audio ||= new(window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume().catch(()=>{});}catch{}}
function sound(type){
 if(!soundOn||!audio)return;
 const specs={attack:[340,.07,.035,'triangle'],jump:[520,.12,.025,'sine'],dash:[160,.12,.035,'sawtooth'],skill:[660,.25,.035,'sine'],ult:[110,.8,.06,'triangle'],hurt:[85,.15,.04,'sawtooth'],kill:[760,.13,.03,'sine']};
 const [freq,dur,vol,wave]=specs[type],t=audio.currentTime,osc=audio.createOscillator(),gain=audio.createGain();osc.type=wave;osc.frequency.setValueAtTime(freq,t);osc.frequency.exponentialRampToValueAtTime(type==='jump'?freq*1.8:freq*.5,t+dur);gain.gain.setValueAtTime(vol,t);gain.gain.exponentialRampToValueAtTime(.001,t+dur);osc.connect(gain).connect(audio.destination);osc.start();osc.stop(t+dur);
}
$('audioToggle').addEventListener('click',()=>{soundOn=!soundOn;try{localStorage.setItem('stellar-academy-sound',soundOn?'1':'0');}catch{}unlockAudio();if(soundOn)sound('skill');updateAudioButton();});
updateSelection();updateAudioButton();
