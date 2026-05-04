const canvas = document.querySelector("#scene");
const ctx = canvas.getContext("2d");

const colors = [
  { core: "255, 255, 255", glow: "255, 255, 255" },
  { core: "255, 43, 77", glow: "255, 43, 77" },
  { core: "255, 120, 180", glow: "255, 120, 180" }
];

const fireworks = [];
const particles = [];
const shapeOverlays = [];
const fireworkTexts = ["ATEH", "VALERIE", "HAPPY BIRTHDAY", "HAPPY VALENTINES", "ENJOY"];
const maxParticles = 430;

let width = 0;
let height = 0;
let pixelRatio = 1;
let lastTime = 0;
let fireworkTimer = 0;
let textPool = [];
let fireworksStarted = false;
let animationFrameId = 0;

function random(min, max) {
  return Math.random() * (max - min) + min;
}

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function shuffle(list) {
  const shuffled = [...list];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}

function nextFireworkText() {
  if (!textPool.length) {
    textPool = shuffle(fireworkTexts);
  }

  return textPool.pop();
}

function resize() {
  pixelRatio = Math.min(window.devicePixelRatio || 1, 1.1);
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = Math.floor(width * pixelRatio);
  canvas.height = Math.floor(height * pixelRatio);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
}

function launchFirework(preferredKind) {
  const color = pick(colors);
  const roll = Math.random();
  const kind = preferredKind || (roll < 0.34 ? "text" : roll < 0.54 ? "heart" : "burst");

  fireworks.push({
    x: random(width * 0.15, width * 0.85),
    y: height + 20,
    targetY: random(height * 0.13, height * 0.48),
    speed: random(520, 720),
    color,
    kind,
    text: kind === "text" ? nextFireworkText() : "",
    trail: []
  });
}

function addParticle(x, y, vx, vy, color, options = {}) {
  if (particles.length > maxParticles) {
    particles.splice(0, particles.length - maxParticles);
  }

  particles.push({
    x,
    y,
    vx,
    vy,
    life: options.life || random(0.75, 1.45),
    maxLife: 1,
    radius: options.radius || random(1.4, 3.2),
    color,
    gravity: options.gravity ?? random(55, 90),
    targetX: options.targetX,
    targetY: options.targetY,
    hold: options.hold || 0,
    settle: options.settle || 0,
    mode: options.mode || "free"
  });
}

function addShapeOverlay(x, y, color, type, text = "") {
  shapeOverlays.push({
    x,
    y,
    startY: y,
    color,
    type,
    text,
    age: 0,
    life: type === "text" ? 2.35 : 2.05,
    scale: 0.35,
    rotation: random(-0.06, 0.06)
  });
}

function burst(x, y, color, kind = "burst", text = "") {
  if (kind === "heart") {
    addShapeOverlay(x, y, color, "heart");
  } else if (kind === "text") {
    addShapeOverlay(x, y, color, "text", text);
  }

  const count = kind === "burst" ? Math.floor(random(14, 26)) : Math.floor(random(5, 9));

  for (let index = 0; index < count; index += 1) {
    const angle = (Math.PI * 2 * index) / count + random(-0.08, 0.08);
    const speed = kind === "burst" ? random(80, 270) : random(35, 120);
    addParticle(
      x,
      y,
      Math.cos(angle) * speed,
      Math.sin(angle) * speed,
      color,
      {
        life: kind === "burst" ? random(0.75, 1.45) : random(0.55, 0.9),
        radius: random(1.1, 2.4),
        gravity: kind === "burst" ? random(55, 90) : random(12, 35)
      }
    );
  }

  const sparkleCount = kind === "burst" ? 5 : 2;
  for (let index = 0; index < sparkleCount; index += 1) {
    const angle = random(0, Math.PI * 2);
    const speed = random(20, 95);
    addParticle(
      x,
      y,
      Math.cos(angle) * speed,
      Math.sin(angle) * speed,
      colors[0],
      {
        life: random(1.1, 1.9),
        radius: random(2.5, 5),
        gravity: random(20, 45)
      }
    );
  }
}

function updateFireworks(delta) {
  for (let index = fireworks.length - 1; index >= 0; index -= 1) {
    const firework = fireworks[index];
    firework.trail.push({ x: firework.x, y: firework.y });
    if (firework.trail.length > 9) firework.trail.shift();

    firework.y -= firework.speed * delta;

    if (firework.y <= firework.targetY) {
      burst(firework.x, firework.y, firework.color, firework.kind, firework.text);
      fireworks.splice(index, 1);
    }
  }
}

function updateParticles(delta) {
  for (let index = particles.length - 1; index >= 0; index -= 1) {
    const particle = particles[index];
    particle.maxLife = Math.max(particle.maxLife, particle.life);

    if (particle.mode === "shape") {
      if (particle.settle > 0) {
        particle.vx *= 0.93;
        particle.vy *= 0.93;
        particle.x += (particle.targetX - particle.x) * 0.075;
        particle.y += (particle.targetY - particle.y) * 0.075;
        particle.settle -= delta;
      } else if (particle.hold > 0) {
        particle.x += (particle.targetX - particle.x) * 0.24;
        particle.y += (particle.targetY - particle.y) * 0.24;
        particle.vx *= 0.5;
        particle.vy *= 0.5;
        particle.hold -= delta;
      } else {
        particle.gravity = 65;
        particle.vx *= 0.985;
      }
    }

    particle.x += particle.vx * delta;
    particle.y += particle.vy * delta;
    particle.vy += particle.gravity * delta;
    particle.vx *= 0.988;
    particle.vy *= 0.992;
    particle.life -= delta;

    if (particle.life <= 0) {
      particles.splice(index, 1);
    }
  }
}

