
(() => {
  "use strict";
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const scoreEl = document.getElementById("score");
  const bestEl = document.getElementById("best");
  const nextEl = document.getElementById("nextBall");
  const overlay = document.getElementById("overlay");
  const finalScore = document.getElementById("finalScore");
  const loginOverlay = document.getElementById("loginOverlay");
  const loginForm = document.getElementById("loginForm");
  const usernameInput = document.getElementById("usernameInput");
  const loginButton = document.getElementById("loginButton");
  const loginMessage = document.getElementById("loginMessage");
  const boardOverlay = document.getElementById("boardOverlay");
  const boardStatus = document.getElementById("boardStatus");
  const boardList = document.getElementById("boardList");
  const boardClose = document.getElementById("boardClose");
  const leaderboardButton = document.getElementById("leaderboard");
  const logoutButton = document.getElementById("logout");
  const SUPABASE_URL = "https://qvvocizlcsfufmjclngq.supabase.co";
  const SUPABASE_KEY = "sb_publishable_udDHJ6wePMfSM7GwoqNTYA_A4GrBsMz";
  const SESSION_STORAGE_KEY = "synthesis-world-class-session-v1";
  const tierImages = {
    AJYC: Object.assign(new Image(), { src: "AJYC.png" }),
    ZT: Object.assign(new Image(), { src: "ZT.png" }),
    "2班": Object.assign(new Image(), { src: "2班.png" }),
  };

  const storage = { getItem(k) { try { return localStorage.getItem(k); } catch { return null; } }, setItem(k,v) { try { localStorage.setItem(k,v); } catch { storageFailed = true; } }, removeItem(k) { try { localStorage.removeItem(k); } catch {} } };
  let storageFailed = false;
  const SAVE_KEY = "class-merge-progress-v2", BEST_KEY = "class-merge-best-v2";
  let guest = true, paused = false, modalWasRunning = false, highest = 0, cooldown = 0, saveClock = 0;
  let combo = 0, lastMerge = -10, audioContext = null, soundOn = storage.getItem("class-merge-sound") === "1";
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const W = 480; let H = 720;
  const LEFT = 18, RIGHT = W - 18; let FLOOR = H - 22;
  const DROP_Y = 74, DANGER_Y = 108;
  // Only the first four tiers spawn; smaller balls are intentionally more common.
  const DROP_POOL = [
    { tier: 0, weight: 46 },
    { tier: 1, weight: 31 },
    { tier: 2, weight: 16 },
    { tier: 3, weight: 7 },
  ];
  const TIERS = [
    { label: "牢", radius: 18, color: "#b7d4b4", score: 1 },
    { label: "C",  radius: 25, color: "#f1d68b", score: 3 },
    { label: "振", radius: 33, color: "#eeb48d", score: 6 },
    { label: "只", radius: 42, color: "#d9b3b2", score: 10 },
    { label: "米", radius: 52, color: "#b4c8db", score: 16 },
    { label: "蛋", radius: 64, color: "#c2b8d6", score: 24 },
    { label: "AJYC", radius: 79, color: "#b8cb86", score: 36 },
    { label: "ZT", radius: 95, color: "#8ebfae", score: 60 },
    { label: "2班", radius: 112, color: "#e5bd67", score: 100 },
  ];

  const state = {
    balls: [],
    aimX: W / 2,
    current: randomTier(),
    next: randomTier(),
    score: 0,
    best: 0,
    running: false,
    loggedIn: false,
    sessionToken: null,
    username: null,
    scoreSubmitted: false,
    canDrop: true,
    dangerTime: 0,
    elapsed: 0,
    pops: [],
    messages: [],
    fireworks: []
  };

  function configureCanvasQuality() {
    const bounds = canvas.getBoundingClientRect();
    const oldFloor = FLOOR;
    H = bounds.width > 0 ? W*bounds.height/bounds.width : 720;
    FLOOR = H-22;
    if (oldFloor !== FLOOR) for (const b of state.balls) { b.y = FLOOR-(oldFloor-b.y); clampBallToWorld(b); }
    const scale = Math.min(2.5, Math.max(1, window.devicePixelRatio || 1)); // Always use the detailed high-resolution renderer.
    canvas.width = W * scale;
    canvas.height = H * scale;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
  }

  function randomTier() {
    const total = DROP_POOL.reduce((sum, item) => sum + item.weight, 0);
    let roll = Math.random() * total;
    for (const item of DROP_POOL) {
      roll -= item.weight;
      if (roll < 0) return item.tier;
    }
    return DROP_POOL[DROP_POOL.length - 1].tier;
  }

  function reset() {
    highest = 0; cooldown = 0; combo = 0; lastMerge = -10; paused = false;
    document.getElementById("pauseOverlay").hidden = true;
    state.balls = [];
    state.pops = [];
    state.messages = [];
    state.fireworks = [];
    state.score = 0;
    state.current = randomTier();
    state.next = randomTier();
    state.running = true;
    state.canDrop = true;
    state.dangerTime = 0;
    state.elapsed = 0;
    state.scoreSubmitted = false;
    overlay.hidden = true;
    syncHud();
    configureCanvasQuality();
    saveProgress();
  }

  function syncHud() {
    scoreEl.textContent = String(state.score);
    bestEl.textContent = String(state.best);
    updateExtraHud();
    const spec = TIERS[state.next];
    nextEl.textContent = spec.label;
    nextEl.style.background = spec.color;
    nextEl.style.color = readableColor(spec.color);
    nextEl.style.fontSize = spec.label.length > 2 ? "9px" : "";
  }

  function readableColor(color) {
    const n = parseInt(color.slice(1), 16);
    const r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    return (0.299*r + 0.587*g + 0.114*b) > 145 ? "#3c5142" : "white";
  }

  function spawnBall(tier, x, y, age=0) {
    state.balls.push({
      tier, x, y, vx: 0, vy: 0,
      r: TIERS[tier].radius,
      born: state.elapsed,
      age
    });
  }

  function drop() {
    if (!state.running || !state.loggedIn || !state.canDrop) return;
    unlockAudio();
    const r = TIERS[state.current].radius;
    const x = Math.min(RIGHT-r, Math.max(LEFT+r, state.aimX));
    spawnBall(state.current, x, DROP_Y);
    highest = Math.max(highest, state.current);
    state.current = state.next; state.next = randomTier();
    state.canDrop = false; cooldown = .33;
    tone(190, .06, .025); syncHud(); saveProgress();
  }

  function clampBallToWorld(ball) {
    ball.x = Math.min(RIGHT-ball.r, Math.max(LEFT+ball.r, ball.x));
    ball.y = Math.min(FLOOR-ball.r, ball.y);
  }

  function mergeBalls(a, b, indexA, indexB) {
    const spec = TIERS[a.tier + 1];
    // Three-dimensional spherical mass is proportional to radius cubed.
    const massA = a.r*a.r*a.r, massB = b.r*b.r*b.r;
    const x = (a.x*massA+b.x*massB)/(massA+massB);
    const y = (a.y*massA+b.y*massB)/(massA+massB);
    state.balls = state.balls.filter((_, index) => index !== indexA && index !== indexB);
    combo = state.elapsed-lastMerge < 1.2 ? combo+1 : 1;
    lastMerge = state.elapsed;
    state.score += TIERS[a.tier].score + spec.score;
    highest = Math.max(highest, a.tier+1);
    storage.setItem(BEST_KEY, String(Math.max(Number(storage.getItem(BEST_KEY)) || 0, state.score)));
    tone(280 * Math.pow(1.19, a.tier), .15, .035);
    if (combo >= 2) showMessage(`${combo} 连合 · 默契满分！`, 1.1);
    if (state.score > state.best) state.best = state.score;
    state.pops.push({x, y, r: spec.radius, tier: a.tier + 1, age: 0, text: spec.label});
    const spawned = {
      tier: a.tier + 1, x, y, vx: (a.vx+b.vx)*.25, vy: Math.min(0,(a.vy+b.vy)*.2),
      r: spec.radius, born: state.elapsed, age: 0.12
    };
    state.balls.push(spawned);
    clampBallToWorld(spawned);
    startCelebration(a.tier + 1, x, y);
    syncHud();
  }

  function physics(dt) {
    const g = 1650;
    const damping = Math.pow(0.21, dt);
    for (const ball of state.balls) {
      ball.vy += g*dt;
      ball.vx *= damping;
      ball.x += ball.vx*dt;
      ball.y += ball.vy*dt;
      ball.age += dt;
      clampBallToWorld(ball);
      if (ball.x-ball.r <= LEFT) ball.vx = Math.abs(ball.vx)*0.16;
      if (ball.x+ball.r >= RIGHT) ball.vx = -Math.abs(ball.vx)*0.16;
      if (ball.y+ball.r >= FLOOR) {
        ball.vy = -Math.abs(ball.vy)*0.06;
        ball.vx *= 0.98;
      }
    }

    // Multiple relaxation passes keep dense stacks from visually overlapping.
    // Each pass fully separates a colliding pair according to inverse mass.
    for (let pass=0; pass<8; pass++) {
      let collided = false;
      let mergedThisPass = false;

      pairLoop:
      for (let i=0; i<state.balls.length; i++) {
        for (let j=i+1; j<state.balls.length; j++) {
          const a=state.balls[i], b=state.balls[j];
          const dx=b.x-a.x || (b.y===a.y ? .001 : 0), dy=b.y-a.y;
          const distance=Math.hypot(dx,dy) || 0.001;
          const minimumDistance=a.r+b.r;
          if (distance >= minimumDistance) continue;

          collided = true;
          if (a.tier === b.tier && a.tier < TIERS.length-1) {
            mergeBalls(a, b, i, j);
            mergedThisPass = true;
            break pairLoop;
          }

          const nx=dx/distance, ny=dy/distance;
          const ma=a.r*a.r*a.r, mb=b.r*b.r*b.r;
          const inverseA=1/ma, inverseB=1/mb;
          const separationWeight=inverseA/(inverseA+inverseB);
          // Add a tiny separation margin so rounding cannot leave edges touching.
          const correction=minimumDistance-distance+0.25;
          a.x -= nx*correction*separationWeight;
          a.y -= ny*correction*separationWeight;
          b.x += nx*correction*(1-separationWeight);
          b.y += ny*correction*(1-separationWeight);

          const rvx=b.vx-a.vx, rvy=b.vy-a.vy;
          const separationVelocity=rvx*nx+rvy*ny;
          if (separationVelocity < 0) {
            // Equal-and-opposite impulse with 3-D spherical masses.
            const restitution=0.12;
            const impulse=-(1+restitution)*separationVelocity/(inverseA+inverseB);
            a.vx -= impulse*nx*inverseA;
            a.vy -= impulse*ny*inverseA;
            b.vx += impulse*nx*inverseB;
            b.vy += impulse*ny*inverseB;
          }
        }
      }

      for (const ball of state.balls) clampBallToWorld(ball);
      if (!collided && !mergedThisPass) break;
    }
  }

  async function supabaseRpc(functionName, payload) {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${functionName}`, {
      method: "POST",
      signal: AbortSignal.timeout(8000),
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`
      },
      body: JSON.stringify(payload)
    }).catch(error => { throw new Error(error.name === "TimeoutError" ? "班级服务响应超时，请稍后重试。" : "暂时连接不上班级服务，请检查网络后重试。本地试玩不受影响。"); });
    const text = await response.text();
    const data = text ? JSON.parse(text) : null;
    if (!response.ok) {
      const message = data?.message || data?.error || "请求失败，请稍后再试";
      throw new Error(message);
    }
    return data;
  }

  function showLogin(message="") {
    loginMessage.textContent = message;
    openModal(loginOverlay);
    usernameInput.focus();
  }

  async function handleLogin(event) {
    event.preventDefault();
    const username = usernameInput.value.trim().toLowerCase();
    loginMessage.textContent = "";
    if (!username) {
      loginMessage.textContent = "请输入账号名";
      return;
    }
    loginButton.disabled = true;
    loginButton.textContent = "登录中…";
    try {
      const token = await supabaseRpc("game_login", { p_username: username });
      state.sessionToken = token;
      storage.setItem(SESSION_STORAGE_KEY, token);
      const session = await supabaseRpc("game_session", { p_token: token });
      applySession(session);
      loginOverlay.close();
      modalWasRunning = false;
      guest = false;
      reset();
      toast("已登录班级账号，新一局开始");
    } catch (error) {
      storage.removeItem(SESSION_STORAGE_KEY);
      loginMessage.textContent = error.message === "account not allowed"
        ? "这个账号名不在允许列表中"
        : (error.message || "登录失败，请稍后再试");
    } finally {
      loginButton.disabled = false;
      loginButton.textContent = "登录游戏";
    }
  }

  function applySession(session) {
    guest = false;
    if (!session) throw new Error("session expired");
    state.loggedIn = true;
    state.username = session.username;
    state.best = Number(session.bestScore || 0);
    state.sessionToken = storage.getItem(SESSION_STORAGE_KEY);
    syncHud();
  }

  async function restoreSession() {
    state.loggedIn = true;
    state.best = Number(storage.getItem(BEST_KEY)) || 0;
    let restored = false;
    try {
      const saved = JSON.parse(storage.getItem(SAVE_KEY));
      if (saved && saved.version === 2 && Array.isArray(saved.balls) && saved.balls.length <= 250 &&
          [saved.current,saved.next].every(t=>Number.isInteger(t)&&t>=0&&t<4) &&
          Number.isFinite(saved.score) && saved.score >= 0 && Number.isFinite(saved.elapsed) &&
          Number.isFinite(saved.highest) && saved.highest >= 0 && saved.highest < TIERS.length &&
          saved.balls.every(b=>Number.isInteger(b.tier)&&b.tier>=0&&b.tier<TIERS.length&&
            [b.x,b.y,b.vx,b.vy,b.age].every(Number.isFinite)&&b.age>=0)) {
        Object.assign(state, { balls:saved.balls.map(b=>({...b,r:TIERS[b.tier].radius})),
          current:saved.current,next:saved.next,score:saved.score,elapsed:saved.elapsed,running:true,canDrop:true });
        state.balls.forEach(clampBallToWorld); highest = saved.highest; restored = true;
        syncHud(); toast("上次的相遇，继续啦");
      }
    } catch { storage.removeItem(SAVE_KEY); }
    if (!restored) reset();
    const token = storage.getItem(SESSION_STORAGE_KEY);
    if (token) {
      document.getElementById("gameStatus").textContent = "正在恢复班级登录…";
      try {
        const session = await supabaseRpc("game_session", { p_token:token });
        // Keep the recovered board; only switch identity after validation.
        applySession(session);
      } catch { storage.removeItem(SESSION_STORAGE_KEY); toast("班级连接暂不可用，已进入本地试玩"); }
      syncHud();
    }
  }

  async function submitCurrentScore() {
    if (guest || !state.sessionToken) return;
    try {
      const result = await supabaseRpc("game_submit_score", {
        p_token: state.sessionToken,
        p_score: state.score
      });
      state.best = Number(result.bestScore || state.best);
      syncHud();
    } catch {
      state.scoreSubmitted = false;
    }
  }

  function renderLeaderboard(entries) {
    boardList.replaceChildren();
    for (const entry of entries) {
      const item=document.createElement("li");
      if (entry.username === state.username) item.className="me";
      const rank=document.createElement("span");
      rank.className="rank"; rank.textContent=`#${entry.rank}`;
      const name=document.createElement("span");
      name.textContent=entry.username;
      const score=document.createElement("span");
      score.className="score"; score.textContent=String(entry.bestScore);
      item.append(rank,name,score);
      boardList.appendChild(item);
    }
  }

  async function showLeaderboard() {
    openModal(boardOverlay);
    boardStatus.textContent = "加载中…";
    boardList.replaceChildren();
    try {
      const entries = await supabaseRpc("game_leaderboard", {});
      renderLeaderboard(entries);
      boardStatus.textContent = `共 ${entries.length} 个账号`;
    } catch (error) {
      boardStatus.textContent = error.message || "排行榜加载失败";
    }
  }

  async function handleLogout() {
    const token = state.sessionToken;
    storage.removeItem(SESSION_STORAGE_KEY);
    state.sessionToken = null; state.username = null; guest = true;
    state.best = Number(storage.getItem(BEST_KEY)) || 0;
    loginOverlay.close(); modalWasRunning = false;
    reset(); toast("已退出账号，进入本地试玩");
    if (token) { try { await supabaseRpc("game_logout",{p_token:token}); } catch {} }
  }

  function startCelebration(tier, x, y) {
    if (tier === 7) {
      showMessage("母校建校20周年快乐", 4);
      launchFireworks(x, y);
    } else if (tier === 8) {
      showMessage("永远的高2023级2班", 5);
    }
  }

  function showMessage(text, duration) {
    const existing = state.messages.find(message => message.text === text);
    if (existing) {
      existing.age = 0;
      existing.duration = duration;
      return;
    }
    state.messages.push({ text, duration, age: 0 });
  }

  function launchFireworks(originX, originY) {
    const burstCount = 6;
    const centers = [
      {x: originX, y: originY},
      {x: W*.25, y: H*.25},
      {x: W*.75, y: H*.24},
      {x: W*.50, y: H*.18},
      {x: W*.18, y: H*.38},
      {x: W*.82, y: H*.36},
    ].slice(0, burstCount);
    const colors = ["#ff477e", "#ffd166", "#06d6a0", "#4cc9f0", "#b5179e"];

    centers.forEach((center, burstIndex) => {
      const particleCount = 30;
      const delay = burstIndex * 0.18;
      for (let i=0; i<particleCount; i++) {
        const angle=(i/particleCount)*Math.PI*2 + Math.random()*.18;
        const speed=85+Math.random()*145;
        state.fireworks.push({
          x: center.x, y: center.y,
          vx: Math.cos(angle)*speed,
          vy: Math.sin(angle)*speed,
          age: -delay,
          life: 0.85+Math.random()*.45,
          color: colors[(burstIndex+i)%colors.length]
        });
      }
    });
  }

  function updateCelebrations(dt) {
    for (const message of state.messages) message.age += dt;
    state.messages = state.messages.filter(message => message.age < message.duration);

    for (const particle of state.fireworks) {
      particle.age += dt;
      if (particle.age <= 0) continue;
      particle.x += particle.vx*dt;
      particle.y += particle.vy*dt;
      particle.vy += 185*dt;
      particle.vx *= Math.pow(.50, dt);
    }
    state.fireworks = state.fireworks.filter(particle => particle.age < particle.life);
  }

  function drawCelebrations() {
    for (const particle of state.fireworks) {
      if (particle.age <= 0) continue;
      const lifeRatio=particle.age/particle.life;
      const alpha=Math.max(0, 1-lifeRatio);
      ctx.save();
      ctx.globalAlpha=alpha;
      ctx.strokeStyle=particle.color;
      ctx.lineWidth=3;
      ctx.lineCap="round";
      ctx.beginPath();
      ctx.moveTo(particle.x-particle.vx*.035, particle.y-particle.vy*.035);
      ctx.lineTo(particle.x, particle.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(particle.x,particle.y,2.4,0,Math.PI*2);
      ctx.fillStyle=particle.color;
      ctx.fill();
      ctx.restore();
    }

    for (const message of state.messages) {
      const fadeIn=Math.min(1,message.age/.22);
      const fadeOut=Math.min(1,Math.max(0,(message.duration-message.age)/.55));
      const alpha=Math.min(fadeIn,fadeOut);
      let fontSize=34;
      ctx.font=`900 ${fontSize}px system-ui,sans-serif`;
      while (ctx.measureText(message.text).width > W-70 && fontSize>20) {
        fontSize--;
        ctx.font=`900 ${fontSize}px system-ui,sans-serif`;
      }
      const width=ctx.measureText(message.text).width+34;
      const height=62;
      const x=(W-width)/2;
      const y=160;

      ctx.save();
      ctx.globalAlpha=alpha;
      ctx.fillStyle="#fffdf4";
      ctx.strokeStyle="#3c5142";
      ctx.lineWidth=4;
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(x,y,width,height,14) : ctx.rect(x,y,width,height);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle="#bb775a";
      ctx.textAlign="center";
      ctx.textBaseline="middle";
      ctx.fillText(message.text,W/2,y+height/2+1);
      ctx.restore();
    }
  }

  function updateDanger(dt) {
    let danger = 0;
    for (const b of state.balls) {
      const unsafe = b.age > 1.2 && b.y-b.r < DANGER_Y && Math.abs(b.vy) < 160;
      b.danger = unsafe ? (b.danger||0)+dt : Math.max(0,(b.danger||0)-dt*2);
      danger = Math.max(danger,b.danger);
    }
    state.dangerTime = danger;
    if (danger > 2) {
      state.running = false; finalScore.textContent = String(state.score);
      overlay.hidden = false; storage.removeItem(SAVE_KEY);
      if (!state.scoreSubmitted) { state.scoreSubmitted=true; submitCurrentScore(); }
    }
  }

  function updatePops(dt) {
    for (const p of state.pops) p.age += dt;
    state.pops = state.pops.filter(p => p.age < (p.tier >= 5 ? 0.72 : 0.48));
  }

  function drawGuide() {
    const spec=TIERS[state.current], r=spec.radius;
    const x=Math.min(RIGHT-r,Math.max(LEFT+r,state.aimX));
    let hit=FLOOR-r;
    for (const b of state.balls) {
      const dx=Math.abs(x-b.x), reach=r+b.r;
      if (dx<reach) { const y=b.y-Math.sqrt(reach*reach-dx*dx); if(y>DROP_Y) hit=Math.min(hit,y); }
    }
    ctx.save(); ctx.setLineDash([3,8]); ctx.strokeStyle="#91a38770"; ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(x,DROP_Y+r+8);ctx.lineTo(x,hit);ctx.stroke();ctx.setLineDash([]);
    ctx.globalAlpha=.25;ctx.fillStyle=spec.color;ctx.beginPath();ctx.arc(x,hit,r,0,Math.PI*2);ctx.fill();
    ctx.globalAlpha=1;drawBallShape(x,DROP_Y,r,spec.color,spec.label);ctx.restore();
  }

  function drawBallShape(x,y,r,color,label,alpha=1) {
    ctx.save();
    ctx.globalAlpha=alpha;
    ctx.beginPath();
    ctx.arc(x,y,r,0,Math.PI*2);
    ctx.fillStyle=color;
    ctx.fill();
    ctx.lineWidth=Math.max(2.5,r*.075);
    ctx.strokeStyle="#3c5142";
    ctx.stroke();

    // Flat anime-style cheek accents; no specular highlight or 3-D reflection.
    const tierImage = tierImages[label];
    if (tierImage && tierImage.complete && tierImage.naturalWidth) {
      // Keep custom badges fully flat: circular clipping only, no lighting or reflection.
      const iconR=r*.76;
      ctx.save();
      ctx.beginPath(); ctx.arc(x,y,iconR,0,Math.PI*2); ctx.clip();
      ctx.drawImage(tierImage,x-iconR,y-iconR,iconR*2,iconR*2);
      ctx.restore();
      ctx.beginPath(); ctx.arc(x,y,iconR,0,Math.PI*2);
      ctx.lineWidth=Math.max(2,r*.045);
      ctx.strokeStyle="#ffffff"; ctx.stroke();
      ctx.lineWidth=1;
      ctx.strokeStyle="#3c5142"; ctx.stroke();
      ctx.restore();
      return;
    }

    if (r >= 25) {
      ctx.beginPath(); ctx.ellipse(x-r*.42,y+r*.12,r*.08,r*.05,0,0,Math.PI*2);
      ctx.ellipse(x+r*.42,y+r*.12,r*.08,r*.05,0,0,Math.PI*2);
      ctx.fillStyle="rgba(255,94,141,.55)"; ctx.fill();
    }

    ctx.fillStyle=readableColor(color);
    ctx.font=`900 ${Math.max(11,r*(label.length>3?.30:.55))}px system-ui, sans-serif`;
    ctx.textAlign="center"; ctx.textBaseline="middle";
    ctx.lineWidth=Math.max(2,r*.035);
    ctx.strokeStyle="rgba(60,81,66,.10)";
    ctx.strokeText(label,x,y+r*.03);
    ctx.fillText(label,x,y+r*.03);
    ctx.restore();
  }

  function drawSynthesisPop(p) {
    const large = p.tier >= 5;
    const duration = large ? .72 : .48;
    const t = Math.min(1, p.age/duration);
    const fade = 1-t;
    ctx.save();
    ctx.globalAlpha=fade;
    ctx.textAlign="center";
    ctx.lineCap="round";

    // Main burst.
    ctx.strokeStyle="#d89c68";
    ctx.lineWidth=(large ? 8 : 5)*fade+1;
    ctx.beginPath(); ctx.arc(p.x,p.y,p.r*(.55+t*(large ? 1.15 : .70)),0,Math.PI*2); ctx.stroke();
    ctx.strokeStyle="#3c5142";
    ctx.lineWidth=1;
    ctx.stroke();

    if (large) {
      // Larger balls receive a stronger two-dimensional anime burst.
      ctx.strokeStyle="#ffb703";
      ctx.lineWidth=5*fade+1;
      ctx.beginPath(); ctx.arc(p.x,p.y,p.r*(.35+t*.82),0,Math.PI*2); ctx.stroke();

      {
        const rays = p.tier >= 7 ? 12 : 8;
        const inner = p.r*(.72+t*.32);
        const outer = p.r*(1.05+t*.55);
        ctx.strokeStyle="#3c5142";
        ctx.lineWidth=4*fade+1;
        for (let i=0; i<rays; i++) {
          const angle=(i/rays)*Math.PI*2 + t*.65;
          ctx.beginPath();
          ctx.moveTo(p.x+Math.cos(angle)*inner,p.y+Math.sin(angle)*inner);
          ctx.lineTo(p.x+Math.cos(angle)*outer,p.y+Math.sin(angle)*outer);
          ctx.stroke();
        }
      }
    }

    ctx.fillStyle=large ? "#d81159" : "#1e2350";
    ctx.font=`900 ${large ? 24 : 16}px system-ui,sans-serif`;
    ctx.fillText(p.text,p.x,p.y-p.r*(.72+t*(large ? .82 : .60)));
    ctx.restore();
  }

  function draw() {
    ctx.clearRect(0,0,W,H);ctx.fillStyle="#fffef6";ctx.fillRect(0,0,W,H);
    ctx.fillStyle="#a8b99b22";
    for(let x=28;x<W;x+=24)for(let y=140;y<FLOOR;y+=24){ctx.beginPath();ctx.arc(x,y,.9,0,Math.PI*2);ctx.fill();}
    ctx.strokeStyle="#c4cfb6";ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(LEFT,DANGER_Y+10);ctx.lineTo(LEFT,FLOOR);ctx.quadraticCurveTo(LEFT,FLOOR+6,LEFT+8,FLOOR+6);ctx.lineTo(RIGHT-8,FLOOR+6);ctx.quadraticCurveTo(RIGHT,FLOOR+6,RIGHT,FLOOR);ctx.lineTo(RIGHT,DANGER_Y+10);ctx.stroke();
    ctx.strokeStyle=state.dangerTime>.1?"#d47c65":"#d8ab9399";ctx.setLineDash([5,7]);ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(LEFT+9,DANGER_Y);ctx.lineTo(RIGHT-9,DANGER_Y);ctx.stroke();ctx.setLineDash([]);
    ctx.fillStyle="#b99a84";ctx.font="10px system-ui";ctx.textAlign="left";
    ctx.fillText(state.dangerTime>.1 ? `即将堆满 · ${(Math.max(0,2-state.dangerTime)).toFixed(1)}s` : "小心这条线哦",LEFT+8,DANGER_Y-12);
    if(state.dangerTime>.1){ctx.fillStyle=`rgba(214,120,95,${Math.min(.15,state.dangerTime*.07)})`;ctx.fillRect(LEFT,DANGER_Y,RIGHT-LEFT,50);}
    if(state.running&&state.canDrop)drawGuide();
    for(const b of state.balls)drawBallShape(b.x,b.y,b.r,TIERS[b.tier].color,TIERS[b.tier].label);
    if(!reducedMotion)for(const p of state.pops)drawSynthesisPop(p);
    drawCelebrations();
  }

  let last=performance.now(), accumulator=0;
  function frame(now) {
    const dt=Math.min(.1,Math.max(0,(now-last)/1000));last=now;
    if(state.running) {
      accumulator+=dt;
      while(accumulator>=1/120) {
        const step=1/120;state.elapsed+=step;cooldown=Math.max(0,cooldown-step);state.canDrop=cooldown===0;
        physics(step);updateDanger(step);updatePops(step);updateCelebrations(step);accumulator-=step;
        if(!state.running){accumulator=0;break;}
      }
      saveClock+=dt;if(saveClock>1){saveClock=0;saveProgress();}
    } else accumulator=0;
    draw();requestAnimationFrame(frame);
  }

  function pointerX(event) {
    const rect=canvas.getBoundingClientRect();
    return (event.clientX-rect.left)*(W/rect.width);
  }
  let aimingPointerId = null;
  canvas.addEventListener("pointerdown", event => {
    if (!state.running || aimingPointerId !== null) return;
    aimingPointerId = event.pointerId;
    canvas.focus({preventScroll:true});
    state.aimX=pointerX(event);
    if (canvas.hasPointerCapture && !canvas.hasPointerCapture(event.pointerId)) {
      canvas.setPointerCapture(event.pointerId);
    }
    event.preventDefault();
  }, {passive:false});
  canvas.addEventListener("pointermove", event => {
    if (aimingPointerId !== null && event.pointerId !== aimingPointerId) return;
    state.aimX=pointerX(event);
    event.preventDefault();
  }, {passive:false});
  canvas.addEventListener("pointerup", event => {
    if (aimingPointerId === null || event.pointerId !== aimingPointerId) return;
    aimingPointerId = null;
    state.aimX=pointerX(event);
    drop();
    event.preventDefault();
  }, {passive:false});
  canvas.addEventListener("pointercancel", event => {
    if (event.pointerId === aimingPointerId) aimingPointerId = null;
  });
  loginForm.addEventListener("submit", handleLogin);
  leaderboardButton.addEventListener("click", showLeaderboard);
  boardClose.addEventListener("click", () => boardOverlay.close());
  boardOverlay.addEventListener("click", event => {
    if (event.target === boardOverlay) boardOverlay.close();
  });
  logoutButton.addEventListener("click", handleLogout);
  window.addEventListener("keydown", event => {
    if (["INPUT","TEXTAREA","BUTTON"].includes(event.target.tagName) || document.querySelector("dialog[open]")) return;
    if(event.key.toLowerCase()==="p"){togglePause();event.preventDefault();return;}
    if (!state.running) return;
    if (event.key === "ArrowLeft") { state.aimX = Math.max(LEFT+TIERS[state.current].radius,state.aimX-20); event.preventDefault(); }
    if (event.key === "ArrowRight") { state.aimX = Math.min(RIGHT-TIERS[state.current].radius,state.aimX+20); event.preventDefault(); }
    if ((event.key === "ArrowDown" || event.key === " ") && !event.repeat) { drop(); event.preventDefault(); }
  });
  document.getElementById("restart").addEventListener("click", () => openModal(document.getElementById("confirmDialog")));
  document.getElementById("overlayRestart").addEventListener("click", reset);




  function updateExtraHud() {
    document.getElementById("emptyHint").hidden = state.balls.length>0 || !overlay.hidden;
    document.getElementById("gameStatus").textContent = storageFailed ? "本地存储不可用 · 进度未保存" : (guest ? "● 本地试玩 · 自动保存" : `● ${state.username} · 班级账号`);
    document.getElementById("account").textContent = guest ? "登录班级账号 ↗" : `${state.username} · 管理账号 ↗`;
    logoutButton.hidden=guest;loginForm.hidden=!guest;
    document.getElementById("discovered").textContent=`${highest+1} / 9`;
    document.getElementById("progressFill").style.width=`${(highest+1)/9*100}%`;
    document.getElementById("tierList").replaceChildren(...TIERS.map((t,i)=>{
      const row=document.createElement("div");row.className=`tier-row ${i>highest?'locked':''} ${i===8?'final':''}`;
      const badge=document.createElement("span");badge.className="tier-badge";badge.style.background=t.color;
      if(tierImages[t.label]) {const img=document.createElement("img");img.src=tierImages[t.label].src;img.alt=t.label;badge.append(img);}else badge.textContent=t.label;
      const name=document.createElement("span");name.className="tier-name";name.textContent=t.label;
      const level=document.createElement("span");level.className="tier-level";level.textContent=`Lv.0${i+1}`;
      row.append(badge,name,level);return row;
    }));
    const sound=document.getElementById("sound");sound.setAttribute("aria-pressed",String(soundOn));sound.title=soundOn?"关闭音效":"开启音效";sound.setAttribute("aria-label",sound.title);sound.style.opacity=soundOn?'1':'.5';
  }
  function saveProgress() {
    if(overlay.hidden && state.loggedIn) storage.setItem(SAVE_KEY,JSON.stringify({version:2,balls:state.balls,current:state.current,next:state.next,score:state.score,elapsed:state.elapsed,highest}));
  }
  function unlockAudio() {
    if(!soundOn)return;
    try { const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;audioContext ||= new Audio(); if(audioContext.state==='suspended')audioContext.resume().catch(()=>{}); } catch {}
  }
  function tone(hz,duration,volume) {
    if(!soundOn||!audioContext)return;
    const osc=audioContext.createOscillator(),gain=audioContext.createGain();osc.type='sine';osc.frequency.setValueAtTime(hz,audioContext.currentTime);osc.frequency.exponentialRampToValueAtTime(hz*.7,audioContext.currentTime+duration);gain.gain.setValueAtTime(volume,audioContext.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audioContext.currentTime+duration);osc.connect(gain).connect(audioContext.destination);osc.start();osc.stop(audioContext.currentTime+duration);
  }
  function toast(text) {const t=document.getElementById("toast");t.textContent=text;t.classList.add("visible");clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.classList.remove("visible"),3000);}
  function openModal(dialog) {
    if(document.querySelector("dialog[open]"))return;
    modalWasRunning=state.running;state.running=false;aimingPointerId=null;saveProgress();dialog.showModal();
  }
  function togglePause() {
    if(!overlay.hidden||document.querySelector("dialog[open]"))return;
    paused=!paused;state.running=!paused;aimingPointerId=null;
    document.getElementById("pauseOverlay").hidden=!paused;
    document.getElementById("pause").textContent=paused?'▶':'Ⅱ';
    document.getElementById("pause").setAttribute('aria-label',paused?'继续':'暂停');saveProgress();
  }
  for(const d of document.querySelectorAll("dialog"))d.addEventListener("close",()=>{if(modalWasRunning&&!paused&&overlay.hidden)state.running=true;modalWasRunning=false;last=performance.now();});
  for(const b of document.querySelectorAll("[data-close]"))b.addEventListener("click",()=>b.closest("dialog").close());
  document.getElementById("help").addEventListener("click",()=>openModal(document.getElementById("helpDialog")));
  document.getElementById("account").addEventListener("click",()=>showLogin());
  document.getElementById("pause").addEventListener("click",togglePause);
  document.getElementById("resume").addEventListener("click",togglePause);
  document.getElementById("confirmRestart").addEventListener("click",()=>{document.getElementById("confirmDialog").close();reset();toast("新的相遇，开始！");});
  document.getElementById("sound").addEventListener("click",()=>{soundOn=!soundOn;storage.setItem("class-merge-sound",soundOn?'1':'0');unlockAudio();tone(440,.13,.04);updateExtraHud();});
  document.addEventListener("visibilitychange",()=>{if(document.hidden&&state.running)togglePause();saveProgress();});
  window.addEventListener("pagehide",saveProgress);
  window.addEventListener("resize",configureCanvasQuality);
  // Available only to the local deterministic regression suite, never on hosted URLs.
  if(location.hostname==='localhost' && new URLSearchParams(location.search).has('test'))window.__gameTest={state,physics,updateDanger,drop,reset,mergeBalls,TIERS,togglePause,saveProgress,get highest(){return highest;}};

  configureCanvasQuality();
  syncHud();
  restoreSession();
  requestAnimationFrame(frame);
})();
