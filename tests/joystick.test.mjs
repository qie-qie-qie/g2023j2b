import test from 'node:test';
import assert from 'node:assert/strict';
import {joystickVector,installJoystick} from '../mobile-layout.mjs';
const rect={left:10,top:20,right:122,width:112,height:112};
test('joystick dead zone, directions and travel clamp',()=>{
 assert.equal(joystickVector(66,76,rect).right,false);
 assert.equal(joystickVector(122,76,rect).right,true);
 assert.equal(joystickVector(10,76,rect).left,true);
 const v=joystickVector(400,400,rect);assert.ok(Math.abs(Math.hypot(v.x,v.y)-1)<1e-9);
});
test('rotated and scaled joystick maps screen down to game right',()=>{
 const r={left:20,top:30,right:100,width:80,height:80};
 assert.equal(joystickVector(60,110,r,true).right,true);
 assert.equal(joystickVector(60,30,r,true).left,true);
 assert.equal(joystickVector(100,70,r,true).left,false);
});
test('one joystick finger owns movement, cancel and reset release it',()=>{
 const events={},styles={},changes=[];let active=true,captured=null;
 const surface={clientWidth:112,style:{setProperty:(k,v)=>styles[k]=v},classList:{add(){},remove(){}},getBoundingClientRect:()=>rect,addEventListener:(n,fn)=>events[n]=fn,setPointerCapture:id=>captured=id,hasPointerCapture:id=>captured===id,releasePointerCapture:()=>captured=null};
 const stick=installJoystick(surface,{isActive:()=>active,isRotated:()=>false,onChange:v=>changes.push(v)});
 const e=(id,x)=>({pointerId:id,clientX:x,clientY:76,preventDefault(){}});
 events.pointerdown(e(1,122));assert.equal(changes.at(-1).right,true);
 events.pointerdown(e(2,10));events.pointerup(e(2,10));assert.equal(changes.at(-1).right,true);
 events.pointermove(e(1,10));assert.equal(changes.at(-1).left,true);
 events.pointercancel(e(1,10));assert.deepEqual(changes.at(-1),{left:false,right:false});assert.equal(captured,null);
 events.pointerdown(e(3,122));active=false;events.pointermove(e(3,122));assert.equal(changes.at(-1).right,false);
 active=true;events.pointerdown(e(4,122));stick.reset();assert.equal(styles['--stick-x'],'0px');assert.equal(captured,null);
});
