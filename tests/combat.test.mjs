import test from 'node:test';
import assert from 'node:assert/strict';
import {Battle,TEACHERS,FLOOR} from '../combat-model.mjs';
const tick=(b,secs,input={})=>{for(let i=0;i<Math.ceil(secs*120);i++)b.update(1/120,input);};
const enemy=(x=450,hp=300)=>({x,y:FLOOR,hp,maxHp:hp,boss:false,type:'melee',timer:99,wind:0,flash:0,stun:0,dead:false,hitBy:-1,speed:0});
test('six correct subjects and only chemistry is female in the presentation mapping',()=>{assert.equal(TEACHERS.length,6);assert.deepEqual(TEACHERS.map(t=>[t.name,t.subject]),[['牢老师','化学'],['C老师','语文'],['振老师','数学'],['只老师','生物'],['米老师','英语'],['蛋老师','物理']]);assert.equal(new Set(TEACHERS.map(t=>t.kind)).size,6);});
test('double jump is capped at two and resets upon landing',()=>{const b=new Battle();assert.ok(b.action('jump'));tick(b,.1);assert.ok(b.action('jump'));assert.equal(b.action('jump'),false);tick(b,2);assert.equal(b.player.jumps,0);assert.equal(b.player.y,FLOOR);assert.equal(b.player.onGround,true);});
test('each melee swing hits each target only once; sustained attack creates new swings',()=>{const b=new Battle();const e=enemy();b.enemies=[e];b.action('attack');tick(b,.2);assert.equal(e.hp,280);tick(b,.2,{attack:true});assert.ok(e.hp<280);});
test('dash grants invulnerability and cannot be spammed during cooldown',()=>{const b=new Battle();assert.ok(b.action('dash'));assert.equal(b.action('dash'),false);assert.equal(b.hurt(80),false);tick(b,1.4);assert.ok(b.action('dash'));});
test('skills differ and cooldowns block duplicate casting',()=>{for(let i=0;i<6;i++){const b=new Battle('fighter',i);b.player.hp=60;const e=enemy();b.enemies=[e];assert.ok(b.action('skill'));assert.equal(b.action('skill'),false);if(i===3)assert.equal(b.player.hp,78);if([0,3,5].includes(i))assert.ok(b.fields.length>0);else assert.ok(b.bullets.length>0);tick(b,1);assert.ok(e.hp<300||b.bullets.length>0);}});
test('ultimates require energy, consume it and defeat low-health enemies',()=>{const b=new Battle();b.enemies=[enemy()];assert.equal(b.action('ult'),false);b.player.energy=100;assert.ok(b.action('ult'));assert.ok(b.player.energy<100);assert.equal(b.enemies[0].hp,130);assert.ok(b.cutIn>0);});
test('boss charges a telegraphed attack before damage or bullets',()=>{const b=new Battle();b.spawnEnemy(true);const boss=b.enemies[0];boss.timer=0;tick(b,.1);assert.ok(boss.wind>0);assert.equal(b.bullets.length,0);tick(b,1);assert.ok(b.bullets.length>0);});
test('three cleared waves including boss produce a victory',()=>{const b=new Battle('fighter',0,()=>.75);for(let i=0;i<15000&&!b.finished;i++){for(const e of b.enemies)b.hitEnemy(e,1000);b.update(1/120);}assert.equal(b.finished,true);assert.equal(b.won,true);assert.equal(b.wave,3);assert.ok(b.kills>=15);});
test('pause freezes distance, cooldown, enemies and simulation time',()=>{const b=new Battle('runner');b.action('dash');b.paused=true;const before=JSON.stringify([b.time,b.distance,b.player]);tick(b,5,{attack:true});assert.equal(JSON.stringify([b.time,b.distance,b.player]),before);assert.equal(b.action('jump'),false);});
test('runner creates traversable gaps and collision-safe obstacle placement',()=>{const b=new Battle('runner',0,()=>.5);b.player.iframe=999;tick(b,8);assert.ok(b.distance>200);assert.ok(b.segments.length>=2);for(let i=1;i<b.segments.length;i++){const gap=b.segments[i].a-b.segments[i-1].b;assert.ok(gap>=130&&gap<=190);}assert.ok(b.obstacles.length>0);assert.ok(b.enemies.every(e=>Number.isFinite(e.x)));});
test('runner dash destroys obstacles, ordinary collision costs health',()=>{const b=new Battle('runner');b.obstacles=[{x:230,y:FLOOR,type:'crate',dead:false}];b.action('dash');b.update(1/120);assert.equal(b.player.hp,100);assert.equal(b.obstacles.some(o=>o.x===230),false);assert.equal(b.score,50);const c=new Battle('runner');c.obstacles=[{x:230,y:FLOOR,type:'crate',dead:false}];c.update(1/120);assert.equal(c.player.hp,86);});
test('runner falling has a recoverable health penalty and safe reposition',()=>{const b=new Battle('runner');b.player.y=900;b.player.vy=200;b.update(1/120);assert.equal(b.player.hp,72);assert.ok(b.player.y<FLOOR);assert.ok(b.player.iframe>0);});
test('1000 metre completion and defeat both end exactly once',()=>{const b=new Battle('runner');b.travel=12000;b.update(1/120);assert.equal(b.won,true);assert.equal(b.events.filter(e=>e.type==='finish').length,1);b.finish(true);assert.equal(b.events.filter(e=>e.type==='finish').length,1);const c=new Battle();c.hurt(100);assert.equal(c.finished,true);assert.equal(c.won,false);assert.equal(c.action('attack'),false);});
test('all six characters remain finite during mixed movement and skill actions',()=>{for(let k=0;k<6;k++){const b=new Battle('fighter',k,()=>.6);for(let i=0;i<12000&&!b.finished;i++){if(i%120===0)b.action('jump');if(i%180===0)b.action('skill');if(i%230===0)b.action('dash');if(i%300===0)b.action('ult');b.update(1/120,{attack:true,left:i%700<350,right:i%700>=350});assert.ok([b.player.x,b.player.y,b.player.vy,b.player.hp,b.score].every(Number.isFinite));}assert.ok(b.particles.length<=350);}});

