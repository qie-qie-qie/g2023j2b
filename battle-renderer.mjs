import {W,H,FLOOR,TEACHERS} from './combat-model.mjs';
const TAU=Math.PI*2;
export class Renderer {
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
