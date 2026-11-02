// CSS rotation is the fallback when a browser cannot lock the device orientation.
export function battleViewport(width,height,mobile){
 const rotated=mobile&&height>width;
 return {rotated,width:rotated?height:width,height:rotated?width:height};
}
export async function requestBattleLandscape(element,screenObject=globalThis.screen){
 let fullscreen=false,locked=false;
 try{if(!document.fullscreenElement&&element.requestFullscreen){await element.requestFullscreen({navigationUI:'hide'});fullscreen=true;}else fullscreen=!!document.fullscreenElement;}catch{}
 try{if(screenObject?.orientation?.lock){await screenObject.orientation.lock('landscape');locked=true;}}catch{}
 return {fullscreen,locked};
}
