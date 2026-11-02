(()=>{
"use strict";
const TEACHERS=[
 {id:'lao',name:'牢老师',subject:'化学',title:'紫晶炼金师',color:'#c29af1',glow:'#6c43803d',skill:'炼金爆破',ult:'元素大反应',desc:'以炼金药剂制造范围爆破，残留的反应场会持续灼烧敌人。',kind:'field',skill2:'催化护盾',icon2:'盾',skill2Cd:8,desc2:'展开2秒无敌护盾，震退附近敌人并造成30点伤害。',kind2:'shield',damage:25},
 {id:'c',name:'C老师',subject:'语文',title:'墨刃执笔人',color:'#e4c38b',glow:'#8b73413d',skill:'笔落惊风',ult:'一剑开篇',desc:'挥笔放出穿透墨刃。射程长，适合用连续剑气压制敌群。',kind:'ink',skill2:'横扫千军',icon2:'笔',skill2Cd:7,desc2:'向前突进220距离，斩击沿途敌人造成60点伤害；跑酷中转为短冲刺。',kind2:'sweep',damage:28},
 {id:'zhen',name:'振老师',subject:'数学',title:'几何裁决者',color:'#89ccef',glow:'#3c71943d',skill:'三角裁决',ult:'无限极限',desc:'三枚几何光刃沿不同角度飞行，近身时能够打出集中爆发。',kind:'prism',skill2:'坐标置换',icon2:'△',skill2Cd:8,desc2:'闪现到前方敌人身侧并造成45点伤害；跑酷中重置双跳并向上跃起。',kind2:'blink',damage:20},
 {id:'zhi',name:'只老师',subject:'生物',title:'森域守望者',color:'#a6d886',glow:'#507e3d3d',skill:'生命蔓延',ult:'万物复苏',desc:'藤蔓缠住附近敌人，同时恢复自身生命。适合持续作战。',kind:'vine',skill2:'共生护佑',icon2:'叶',skill2Cd:10,desc2:'4秒内每0.5秒恢复3点生命，共24点；释放瞬间获得短暂保护。',kind2:'regen',damage:22},
 {id:'mi',name:'米老师',subject:'英语',title:'赤羽咏唱者',color:'#e69d94',glow:'#8c49443d',skill:'飞羽序章',ult:'Final Chapter',desc:'召唤追踪飞羽，自动寻找附近敌人，让空中作战更加从容。',kind:'feather',skill2:'疾风咏唱',icon2:'羽',skill2Cd:9,desc2:'4秒内提高普攻频率和移动速度；跑酷中提高射速与前进速度。',kind2:'haste',damage:18},
 {id:'dan',name:'蛋老师',subject:'物理',title:'引力掌控者',color:'#87aef5',glow:'#3d58933d',skill:'引力坍缩',ult:'万有引力',desc:'展开引力核心，牵引附近敌人并造成伤害，聚怪后再连招。',kind:'gravity',skill2:'时空减速',icon2:'◎',skill2Cd:9,desc2:'3.2秒内让敌人的移动、出招和敌方弹幕降至35%速度，自身不受影响。',kind2:'slow',damage:23}
];
const W=1280,H=720,FLOOR=575;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
class Battle {
 constructor(mode='fighter',character=0,rng=Math.random){
  this.mode=mode;this.teacher=TEACHERS[character];this.character=character;this.rng=rng;this.time=0;this.score=0;this.combo=0;this.comboTime=0;this.finished=false;this.won=false;this.paused=false;
  this.player={x:mode==='runner'?220:380,y:FLOOR,vx:0,vy:0,dir:1,hp:100,energy:20,jumps:0,onGround:true,iframe:0,dash:0,dashCd:0,attack:0,attackCd:0,attackId:0,skillCd:0,skill2Cd:0,haste:0,slow:0,regen:0,regenTick:0,pose:0};
  this.enemies=[];this.bullets=[];this.fields=[];this.particles=[];this.texts=[];this.events=[];this.slashes=[];this.cutIn=0;this.shake=0;this.freeze=0;this.wave=0;this.waveRest=1.8;this.spawnQueue=0;this.spawnCd=0;this.maxCombo=0;this.kills=0;this.distance=0;this.speed=330;this.travel=0;this.obstacles=[];this.pickups=[];this.segments=[{a:-1000,b:2200}];this.genX=2200;this.nextHazard=850;this.nextDrone=1700;this.checkpoint=0;this.shield=0;this.trail=[];this.notice(mode==='fighter'?'第一节课 · 准备迎战':'星轨疾行 · 1000米突围');
 }
 notice(text){this.events.push({type:'notice',text});}
 action(key){
  if(this.paused||this.finished)return false;
  const p=this.player;
  if(key==='jump'&&p.jumps<2){p.vy=p.jumps===0?-760:-700;p.jumps++;p.onGround=false;this.burst(p.x,p.y-8,this.teacher.color,12,130);this.events.push({type:'jump'});return true;}
  if(key==='dash'&&p.dashCd<=0){p.dash=.23;p.dashCd=1.3;p.iframe=.35;this.events.push({type:'dash'});return true;}
  if(key==='attack'&&p.attackCd<=0){
   p.attack=.25;p.attackCd=(this.mode==='runner'?.24:.28)*(p.haste>0?.55:1);p.attackId++;p.pose=(p.pose+1)%3;
   if(this.mode==='runner')this.projectile(p.x+35,p.y-70,1,0,17,650,'player',9);
   else this.slashes.push({x:p.x+p.dir*65,y:p.y-68,dir:p.dir,life:.22,max:.22,pose:p.pose,color:this.teacher.color});
   this.events.push({type:'attack'});return true;
  }
  if(key==='skill'&&p.skillCd<=0){p.skillCd=5;this.castSkill();this.events.push({type:'skill'});return true;}
  if(key==='skill2'&&p.skill2Cd<=0){p.skill2Cd=this.teacher.skill2Cd;this.castSecondSkill();this.events.push({type:'skill'});return true;}
  if(key==='ult'){
   if(p.energy<100){this.notice('终结能量不足 · 命中与击败敌人可充能');return false;}
   p.energy=0;p.iframe=2.1;this.cutIn=1.35;this.shield=3;this.shake=12;
   this.notice(this.teacher.ult);this.events.push({type:'ult'});
   for(const e of this.enemies)this.hitEnemy(e,170);
   this.bullets=this.bullets.filter(b=>b.owner==='player');
   this.obstacles=this.obstacles.filter(o=>Math.abs(o.x-this.travel-p.x)>900);
   if(this.character===3)p.hp=Math.min(100,p.hp+35);
   this.fields.push({x:p.x+180*p.dir,y:FLOOR-50,r:650,life:1.3,max:1.3,kind:'ultimate',tick:0});
   this.burst(p.x+150*p.dir,p.y-100,this.teacher.color,65,650);return true;
  }
  return false;
 }
 castSkill(){
  const p=this.player,t=this.teacher;
  if(t.kind==='field'){
   this.fields.push({x:p.x+p.dir*170,y:FLOOR-45,r:160,life:2.6,max:2.6,kind:'field',tick:0});
   this.burst(p.x+p.dir*170,FLOOR-65,t.color,24,250);
  } else if(t.kind==='ink') {
   this.projectile(p.x+p.dir*45,p.y-80,p.dir,0,45,800,'player',22,true);
  } else if(t.kind==='prism') {
   for(const dy of [-.3,0,.3])this.projectile(p.x+p.dir*35,p.y-75,p.dir,dy,29,700,'player',13);
  } else if(t.kind==='vine') {
   p.hp=Math.min(100,p.hp+18);this.texts.push({x:p.x,y:p.y-140,text:'+18',color:'#a1eb99',life:1});
   this.fields.push({x:p.x+p.dir*90,y:FLOOR-45,r:230,life:2,max:2,kind:'vine',tick:0});
  } else if(t.kind==='feather') {
   for(let i=0;i<5;i++){const b=this.projectile(p.x,p.y-110-i*12,p.dir,(i-2)*.15,22,550,'player',9);b.homing=true;}
  } else {
   this.fields.push({x:p.x+p.dir*200,y:FLOOR-70,r:240,life:2.8,max:2.8,kind:'gravity',tick:0});
  }
  if(this.mode==='runner'){
   for(const o of this.obstacles)if(o.x-this.travel>p.x-60&&o.x-this.travel<p.x+500){o.dead=true;this.burst(o.x-this.travel,FLOOR-45,t.color,10,140);this.score+=30;}
   this.shield=Math.max(this.shield,.8);
  }
 }
 castSecondSkill(){
  const p=this.player,t=this.teacher;
  this.notice(`${t.name} · ${t.skill2}`);
  if(t.kind2==='shield'){
   this.shield=Math.max(this.shield,2);
   for(const e of this.enemies)if(Math.abs(e.x-p.x)<200){this.hitEnemy(e,30);e.x=clamp(e.x+(e.x>=p.x?65:-65),45,W-45);}
   this.fields.push({x:p.x,y:FLOOR-50,r:190,life:.8,max:.8,kind:'aura',tick:0});
  }else if(t.kind2==='sweep'){
   const from=p.x;if(this.mode==='fighter')p.x=clamp(p.x+p.dir*220,50,W-50);else p.dash=Math.max(p.dash,.34);
   p.iframe=Math.max(p.iframe,.5);
   for(const e of this.enemies)if(Math.abs(e.y-p.y)<180&&e.x>=Math.min(from,p.x)-90&&e.x<=Math.max(from,p.x)+90)this.hitEnemy(e,60);
   for(let i=0;i<3;i++)this.slashes.push({x:from+p.dir*i*85,y:p.y-80,dir:p.dir,life:.35,max:.35,pose:i,color:t.color});
  }else if(t.kind2==='blink'){
   if(this.mode==='fighter'){
    const target=this.enemies.filter(e=>!e.dead&&(e.x-p.x)*p.dir>=0).sort((a,b)=>Math.abs(a.x-p.x)-Math.abs(b.x-p.x))[0];
    const old=p.x;p.x=clamp(target?target.x-p.dir*70:p.x+p.dir*260,50,W-50);
    this.burst(old,p.y-80,t.color,20,240);if(target&&Math.abs(target.x-p.x)<150)this.hitEnemy(target,45);
   }else{p.jumps=0;p.vy=-650;p.onGround=false;p.dash=Math.max(p.dash,.2);}
   p.iframe=Math.max(p.iframe,.6);
  }else if(t.kind2==='regen'){
   p.regen=4;p.regenTick=.5;p.iframe=Math.max(p.iframe,.6);
  }else if(t.kind2==='haste')p.haste=4;
  else p.slow=3.2;
  this.burst(p.x,p.y-70,t.color,24,230);
 }
 projectile(x,y,dx,dy,damage,speed,owner,r=8,pierce=false){const l=Math.hypot(dx,dy)||1;const b={x,y,vx:dx/l*speed,vy:dy/l*speed,damage,owner,r,life:3,pierce,hits:new Set()};this.bullets.push(b);return b;}
 burst(x,y,color,n,speed=200){for(let i=0;i<n;i++){const a=this.rng()*Math.PI*2,v=(.3+this.rng()*.7)*speed;this.particles.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:.3+this.rng()*.5,max:.8,color,r:1+this.rng()*3});}if(this.particles.length>350)this.particles.splice(0,this.particles.length-350);}
 hitEnemy(e,damage){
  if(e.dead)return;
  e.hp-=damage;e.flash=.12;e.stun=.12;e.x+=this.player.dir*(e.boss?3:12);this.combo++;this.comboTime=2.3;this.maxCombo=Math.max(this.combo,this.maxCombo);
  this.player.energy=Math.min(100,this.player.energy+5);this.shake=Math.max(this.shake,3);this.burst(e.x,e.y-60,this.teacher.color,7,150);
  this.texts.push({x:e.x+(this.rng()-.5)*40,y:e.y-100,text:String(damage),color:this.teacher.color,life:.7});
  if(e.hp<=0){e.dead=true;this.kills++;this.score+=e.boss?1200:100+this.wave*25;this.player.energy=Math.min(100,this.player.energy+10);this.burst(e.x,e.y-50,e.boss?'#e8c58d':'#87b8d9',e.boss?60:20,240);this.events.push({type:'kill'});}
 }
 hurt(damage,knock=0){
  const p=this.player;if(p.iframe>0||this.shield>0||this.finished)return false;
  p.hp=Math.max(0,p.hp-damage);p.iframe=1;p.vx=knock;this.shake=9;this.combo=0;
  this.burst(p.x,p.y-65,'#ee92a3',15,200);this.texts.push({x:p.x,y:p.y-125,text:`-${damage}`,color:'#f598a6',life:.9});this.events.push({type:'hurt'});
  if(p.hp<=0)this.finish(false);return true;
 }
 finish(won){if(this.finished)return;this.finished=true;this.won=won;if(won)this.score+=Math.floor(this.player.hp)*10;this.events.push({type:'finish',won});}
 spawnEnemy(boss=false,index=0){
  const side=this.rng()>.5;const hp=boss?620:45+this.wave*18;
  this.enemies.push({x:side?1190:90,y:FLOOR,dir:side?-1:1,hp,maxHp:hp,boss,type:boss?'boss':index%3===2?'ranged':'melee',timer:1.5+this.rng(),wind:0,flash:0,stun:0,dead:false,hitBy:-1,speed:boss?55:80+this.wave*16,attackKind:0});
 }
 update(dt,input={}){
  if(this.paused||this.finished)return;
  dt=Math.min(.04,Math.max(0,dt));this.time+=dt;
  const p=this.player;this.cutIn=Math.max(0,this.cutIn-dt);this.shake=Math.max(0,this.shake-dt*25);this.shield=Math.max(0,this.shield-dt);
  if(this.cutIn>0)dt*=.2;
  for(const k of ['iframe','dash','dashCd','attack','attackCd','skillCd','skill2Cd','haste','slow'])p[k]=Math.max(0,p[k]-dt);
  if(p.regen>0){
   const active=Math.min(dt,p.regen);p.regen=Math.max(0,p.regen-dt);p.regenTick-=active;
   while(p.regenTick<=1e-8){p.hp=Math.min(100,p.hp+3);p.regenTick+=.5;this.texts.push({x:p.x,y:p.y-120,text:'+3',color:'#a1eb99',life:.7});}
  }
  this.comboTime-=dt;if(this.comboTime<=0)this.combo=0;
  if(input.attack)this.action('attack');
  const moving=(input.right?1:0)-(input.left?1:0);
  if(this.mode==='fighter'){
   if(moving&&p.dash<=0){p.dir=moving;p.vx=moving*310*(p.haste>0?1.3:1);}else if(p.dash<=0)p.vx*=Math.pow(.001,dt);
   if(p.dash>0)p.vx=p.dir*1080;
   p.x=clamp(p.x+p.vx*dt,50,W-50);this.updateFighter(dt);
  }else this.updateRunner(dt,input);
  const previousY=p.y;
  p.vy+=1900*dt;p.y+=p.vy*dt;
  const supported=this.mode==='fighter'||this.segments.some(s=>this.travel+p.x>=s.a&&this.travel+p.x<=s.b);
  if(p.y>=FLOOR&&previousY<=FLOOR+1&&p.vy>=0&&supported){p.y=FLOOR;p.vy=0;p.jumps=0;p.onGround=true;}else p.onGround=false;
  if(p.y>H+140){if(this.mode==='runner'){this.hurt(28);p.y=FLOOR-180;p.vy=-450;p.jumps=1;p.iframe=1.5;const landing=this.segments.find(s=>s.b>this.travel+p.x&&s.a>this.travel+p.x);if(landing)this.travel=landing.a-p.x+50;}else{p.y=FLOOR;p.vy=0;}}
  if(p.dash>0||Math.abs(p.vx)>180){this.trail.push({x:p.x,y:p.y,life:.18,dir:p.dir});}
  for(const t of this.trail)t.life-=dt;this.trail=this.trail.filter(t=>t.life>0).slice(-12);
  this.updateBullets(dt);this.updateFields(dt);
  for(const s of this.slashes)s.life-=dt;this.slashes=this.slashes.filter(s=>s.life>0);
  for(const a of this.particles){a.life-=dt;a.x+=a.vx*dt;a.y+=a.vy*dt;a.vy+=250*dt;}
  this.particles=this.particles.filter(a=>a.life>0);
  for(const t of this.texts){t.life-=dt;t.y-=55*dt;}this.texts=this.texts.filter(t=>t.life>0);
  this.enemies=this.enemies.filter(e=>!e.dead);
 }
 updateFighter(dt){
  const p=this.player,enemyDt=dt*(p.slow>0?.35:1);
  if(this.enemies.filter(e=>!e.dead).length===0&&this.spawnQueue===0){
   this.waveRest-=dt;
   if(this.waveRest<=0){
    if(this.wave>=3){this.finish(true);return;}
    this.wave++;this.waveRest=2;this.spawnQueue=this.wave===3?3:3+this.wave*2;this.spawnCd=.4;
    this.notice(this.wave===3?'终考来临 · 终考执行者':`第 ${this.wave} 波 · 课间实战`);
    if(this.wave===3)this.spawnEnemy(true);
   }
  }
  if(this.spawnQueue>0){this.spawnCd-=dt;if(this.spawnCd<=0){this.spawnQueue--;this.spawnEnemy(false,this.spawnQueue);this.spawnCd=.65;}}
  for(const e of this.enemies){
   if(e.dead)continue;e.flash=Math.max(0,e.flash-dt);e.stun=Math.max(0,e.stun-dt);e.dir=p.x>e.x?1:-1;
   if(p.attack>.05&&e.hitBy!==p.attackId&&Math.abs(e.x-p.x)<145&&Math.abs(e.y-p.y)<145&&(e.x-p.x)*p.dir>-30){e.hitBy=p.attackId;this.hitEnemy(e,16+p.pose*4);}
   if(e.stun>0)continue;
   if(e.wind>0){
    e.wind-=enemyDt;
    if(e.wind<=0){
     if(e.boss){
      if(e.attackKind%2===0){for(let i=-2;i<=2;i++)this.projectile(e.x,e.y-75,e.dir,i*.15,14,330,'enemy',12);}
      else {this.fields.push({x:e.targetX,y:FLOOR-15,r:115,life:.32,max:.32,kind:'enemy',tick:0});if(Math.abs(p.x-e.targetX)<115&&p.y>FLOOR-115)this.hurt(22,e.dir*300);this.burst(e.targetX,FLOOR-50,'#ef94a8',30,360);}
      e.timer=1.6;e.attackKind++;
     }else if(e.type==='ranged'){this.projectile(e.x,e.y-75,p.x-e.x,p.y-65-(e.y-75),11,300,'enemy',9);e.timer=2.2;}
     else{if(Math.abs(e.x-p.x)<100&&Math.abs(e.y-p.y)<100)this.hurt(12,e.dir*250);e.timer=1.3;}
    }
   }else{
    const desired=e.boss?230:e.type==='ranged'?390:65;
    if(Math.abs(e.x-p.x)>desired)e.x+=e.dir*e.speed*enemyDt;
    e.timer-=enemyDt;
    if(e.timer<=0&&(e.boss||e.type==='ranged'||Math.abs(e.x-p.x)<100)){e.wind=e.boss?.9:.5;e.targetX=p.x;}
   }
   e.x=clamp(e.x,45,W-45);
  }
 }
 updateRunner(dt,input){
  const p=this.player;this.speed=Math.min(530,330+this.distance*.17);const speed=this.speed*(p.haste>0?1.2:1)+(p.dash>0?430:0);
  this.travel+=speed*dt;this.distance=this.travel/12;p.dir=1;p.vx=speed;
  // World generation uses independent solid intervals; gaps remain jumpable at all speeds.
  while(this.genX<this.travel+W+1600){
   const gap=130+this.rng()*60;const length=1250+this.rng()*700;
   this.segments.push({a:this.genX+gap,b:this.genX+gap+length});this.genX+=gap+length;
  }
  this.segments=this.segments.filter(s=>s.b>this.travel-500);
  while(this.nextHazard<this.travel+W+400){
   const on=this.segments.find(s=>this.nextHazard>s.a+230&&this.nextHazard<s.b-260);
   if(on){const type=this.rng()>.65?'laser':'crate';this.obstacles.push({x:this.nextHazard,y:FLOOR,type,dead:false});this.pickups.push({x:this.nextHazard-70,y:FLOOR-175,r:10,dead:false});}
   this.nextHazard+=460+this.rng()*340;
  }
  if(this.nextDrone<this.travel+W){
   this.enemies.push({x:W+90,y:FLOOR-100-this.rng()*90,hp:55,maxHp:55,dead:false,type:'drone',boss:false,dir:-1,timer:1.7,wind:0,flash:0,stun:0,hitBy:-1});this.nextDrone+=1500+this.rng()*900;
  }
  for(const e of this.enemies){
   e.x-=speed*dt;e.flash=Math.max(0,e.flash-dt);e.timer-=dt*(p.slow>0?.35:1);
   if(e.timer<0&&e.x>p.x+160){this.projectile(e.x,e.y-30,-1,0,10,260,'enemy',10);e.timer=2;}
   if(dist({x:p.x,y:p.y-50},{x:e.x,y:e.y-40})<70){if(p.dash>0||this.shield>0)this.hitEnemy(e,100);else this.hurt(12);}
   if(e.x<-100)e.dead=true;
  }
  for(const o of this.obstacles){
   const x=o.x-this.travel;
   if(o.dead)continue;
   const height=o.type==='laser'?120:65;
   if(Math.abs(x-p.x)<43&&p.y>FLOOR-height&&p.y<FLOOR+50){
    if(p.dash>0||this.shield>0){o.dead=true;this.score+=50;this.player.energy=Math.min(100,p.energy+8);this.burst(x,FLOOR-40,this.teacher.color,18,240);}
    else {if(this.hurt(o.type==='laser'?20:14)){o.dead=true;this.score=Math.max(0,this.score-20);}}
   }
  }
  this.obstacles=this.obstacles.filter(o=>!o.dead&&o.x>this.travel-100);
  for(const c of this.pickups){if(dist({x:c.x-this.travel,y:c.y},{x:p.x,y:p.y-50})<65){c.dead=true;this.score+=25;p.energy=Math.min(100,p.energy+10);this.burst(p.x,p.y-50,'#e8cf8a',8,100);}}
  this.pickups=this.pickups.filter(c=>!c.dead&&c.x>this.travel-100);
  if(Math.floor(this.distance/250)>this.checkpoint){this.checkpoint=Math.floor(this.distance/250);p.hp=Math.min(100,p.hp+15);this.score+=150;this.notice(`${this.checkpoint*250}米检查点 · 生命 +15`);}
  if(this.distance>=1000)this.finish(true);
 }
 updateBullets(dt){
  const p=this.player;
  for(const b of this.bullets){
   if(b.homing){const target=this.enemies.filter(e=>!e.dead).sort((a,c)=>dist(a,b)-dist(c,b))[0];if(target){const dx=target.x-b.x,dy=target.y-60-b.y,l=Math.hypot(dx,dy)||1;b.vx+= (dx/l*600-b.vx)*dt*6;b.vy+=(dy/l*600-b.vy)*dt*6;}}
   const flightDt=dt*(b.owner==='enemy'&&p.slow>0?.35:1);b.x+=b.vx*flightDt;b.y+=b.vy*flightDt;b.life-=flightDt;
   if(b.owner==='enemy'){
    if(Math.abs(b.x-p.x)<b.r+23&&Math.abs(b.y-(p.y-60))<b.r+50){this.hurt(b.damage);b.life=0;}
   }else{
    for(const e of this.enemies)if(!e.dead&&!b.hits.has(e)&&Math.abs(b.x-e.x)<b.r+(e.boss?55:30)&&Math.abs(b.y-(e.y-60))<b.r+(e.boss?100:60)){this.hitEnemy(e,b.damage);b.hits.add(e);if(!b.pierce){b.life=0;break;}}
    if(this.mode==='runner')for(const o of this.obstacles){if(!o.dead&&Math.abs(b.x-(o.x-this.travel))<b.r+25&&Math.abs(b.y-(FLOOR-35))<b.r+40){o.dead=true;b.life=0;this.score+=20;this.burst(o.x-this.travel,FLOOR-40,this.teacher.color,10,180);}}
   }
  }
  this.bullets=this.bullets.filter(b=>b.life>0&&b.x>-200&&b.x<W+200&&b.y>-200&&b.y<H+200);
 }
 updateFields(dt){
  for(const f of this.fields){
   f.life-=dt;f.tick-=dt;
   if(['enemy','ultimate','aura'].includes(f.kind))continue;
   for(const e of this.enemies){if(e.dead||Math.abs(e.x-f.x)>f.r)continue;
    if(f.kind==='gravity')e.x+=(f.x-e.x)*dt*2.5;
    if(f.kind==='vine')e.stun=Math.max(e.stun,.1);
   }
   if(f.tick<=0){f.tick=.4;for(const e of this.enemies)if(!e.dead&&Math.abs(e.x-f.x)<f.r)this.hitEnemy(e,this.teacher.damage);}
  }
  this.fields=this.fields.filter(f=>f.life>0);
 }
}

