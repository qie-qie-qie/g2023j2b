const {readFileSync}=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
function boot(seed={}) {
 const data=new Map(Object.entries(seed)), elements=new Map(),frames=[];
 class Element {
  constructor(id){this.id=id;this.hidden=['overlay','pauseOverlay'].includes(id);this.listeners={};this.style={};this.classList={add(){},remove(){}};this.textContent='';this.value='';this.open=false;}
  addEventListener(k,cb){(this.listeners[k]??=[]).push(cb);}
  setAttribute(){} append(){} replaceChildren(...c){this.children=c;} focus(){} getBoundingClientRect(){return {width:480,height:720,left:0};}
  getContext(){return new Proxy({measureText:()=>({width:100})},{get:(t,k)=>t[k]||(()=>{})});}
  showModal(){this.open=true;}close(){this.open=false;for(const cb of this.listeners.close||[])cb();}
 }
 const document={hidden:false,getElementById(id){if(!elements.has(id))elements.set(id,new Element(id));return elements.get(id);},createElement:()=>new Element(''),querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){}};
 const window={devicePixelRatio:2,addEventListener(){}};
 const ctx={console,document,window,Image:class{},localStorage:{getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)},location:{hostname:'localhost',search:'?test'},URLSearchParams,performance:{now:()=>0},matchMedia:()=>({matches:false}),setTimeout:()=>0,clearTimeout(){},requestAnimationFrame:cb=>frames.push(cb),AbortSignal,fetch:()=>Promise.reject(Error('Offline')),Math};
 vm.runInNewContext(readFileSync('game.js','utf8'),ctx);
 return {...window.__gameTest,data,elements,step(ms){const cb=frames.shift();cb(ms);}};
}
let passed=0;
function test(name,fn){fn();console.log('PASS',name);passed++;}
const ball=(tier,x,y,vx=0,vy=0)=>({tier,x,y,vx,vy,r:[18,25,33,42,52,64,79,95,112][tier],age:3,born:0});
test('all eight upgrades, score increments, and highest tier celebrations',()=>{
 for(let t=0;t<8;t++){
  const g=boot();g.state.balls=[ball(t,200,500),ball(t,200,500)];g.physics(1/120);
  assert.equal(g.state.balls.length,1);assert.equal(g.state.balls[0].tier,t+1);
  assert.equal(g.state.score,g.TIERS[t].score+g.TIERS[t+1].score);
  if(t===6)assert.ok(g.state.messages.some(x=>x.text==='母校建校20周年快乐'));
  if(t===7)assert.ok(g.state.messages.some(x=>x.text==='永远的高2023级2班'));
 }
});
test('different tiers separate without merging, including coincident centers',()=>{
 const g=boot();g.state.balls=[ball(0,240,400),ball(1,240,400)];g.physics(1/120);
 assert.equal(g.state.balls.length,2);assert.equal(g.state.score,0);
 const [a,b]=g.state.balls;assert.ok(Math.hypot(a.x-b.x,a.y-b.y)>=a.r+b.r-.01);
});
test('final tier never advances beyond the tier array',()=>{
 const g=boot();g.state.balls=[ball(8,160,500),ball(8,250,500)];for(let i=0;i<120;i++)g.physics(1/120);
 assert.equal(g.state.balls.length,2);assert.equal(g.state.score,0);
});
test('drop cooldown prevents rapid input and unlocks in simulation time',()=>{
 const g=boot();g.drop();g.drop();assert.equal(g.state.balls.length,1);assert.equal(g.state.canDrop,false);
 for(let t=20;t<=400;t+=20)g.step(t);assert.equal(g.state.canDrop,true);
});
test('pause blocks drops and resume restores gameplay',()=>{
 const g=boot();g.togglePause();assert.equal(g.state.running,false);g.drop();assert.equal(g.state.balls.length,0);
 g.togglePause();g.drop();assert.equal(g.state.balls.length,1);
});
test('newly dropped balls receive danger grace; sustained overflow ends the round',()=>{
 const g=boot(),b=ball(1,200,90);b.age=.1;g.state.balls=[b];
 for(let i=0;i<300;i++)g.updateDanger(1/120);assert.equal(g.state.running,true);
 b.age=3;for(let i=0;i<250;i++)g.updateDanger(1/120);
 assert.equal(g.state.running,false);assert.equal(g.elements.get('overlay').hidden,false);assert.equal(g.data.has('class-merge-progress-v2'),false);
});
test('normal falling ball clears the danger line and remains within boundaries',()=>{
 const g=boot();g.state.balls=[ball(0,-100,74,0,0)];g.state.balls[0].age=0;
 for(let i=0;i<600;i++){g.physics(1/120);g.updateDanger(1/120);}
 const b=g.state.balls[0];assert.ok(b.x>=18+b.r);assert.ok(b.y<=698-b.r);assert.equal(g.state.running,true);
});
test('save and restore recover board, score and preview',()=>{
 const g=boot();g.state.balls=[ball(3,250,500)];g.state.score=72;g.state.current=2;g.state.next=1;g.saveProgress();
 const h=boot(Object.fromEntries(g.data));assert.equal(h.state.score,72);assert.equal(h.state.balls.length,1);assert.equal(h.state.balls[0].tier,3);assert.equal(h.state.next,1);
});
test('corrupt storage falls back to a clean playable board',()=>{
 for(const bad of ['{broken',JSON.stringify({version:2,balls:[],current:99,next:0,score:0})]){
  const g=boot({'class-merge-progress-v2':bad});assert.equal(g.state.running,true);assert.equal(g.state.balls.length,0);assert.equal(g.state.score,0);
 }
});
test('dense mixed stacks remain finite during prolonged simulation',()=>{
 const g=boot();g.state.balls=Array.from({length:45},(_,i)=>ball(i%5,50+(i%7)*60,200+Math.floor(i/7)*50));
 for(let i=0;i<1800;i++)g.physics(1/120);
 assert.ok(g.state.balls.every(b=>[b.x,b.y,b.vx,b.vy].every(Number.isFinite)));assert.ok(g.state.balls.every(b=>b.x-b.r>=18-.01&&b.x+b.r<=462+.01&&b.y+b.r<=698+.01));
});
console.log(`${passed} engine regression tests passed.`);
