const canvas = document.getElementById("pong");
const ctx = canvas.getContext("2d");

const WIDTH = canvas.width;
const HEIGHT = canvas.height;

// Paddle settings
const PADDLE_WIDTH = 16;
const PADDLE_HEIGHT = 100;
const PADDLE_SPEED = 8;

// Ball settings
const BALL_SIZE = 18;
let ballX = WIDTH / 2 - BALL_SIZE / 2;
let ballY = HEIGHT / 2 - BALL_SIZE / 2;
let ballVX = 7 * (Math.random() < 0.5 ? 1 : -1);
let ballVY = 5 * (Math.random() < 0.5 ? 1 : -1);

// Player paddle (left)
let leftY = HEIGHT / 2 - PADDLE_HEIGHT / 2;

// AI paddle (right)
let rightY = HEIGHT / 2 - PADDLE_HEIGHT / 2;

// Scores
let leftScore = 0;
let rightScore = 0;

// Mouse control
canvas.addEventListener("mousemove", function (e) {
  const rect = canvas.getBoundingClientRect();
  const mouseY = e.clientY - rect.top;
  leftY = mouseY - PADDLE_HEIGHT / 2;
  leftY = Math.max(0, Math.min(HEIGHT - PADDLE_HEIGHT, leftY));
});

function drawRect(x, y, w, h, color = "#fff") {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

function drawBall() {
  ctx.beginPath();
  ctx.arc(
    ballX + BALL_SIZE / 2,
    ballY + BALL_SIZE / 2,
    BALL_SIZE / 2,
    0,
    Math.PI * 2
  );
  ctx.fillStyle = "#fff";
  ctx.fill();
}

function drawNet() {
  for (let i = 0; i < HEIGHT; i += 32) {
    drawRect(WIDTH / 2 - 2, i, 4, 18, "#666");
  }
}

function drawScores() {
  ctx.font = "40px monospace";
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.fillText(leftScore, WIDTH / 2 - 80, 60);
  ctx.fillText(rightScore, WIDTH / 2 + 80, 60);
}

function resetBall() {
  ballX = WIDTH / 2 - BALL_SIZE / 2;
  ballY = HEIGHT / 2 - BALL_SIZE / 2;
  ballVX = 7 * (Math.random() < 0.5 ? 1 : -1);
  ballVY = 5 * (Math.random() < 0.5 ? 1 : -1);
}

function updateBall() {
  ballX += ballVX;
  ballY += ballVY;

  // Top/bottom wall collision
  if (ballY <= 0 || ballY + BALL_SIZE >= HEIGHT) {
    ballVY *= -1;
  }

  // Left paddle collision
  if (
    ballX <= PADDLE_WIDTH &&
    ballY + BALL_SIZE > leftY &&
    ballY < leftY + PADDLE_HEIGHT
  ) {
    ballVX *= -1;
    ballVY += (ballY + BALL_SIZE / 2 - (leftY + PADDLE_HEIGHT / 2)) * 0.15;
    ballX = PADDLE_WIDTH;
  }

  // Right paddle collision (AI)
  if (
    ballX + BALL_SIZE >= WIDTH - PADDLE_WIDTH &&
    ballY + BALL_SIZE > rightY &&
    ballY < rightY + PADDLE_HEIGHT
  ) {
    ballVX *= -1;
    ballVY += (ballY + BALL_SIZE / 2 - (rightY + PADDLE_HEIGHT / 2)) * 0.15;
    ballX = WIDTH - PADDLE_WIDTH - BALL_SIZE;
  }

  // Left/right wall (score)
  if (ballX < -BALL_SIZE) {
    rightScore++;
    resetBall();
  }
  if (ballX > WIDTH + BALL_SIZE) {
    leftScore++;
    resetBall();
  }
}

function updateRightPaddleAI() {
  let center = rightY + PADDLE_HEIGHT / 2;
  if (center < ballY + BALL_SIZE / 2 - 10) rightY += PADDLE_SPEED * 0.9;
  else if (center > ballY + BALL_SIZE / 2 + 10) rightY -= PADDLE_SPEED * 0.9;
  rightY = Math.max(0, Math.min(HEIGHT - PADDLE_HEIGHT, rightY));
}

function loop() {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  drawNet();
  drawScores();
  drawRect(0, leftY, PADDLE_WIDTH, PADDLE_HEIGHT, "#fff");
  drawRect(WIDTH - PADDLE_WIDTH, rightY, PADDLE_WIDTH, PADDLE_HEIGHT, "#fff");
  drawBall();

  updateBall();
  updateRightPaddleAI();

  requestAnimationFrame(loop);
}

loop();

function mute() {
  const bgMusic = document.getElementById("bg-music");
  bgMusic.muted = !bgMusic.muted;
  alert(bgMusic.muted ? "Audio Muted" : "Audio Unmuted");
}