// CSS rotation is the fallback when a browser cannot lock the device orientation.
export function battleViewport(width,height,mobile){
 const rotated=mobile&&height>width;
 return {rotated,width:rotated?height:width,height:rotated?width:height};
}
// A zoomed visual viewport must not change the game's layout dimensions.
export function layoutViewport(width,height,visual){
 const normalScale=!visual||Math.abs((visual.scale||1)-1)<.02;
 return {
  width:normalScale&&visual?.width>0?Math.min(width,visual.width):width,
  height:normalScale&&visual?.height>0?Math.min(height,visual.height):height
 };
}
export function canvasBackingSize(width,height,pixelRatio=1){
 if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)return null;
 const ratio=Math.min(2,Math.max(1,Number.isFinite(pixelRatio)?pixelRatio:1));
 return {width:Math.max(1,Math.round(width*ratio)),height:Math.max(1,Math.round(height*ratio))};
}
export function installBattleGestureGuard(surface,isActive){
 let previousTap=null;
 const listeners=[];
 const inGame=event=>isActive()&&!event.target?.closest?.('dialog');
 const block=event=>{if(event.cancelable!==false)event.preventDefault();};
 const listen=(name,handler)=>{const options={capture:true,passive:false};surface.addEventListener(name,handler,options);listeners.push([name,handler,options]);};
 for(const name of ['dblclick','gesturestart','gesturechange'])listen(name,event=>{if(inGame(event))block(event);});
 listen('touchmove',event=>{if(inGame(event)&&event.touches?.length>1)block(event);});
 listen('touchend',event=>{
  if(!inGame(event)||event.touches?.length){previousTap=null;return;}
  const touch=event.changedTouches?.[0];if(!touch)return;
  const tap={time:event.timeStamp,x:touch.clientX,y:touch.clientY};
  if(previousTap&&tap.time-previousTap.time>=0&&tap.time-previousTap.time<350&&Math.hypot(tap.x-previousTap.x,tap.y-previousTap.y)<40)block(event);
  previousTap=tap;
 });
 return ()=>{for(const [name,handler,options] of listeners)surface.removeEventListener(name,handler,options);};
}
export async function requestBattleLandscape(element,screenObject=globalThis.screen){
 let fullscreen=false,locked=false;
 try{if(!document.fullscreenElement&&element.requestFullscreen){await element.requestFullscreen({navigationUI:'hide'});fullscreen=true;}else fullscreen=!!document.fullscreenElement;}catch{}
 try{if(screenObject?.orientation?.lock){await screenObject.orientation.lock('landscape');locked=true;}}catch{}
 return {fullscreen,locked};
}

// Convert a screen pointer to the joystick's own axes, including CSS landscape rotation.
export function joystickVector(clientX,clientY,rect,rotated=false){
 const x=rotated?(clientY-rect.top)/rect.height:(clientX-rect.left)/rect.width;
 const y=rotated?(rect.right-clientX)/rect.width:(clientY-rect.top)/rect.height;
 let dx=(x-.5)*2,dy=(y-.5)*2;
 const length=Math.hypot(dx,dy);if(length>1){dx/=length;dy/=length;}
 return {x:dx,y:dy,left:dx<-.2,right:dx>.2};
}
export function installJoystick(surface,{isActive,isRotated,onChange,onEngage=()=>{}}){
 let pointer=null;
 const reset=()=>{const previous=pointer;pointer=null;surface.classList.remove('engaged');surface.style.setProperty('--stick-x','0px');surface.style.setProperty('--stick-y','0px');onChange({left:false,right:false});if(previous!==null&&surface.hasPointerCapture?.(previous))surface.releasePointerCapture(previous);};
 const update=event=>{const vector=joystickVector(event.clientX,event.clientY,surface.getBoundingClientRect(),isRotated());const travel=surface.clientWidth*.29;surface.style.setProperty('--stick-x',`${vector.x*travel}px`);surface.style.setProperty('--stick-y',`${vector.y*travel}px`);onChange(vector);};
 surface.addEventListener('pointerdown',event=>{event.preventDefault();if(pointer!==null||!isActive())return;pointer=event.pointerId;surface.setPointerCapture(pointer);surface.classList.add('engaged');onEngage();update(event);});
 surface.addEventListener('pointermove',event=>{if(event.pointerId!==pointer)return;event.preventDefault();if(!isActive()){reset();return;}update(event);});
 for(const name of ['pointerup','pointercancel','lostpointercapture'])surface.addEventListener(name,event=>{if(event.pointerId===pointer)reset();});
 surface.addEventListener('contextmenu',event=>event.preventDefault());
 return {reset};
}
