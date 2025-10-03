const canvas = document.getElementById("tetris");
const context = canvas.getContext("2d");
context.scale(20, 20);

const scoreEl = document.getElementById("score");
const linesEl = document.getElementById("lines");
const modeEl = document.getElementById("modeDisplay");
const modeSelect = document.getElementById("modeSelect");
const startBtn = document.getElementById("startBtn");
const resetBtn = document.getElementById("resetBtn");

// 🔹 Add highscore element dynamically
const highScoreBox = document.createElement("div");
highScoreBox.classList.add("small");
highScoreBox.innerHTML = `Highscore: <span id="highscore">0</span>`;
document.querySelector(".hud .left").appendChild(highScoreBox);

let dropCounter = 0;
let dropInterval = 1000;
let lastTime = 0;
let animationId;
let mode = "normal";

const arena = createMatrix(12, 20);

const colors = [
  null,
  "#FF0D72",
  "#0DC2FF",
  "#0DFF72",
  "#F538FF",
  "#FF8E0D",
  "#FFE138",
  "#3877FF",
];

// 🔹 Load highscore from localStorage
let highscore = parseInt(localStorage.getItem("tetrisHighscore")) || 0;
document.getElementById("highscore").innerText = highscore;

function createMatrix(w, h) {
  const matrix = [];
  while (h--) matrix.push(new Array(w).fill(0));
  return matrix;
}

function createPiece(type) {
  if (type === "T") return [[0,0,0],[1,1,1],[0,1,0]];
  if (type === "O") return [[2,2],[2,2]];
  if (type === "L") return [[0,3,0],[0,3,0],[0,3,3]];
  if (type === "J") return [[0,4,0],[0,4,0],[4,4,0]];
  if (type === "I") return [[0,5,0,0],[0,5,0,0],[0,5,0,0],[0,5,0,0]];
  if (type === "S") return [[0,6,6],[6,6,0],[0,0,0]];
  if (type === "Z") return [[7,7,0],[0,7,7],[0,0,0]];
}

function collide(arena, player) {
  const m = player.matrix;
  const o = player.pos;
  for (let y = 0; y < m.length; ++y) {
    for (let x = 0; x < m[y].length; ++x) {
      if (m[y][x] !== 0 &&
          (arena[y + o.y] &&
           arena[y + o.y][x + o.x]) !== 0) {
        return true;
      }
    }
  }
  return false;
}

function merge(arena, player) {
  player.matrix.forEach((row,y) => {
    row.forEach((value,x) => {
      if (value !== 0) {
        arena[y + player.pos.y][x + player.pos.x] = value;
      }
    });
  });
}

function playerDrop() {
  player.pos.y++;
  if (collide(arena, player)) {
    player.pos.y--;
    merge(arena, player);
    playerReset();
    arenaSweep();
    updateScore();
  }
  dropCounter = 0;
}

function playerMove(dir) {
  player.pos.x += dir;
  if (collide(arena, player)) {
    player.pos.x -= dir;
  }
}

function playerReset() {
  const pieces = "TJLOSZI";
  player.matrix = createPiece(pieces[(pieces.length * Math.random()) | 0]);
  player.pos.y = 0;
  player.pos.x = ((arena[0].length / 2) | 0) - ((player.matrix[0].length / 2) | 0);
  if (collide(arena, player)) {
    arena.forEach(row => row.fill(0));
    player.score = 0;
    player.lines = 0;
    updateScore();
  }
}

function playerRotate(dir) {
  const pos = player.pos.x;
  let offset = 1;
  rotate(player.matrix, dir);
  while (collide(arena, player)) {
    player.pos.x += offset;
    offset = -(offset + (offset > 0 ? 1 : -1));
    if (offset > player.matrix[0].length) {
      rotate(player.matrix, -dir);
      player.pos.x = pos;
      return;
    }
  }
}

function rotate(matrix, dir) {
  for (let y = 0; y < matrix.length; ++y) {
    for (let x = 0; x < y; ++x) {
      [ matrix[x][y], matrix[y][x] ] = [ matrix[y][x], matrix[x][y] ];
    }
  }
  if (dir > 0) matrix.forEach(row => row.reverse());
  else matrix.reverse();
}

