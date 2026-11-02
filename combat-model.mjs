export const TEACHERS=[
 {id:'lao',name:'牢老师',subject:'化学',title:'紫晶炼金师',color:'#c29af1',glow:'#6c43803d',skill:'炼金爆破',ult:'元素大反应',desc:'以炼金药剂制造范围爆破，残留的反应场会持续灼烧敌人。',kind:'field',skill2:'催化护盾',icon2:'盾',skill2Cd:8,desc2:'展开2秒无敌护盾，震退附近敌人并造成30点伤害。',kind2:'shield',damage:25},
 {id:'c',name:'C老师',subject:'语文',title:'墨刃执笔人',color:'#e4c38b',glow:'#8b73413d',skill:'笔落惊风',ult:'一剑开篇',desc:'挥笔放出穿透墨刃。射程长，适合用连续剑气压制敌群。',kind:'ink',skill2:'横扫千军',icon2:'笔',skill2Cd:7,desc2:'向前突进220距离，斩击沿途敌人造成60点伤害；跑酷中转为短冲刺。',kind2:'sweep',damage:28},
 {id:'zhen',name:'振老师',subject:'数学',title:'几何裁决者',color:'#89ccef',glow:'#3c71943d',skill:'三角裁决',ult:'无限极限',desc:'三枚几何光刃沿不同角度飞行，近身时能够打出集中爆发。',kind:'prism',skill2:'坐标置换',icon2:'△',skill2Cd:8,desc2:'闪现到前方敌人身侧并造成45点伤害；跑酷中重置双跳并向上跃起。',kind2:'blink',damage:20},
 {id:'zhi',name:'只老师',subject:'生物',title:'森域守望者',color:'#a6d886',glow:'#507e3d3d',skill:'生命蔓延',ult:'万物复苏',desc:'藤蔓缠住附近敌人，同时恢复自身生命。适合持续作战。',kind:'vine',skill2:'共生护佑',icon2:'叶',skill2Cd:10,desc2:'4秒内每0.5秒恢复3点生命，共24点；释放瞬间获得短暂保护。',kind2:'regen',damage:22},
 {id:'mi',name:'米老师',subject:'英语',title:'赤羽咏唱者',color:'#e69d94',glow:'#8c49443d',skill:'飞羽序章',ult:'Final Chapter',desc:'召唤追踪飞羽，自动寻找附近敌人，让空中作战更加从容。',kind:'feather',skill2:'疾风咏唱',icon2:'羽',skill2Cd:9,desc2:'4秒内提高普攻频率和移动速度；跑酷中提高射速与前进速度。',kind2:'haste',damage:18},
 {id:'dan',name:'蛋老师',subject:'物理',title:'引力掌控者',color:'#87aef5',glow:'#3d58933d',skill:'引力坍缩',ult:'万有引力',desc:'展开引力核心，牵引附近敌人并造成伤害，聚怪后再连招。',kind:'gravity',skill2:'时空减速',icon2:'◎',skill2Cd:9,desc2:'3.2秒内让敌人的移动、出招和敌方弹幕降至35%速度，自身不受影响。',kind2:'slow',damage:23}
];
export const W=1280,H=720,FLOOR=575;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export class Battle {
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
export function abilityState(battle,action){
 const p=battle.player,t=battle.teacher;
 if(action==='jump')return {remaining:0,total:0,progress:1,ready:p.jumps<2&&!battle.paused&&!battle.finished,text:`${Math.max(0,2-p.jumps)}跳`};
 const cd={attack:[p.attackCd,p.haste>0?.16:.28],dash:[p.dashCd,1.3],skill:[p.skillCd,5],skill2:[p.skill2Cd,t.skill2Cd]};
 if(action==='ult')return {remaining:0,total:100,progress:p.energy/100,ready:p.energy>=100&&!battle.paused&&!battle.finished,text:p.energy>=100?'就绪':`${Math.floor(p.energy)}%`};
 const [remaining,total]=cd[action]||[0,0];
 return {remaining,total,progress:total?Math.max(0,1-remaining/total):1,ready:remaining<=0&&!battle.paused&&!battle.finished,text:remaining>0?`${(Math.ceil(remaining*10)/10).toFixed(1)}`:'就绪'};
}
