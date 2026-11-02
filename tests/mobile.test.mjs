import test from 'node:test';
import assert from 'node:assert/strict';
import {Battle,abilityState} from '../combat-model.mjs';
import {battleViewport,requestBattleLandscape} from '../mobile-layout.mjs';
test('portrait mobile rotates the layout, physical landscape removes the transform',()=>{assert.deepEqual(battleViewport(390,844,true),{rotated:true,width:844,height:390});assert.deepEqual(battleViewport(844,390,true),{rotated:false,width:844,height:390});assert.equal(battleViewport(600,900,false).rotated,false);});
test('cooldown icon state counts down with precision, pause blocks readiness and energy gates Q',()=>{
 const b=new Battle('fighter',0);b.action('skill2');let s=abilityState(b,'skill2');assert.equal(s.text,'8.0');assert.equal(s.ready,false);assert.equal(s.progress,0);
 b.update(.04);s=abilityState(b,'skill2');assert.ok(s.progress>0);assert.equal(s.text,'8.0');b.player.skill2Cd=.001;assert.equal(abilityState(b,'skill2').text,'0.1');b.player.skill2Cd=0;assert.equal(abilityState(b,'skill2').ready,true);b.paused=true;assert.equal(abilityState(b,'skill2').ready,false);b.paused=false;b.player.energy=100;assert.equal(abilityState(b,'ult').ready,true);b.action('jump');b.action('jump');assert.equal(abilityState(b,'jump').ready,false);
});
test('fullscreen or orientation rejection falls back without throwing',async()=>{
 globalThis.document={fullscreenElement:null};
 const r=await requestBattleLandscape({requestFullscreen:async()=>{throw Error('requires user activation');}},{orientation:{lock:async()=>{throw Error('not supported');}}});assert.deepEqual(r,{fullscreen:false,locked:false});
 const absent=await requestBattleLandscape({},{});assert.deepEqual(absent,{fullscreen:false,locked:false});
});
test('supported full screen is requested before orientation locking',async()=>{
 const calls=[];globalThis.document={fullscreenElement:null};const r=await requestBattleLandscape({requestFullscreen:async()=>{calls.push('fullscreen');}},{orientation:{lock:async type=>{calls.push(type);}}});assert.deepEqual(calls,['fullscreen','landscape']);assert.deepEqual(r,{fullscreen:true,locked:true});
});
