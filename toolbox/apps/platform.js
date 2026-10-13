// Small platformer engine shared by Parkour, Reverse platformer and Desk level.
// World is in pixels. The caller supplies solid(x,y) and hazard(x,y) tests and draws the world itself.
class Platformer{
  constructor(canvas,o){Object.assign(this,{canvas,ctx:canvas.getContext('2d'),solid:()=>false,hazard:()=>false,start:{x:40,y:40},goal:null,worldW:1000,worldH:600,
    input:()=>({left:keys.has('arrowleft')||keys.has('a'),right:keys.has('arrowright')||keys.has('d'),jump:keys.has('arrowup')||keys.has('w')||keys.has(' ')}),
    drawWorld:()=>{},onWin:()=>{},onDie:()=>{},onFrame:()=>{},color:'#2f6fde',zoom:1},o);
    this.W=18;this.H=26;this.running=false;this.reset();this._loop=this._loop.bind(this)}
  reset(){this.p={x:this.start.x,y:this.start.y,vx:0,vy:0,ground:false,coyote:0,buffer:0,face:1};this.t=0;this.rec=[];this.done=false;this.cam={x:0,y:0};this.jumpHeld=false}
  play(){if(!this.running){this.running=true;this.last=performance.now();requestAnimationFrame(this._loop)}}
  stop(){this.running=false}
  hit(x,y,w,h,test){for(let i=0;i<=w;i+=Math.min(6,w))for(let j=0;j<=h;j+=Math.min(6,h))if(test(x+Math.min(i,w),y+Math.min(j,h)))return true;return false}
  step(dt){const p=this.p,inp=this.input(p,this),ACC=2400,MAX=270,G=1900,JUMP=640;
    const dir=(inp.right?1:0)-(inp.left?1:0);if(dir){p.vx+=dir*ACC*dt;p.face=dir}else p.vx*=Math.pow(p.ground?.0005:.15,dt);p.vx=Math.max(-MAX,Math.min(MAX,p.vx));
    if(inp.jump&&!this.jumpHeld)p.buffer=.12;this.jumpHeld=inp.jump;p.buffer-=dt;p.coyote-=dt;
    if(p.buffer>0&&p.coyote>0){p.vy=-JUMP;p.buffer=0;p.coyote=0;p.ground=false;if(this.sound)tone(520,.06,'square',.04)}
    if(!inp.jump&&p.vy<-250)p.vy=-250;// short hop when released early
    p.vy=Math.min(1200,p.vy+G*dt);
    // move x then y, stepping up 1px slopes on irregular (photo) terrain
    let nx=p.x+p.vx*dt;if(this.hit(nx,p.y,this.W,this.H-1,this.solid)){let up=0;while(up<6&&this.hit(nx,p.y-up-1,this.W,this.H-1,this.solid))up++;
      if(up<6&&p.ground){p.y-=up+1;p.x=nx}else{const s=Math.sign(p.vx);while(!this.hit(p.x+s,p.y,this.W,this.H-1,this.solid)&&Math.abs(nx-p.x)>=1)p.x+=s;p.vx=0}}else p.x=nx;
    let ny=p.y+p.vy*dt;p.ground=false;if(this.hit(p.x,ny,this.W,this.H,this.solid)){const s=Math.sign(p.vy)||1;let guard=0;while(!this.hit(p.x,p.y+s,this.W,this.H,this.solid)&&guard++<60)p.y+=s;if(p.vy>0){p.ground=true;p.coyote=.1}p.vy=0}else p.y=ny;
    if(p.ground)p.coyote=.1;
    this.t+=dt;this.rec.push([Math.round(p.x),Math.round(p.y)]);
    if(p.y>this.worldH+80||this.hit(p.x+3,p.y+3,this.W-6,this.H-6,this.hazard)){this.onDie(this);return}
    const g=this.goal;if(g&&p.x+this.W>g.x&&p.x<g.x+g.w&&p.y+this.H>g.y&&p.y<g.y+g.h){this.done=true;this.onWin(this)}}
  _loop(now){if(!this.running)return;const dt=Math.min(.033,(now-this.last)/1000);this.last=now;
    if(!this.done){let left=dt;while(left>0&&!this.done){const s=Math.min(1/120,left);this.step(s);left-=s}}
    this.render();this.onFrame(this);requestAnimationFrame(this._loop)}
  render(){const c=this.canvas,x=this.ctx,dpr=devicePixelRatio||1,W=c.clientWidth,H=c.clientHeight;if(c.width!==W*dpr||c.height!==H*dpr){c.width=W*dpr;c.height=H*dpr}
    const z=this.zoom,vw=W/z,vh=H/z,p=this.p;this.cam.x+=((p.x-vw/2)-this.cam.x)*.12;this.cam.y+=((p.y-vh/2)-this.cam.y)*.12;
    this.cam.x=Math.max(0,Math.min(Math.max(0,this.worldW-vw),this.cam.x));this.cam.y=Math.max(Math.min(0,this.worldH-vh),Math.min(Math.max(0,this.worldH-vh),this.cam.y));
    x.setTransform(dpr*z,0,0,dpr*z,-this.cam.x*dpr*z,-this.cam.y*dpr*z);x.clearRect(this.cam.x,this.cam.y,vw,vh);this.drawWorld(x,this.cam,vw,vh);
    if(this.ghost){const g=this.ghost[Math.min(this.rec.length,this.ghost.length-1)];if(g){x.globalAlpha=.35;this.drawRunner(x,g[0],g[1],'#888',1);x.globalAlpha=1}}
    if(this.goal){const g=this.goal;x.font='26px system-ui';x.textAlign='center';x.fillText('🏁',g.x+g.w/2,g.y+g.h-2);x.textAlign='left'}
    this.drawRunner(x,p.x,p.y,this.color,p.face)}
  drawRunner(x,px,py,col,face){x.fillStyle=col;x.beginPath();x.roundRect(px,py,this.W,this.H,5);x.fill();x.fillStyle='#fff';x.fillRect(px+(face>0?10:3),py+6,5,5);x.fillStyle='#111';x.fillRect(px+(face>0?12:4),py+7,2,3)}
}