function updateShapeOverlays(delta) {
  for (let index = shapeOverlays.length - 1; index >= 0; index -= 1) {
    const shape = shapeOverlays[index];
    shape.age += delta;
    shape.scale += (1 - shape.scale) * 4.6 * delta;
    shape.y = shape.startY + Math.max(0, shape.age - 1.05) * 34;

    if (shape.age >= shape.life) {
      shapeOverlays.splice(index, 1);
    }
  }
}

function drawHeartOverlay(size) {
  ctx.beginPath();
  for (let index = 0; index <= 120; index += 1) {
    const t = (Math.PI * 2 * index) / 120;
    const hx = 16 * Math.pow(Math.sin(t), 3);
    const hy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
    const px = hx * size;
    const py = hy * size;

    if (index === 0) {
      ctx.moveTo(px, py);
    } else {
      ctx.lineTo(px, py);
    }
  }
  ctx.closePath();
  ctx.fill();
}

function drawShapeOverlays() {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (const shape of shapeOverlays) {
    const progress = Math.min(1, shape.age / shape.life);
    const intro = Math.min(1, shape.age / 0.25);
    const alpha = progress < 0.68 ? intro : Math.max(0, 1 - (progress - 0.68) / 0.32);
    const glow = `rgba(${shape.color.glow}, ${alpha})`;
    const fill = `rgba(${shape.color.core}, ${alpha})`;

    ctx.save();
    ctx.translate(shape.x, shape.y);
    ctx.rotate(shape.rotation);
    ctx.scale(shape.scale, shape.scale);
    ctx.shadowColor = glow;
    ctx.shadowBlur = shape.type === "text" ? 22 : 28;
    ctx.fillStyle = fill;

    if (shape.type === "text") {
      const textLength = shape.text.length;
      const landscapePhone = width > height && height <= 520;
      const maxTextWidth = landscapePhone ? width * 0.68 : width * 0.82;
      const sizeRatio = landscapePhone ? 0.075 : 0.115;
      const maxFont = landscapePhone
        ? textLength > 14 ? 26 : textLength > 8 ? 34 : 42
        : textLength > 14 ? 46 : textLength > 8 ? 58 : 74;
      let fontSize = Math.min(width * sizeRatio, maxFont);
      ctx.font = `900 ${fontSize}px Arial, Helvetica, sans-serif`;
      while (ctx.measureText(shape.text).width > maxTextWidth && fontSize > 18) {
        fontSize -= 2;
        ctx.font = `900 ${fontSize}px Arial, Helvetica, sans-serif`;
      }
      ctx.lineWidth = Math.max(2, fontSize * 0.055);
      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.62})`;
      ctx.strokeText(shape.text, 0, 0);
      ctx.fillText(shape.text, 0, 0);
    } else {
      drawHeartOverlay(Math.min(width, height) * 0.01);
      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.55})`;
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }

    ctx.restore();
  }

  ctx.restore();
}

function drawFireworks() {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  for (const firework of fireworks) {
    for (let index = 0; index < firework.trail.length; index += 1) {
      const point = firework.trail[index];
      const alpha = index / firework.trail.length;
      ctx.fillStyle = `rgba(${firework.color.core}, ${alpha * 0.4})`;
      ctx.beginPath();
      ctx.arc(point.x, point.y, 2 + alpha * 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = `rgba(${firework.color.core}, 1)`;
    ctx.shadowColor = `rgba(${firework.color.glow}, 0.9)`;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(firework.x, firework.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const particle of particles) {
    const alpha = Math.max(0, particle.life / particle.maxLife);
    const radius = particle.radius * (0.6 + alpha * 0.9);
    ctx.fillStyle = `rgba(${particle.color.core}, ${alpha})`;
    ctx.shadowColor = `rgba(${particle.color.glow}, ${alpha})`;
    ctx.shadowBlur = 7;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawBackground(time) {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "rgba(0, 0, 0, 0.18)";
  ctx.fillRect(0, 0, width, height);
}

function animate(currentTime) {
  const delta = Math.min(0.033, (currentTime - lastTime) / 1000 || 0.016);
  const time = currentTime / 1000;
  lastTime = currentTime;
  fireworkTimer -= delta;

  if (fireworkTimer <= 0) {
    launchFirework("burst");
    if (Math.random() > 0.42) launchFirework();
    if (Math.random() > 0.64) launchFirework("text");
    fireworkTimer = random(0.62, 1.05);
  }

  updateFireworks(delta);
  updateParticles(delta);
  updateShapeOverlays(delta);
  drawBackground(time);
  drawFireworks();
  drawShapeOverlays();

  animationFrameId = requestAnimationFrame(animate);
}

window.addEventListener("resize", resize);

window.startFireworksShow = function() {
  if (fireworksStarted) return;
  fireworksStarted = true;
  fireworks.length = 0;
  particles.length = 0;
  shapeOverlays.length = 0;
  fireworkTimer = 0;
  lastTime = 0;
  resize();
  canvas.classList.add("fireworks-active");
  ctx.clearRect(0, 0, width, height);
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }
  animationFrameId = requestAnimationFrame(animate);
};
