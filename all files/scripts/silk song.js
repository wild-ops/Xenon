/* 2D Procedural Side-scrolling Platformer
   Features:
    - Infinite procedural horizontal generation
    - Player: move, jump, double jump, dash, attack
    - Enemies, coins, score, health, highscore saved to localStorage
    - Parallax background
*/

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// resolution handling (sharp on high-DPI)
function resizeCanvas() {
  const cssW = canvas.clientWidth || 960;
  const cssH = canvas.clientHeight || 540;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.floor(cssW * dpr);
  canvas.height = Math.floor(cssH * dpr);
  ctx.setTransform(dpr,0,0,dpr,0,0);
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Game constants
const GRAVITY = 1.0;
const MOVE_SPEED = 3.6;
const RUN_MULT = 1.3;
const JUMP_POWER = -14;
const DASH_SPEED = 10;
const PLAYER_W = 36;
const PLAYER_H = 54;

const spawnBuffer = 1400; // how far ahead to generate
const difficultySelect = document.getElementById('difficulty');

let difficulty = difficultySelect.value; // easy/normal/hard

difficultySelect.addEventListener('change', () => difficulty = difficultySelect.value);

// Camera/world
let cameraX = 0;
let baseScrollSpeed = 2.0; // increases with difficulty/time
let worldObjects = []; // platforms, enemies, coins

// UI elements
const scoreEl = document.getElementById('score');
const coinsEl = document.getElementById('coins');
const healthEl = document.getElementById('health');
const highEl = document.getElementById('highscore');
const startBtn = document.getElementById('startBtn');
const clearHigh = document.getElementById('clearHigh');

let keys = {};
document.addEventListener('keydown', e => { keys[e.code] = true; if (e.code === 'KeyP') togglePause(); });
document.addEventListener('keyup',   e => { keys[e.code] = false; });

// highscore
let highscore = parseInt(localStorage.getItem('ss_high')) || 0;
highEl.innerText = highscore;

// Player object (world coordinates)
let player = {
  x: 140, y: 0,
  vx: 0, vy: 0,
  w: PLAYER_W, h: PLAYER_H,
  onGround: false,
  jumpsUsed: 0,
  facingRight: true,
  attacking: false,
  dashCooldown: 0,
  attackCooldown: 0,
  health: 6,
  alive: true,
  animTime: 0,
};

// Game state
let running = false;
let paused = false;
let score = 0;
let coins = 0;
let timeElapsed = 0;
let lastGenX = 0;
let enemySpawnTimer = 0;

// Platform generation params
let platformSeedX = 0;
let lastPlatformY = 380;
const groundHeight = 420;

// utility helpers
function rand(min, max) { return Math.random() * (max - min) + min; }
function rint(a,b){ return Math.floor(rand(a,b+1)); }

// basic rectangle collision
function rectsCollide(a,b){
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// reset game
function resetGame(){
  cameraX = 0;
  worldObjects = [];
  lastGenX = 0;
  platformSeedX = 0;
  lastPlatformY = 360;
  score = 0;
  coins = 0;
  timeElapsed = 0;
  enemySpawnTimer = 0;
  player.x = 140; player.y = 200; player.vx = 0; player.vy = 0;
  player.onGround = false; player.jumpsUsed = 0; player.health = 6; player.alive = true;
  baseScrollSpeed = (difficulty === 'easy') ? 1.6 : (difficulty === 'normal' ? 2.0 : 2.6);
  spawnInitialGround();
  running = true;
  paused = false;
}

// spawn initial ground chunk
function spawnInitialGround(){
  // a long flat platform across start
  pushPlatform(0, groundHeight, 2000);
  lastGenX = 2000;
  // spawn some platforms ahead
  for(let i=0;i<6;i++) generateChunk();
}

// push platform to worldObjects
function pushPlatform(x,y,w){
  worldObjects.push({type:'platform', x, y, w, h: 20});
  lastPlatformY = y;
}

// push enemy
function pushEnemy(x,y){
  worldObjects.push({type:'enemy', x, y-32, w:32, h:32, vx: (Math.random()<0.5? -1.2: 1.2), hp:1});
}

// push coin
function pushCoin(x,y){
  worldObjects.push({type:'coin', x, y-28, w:14, h:14});
}

// procedural generator: creates platforms, occasional enemies and coins
function generateChunk(){
  // generate until lastGenX > cameraX + spawnBuffer
  while(lastGenX < cameraX + spawnBuffer){
    let gap = rint(80, 260);
    let minY = 200; let maxY = 420;
    // vary platform Y moderately from lastPlatformY
    let nextY = lastPlatformY + rint(-120, 60);
    nextY = Math.max(minY, Math.min(maxY, nextY));
    let w = rint(80, 260);
    let x = lastGenX + gap;
    pushPlatform(x, nextY, w);
    // maybe spawn enemy
    if (Math.random() < (difficulty === 'hard' ? 0.28 : difficulty === 'normal' ? 0.18 : 0.08)) {
      pushEnemy(x + rint(30, w-40), nextY);
    }
    // maybe spawn coins distributed on platform
    let coinCount = Math.random() < 0.6 ? rint(0,3) : 0;
    for(let i=0;i<coinCount;i++){
      pushCoin(x + 20 + i*24 + rint(-6,6), nextY);
    }
    lastGenX = x + w;
  }
}

// physics & player controls
function updatePlayer(dt){
  if(!player.alive) return;

  // horizontal input (player relative control) - but camera moves forward too
  let ax = 0;
  if (keys['ArrowLeft'] || keys['KeyA']) ax = -MOVE_SPEED;
  if (keys['ArrowRight'] || keys['KeyD']) ax = MOVE_SPEED;

  // facing
  if (ax !== 0) player.facingRight = ax > 0;

  // dash
  if ((keys['KeyL'] || keys['ShiftLeft']) && player.dashCooldown <= 0){
    player.dashCooldown = 0.85; // seconds cooldown
    const dir = player.facingRight ? 1 : -1;
    player.vx = dir * DASH_SPEED;
    player.vy *= 0.6;
    player.animTime = 0;
  } else {
    // smooth horizontal movement (dampen)
    player.vx += (ax - player.vx) * 0.18;
  }

  // jump & double jump
  if ((keys['Space'] || keys['ArrowUp'] || keys['KeyW']) && player.jumpPressed !== true){
    // new press
    player.jumpPressed = true;
    if (player.onGround) {
      player.vy = JUMP_POWER;
      player.onGround = false;
      player.jumpsUsed = 1;
    } else if (player.jumpsUsed < 2) {
      player.vy = JUMP_POWER * 0.9;
      player.jumpsUsed++;
    }
  }
  if (!(keys['Space'] || keys['ArrowUp'] || keys['KeyW'])) player.jumpPressed = false;

  // attack
  if ((keys['KeyK'] || keys['KeyF']) && player.attackCooldown <= 0){
    player.attacking = true;
    player.attackCooldown = 0.28;
    setTimeout(()=> player.attacking = false, 180);
  }

  // gravity
  player.vy += GRAVITY * 0.9;
  // clamp speeds
  player.vy = Math.min(player.vy, 18);

  // integrate position
  player.x += player.vx;
  player.y += player.vy;

  // collisions with platforms
  player.onGround = false;
  for (let obj of worldObjects){
    if (obj.type !== 'platform') continue;
    let plat = obj;
    let pr = {x: player.x, y: player.y, w: player.w, h: player.h};
    let pRect = {x: plat.x, y: plat.y - plat.h, w: plat.w, h: plat.h};
    // our platform coordinate has y at top of platform? Using plat.y as top.
    // adjust check because we used plat.h as thickness
    pRect = {x: plat.x, y: plat.y, w: plat.w, h: plat.h};

    // approximate standing collision
    if (rectsCollide(pr, pRect)){
      // we collided — check if landing from above
      if (player.vy > 0 && player.y + player.h - player.vy <= pRect.y + 4){
        player.y = pRect.y - player.h;
        player.vy = 0;
        player.onGround = true;
        player.jumpsUsed = 0;
      } else {
        // side collision push out
        if (player.x + player.w/2 < pRect.x + pRect.w/2) {
          player.x = pRect.x - player.w - 0.1;
          player.vx = Math.min(0, player.vx);
        } else {
          player.x = pRect.x + pRect.w + 0.1;
          player.vx = Math.max(0, player.vx);
        }
      }
    }
  }

  // world bounds vertically
  if (player.y > canvas.height) {
    player.health -= 1;
    respawnAtLastSafe();
  }

  // dash & cooldown reductions
  if (player.dashCooldown > 0) player.dashCooldown -= dt;
  if (player.attackCooldown > 0) player.attackCooldown -= dt;
  if (player.attackCooldown < 0) player.attackCooldown = 0;
}

// respawn simple: move player up to nearest platform (camera-relative)
function respawnAtLastSafe(){
  // find platforms left of cameraX + 200 and place player on top of last one
  let safe = worldObjects.filter(o=> o.type==='platform' && o.x < cameraX + 300);
  if (safe.length){
    let p = safe[safe.length-1];
    player.x = Math.max(p.x + 10, cameraX + 120);
    player.y = p.y - player.h - 2;
    player.vy = 0;
  } else {
    player.x = cameraX + 140; player.y = 180; player.vy = 0;
  }
  if (player.health <= 0) player.alive = false;
}

// update enemies, coins, collisions
function updateWorld(dt){
  // move camera forward
  let speedIncrease = Math.min(1.2, timeElapsed / 120); // slowly increase
  let difficultyMul = difficulty === 'easy' ? 0.85 : difficulty === 'normal' ? 1.0 : 1.18;
  const scroll = (baseScrollSpeed + speedIncrease) * difficultyMul;
  cameraX += scroll;

  // procedural generation based on camera
  generateChunk();

  // update world objects
  for (let obj of worldObjects){
    if (obj.type === 'enemy'){
      // simple AI: patrol
      obj.x += obj.vx;
      // flip at edges of platform or bounds
      // find platform underneath enemy
      let below = worldObjects.find(o => o.type==='platform' && (obj.x + obj.w/2) >= o.x && (obj.x + obj.w/2) <= o.x + o.w);
      if (!below) {
        obj.vx *= -1;
        obj.x += obj.vx * 2;
      }
      // enemy vs player collision
      if (player.alive && rectsCollide(player, obj)){
        // if player attacking and facing correct way and attack active -> enemy dies
        const attackRect = player.attacking ? {
          x: player.facingRight ? player.x + player.w : player.x - 24,
          y: player.y + 8, w: 24, h: 24
        } : null;
        if (attackRect && rectsCollide(attackRect, obj)){
          obj.hp = 0;
          score += 120;
        } else {
          // damage player and knockback
          if (!obj._hurtCooldown) {
            player.health -= 1;
            obj._hurtCooldown = 0.9;
            // knockback
            player.vx = (obj.vx > 0 ? -4 : 4);
            player.vy = -6;
          }
        }
      }
      if (obj._hurtCooldown !== undefined){
        obj._hurtCooldown -= dt;
        if (obj._hurtCooldown <= 0) obj._hurtCooldown = 0;
      }
    } else if (obj.type === 'coin'){
      // collect coins if player collides
      if (player.alive && rectsCollide(player, obj)){
        coins += 1;
        score += 20;
        obj.collected = true;
      }
    }
    // cleanup objects that are far left (behind camera)
  }

  // remove dead or collected objects that are far left or flagged
  worldObjects = worldObjects.filter(o => {
    if ((o.type === 'enemy' && o.hp <= 0) || o.collected) return false;
    if (o.x + (o.w||0) < cameraX - 400) return false;
    return true;
  });

  // spawn occasional enemies in empty platform areas (a backup)
  enemySpawnTimer -= dt;
  if (enemySpawnTimer <= 0){
    enemySpawnTimer = rand(1.6, 3.2);
    // find a platform ahead
    let candidates = worldObjects.filter(o=> o.type==='platform' && o.x > cameraX + 200 && o.x < cameraX + spawnBuffer - 60);
    if (candidates.length > 0 && Math.random() < 0.5){
      let p = candidates[rint(0, candidates.length-1)];
      pushEnemy(p.x + rint(20, p.w-40), p.y);
    }
  }

  // if player died update highscore
  if (!player.alive) {
    running = false;
    if (score > highscore){
      highscore = score;
      localStorage.setItem('ss_high', highscore);
      highEl.innerText = highscore;
    }
  }
}

// draw parallax background
function drawBackground(){
  // sky gradient already from CSS; draw parallax hills and stars
  // stars
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  for (let i=0;i<60;i++){
    let sx = ((i*73) - (cameraX*0.02)) % canvas.width;
    let sy = 60 + ( (i*37) % 120 );
    ctx.fillRect(sx, sy, 1.5, 1.5);
  }
  // big parallax blobs (hills)
  ctx.save();
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = '#0a3141';
  ctx.beginPath();
  ctx.ellipse( (canvas.width*0.2) - (cameraX*0.12 % canvas.width), canvas.height - 60, 560, 120, 0, 0, Math.PI*2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.6;
  ctx.fillStyle = '#06313f';
  ctx.beginPath();
  ctx.ellipse( (canvas.width*0.8) - (cameraX*0.08 % canvas.width), canvas.height - 90, 420, 100, 0, 0, Math.PI*2);
  ctx.fill();
  ctx.restore();
}

// draw everything
function draw(){
  // clear
  ctx.clearRect(0,0,canvas.width,canvas.height);

  drawBackground();

  // draw platforms and world
  for (let obj of worldObjects){
    if (obj.type === 'platform'){
      // screen relative
      let sx = obj.x - cameraX;
      ctx.fillStyle = '#6b4c36';
      ctx.fillRect(sx, obj.y, obj.w, obj.h);

      // subtle top highlight
      ctx.fillStyle = 'rgba(255,255,255,0.03)';
      ctx.fillRect(sx, obj.y, obj.w, 4);
    } else if (obj.type === 'enemy'){
      let sx = obj.x - cameraX;
      ctx.save();
      ctx.translate(sx, obj.y);
      // body
      ctx.fillStyle = '#3a9d45';
      ctx.fillRect(0,0,obj.w, obj.h);
      // eyes
      ctx.fillStyle = '#000';
      ctx.fillRect(6, 8, 6, 6);
      ctx.fillRect( obj.w - 12, 8, 6, 6);
      ctx.restore();
    } else if (obj.type === 'coin'){
      let sx = obj.x - cameraX;
      ctx.save();
      ctx.translate(sx + obj.w/2, obj.y + obj.h/2);
      ctx.beginPath();
      ctx.fillStyle = '#ffd166';
      ctx.arc(0,0, obj.w/2, 0, Math.PI*2);
      ctx.fill();
      ctx.restore();
    }
  }

  // draw player (screen space)
  const px = player.x - cameraX;
  const py = player.y;
  ctx.save();
  ctx.translate(px + player.w/2, py + player.h/2);
  ctx.scale(player.facingRight ? 1 : -1, 1);

  // simple animation: bob when idle / tilt when moving
  const t = player.animTime * 40;
  player.animTime += 0.016;
  // shadow
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath();
  ctx.ellipse(0, player.h/2 - 6, player.w*0.45, 8, 0, 0, Math.PI*2);
  ctx.fill();

  // body
  ctx.fillStyle = '#e9d7ba';
  ctx.fillRect(-player.w/2, -player.h/2, player.w, player.h);

  // chest mark
  ctx.fillStyle = '#c27b5a';
  ctx.fillRect(-10, -10, 20, 10);

  // eyes
  ctx.fillStyle = '#222';
  ctx.fillRect(-8, -22, 6, 6);

  // attack effect
  if (player.attacking){
    ctx.fillStyle = 'rgba(255,60,60,0.9)';
    ctx.fillRect(player.w/2 - 4, -8, 28, 12);
  }

  // dash trail
  if (player.dashCooldown > 0.6){
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(-player.w/2 - 6, -player.h/2 + 6, 12, player.h - 10);
  }

  ctx.restore();

  // UI overlay (screen space)
  ctx.fillStyle = '#eaf6ff';
  ctx.font = '18px Inter, Arial';
  ctx.fillText('Score: ' + score, 14, 26);
  ctx.fillText('Coins: ' + coins, 14, 50);
  ctx.fillText('HP: ' + player.health, 14, 74);
  ctx.fillStyle = '#9fb3c8';
  ctx.fillText('High: ' + highscore, canvas.width - 140, 26);
}

// main loop
let lastTime = 0;
function loop(ts){
  if (!running) {
    requestAnimationFrame(loop);
    return;
  }
  if (paused) {
    lastTime = ts;
    requestAnimationFrame(loop);
    return;
  }
  const dt = Math.min(0.06, (ts - lastTime) / 1000);
  lastTime = ts;
  timeElapsed += dt;

  // update
  updatePlayer(dt);
  updateWorld(dt);

  // collisions: player attack vs enemies handled in updateWorld - now handle enemy deaths dropping coins
  for (let i=worldObjects.length-1;i>=0;i--){
    let o = worldObjects[i];
    if (o.type === 'enemy' && o.hp <= 0){
      // spawn a couple coins
      for (let c=0;c< rint(1,3); c++){
        pushCoin(o.x + rint(-8, o.w+8), o.y + rint(-10, 6));
      }
      worldObjects.splice(i,1);
    }
  }

  // coin collection visual: handled in updateWorld marking collected

  // UI updates
  scoreEl.innerText = score;
  coinsEl.innerText = coins;
  healthEl.innerText = player.health;

  // draw
  draw();

  // keep generating ahead
  generateChunk();

  requestAnimationFrame(loop);
}

function togglePause(){
  paused = !paused;
}

// helpers used earlier
function rint(a,b){ return Math.floor(rand(a,b+1)); }
function rand(a,b){ return Math.random()*(b-a)+a; }

// button handlers
startBtn.addEventListener('click', ()=>{
  resetGame();
  lastTime = performance.now();
  requestAnimationFrame(loop);
});

clearHigh.addEventListener('click', ()=>{
  localStorage.removeItem('ss_high');
  highscore = 0;
  highEl.innerText = 0;
});

// start paused, user must press Start
// automatically spawn some initial content for visuals
resetGame();
draw();

// small helper to slowly update stored highscore while running
setInterval(()=> {
  if (score > highscore) {
    highscore = score;
    localStorage.setItem('ss_high', highscore);
    highEl.innerText = highscore;
  }
}, 1500);
