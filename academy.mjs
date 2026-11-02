import {Battle,TEACHERS,abilityState} from './combat-model.mjs';
import {Renderer} from './battle-renderer.mjs';
import {battleViewport,requestBattleLandscape,layoutViewport,installBattleGestureGuard,installJoystick} from './mobile-layout.mjs';
const $=id=>document.getElementById(id);
const atlas=new Image();atlas.src='teachers-atlas.png';
const canvas=$('actionCanvas');let renderer=null,battle=null,mode='fighter',selected=0,last=0,noticeEnd=0,gameRAF=0,soundOn=false,audio=null,enteringDisplay=false,skillHelpWasPaused=false;
let joystick=null;
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
 $('selectedSubject').textContent=`${t.subject} / ${selected===0?'女':'男'}`;$('selectedName').textContent=`${t.name} · ${t.title}`;$('selectedDesc').textContent=t.desc;$('selectedSkill').textContent=t.skill;$('selectedUlt').textContent=t.ult;renderAbilityIntro($('selectionAbilities'),t);
 try{localStorage.setItem('stellar-academy-character',String(selected));}catch{}
}
function openSelect(nextMode){mode=nextMode;$('selectTitle').textContent=(mode==='fighter'?'六师对决':'星轨疾行')+' / 选择出战老师';$('briefing').textContent=mode==='fighter'?'任务：击败三波敌人和最终首领。A/D 移动，空格双跳，J 连续普攻，K 无敌闪避，E 技能一，R 技能二，Q 满能量终结技。首领抬手时，跳跃或闪避躲开预警。':'任务：跑完1000米。角色自动前进，空格双段跳跨越断桥，K 冲刺穿透障碍，J 发射弹幕，E 清理前方障碍，R 使用第二技能，Q 终结技。每250米恢复生命。';updateSelection();$('selectDialog').showModal();}
for(const b of document.querySelectorAll('[data-mode]'))b.addEventListener('click',()=>openSelect(b.dataset.mode));
for(const b of document.querySelectorAll('[data-scroll]'))b.addEventListener('click',()=>$ (b.dataset.scroll).scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'}));
for(const b of document.querySelectorAll('[data-close]'))b.addEventListener('click',()=>b.closest('dialog').close());
$('deploy').addEventListener('click',async()=>{
 if(!atlas.complete||!atlas.naturalWidth){$('deploy').disabled=true;$('deploy').textContent='角色资源加载中…';try{await atlas.decode();}catch{toast('角色资源加载失败，请刷新后重试');$('deploy').disabled=false;$('deploy').textContent='确认出战 →';return;}}
 $('deploy').disabled=false;$('deploy').textContent='确认出战 →';$('selectDialog').close();start();
});
function start(){
 cancelAnimationFrame(gameRAF);battle=new Battle(mode,selected);input.left=input.right=input.attack=false;joystick?.reset();$('lobby').hidden=true;document.querySelector('.nav').classList.add('playing');$('playScreen').hidden=false;document.body.classList.add('battle-active');syncBattleLayout();$('pausePanel').hidden=true;$('resultPanel').hidden=true;
 $('playMode').textContent=mode==='fighter'?'六师对决 / 实战教室':'星轨疾行 / 千米突围';$('hudName').textContent=`${TEACHERS[selected].name} · ${TEACHERS[selected].subject}`;configureAbilityIcons();theme($('hudPortrait'),TEACHERS[selected],selected);
 $('controlHint').textContent=mode==='fighter'?'A / D 移动 · 空格双段跳 · J 普攻 · K 闪避 · E 技能一 · R 技能二 · Q 终结技 · P 暂停':'自动前进 · 空格双段跳 · J 射击 · K 冲刺破障 · E 技能清场 · R 技能二 · Q 终结技 · P 暂停';
 document.querySelector('.direction-pad').style.opacity=mode==='runner'?'.35':'1';document.querySelector('.joystick-caption').textContent=mode==='runner'?'自动前进':'拖动移动';$('pauseButton').textContent='暂停 Ⅱ';updateAudioButton();renderer=new Renderer(canvas,atlas);window.scrollTo({top:0,behavior:'instant'});canvas.focus({preventScroll:true});last=performance.now();unlockAudio();enterDisplay();renderHud();gameRAF=requestAnimationFrame(frame);
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
 $('scoreText').textContent=String(Math.floor(battle.score)).padStart(5,'0');$('waveText').textContent=mode==='fighter'?`WAVE ${String(Math.max(1,battle.wave)).padStart(2,'0')} / 03`:`${Math.floor(battle.distance)} m`;
 for(const button of document.querySelectorAll('[data-action]')){
  const action=button.dataset.action,state=abilityState(battle,action);
  button.style.setProperty('--cooldown',`${Math.round((1-state.progress)*360)}deg`);
  button.classList.toggle('cooling',state.remaining>0);button.classList.toggle('ability-ready',state.ready);button.classList.toggle('energy-pending',action==='ult'&&!state.ready);
  button.querySelector('.cd-value').textContent=action==='ult'?state.text:state.remaining>0?state.text:action==='jump'?`${Math.max(0,2-p.jumps)}跳`:'';
  button.setAttribute('aria-disabled',String(!state.ready));
  button.setAttribute('aria-label',`${button.dataset.label}，${state.remaining>0?'冷却 '+state.text+' 秒':action==='ult'?state.text:state.ready?'就绪':'暂不可用'}`);
 }

}
function showResult(){
 input.left=input.right=input.attack=false;joystick?.reset();const b=battle;
 $('resultKicker').textContent=b.won?'MISSION COMPLETE':'MISSION RETRY';$('resultTitle').textContent=b.won?(mode==='runner'?'千米突围，完成！':'这一课，满分收官！'):'再来一次，就会更强。';
 const value=mode==='fighter'?b.score:b.distance,previous=Number(records[mode])||0;if(value>previous){records[mode]=value;try{localStorage.setItem('stellar-academy-records-v1',JSON.stringify(records));}catch{toast('浏览器存储不可用，本次纪录未保存');}}
 $('resultStats').textContent=mode==='fighter'?`得分 ${b.score} · 击败 ${b.kills} · 最高 ${b.maxCombo} 连击${value>previous?' · 新纪录！':''}`:`距离 ${Math.floor(b.distance)}米 · 得分 ${b.score}${value>previous?' · 新纪录！':''}`;$('resultPanel').hidden=false;updateRecords();
}
function pause(force){if(!battle||battle.finished||$('skillDialog').open)return;battle.paused=typeof force==='boolean'?force:!battle.paused;input.left=input.right=input.attack=false;joystick?.reset();$('pausePanel').hidden=!battle.paused;$('pauseButton').textContent=battle.paused?'继续 ▶':'暂停 Ⅱ';last=performance.now();}
function exit(){cancelAnimationFrame(gameRAF);battle=null;input.left=input.right=input.attack=false;joystick?.reset();$('playScreen').hidden=true;document.body.classList.remove('battle-active','battle-mobile','battle-rotated','battle-compact');releaseDisplay();$('lobby').hidden=false;document.querySelector('.nav').classList.remove('playing');$('battleNotice').classList.remove('show');updateRecords();$('games').scrollIntoView({behavior:'instant'});}
$('pauseButton').addEventListener('click',()=>pause());$('continueButton').addEventListener('click',()=>{pause(false);canvas.focus({preventScroll:true});});
for(const id of ['pauseExit','resultExit'])$(id).addEventListener('click',exit);
$('backToLobby').addEventListener('click',()=>{if(battle&&!battle.finished)pause(true);else exit();});
$('retryButton').addEventListener('click',start);
const keyMap={KeyJ:'attack',KeyK:'dash',KeyE:'skill',KeyR:'skill2',KeyQ:'ult',Space:'jump',ArrowUp:'jump',KeyW:'jump'};
window.addEventListener('keydown',event=>{
 if(!battle||$('playScreen').hidden||$('skillDialog').open)return;
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
 const pointers=new Set();
 button.addEventListener('pointerdown',e=>{e.preventDefault();if(!battle||battle.paused||battle.finished)return;pointers.add(e.pointerId);button.setPointerCapture(e.pointerId);unlockAudio();if(button.dataset.hold)input[button.dataset.hold]=true;else{battle.action(button.dataset.action);if(button.dataset.action==='attack')input.attack=true;}if(navigator.vibrate)navigator.vibrate(8);});
 const release=e=>{pointers.delete(e.pointerId);if(pointers.size)return;if(button.dataset.hold)input[button.dataset.hold]=false;if(button.dataset.action==='attack')input.attack=false;};
 button.addEventListener('pointerup',release);button.addEventListener('pointercancel',release);button.addEventListener('lostpointercapture',release);
 // Keyboard and assistive-technology click activation does not generate a pointerdown.
 button.addEventListener('click',e=>{if(e.detail===0&&battle)battle.action(button.dataset.action);});
 button.addEventListener('contextmenu',e=>e.preventDefault());
}
joystick=installJoystick($('moveJoystick'),{
 isActive:()=>!!battle&&!battle.paused&&!battle.finished&&mode==='fighter',
 isRotated:()=>document.body.classList.contains('battle-rotated'),
 onChange:vector=>{input.left=vector.left;input.right=vector.right;},onEngage:unlockAudio
});
window.addEventListener('blur',()=>{if(battle&&!battle.finished&&!enteringDisplay)pause(true);});document.addEventListener('visibilitychange',()=>{if(document.hidden&&battle&&!battle.finished)pause(true);});
function isMobileLayout(){return (Math.min(innerWidth,innerHeight)<=600&&Math.max(innerWidth,innerHeight)<=1100) || (matchMedia('(pointer:coarse)').matches&&Math.min(innerWidth,innerHeight)<=900);}
function syncBattleLayout(){
 if(!battle)return;
 const {width,height}=layoutViewport(document.documentElement.clientWidth||innerWidth,document.documentElement.clientHeight||innerHeight,window.visualViewport);
 const mobile=isMobileLayout(),view=battleViewport(width,height,mobile);
 document.body.classList.toggle('battle-compact',mobile&&view.width<680);document.body.classList.toggle('battle-mobile',mobile);document.body.classList.toggle('battle-rotated',view.rotated);
 // Position inside the visible viewport, not the larger area behind browser toolbars.
 const visual=window.visualViewport,normalScale=!visual||Math.abs((visual.scale||1)-1)<.02;
 const left=normalScale?(visual?.offsetLeft||0):0,top=normalScale?(visual?.offsetTop||0):0;
 $('playScreen').style.setProperty('--battle-left',`${left+(view.rotated?width/2:0)}px`);
 $('playScreen').style.setProperty('--battle-top',`${top+(view.rotated?height/2:0)}px`);
 $('playScreen').style.setProperty('--control-scale',String(Math.max(.72,Math.min(1,(view.height-82)/220))));
 $('playScreen').style.setProperty('--battle-width',`${view.width}px`);$('playScreen').style.setProperty('--battle-height',`${view.height}px`);
 requestAnimationFrame(()=>renderer?.resize());
}
async function enterDisplay(){
 syncBattleLayout();if(!isMobileLayout()||!matchMedia('(pointer:coarse)').matches)return;enteringDisplay=true;
 try{await requestBattleLandscape(document.documentElement);}finally{enteringDisplay=false;syncBattleLayout();}
}
function releaseDisplay(){
 try{screen.orientation?.unlock?.();}catch{}
 try{if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});}catch{}
}
window.addEventListener('resize',syncBattleLayout);window.visualViewport?.addEventListener('resize',syncBattleLayout);window.visualViewport?.addEventListener('scroll',syncBattleLayout);
// Container changes (including entering/exiting fullscreen) may settle after resize.
if(typeof ResizeObserver!=='undefined')new ResizeObserver(()=>renderer?.resize()).observe(canvas);
installBattleGestureGuard($('playScreen'),()=>!!battle&&!$('playScreen').hidden);
window.addEventListener('orientationchange',()=>{if(battle){input.left=input.right=input.attack=false;joystick?.reset();syncBattleLayout();}});
document.addEventListener('fullscreenchange',()=>{syncBattleLayout();});
$('fullscreenButton').addEventListener('click',()=>{enteringDisplay=true;requestBattleLandscape(document.documentElement).finally(()=>{enteringDisplay=false;syncBattleLayout();});});
const skillIcons=['炼','墨','△','叶','羽','◎'];
function renderAbilityIntro(container,t){
 const baseDescriptions={field:'在前方生成2.6秒反应场，每0.4秒造成25点范围伤害。',ink:'发射可穿透敌群的墨刃，命中造成45点伤害。',prism:'向三个方向发射光刃，每枚命中造成29点伤害。',vine:'立即恢复18点生命，并用藤蔓限制范围内敌人。',feather:'召唤5枚追踪飞羽，每枚造成22点伤害。',gravity:'持续2.8秒牵引范围内的敌人，并周期造成伤害。'};
 const rows=[['E',t.skill,'冷却 5秒',baseDescriptions[t.kind]+(mode==='runner'?' 跑酷中额外清除前方障碍并获得0.8秒保护。':'')],['R',t.skill2,`冷却 ${t.skill2Cd}秒`,t.desc2],['Q',t.ult,'消耗 100能量',`对敌群造成170点伤害，短暂无敌并清除敌方弹幕${t.id==='zhi'?'，额外恢复35点生命':''}；跑酷中清除附近障碍。`],['K','闪避冲刺','冷却 1.3秒','冲刺期间躲避伤害；跑酷中可击碎接触到的障碍。']];
 container.replaceChildren(...rows.map(([key,name,cd,desc])=>{const row=document.createElement('article');row.className='ability-intro';row.innerHTML=`<kbd>${key}</kbd><div><h4>${name}<small>${cd}</small></h4><p>${desc}</p></div>`;return row;}));
}
function configureAbilityIcons(){
 const t=TEACHERS[selected];
 for(const button of document.querySelectorAll('[data-action]')){
  const a=button.dataset.action,label=a==='skill'?t.skill:a==='skill2'?t.skill2:a==='ult'?t.ult:({dash:'闪避冲刺',jump:'双段跳',attack:mode==='fighter'?'普攻':'射击'})[a];
  button.dataset.label=label;button.querySelector('.action-caption').textContent=label;
  if(a==='skill')button.querySelector('.action-icon').textContent=skillIcons[selected];if(a==='skill2')button.querySelector('.action-icon').textContent=t.icon2;
  button.style.setProperty('--ability-color',t.color);button.title=`${label} · ${a==='skill'?'5秒冷却':a==='skill2'?t.skill2Cd+'秒冷却':a==='ult'?'100能量':'点击释放'}`;
 }
}
$('skillHelpButton').addEventListener('click',()=>{
 if(!battle)return;skillHelpWasPaused=battle.paused;input.left=input.right=input.attack=false;joystick?.reset();battle.paused=true;
 $('skillDialogTitle').textContent=`${battle.teacher.name} · 技能介绍`;renderAbilityIntro($('battleAbilities'),battle.teacher);$('skillDialog').showModal();
});
$('skillDialog').addEventListener('close',()=>{if(battle&&!battle.finished){battle.paused=skillHelpWasPaused;$('pausePanel').hidden=!battle.paused;$('pauseButton').textContent=battle.paused?'继续 ▶':'暂停 Ⅱ';last=performance.now();}});
function updateAudioButton(){$('audioToggle').textContent=`音效 ${soundOn?'开':'关'}`;$('audioToggle').setAttribute('aria-pressed',String(soundOn));}
function unlockAudio(){if(!soundOn)return;try{audio ||= new(window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume().catch(()=>{});}catch{}}
function sound(type){
 if(!soundOn||!audio)return;
 const specs={attack:[340,.07,.035,'triangle'],jump:[520,.12,.025,'sine'],dash:[160,.12,.035,'sawtooth'],skill:[660,.25,.035,'sine'],ult:[110,.8,.06,'triangle'],hurt:[85,.15,.04,'sawtooth'],kill:[760,.13,.03,'sine']};
 const [freq,dur,vol,wave]=specs[type],t=audio.currentTime,osc=audio.createOscillator(),gain=audio.createGain();osc.type=wave;osc.frequency.setValueAtTime(freq,t);osc.frequency.exponentialRampToValueAtTime(type==='jump'?freq*1.8:freq*.5,t+dur);gain.gain.setValueAtTime(vol,t);gain.gain.exponentialRampToValueAtTime(.001,t+dur);osc.connect(gain).connect(audio.destination);osc.start();osc.stop(t+dur);
}
$('audioToggle').addEventListener('click',()=>{soundOn=!soundOn;try{localStorage.setItem('stellar-academy-sound',soundOn?'1':'0');}catch{}unlockAudio();if(soundOn)sound('skill');updateAudioButton();});
updateSelection();updateAudioButton();
