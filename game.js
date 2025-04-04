// ===========================
// 資源與全域變數宣告區
// ===========================

// Canvas 與繪圖上下文
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 432;
canvas.height = 644;

// 遊戲狀態與參數
let gameStarted = false;
let gameOver = false;
let canRestart = false;
let score = 0;
const GROUND_HEIGHT = 146;  // 地板圖片原始高度

// 小鳥參數 (原尺寸 56x48，縮小80% => 約45x38)
let bird = {
  x: 50,
  y: 150,
  width: 56 * 0.8,
  height: 48 * 0.8,
  gravity: 0.6,
  lift: -10,
  velocity: 0
};

// 管道參數 (原尺寸 78x530，縮小80%)
const PIPE_WIDTH = 78 * 0.8;
const PIPE_HEIGHT = 530 * 0.8;
let pipeGap = 150;  // 上下管子間隔
const pipeSpeed = 3;  // 提高移動速度
let pipes = [];
let frameCount = 0;

// 地板滾動偏移
let groundX = 0;

// ===========================
// 資源載入
// ===========================

// 輔助函式：載入圖片
function loadImage(src) {
  const img = new Image();
  img.src = src;
  return img;
}

// 輔助函式：載入音效
function loadAudio(src, { loop = false, volume = 1 } = {}) {
  const audio = new Audio(src);
  audio.loop = loop;
  audio.volume = volume;
  return audio;
}

// 圖片資源
const images = {
  bg: loadImage('img/bg.png'),
  pipeTop: loadImage('img/pipeTop.png'),
  pipeBottom: loadImage('img/pipeBottom.png'),
  ground: loadImage('img/ground.png'),
  start: loadImage('img/start.png'),
  gameOver: loadImage('img/gameover.png'),
  scoreDigits: Array.from({ length: 10 }, (_, i) => loadImage(`img/score/${i}.png`)),
  birdFrames: Array.from({ length: 8 }, (_, i) => loadImage(`img/bird/${i}.png`))
};

// 音效資源
const sounds = {
  bgMusic: loadAudio('sounds/9999.mp3', { loop: true, volume: 0.1 }),
  jump: loadAudio('sounds/jump.mp3', { volume: 0.2 }),
  death: loadAudio('sounds/death.wav', { volume: 0.5 }),
  score: loadAudio('sounds/0000.wav', { volume: 0.2 })
};

// ===========================
// 繪圖函式區
// ===========================