function arenaSweep() {
  let rowCount = 1;
  outer: for (let y = arena.length -1; y >=0; --y) {
    for (let x = 0; x < arena[y].length; ++x) {
      if (arena[y][x] === 0) continue outer;
    }
    const row = arena.splice(y, 1)[0].fill(0);
    arena.unshift(row);
    ++y;
    player.score += rowCount * 10;
    player.lines++;
    rowCount *= 2;
  }
}

// 🔹 drawMatrix now has grid lines
function drawMatrix(matrix, offset) {
  matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        context.fillStyle = colors[value];
        context.fillRect(x + offset.x, y + offset.y, 1, 1);

        // Grid line around filled block
        context.strokeStyle = "#111";
        context.lineWidth = 0.05;
        context.strokeRect(x + offset.x, y + offset.y, 1, 1);
      }
    });
  });
}

// 🔹 draw arena grid background
function drawArenaGrid() {
  context.strokeStyle = "rgba(255,255,255,0.05)";
  context.lineWidth = 0.03;
  for (let y = 0; y < arena.length; y++) {
    for (let x = 0; x < arena[y].length; x++) {
      context.strokeRect(x, y, 1, 1);
    }
  }
}

function draw() {
  context.fillStyle = "#000";
  context.fillRect(0,0,canvas.width,canvas.height);

  // draw faint grid background
  drawArenaGrid();

  drawMatrix(arena, {x:0,y:0});
  drawMatrix(player.matrix, player.pos);
}

function update(time = 0) {
  const deltaTime = time - lastTime;
  lastTime = time;
  dropCounter += deltaTime;

  // handle modes
  if (mode === "fast") dropInterval = Math.max(200, dropInterval - 0.01);
  else if (mode === "slow") dropInterval = 1500;
  else if (mode === "normal") dropInterval = 1000;
  else if (mode === "impossible") {
    if (Math.random() < 0.002) {
      const choices = [500, 1000, 1500, 200, 800];
      dropInterval = choices[Math.floor(Math.random()*choices.length)];
    }
  }

  if (dropCounter > dropInterval) playerDrop();

  draw();
  animationId = requestAnimationFrame(update);
}

function updateScore() {
  scoreEl.innerText = player.score;
  linesEl.innerText = player.lines;

  // 🔹 Update highscore
  if (player.score > highscore) {
    highscore = player.score;
    localStorage.setItem("tetrisHighscore", highscore);
    document.getElementById("highscore").innerText = highscore;
  }
}

const player = {
  pos:{x:0,y:0},
  matrix:null,
  score:0,
  lines:0,
};

document.addEventListener("keydown", e=>{
  if(e.keyCode===37) playerMove(-1); // left
  else if(e.keyCode===39) playerMove(1); // right
  else if(e.keyCode===40) playerDrop(); // down
  else if(e.keyCode===81) playerRotate(-1); // Q
  else if(e.keyCode===38) playerRotate(1); // up arrow
  else if(e.keyCode===32) { // space = hard drop
    while(!collide(arena,player)) player.pos.y++;
    player.pos.y--;
    merge(arena,player);
    playerReset();
    arenaSweep();
    updateScore();
  }
});

modeSelect.addEventListener("change", ()=>{
  mode = modeSelect.value;
  modeEl.innerText = mode.charAt(0).toUpperCase()+mode.slice(1);
});

startBtn.addEventListener("click", ()=>{
  cancelAnimationFrame(animationId);
  playerReset();
  updateScore();
  update();
});

resetBtn.addEventListener("click", ()=>{
  arena.forEach(row=>row.fill(0));
  player.score=0;
  player.lines=0;
  updateScore();
  cancelAnimationFrame(animationId);
  draw();
});

draw();

function mute() {
  const bgMusic = document.getElementById("bg-music");
  bgMusic.muted = !bgMusic.muted;
  alert(bgMusic.muted ? "Audio Muted" : "Audio Unmuted");
}