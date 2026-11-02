import test from 'node:test';
import assert from 'node:assert/strict';
import {Renderer} from '../battle-renderer.mjs';
import {layoutViewport,canvasBackingSize,installBattleGestureGuard} from '../mobile-layout.mjs';

test('rotated canvas uses local dimensions and keeps physical X/Y scale equal',()=>{
 const oldMatch=globalThis.matchMedia,oldRatio=globalThis.devicePixelRatio;
 globalThis.matchMedia=()=>({matches:false});globalThis.devicePixelRatio=2;
 try{
  let transform;
  const context={setTransform(...args){transform=args;},fillRect(){}};
  const canvas={clientWidth:844,clientHeight:354,width:0,height:0,getContext:()=>context,getBoundingClientRect:()=>({width:354,height:844})};
  const r=new Renderer(canvas,{});assert.equal(canvas.width,1688);assert.equal(canvas.height,708);
  r.begin({player:{x:380}});
  const physicalX=transform[0]*canvas.clientWidth/canvas.width,physicalY=transform[3]*canvas.clientHeight/canvas.height;
  assert.ok(Math.abs(physicalX-physicalY)<1e-9,'circles and characters must not stretch');
  canvas.getBoundingClientRect=()=>({width:844,height:354});r.resize();assert.equal(canvas.width,1688);assert.equal(canvas.height,708);
  canvas.clientWidth=667;canvas.clientHeight=339;r.resize();assert.equal(canvas.width,1334);assert.equal(canvas.height,678);
 }finally{globalThis.matchMedia=oldMatch;globalThis.devicePixelRatio=oldRatio;}
});
test('hidden canvases do not allocate invalid or growing backing buffers',()=>{
 assert.equal(canvasBackingSize(0,354,2),null);assert.equal(canvasBackingSize(844,NaN,2),null);assert.deepEqual(canvasBackingSize(844,354,3),{width:1688,height:708});
});
test('browser zoom cannot recursively shrink or rotate the game layout',()=>{
 assert.deepEqual(layoutViewport(390,844,{width:195,height:422,scale:2}),{width:390,height:844});
 assert.deepEqual(layoutViewport(390,844,{width:390,height:750,scale:1}),{width:390,height:750});
 assert.deepEqual(layoutViewport(844,390,{width:844,height:354,scale:1}),{width:844,height:354});
});
function gestureFixture(){
 const listeners=new Map();let active=true;
 const surface={addEventListener(name,handler,options){assert.equal(options.passive,false);listeners.set(name,handler);},removeEventListener(name){listeners.delete(name);}};
 const clean=installBattleGestureGuard(surface,()=>active);
 function emit(type,{time=100,x=80,y=50,touches=[],dialog=false,cancelable=true}={}){
  const e={timeStamp:time,changedTouches:[{clientX:x,clientY:y}],touches,target:{closest:()=>dialog?{}:null},cancelable,blocked:false,preventDefault(){this.blocked=true;}};
  listeners.get(type)?.(e);return e;
 }
 return {emit,listeners,clean,deactivate(){active=false;}};
}
test('rapid repeated touch taps block browser zoom but preserve the first normal tap',()=>{
 const f=gestureFixture();assert.equal(f.emit('touchend',{time:100}).blocked,false);assert.equal(f.emit('touchend',{time:230}).blocked,true);assert.equal(f.emit('touchend',{time:300}).blocked,true);assert.equal(f.emit('touchend',{time:900}).blocked,false);assert.equal(f.emit('touchend',{time:1000,x:200}).blocked,false);
});
test('gesture guard covers Safari zoom without consuming pointer events or one-finger scrolling',()=>{
 const f=gestureFixture();assert.equal(f.emit('dblclick').blocked,true);assert.equal(f.emit('gesturestart').blocked,true);assert.equal(f.emit('gesturechange').blocked,true);assert.equal(f.emit('touchmove',{touches:[{},{}]}).blocked,true);assert.equal(f.emit('touchmove',{touches:[{}]}).blocked,false);assert.equal(f.listeners.has('pointerdown'),false);assert.equal(f.listeners.has('pointerup'),false);
});
test('normal page navigation, skill descriptions and noncancelable events stay usable',()=>{
 const f=gestureFixture();assert.equal(f.emit('dblclick',{dialog:true}).blocked,false);assert.equal(f.emit('gesturestart',{cancelable:false}).blocked,false);f.deactivate();assert.equal(f.emit('dblclick').blocked,false);f.clean();assert.equal(f.listeners.size,0);
});