function drawBackground() {
  if (images.bg.complete) {
    ctx.drawImage(images.bg, 0, 0, canvas.width, canvas.height);
  } else {
    ctx.fillStyle = '#70c5ce';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}

function drawGround() {
  if (images.ground.complete) {
    const groundY = canvas.height - GROUND_HEIGHT;
    ctx.drawImage(images.ground, groundX, groundY, images.ground.width, images.ground.height);
    ctx.drawImage(images.ground, groundX + images.ground.width, groundY, images.ground.width, images.ground.height);
  }
}

function drawBird() {
  const frame = Math.floor(frameCount / 5) % images.birdFrames.length;
  const currentBird = images.birdFrames[frame];
  if (currentBird.complete) {
    let angleDeg = (bird.velocity < 0)
      ? Math.min(-bird.velocity * 3, 60)
      : Math.max(-bird.velocity * 6, -70);
    const angleRad = -angleDeg * Math.PI / 180;
    ctx.save();
    const centerX = bird.x + bird.width / 2;
    const centerY = bird.y + bird.height / 2;
    ctx.translate(centerX, centerY);
    ctx.rotate(angleRad);
    ctx.drawImage(currentBird, -bird.width / 2, -bird.height / 2, bird.width, bird.height);
    ctx.restore();
  } else {
    ctx.fillStyle = 'yellow';
    ctx.fillRect(bird.x, bird.y, bird.width, bird.height);
  }
}

function drawPipes() {
  pipes.forEach(p => {
    if (images.pipeTop.complete) {
      ctx.drawImage(images.pipeTop, p.x, p.topPipeBottom - PIPE_HEIGHT, PIPE_WIDTH, PIPE_HEIGHT);
    } else {
      ctx.fillStyle = 'green';
      ctx.fillRect(p.x, p.topPipeBottom - PIPE_HEIGHT, PIPE_WIDTH, PIPE_HEIGHT);
    }
    if (images.pipeBottom.complete) {
      ctx.drawImage(images.pipeBottom, p.x, p.topPipeBottom + pipeGap, PIPE_WIDTH, PIPE_HEIGHT);
    } else {
      ctx.fillStyle = 'green';
      ctx.fillRect(p.x, p.topPipeBottom + pipeGap, PIPE_WIDTH, PIPE_HEIGHT);
    }
  });
}

function drawScore() {
  const scoreStr = score.toString();
  const digitWidth = 24;
  const digitHeight = 36;
  const totalWidth = scoreStr.length * digitWidth;
  const startX = (canvas.width - totalWidth) / 2;
  const y = 20;
  for (let i = 0; i < scoreStr.length; i++) {
    const digit = parseInt(scoreStr[i]);
    const digitImg = images.scoreDigits[digit];
    if (digitImg.complete) {
      ctx.drawImage(digitImg, startX + i * digitWidth, y, digitWidth, digitHeight);
    }
  }
}

function drawOverlay() {
  if (!gameStarted && images.start.complete) {
    ctx.drawImage(images.start, 0, 0, canvas.width, canvas.height);
  }
  if (gameOver && images.gameOver.complete) {
    ctx.drawImage(images.gameOver, 0, 0, canvas.width, canvas.height);
  }
}

// ===========================
// 更新邏輯函式區
// ===========================

function updateGround() {
  if (gameOver) return;
  groundX -= pipeSpeed;
  if (groundX <= -images.ground.width) {
    groundX += images.ground.width;
  }
}

function updateBird() {
  if (gameOver) return;
  bird.velocity += bird.gravity;
  bird.y += bird.velocity;
  if (bird.y < 0) {
    bird.y = 0;
    bird.velocity = 0;
  }
  if (bird.y + bird.height > canvas.height - GROUND_HEIGHT) {
    bird.y = canvas.height - GROUND_HEIGHT - bird.height;
    bird.velocity = 0;
    triggerGameOver();
  }
}

function updatePipes() {
  if (gameOver) return;
  if (frameCount % 70 === 0) {
    const minTopPipeBottom = PIPE_HEIGHT * 0.2;
    const maxTopPipeBottom = canvas.height - pipeGap - PIPE_HEIGHT * 0.2 - GROUND_HEIGHT;
    let newTopPipeBottom;
    if (pipes.length > 0) {
      const prevTop = pipes[pipes.length - 1].topPipeBottom;
      const offset = Math.random() * 200 - 100; // -100 ~ +100
      newTopPipeBottom = Math.max(minTopPipeBottom, Math.min(prevTop + offset, maxTopPipeBottom));
    } else {
      newTopPipeBottom = Math.random() * (maxTopPipeBottom - minTopPipeBottom) + minTopPipeBottom;
    }
    pipes.push({ x: canvas.width, topPipeBottom: newTopPipeBottom, scored: false });
  }
  pipes.forEach(p => p.x -= pipeSpeed);
  if (pipes.length && pipes[0].x < -PIPE_WIDTH) {
    pipes.shift();
  }
  // 得分判斷：當小鳥中心點通過管子中心點時記分
  pipes.forEach(p => {
    if (!p.scored && (bird.x + bird.width / 2 > p.x + PIPE_WIDTH / 2)) {
      score++;
      p.scored = true;
      sounds.score.currentTime = 0;
      sounds.score.play();
    }
  });
}

function checkCollision() {
  if (gameOver) return;
  pipes.forEach(p => {
    if (bird.x + bird.width > p.x && bird.x < p.x + PIPE_WIDTH) {
      if (bird.y < p.topPipeBottom || bird.y + bird.height > p.topPipeBottom + pipeGap) {
        triggerGameOver();
      }
    }
  });
}

function triggerGameOver() {
  if (!gameOver) {
    gameOver = true;
    sounds.death.play();
    setTimeout(() => { canRestart = true; }, 500);
  }
}

// ===========================
// 事件處理區
// ===========================

function handleInput() {
  if (!gameStarted) {
    gameStarted = true;
    sounds.bgMusic.play();
  } else if (gameOver && canRestart) {
    resetGame();
  } else if (!gameOver) {
    flyUp();
  }
}

function flyUp() {
  if (!gameOver) {
    bird.velocity = bird.lift;
    sounds.jump.currentTime = 0;
    sounds.jump.play();
  }
}

document.addEventListener('keydown', e => {
  if (e.code === 'Space' && !e.repeat) {
    handleInput();
  }
});
document.addEventListener('click', () => {
  handleInput();
});

function resetGame() {
  gameStarted = false;
  gameOver = false;
  canRestart = false;
  score = 0;
  bird.x = 50;
  bird.y = 150;
  bird.velocity = 0;
  pipes = [];
  frameCount = 0;
  groundX = 0;
  // 背景音樂持續播放，不重設
}

// ===========================
// Service Worker 註冊
// ===========================
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js')
      .then(registration => {
        console.log('Service Worker registered with scope:', registration.scope);
      })
      .catch(error => {
        console.log('Service Worker registration failed:', error);
      });
  });
}

// ===========================
// 主遊戲迴圈
// ===========================

function gameLoop() {
  frameCount++;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  drawBackground();
  
  if (gameStarted) {
    if (!gameOver) {
      updateBird();
      updatePipes();
      updateGround();
      checkCollision();
    }
    drawPipes();
    drawGround();
    drawBird();
    drawScore();
  } else {
    updateGround();
    drawGround();
    drawBird();
  }
  
  drawOverlay();
  requestAnimationFrame(gameLoop);
}

gameLoop();