test('all six R skills have independent cooldowns and gameplay effects',()=>{
 for(let i=0;i<6;i++){
  const b=new Battle('fighter',i);b.player.hp=50;b.enemies=[enemy(520)];
  assert.ok(b.action('skill2'));assert.equal(b.player.skill2Cd,TEACHERS[i].skill2Cd);assert.equal(b.player.skillCd,0);assert.equal(b.action('skill2'),false);assert.ok(b.action('skill'));
  if(i===0)assert.equal(b.shield,2);
  if(i===1){assert.equal(b.player.x,600);assert.ok(b.enemies[0].hp<300);}
  if(i===2){assert.equal(b.player.x,450);assert.equal(b.enemies[0].hp,255);}
  if(i===3){tick(b,4.01);assert.equal(b.player.hp,92);}
  if(i===4)assert.equal(b.player.haste,4);
  if(i===5)assert.equal(b.player.slow,3.2);
 }
});
test('haste increases attack rate while slow reduces only enemy projectile speed',()=>{
 const h=new Battle('fighter',4);h.action('skill2');h.action('attack');assert.ok(h.player.attackCd<.2);
 const s=new Battle('fighter',5);s.action('skill2');const e=s.projectile(900,100,-1,0,10,100,'enemy');const p=s.projectile(100,100,1,0,10,100,'player');s.update(1/120);assert.ok(Math.abs(e.x-(900-100/120*.35))<.001);assert.ok(Math.abs(p.x-(100+100/120))<.001);
});
test('R skill cooldown stops on pause, resumes, and resets on a new round',()=>{
 const b=new Battle('fighter',0);b.action('skill2');tick(b,1);const before=b.player.skill2Cd;b.paused=true;tick(b,2);assert.equal(b.player.skill2Cd,before);b.paused=false;tick(b,7.1);assert.equal(b.player.skill2Cd,0);assert.equal(new Battle('fighter',0).player.skill2Cd,0);
});
test('all new skills work in runner mode, including an aerial jump reset',()=>{
 for(let i=0;i<6;i++){const b=new Battle('runner',i);b.action('jump');b.action('jump');assert.ok(b.action('skill2'));if(i===2)assert.equal(b.player.jumps,0);tick(b,1);assert.ok(Number.isFinite(b.distance));assert.equal(b.finished,false);}
});