// Shared by visible icon controls and regression tests; cooldown numbers never round down to a false ready state.
function abilityState(battle,action){
 const p=battle.player,t=battle.teacher;
 if(action==='jump')return {remaining:0,total:0,progress:1,ready:p.jumps<2&&!battle.paused&&!battle.finished,text:`${Math.max(0,2-p.jumps)}跳`};
 const cd={attack:[p.attackCd,p.haste>0?.16:.28],dash:[p.dashCd,1.3],skill:[p.skillCd,5],skill2:[p.skill2Cd,t.skill2Cd]};
 if(action==='ult')return {remaining:0,total:100,progress:p.energy/100,ready:p.energy>=100&&!battle.paused&&!battle.finished,text:p.energy>=100?'就绪':`${Math.floor(p.energy)}%`};
 const [remaining,total]=cd[action]||[0,0];
 return {remaining,total,progress:total?Math.max(0,1-remaining/total):1,ready:remaining<=0&&!battle.paused&&!battle.finished,text:remaining>0?`${(Math.ceil(remaining*10)/10).toFixed(1)}`:'就绪'};
}

const TAU=Math.PI*2;
class Renderer {
 constructor(canvas,atlas){this.canvas=canvas;this.c=canvas.getContext('2d');this.atlas=atlas;this.width=W;this.height=H;this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;this.resize();}
 resize(){const r=this.canvas.getBoundingClientRect(),d=Math.min(2,devicePixelRatio||1);this.canvas.width=Math.round(r.width*d);this.canvas.height=Math.round(r.height*d);this.width=r.width*d;this.height=r.height*d;}
 begin(b){const c=this.c;this.viewW=this.width/this.height<1.5?960:W;this.cameraX=Math.max(0,Math.min(W-this.viewW,b.player.x-this.viewW*.4));c.setTransform(1,0,0,1,0,0);c.fillStyle='#0a1324';c.fillRect(0,0,this.width,this.height);const s=Math.min(this.width/this.viewW,this.height/H);c.setTransform(s,0,0,s,(this.width-this.viewW*s)/2-this.cameraX*s,(this.height-H*s)/2);}
 glow(color,blur=15){this.c.shadowColor=color;this.c.shadowBlur=this.reduced?0:blur;}
 line(x,y,x2,y2,color,width=1){const c=this.c;c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(x,y);c.lineTo(x2,y2);c.stroke();}
 draw(b){
  this.begin(b);const c=this.c;c.save();if(!this.reduced&&b.shake>0)c.translate(Math.sin(b.time*137)*b.shake*.5,Math.cos(b.time*167)*b.shake*.25);
  this.background(b);
  for(const f of b.fields)this.field(f,b);
  if(b.mode==='runner')this.runnerObjects(b);
  for(const trail of b.trail){if(this.reduced)break;c.globalAlpha=trail.life*.8;this.character(b.character,trail.x,trail.y,trail.dir,b.time,0,false,true);}
  c.globalAlpha=1;
  for(const e of b.enemies)this.enemy(e,b);
  const p=b.player;
  if(!(p.iframe>0&&p.dash<=0&&Math.floor(b.time*18)%2===0)){
   this.character(b.character,p.x,p.y,p.dir,b.time,p.onGround?Math.abs(p.vx):0,p.attack>0);
  }
  if(b.shield>0){c.save();c.strokeStyle=b.teacher.color;c.lineWidth=2;c.globalAlpha=.5;this.glow(b.teacher.color,20);c.beginPath();c.ellipse(p.x,p.y-83,57,102,0,0,TAU);c.stroke();c.restore();}
  if(p.haste>0||p.slow>0||p.regen>0){
   c.save();c.globalAlpha=.6;c.strokeStyle=b.teacher.color;this.glow(b.teacher.color,18);c.lineWidth=2;c.beginPath();c.ellipse(p.x,p.y-75,60+Math.sin(b.time*7)*5,98,0,0,TAU);c.stroke();c.font='12px system-ui';c.textAlign='center';c.fillStyle=b.teacher.color;
   const label=p.haste>0?`疾风 ${p.haste.toFixed(1)}s`:p.slow>0?`时缓 ${p.slow.toFixed(1)}s`:`共生 ${p.regen.toFixed(1)}s`;c.fillText(label,p.x,p.y-220);c.restore();
  }
  for(const s of b.slashes)this.slash(s);
  for(const bullet of b.bullets)this.bullet(bullet,b);
  if(b.particles.length&&!this.reduced)for(const a of b.particles){c.globalAlpha=Math.min(1,a.life*2);c.fillStyle=a.color;c.beginPath();c.arc(a.x,a.y,a.r,0,TAU);c.fill();}
  c.globalAlpha=1;
  for(const t of b.texts){c.globalAlpha=Math.min(1,t.life*2);c.font='700 24px system-ui';c.textAlign='center';c.fillStyle=t.color;c.strokeStyle='#0b1221';c.lineWidth=4;c.strokeText(t.text,t.x,t.y);c.fillText(t.text,t.x,t.y);}c.globalAlpha=1;
  if(b.combo>1){c.save();c.textAlign='right';c.fillStyle=b.teacher.color;c.font='italic 700 52px Georgia';c.fillText(String(b.combo),this.cameraX+this.viewW-65,190);c.font='10px system-ui';c.letterSpacing='3px';c.fillText('COMBO',this.cameraX+this.viewW-65,213);c.restore();}
  c.save();c.translate(this.cameraX,0);const boss=b.enemies.find(e=>e.boss&&!e.dead);if(boss)this.bossHud(boss);
  if(b.mode==='runner')this.progress(b);
  if(b.cutIn>0)this.cutIn(b);
  c.restore();c.restore();
 }
 background(b){
  const c=this.c,t=b.time,scroll=b.mode==='runner'?b.travel:t*8;
  const sky=c.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#0b1429');sky.addColorStop(.55,'#223354');sky.addColorStop(1,'#15273e');c.fillStyle=sky;c.fillRect(0,0,W,H);
  // Distant orbit, moon and starfield.
  c.save();c.strokeStyle='#a7bdd220';c.lineWidth=1;c.beginPath();c.ellipse(920,185,370,110,-.3,0,TAU);c.stroke();c.beginPath();c.ellipse(920,185,410,140,-.3,0,TAU);c.stroke();
  const moon=c.createRadialGradient(925,165,15,925,165,76);moon.addColorStop(0,'#dee0d1');moon.addColorStop(.75,'#9ba6b9');moon.addColorStop(1,'#b1c1d955');c.fillStyle=moon;c.beginPath();c.arc(925,165,66,0,TAU);c.fill();c.fillStyle='#2b3b58';c.beginPath();c.arc(942,150,57,0,TAU);c.fill();c.restore();
  for(let i=0;i<65;i++){const x=(i*173.71-scroll*.025)%W,y=(i*47.23)%330;c.globalAlpha=.3+(Math.sin(t+i)*.5+.5)*.4;c.fillStyle='#d2e0f0';c.fillRect(x<0?x+W:x,y,i%7===0?2:1,i%7===0?2:1);}c.globalAlpha=1;
  for(let layer=0;layer<3;layer++){
   const size=layer===0?110:layer===1?95:145,par=.06+layer*.12,shift=scroll*par%(size*12);
   for(let i=-12;i<27;i++){
    const xx=i*size-shift,hh=90+((i+120)*71%190)+layer*25,yy=FLOOR-hh+layer*25;
    c.fillStyle=['#15223c','#172c45','#193348'][layer];c.fillRect(xx,yy,size-12,hh+100);
    c.fillStyle=['#1b2c49','#254058','#25465b'][layer];c.fillRect(xx+6,yy+8,size-24,4);
    if(layer===2){for(let row=0;row<8;row++)for(let col=0;col<4;col++){if((i+row+col)%3===0)continue;c.fillStyle=(i+row)%4===0?'#b1a37e35':'#74aacb22';c.fillRect(xx+15+col*24,yy+25+row*25,11,3);}c.fillStyle='#8ebacc33';c.fillRect(xx+size-20,yy+10,2,hh);}
   }
  }
  // Elevated academy platform; visible supports and an emissive edge make gaps legible.
  const ranges=b.mode==='runner'?b.segments.map(s=>({a:s.a-b.travel,b:s.b-b.travel})):[{a:0,b:W}];
  for(const range of ranges){
   const x=Math.max(-30,range.a),right=Math.min(W+30,range.b);if(right<x)continue;
   const floor=c.createLinearGradient(0,FLOOR,0,H);floor.addColorStop(0,'#33495c');floor.addColorStop(.12,'#142a41');floor.addColorStop(1,'#0d1d32');c.fillStyle=floor;c.fillRect(x,FLOOR,right-x,H-FLOOR);
   this.line(x,FLOOR,right,FLOOR,'#90c5d7',3);this.line(x,FLOOR+7,right,FLOOR+7,'#548392',2);this.line(x,FLOOR+36,right,FLOOR+36,'#7294a23a');
   for(let xx=Math.floor((x+b.travel)/110)*110-b.travel;xx<right;xx+=110){if(xx<x)continue;this.line(xx,FLOOR+10,xx-30,H,'#6c8c9c22');c.fillStyle='#bcac7777';c.fillRect(xx+25,FLOOR+17,20,3);}
   c.fillStyle='#0b192c';c.fillRect(x,FLOOR+65,right-x,6);for(let xx=x+10;xx<right;xx+=180){c.strokeStyle='#45647844';c.lineWidth=5;c.beginPath();c.moveTo(xx,FLOOR+72);c.lineTo(xx+60,H);c.stroke();}
  }
  if(b.mode==='fighter'){
   this.line(30,FLOOR-100,30,FLOOR,'#d8b88966',3);this.line(W-30,FLOOR-100,W-30,FLOOR,'#d8b88966',3);
   c.save();c.translate(170,270);c.rotate(-.03);c.strokeStyle='#93b7d144';c.strokeRect(0,0,175,50);c.fillStyle='#adc1d577';c.font='11px system-ui';c.textAlign='left';c.fillText('STELLAR ACADEMY / 02',15,30);c.restore();
  }
  const fog=c.createLinearGradient(0,420,0,FLOOR);fog.addColorStop(0,'#80a5cf00');fog.addColorStop(1,'#8cb1ce10');c.fillStyle=fog;c.fillRect(0,420,W,155);
 }
 character(index,x,y,dir,time,speed=0,attack=false,ghost=false){
  const c=this.c,t=TEACHERS[index],a=this.atlas;if(!a.complete||!a.naturalWidth)return;
  const sw=a.naturalWidth/6,sh=a.naturalHeight,height=205,width=sw/sh*height;
  const moving=speed>50,cycle=time*(speed>700?23:13),bounce=moving?Math.abs(Math.sin(cycle))*5:Math.sin(time*2)*1.2;
  c.save();c.translate(x,y-bounce);c.scale(dir,1);c.rotate(moving?(speed>700?.23:.08):attack?-.13:0);
  if(!ghost){c.save();c.scale(dir,1);c.fillStyle='#0005';c.beginPath();c.ellipse(0,bounce,40,7,0,0,TAU);c.fill();c.restore();}
  if(moving&&!this.reduced){
   const split=.65;c.drawImage(a,index*sw,0,sw,sh*split,-width/2,-height,width,height*split);
   for(let leg=0;leg<2;leg++){
    c.save();c.translate((leg===0?-.2:.2)*width,-height*(1-split));c.rotate(Math.sin(cycle+leg*Math.PI)*.18);
    c.drawImage(a,index*sw+leg*sw/2,sh*split,sw/2,sh*(1-split),-width/4,0,width/2,height*(1-split));c.restore();
   }
  }else c.drawImage(a,index*sw,0,sw,sh,-width/2,-height,width,height);
  c.restore();
  if(attack&&!ghost){c.save();c.translate(x+dir*50,y-90);this.glow(t.color,14);this.line(-dir*15,30,dir*75,-50,t.color,3);c.restore();}
 }
 enemy(e,b){
  const c=this.c,x=e.x,y=e.y,scale=e.boss?1.65:1,drone=e.type==='drone';
  if(e.wind>0&&e.boss&&e.attackKind%2===1){c.save();c.globalAlpha=.3+.2*Math.sin(b.time*25);c.fillStyle='#eb789b';c.fillRect(e.targetX-115,FLOOR-10,230,10);this.line(e.targetX-115,FLOOR,e.targetX-115,FLOOR-180,'#ef92af66',2);this.line(e.targetX+115,FLOOR,e.targetX+115,FLOOR-180,'#ef92af66',2);c.restore();}
  c.save();c.translate(x,y);c.scale(scale,scale);if(drone)c.translate(0,Math.sin(b.time*5+x)*9);
  c.fillStyle='#0005';c.beginPath();c.ellipse(0,0,30,6,0,0,TAU);c.fill();
  const armor=e.flash>0?'#ddd7ed':e.boss?'#4b3e59':e.type==='ranged'?'#3b5069':'#3b485e';const glow=e.boss?'#e7aa93':e.type==='ranged'?'#91bade':'#d199b7';
  if(!drone){
   const step=Math.sin(b.time*9+x)*5;c.fillStyle='#1b263c';c.fillRect(-21,-38,14,34+step*.4);c.fillRect(7,-38,14,34-step*.4);c.fillStyle='#657288';c.fillRect(-25,-8,24,8);c.fillRect(3,-8,24,8);
  }
  c.fillStyle=armor;c.strokeStyle='#758099';c.lineWidth=1.5;c.beginPath();c.moveTo(-29,-92);c.lineTo(20,-98);c.lineTo(33,-66);c.lineTo(23,-36);c.lineTo(-23,-36);c.lineTo(-34,-63);c.closePath();c.fill();c.stroke();
  c.fillStyle='#18273d';c.fillRect(-17,-121,34,28);c.strokeStyle='#8292a5';c.strokeRect(-17,-121,34,28);c.save();this.glow(glow,10);c.fillStyle=glow;c.fillRect(-12,-111,24,4);c.beginPath();c.moveTo(0,-81);c.lineTo(9,-68);c.lineTo(0,-54);c.lineTo(-9,-68);c.closePath();c.fill();c.restore();
  c.fillStyle=armor;c.fillRect(-46,-89,16,36);c.fillRect(30,-89,16,36);c.fillStyle='#8b96a4';c.fillRect(-47,-57,18,8);c.fillRect(29,-57,18,8);
  if(e.boss){c.strokeStyle='#b39bb5';c.lineWidth=2;c.beginPath();c.moveTo(-22,-120);c.lineTo(-32,-145);c.lineTo(-6,-128);c.moveTo(22,-120);c.lineTo(32,-145);c.lineTo(6,-128);c.stroke();}
  if(e.wind>0){c.save();this.glow('#ffb197',16);c.strokeStyle='#ffb197';c.lineWidth=2;c.beginPath();c.arc(0,-76,53,0,TAU);c.stroke();c.fillStyle='#f7c3a0';c.font='bold 23px system-ui';c.textAlign='center';c.fillText('!',0,-145);c.restore();}
  if(!e.boss&&e.hp<e.maxHp){c.fillStyle='#172236';c.fillRect(-25,-139,50,3);c.fillStyle=glow;c.fillRect(-25,-139,50*Math.max(0,e.hp/e.maxHp),3);}
  c.restore();
 }
 slash(s){const c=this.c,alpha=s.life/s.max;c.save();c.translate(s.x,s.y);c.scale(s.dir,1);c.globalAlpha=alpha;this.glow(s.color,20);c.strokeStyle=s.color;c.lineWidth=9*alpha;c.beginPath();const angle=s.pose===1?.4:-.3;c.ellipse(0,0,76,90,angle,-1.3,1.3);c.stroke();c.strokeStyle='#fff4ee';c.lineWidth=2;c.stroke();c.globalAlpha=alpha*.18;c.fillStyle=s.color;c.beginPath();c.moveTo(-40,0);c.lineTo(50,-80);c.lineTo(95,0);c.lineTo(40,80);c.closePath();c.fill();c.restore();}
 bullet(b,game){const c=this.c,color=b.owner==='player'?game.teacher.color:'#f49eaf';c.save();this.glow(color,b.owner==='player'?18:12);c.translate(b.x,b.y);c.rotate(Math.atan2(b.vy,b.vx));c.fillStyle=color;if(b.owner==='player'){c.beginPath();c.moveTo(b.r*2.4,0);c.lineTo(0,-b.r*.6);c.lineTo(-b.r*2.5,0);c.lineTo(0,b.r*.6);c.closePath();c.fill();this.line(-b.r*3.5,0,b.r,0,'#fff6f0',2);}else{c.beginPath();c.arc(0,0,b.r,0,TAU);c.fill();c.fillStyle='#ffe3ec';c.beginPath();c.arc(0,0,b.r*.4,0,TAU);c.fill();}c.restore();}
 field(f,b){
  const c=this.c,t=b.time,color=f.kind==='enemy'?'#ec94ab':b.teacher.color;const alpha=Math.min(1,f.life*2);c.save();c.globalAlpha=.35*alpha;this.glow(color,25);c.fillStyle=color;
  c.beginPath();c.ellipse(f.x,FLOOR-6,f.r,22,0,0,TAU);c.fill();c.strokeStyle=color;c.lineWidth=2;
  for(let i=0;i<3;i++){c.beginPath();c.ellipse(f.x,FLOOR-10-i*15,f.r*(.65+i*.12),25+i*15,0,0,TAU);c.stroke();}
  if(f.kind==='gravity'){for(let i=0;i<8;i++){const a=i/8*TAU+t*3,r=f.r*(.4+.3*Math.sin(t*2+i));c.beginPath();c.arc(f.x+Math.cos(a)*r,FLOOR-80+Math.sin(a)*45,3,0,TAU);c.fill();}}
  else if(f.kind==='vine'){for(let i=0;i<6;i++){const x=f.x-f.r+i*f.r/3;c.beginPath();c.moveTo(x,FLOOR);c.bezierCurveTo(x+35,FLOOR-70,x-40,FLOOR-120,x+Math.sin(t*4+i)*30,FLOOR-170);c.stroke();}}
  else if(f.kind==='field'){for(let i=0;i<7;i++){const a=i*2.4+t*2;c.beginPath();c.arc(f.x+Math.sin(a)*f.r*.8,FLOOR-30-(t*60+i*25)%160,4+i%4,0,TAU);c.stroke();}}
  else if(f.kind==='ultimate'){c.globalAlpha=.3*alpha;c.lineWidth=8;c.beginPath();c.arc(f.x,FLOOR-120,f.r*(1-f.life/f.max),0,TAU);c.stroke();}
  c.restore();
 }
 runnerObjects(b){const c=this.c;for(const o of b.obstacles){const x=o.x-b.travel;if(x<-50||x>W+80)continue;c.save();c.translate(x,FLOOR);if(o.type==='laser'){c.fillStyle='#293f55';c.fillRect(-28,-12,56,12);c.fillRect(-22,-130,44,12);this.glow('#ee8ca5',18);c.fillStyle='#f2a0bbaa';c.fillRect(-5,-119,10,107);this.line(0,-120,0,0,'#ffe0eb',3);}else{c.fillStyle='#334458';c.strokeStyle='#c4998b';c.lineWidth=2;c.fillRect(-28,-66,56,66);c.strokeRect(-28,-66,56,66);this.line(-22,-59,22,-7,'#b9818799',3);this.line(22,-59,-22,-7,'#b9818799',3);c.fillStyle='#e9b29b';c.fillRect(-7,-42,14,4);}c.restore();}for(const p of b.pickups){const x=p.x-b.travel;c.save();c.translate(x,p.y+Math.sin(b.time*4+x)*6);c.rotate(Math.PI/4);this.glow('#ecd494',15);c.fillStyle='#ebcc84';c.fillRect(-8,-8,16,16);c.strokeStyle='#fff1bd';c.strokeRect(-11,-11,22,22);c.restore();}}
 bossHud(e){const c=this.c;c.save();c.textAlign='center';c.fillStyle='#dfc5bd';c.font='11px system-ui';c.fillText('终考执行者 · THE FINAL EXAM',this.viewW/2,106);c.fillStyle='#101a2d';c.fillRect(this.viewW/2-220,118,440,5);c.fillStyle='#d7999f';c.fillRect(this.viewW/2-220,118,440*Math.max(0,e.hp/e.maxHp),5);c.restore();}
 progress(b){const c=this.c;c.save();c.fillStyle='#b8ac98';c.font='10px system-ui';c.textAlign='center';c.fillText(`${Math.floor(b.distance)} / 1000 m`,this.viewW/2,106);c.fillStyle='#99b5c933';c.fillRect(this.viewW/2-170,117,340,2);c.fillStyle='#d9c68d';c.fillRect(this.viewW/2-170,117,340*Math.min(1,b.distance/1000),2);c.restore();}
 cutIn(b){
  const c=this.c,p=b.player,alpha=Math.min(1,b.cutIn*3);c.save();c.globalAlpha=alpha;
  const grad=c.createLinearGradient(0,220,W,500);grad.addColorStop(0,'#0c1324f0');grad.addColorStop(.6,`${b.teacher.glow}`);grad.addColorStop(1,'#0c1324d9');c.fillStyle=grad;c.fillRect(0,200,W,320);this.line(0,200,W,200,b.teacher.color,2);this.line(0,520,W,520,b.teacher.color,2);
  const a=this.atlas;if(a.complete&&a.naturalWidth){const sw=a.naturalWidth/6;c.drawImage(a,b.character*sw,0,sw,a.naturalHeight*.58,200,200,245,320);}
  c.textAlign='left';c.fillStyle=b.teacher.color;c.font='12px system-ui';c.fillText(`${b.teacher.subject} / ULTIMATE RELEASE`,540,300);c.fillStyle='#f6e8d2';c.font='600 49px system-ui';c.fillText(b.teacher.ult,540,375);c.fillStyle='#a1acbc';c.font='14px system-ui';c.fillText(`${b.teacher.name} · ${b.teacher.title}`,544,420);c.restore();
 }
}

// CSS rotation is the fallback when a browser cannot lock the device orientation.
function battleViewport(width,height,mobile){
 const rotated=mobile&&height>width;
 return {rotated,width:rotated?height:width,height:rotated?width:height};
}
async function requestBattleLandscape(element,screenObject=globalThis.screen){
 let fullscreen=false,locked=false;
 try{if(!document.fullscreenElement&&element.requestFullscreen){await element.requestFullscreen({navigationUI:'hide'});fullscreen=true;}else fullscreen=!!document.fullscreenElement;}catch{}
 try{if(screenObject?.orientation?.lock){await screenObject.orientation.lock('landscape');locked=true;}}catch{}
 return {fullscreen,locked};
}

const $=id=>document.getElementById(id);
const atlas=new Image();atlas.src='teachers-atlas.png';
const canvas=$('actionCanvas');let renderer=null,battle=null,mode='fighter',selected=0,last=0,noticeEnd=0,gameRAF=0,soundOn=false,audio=null,enteringDisplay=false,skillHelpWasPaused=false;
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
 cancelAnimationFrame(gameRAF);battle=new Battle(mode,selected);input.left=input.right=input.attack=false;$('lobby').hidden=true;document.querySelector('.nav').classList.add('playing');$('playScreen').hidden=false;document.body.classList.add('battle-active');syncBattleLayout();$('pausePanel').hidden=true;$('resultPanel').hidden=true;
 $('playMode').textContent=mode==='fighter'?'六师对决 / 实战教室':'星轨疾行 / 千米突围';$('hudName').textContent=`${TEACHERS[selected].name} · ${TEACHERS[selected].subject}`;configureAbilityIcons();theme($('hudPortrait'),TEACHERS[selected],selected);
 $('controlHint').textContent=mode==='fighter'?'A / D 移动 · 空格双段跳 · J 普攻 · K 闪避 · E 技能一 · R 技能二 · Q 终结技 · P 暂停':'自动前进 · 空格双段跳 · J 射击 · K 冲刺破障 · E 技能清场 · R 技能二 · Q 终结技 · P 暂停';
 document.querySelector('.direction-pad').style.opacity=mode==='runner'?'.25':'1';$('pauseButton').textContent='暂停 Ⅱ';updateAudioButton();renderer=new Renderer(canvas,atlas);window.scrollTo({top:0,behavior:'instant'});canvas.focus({preventScroll:true});last=performance.now();unlockAudio();enterDisplay();renderHud();gameRAF=requestAnimationFrame(frame);
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
 input.left=input.right=input.attack=false;const b=battle;
 $('resultKicker').textContent=b.won?'MISSION COMPLETE':'MISSION RETRY';$('resultTitle').textContent=b.won?(mode==='runner'?'千米突围，完成！':'这一课，满分收官！'):'再来一次，就会更强。';
 const value=mode==='fighter'?b.score:b.distance,previous=Number(records[mode])||0;if(value>previous){records[mode]=value;try{localStorage.setItem('stellar-academy-records-v1',JSON.stringify(records));}catch{toast('浏览器存储不可用，本次纪录未保存');}}
 $('resultStats').textContent=mode==='fighter'?`得分 ${b.score} · 击败 ${b.kills} · 最高 ${b.maxCombo} 连击${value>previous?' · 新纪录！':''}`:`距离 ${Math.floor(b.distance)}米 · 得分 ${b.score}${value>previous?' · 新纪录！':''}`;$('resultPanel').hidden=false;updateRecords();
}
function pause(force){if(!battle||battle.finished||$('skillDialog').open)return;battle.paused=typeof force==='boolean'?force:!battle.paused;input.left=input.right=input.attack=false;$('pausePanel').hidden=!battle.paused;$('pauseButton').textContent=battle.paused?'继续 ▶':'暂停 Ⅱ';last=performance.now();}
function exit(){cancelAnimationFrame(gameRAF);battle=null;input.left=input.right=input.attack=false;$('playScreen').hidden=true;document.body.classList.remove('battle-active','battle-mobile','battle-rotated');releaseDisplay();$('lobby').hidden=false;document.querySelector('.nav').classList.remove('playing');$('battleNotice').classList.remove('show');updateRecords();$('games').scrollIntoView({behavior:'instant'});}
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
window.addEventListener('blur',()=>{if(battle&&!battle.finished&&!enteringDisplay)pause(true);});document.addEventListener('visibilitychange',()=>{if(document.hidden&&battle&&!battle.finished)pause(true);});
function isMobileLayout(){return (Math.min(innerWidth,innerHeight)<=600&&Math.max(innerWidth,innerHeight)<=1100) || (matchMedia('(pointer:coarse)').matches&&Math.min(innerWidth,innerHeight)<=900);}
function syncBattleLayout(){
 if(!battle)return;
 const width=window.visualViewport?.width||innerWidth,height=window.visualViewport?.height||innerHeight;
 const mobile=isMobileLayout(),view=battleViewport(width,height,mobile);
 document.body.classList.toggle('battle-mobile',mobile);document.body.classList.toggle('battle-rotated',view.rotated);
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
window.addEventListener('resize',syncBattleLayout);window.visualViewport?.addEventListener('resize',syncBattleLayout);
window.addEventListener('orientationchange',()=>{if(battle){input.left=input.right=input.attack=false;syncBattleLayout();}});
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
 if(!battle)return;skillHelpWasPaused=battle.paused;input.left=input.right=input.attack=false;battle.paused=true;
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

})();
