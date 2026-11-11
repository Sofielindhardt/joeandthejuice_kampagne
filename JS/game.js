"use strict";

/* =========================================
   SLICE INTO CHRISTMAS
   JOE & THE JUICE – ADVENTSSPIL
========================================= */

/* HTML-ELEMENTER */

const $ = (selector) => document.querySelector(selector);

const canvas = $("#game");
const ctx = canvas.getContext("2d");

// SLICE-LYD
const sliceSound = new Audio("sound/slice_the_secret_fruit_slice.wav");

function playSliceSound() {
  sliceSound.currentTime = 0;
  sliceSound.play();
}

// BOMBE-LYD
const bombSound = new Audio("sound/slice_the_secret_bomb_hit.wav");



/* =========================================
   BILLEDER OG INGREDIENSER
========================================= */

// Billedstier er relative til index.html

const imagePaths = [
  "img/appelsin.png", // 0
  "img/hindbaer.png", // 1
  "img/tranebaer.png", // 2
  "img/æble.png", // 3
  "img/ingefaer.png", // 4
  "img/julekugle1.png", // 5: Bombe
  "img/julekugle2.png", // 6: Bombe
];

const fruitImages = imagePaths.map((path) => {
  const image = new Image();
  image.src = path;

  image.onerror = () => {
    console.error("Kunne ikke indlæse billedet:", path);
  };

  return image;
});

const palette = [
  "#e67b17",
  "#c41d43",
  "#9f183b",
  "#d64443",
  "#ce9e62",
  "#ff4166",
  "#ff4166",
];

/* =========================================
   POINT OG SPILREGLER
========================================= */

const POINTS_FRUIT = 10;
const POINTS_BOMB = -20;

const GAME_DURATION = 25;

// Sandsynlighed for at en julekugle dukker op
const BOMB_CHANCE = 0.15;

/* =========================================
   GEMT ADVENTSFREMGANG
========================================= */

const KEY = "joe-advent-demo-v1";

let completed = 0;

try {
  completed = Math.max(0, Math.min(4, Number(localStorage.getItem(KEY)) || 0));
} catch {
  // Spillet kan stadig bruges uden localStorage
}

/* =========================================
   SPILLETS VARIABLER
========================================= */

let w = 0;
let h = 0;
let dpr = 1;

let fruits = [];
let particles = [];
let trail = [];
let floats = [];

let playing = false;
let paused = false;

let remaining = GAME_DURATION;
let score = 0;
let round = 1;

let spawn = 0;
let last = 0;

let drag = false;
let previous = null;

let combo = 0;
let comboTime = 0;

let action = "start";

/* =========================================
   RESPONSIV CANVAS
========================================= */

function resize() {
  const rect = canvas.getBoundingClientRect();

  w = rect.width;
  h = rect.height;

  dpr = Math.min(window.devicePixelRatio || 1, 2);

  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

if (typeof ResizeObserver !== "undefined") {
  new ResizeObserver(resize).observe(canvas);
} else {
  window.addEventListener("resize", resize);
}

resize();

/* =========================================
   OPDATER POINT
========================================= */

function updateScore() {
  $("#score").textContent = String(score).padStart(3, "0");
}

/* =========================================
   ADVENTSFREMGANG
========================================= */

function updateProgress() {
  $("#count").textContent = completed + " / 4";

  $("#days").innerHTML = Array.from({ length: 4 }, (_, i) => {
    const status = i < completed ? "done" : i === completed ? "current" : "";

    return `
        <div class="day ${status}">
          <b>${i < completed ? "✓" : i + 1}</b>
          <small>${i + 1}. ADVENT</small>
        </div>
      `;
  }).join("");

  $("#voucher").hidden = completed < 4;

  if (completed === 4) {
    $("#progressText").textContent =
      "Alle fire adventsrunder er gennemført. " + "Din demovoucher er klar!";
  } else {
    $("#progressText").textContent =
      "Gennemfør en runde hver adventssøndag, " +
      "og få én gratis juledrink efter alle fire.";
  }
}

function initial() {
  updateProgress();

  $("#start").innerHTML =
    completed < 4
      ? `SPIL ${completed + 1}. ADVENT <span>↗</span>`
      : "SPIL IGEN <span>↗</span>";

  $("#roundLabel").textContent = Math.min(completed + 1, 4) + ". ADVENT";
}

initial();

/* =========================================
   DIALOGER
========================================= */

function showModal(html) {
  $("#modalContent").innerHTML = html;

  if (!$("#modal").open) {
    $("#modal").showModal();
  }
}

$(".close").onclick = () => {
  $("#modal").close();
};

$("#modal").addEventListener("click", (event) => {
  if (event.target === $("#modal")) {
    $("#modal").close();
  }
});

/* =========================================
   SPILLEREGLER
========================================= */

$("#rulesBtn").onclick = () => {
  if (playing && !paused) {
    togglePause();
  }

  showModal(`
    <div class="eyebrow">SÅDAN SPILLER DU</div>

    <h2>
      ET SWIPE.<br>
      ET LILLE SMIL.
    </h2>

    <ol>
      <li>
        Start en runde på 25 sekunder.
      </li>

      <li>
        Swipe gennem frugterne med musen
        eller fingeren.
      </li>

      <li>
        Hver frugt giver 10 point.
      </li>

      <li>
        Pas på julekuglerne!
        De trækker 20 point fra.
      </li>

      <li>
        Gennemfør alle fire adventsrunder
        for at låse op for demovoucheren.
      </li>
    </ol>

    <p>
      <b>Prototype:</b>
      Alle adventsrunder kan spilles nu.
      Ingen rigtig præmie eller app-integration.
    </p>
  `);
};

/* =========================================
   DEMOVOUCHER
========================================= */

function voucher() {
  if (completed < 4) return;

  showModal(`
    <div class="eyebrow">
      4 AF 4 · GENNEMFØRT
    </div>

    <h2>
      FRA JULESWIPE<br>
      TIL JULESMAG.
    </h2>

    <div class="ticket">
      <span>
        DEMO · IKKE GYLDIG I BUTIK
      </span>

      <strong>
        ÉN GRATIS<br>
        MERRY BERRY BOOST
      </strong>

      <p>
        Din adventsrejse er gennemført.
      </p>
    </div>

    <p>
      I den færdige kampagne skal voucheren
      være tilgængelig i Joe & The Juice-appen.

      Denne prototype udsteder
      ingen rigtig voucher.
    </p>
  `);
}

$("#voucher").onclick = voucher;

/* =========================================
   NULSTIL SPILLET
========================================= */

$("#reset").onclick = () => {
  showModal(`
    <h2>START FORFRA?</h2>

    <p>
      Vil du nulstille dine fire adventsrunder?
    </p>

    <button class="primary" id="confirmReset">
      NULSTIL DEMO ↗
    </button>
  `);

  $("#confirmReset").onclick = () => {
    playing = false;
    paused = false;
    completed = 0;

    try {
      localStorage.removeItem(KEY);
    } catch {
      // Fortsæt uden localStorage
    }

    fruits = [];
    particles = [];
    trail = [];
    floats = [];

    score = 0;
    remaining = GAME_DURATION;

    updateScore();

    $("#time").textContent = GAME_DURATION;

    $("#pause").hidden = true;
    $("#overlay").hidden = false;

    $("#overlayTitle").innerHTML = "KLAR TIL<br>ET JULESWIPE?";

    $("#overlayText").innerHTML =
      "Hold musen nede eller stryg med fingeren.<br>" +
      "Skær frugterne, og undgå julekuglerne!";

    $("#overlayTag").textContent = "DIT ADVENTSØJEBLIK";

    $("#overlayFine").textContent = "+10 for frugt. -20 for julekugle.";

    action = "start";

    initial();

    $("#modal").close();
  };
};

/* =========================================
   START SPILLET
========================================= */

function start() {
  if (action === "resume") {
    togglePause();
    return;
  }

  round = Math.min(completed + 1, 4);

  fruits = [];
  particles = [];
  trail = [];
  floats = [];

  remaining = GAME_DURATION;
  score = 0;

  combo = 0;
  comboTime = 0;

  spawn = 0.1;

  playing = true;
  paused = false;
  drag = false;

  previous = null;

  $("#overlay").hidden = true;
  $("#pause").hidden = false;

  $("#pause").textContent = "Ⅱ";

  updateScore();

  $("#time").textContent = GAME_DURATION;

  $("#roundLabel").textContent = round + ". ADVENT";

  last = performance.now();

  canvas.focus();
}

let countdownRunning = false;

$("#start").onclick = () => {
  // Hvis spillet er på pause
  if (action === "resume") {
    start();
    return;
  }

  // Undgå at starte flere countowns
  if (countdownRunning) return;

  countdownRunning = true;

  const countdown = $("#countdown");
  const number = $("#countdownNumber");

  // Skjul startskærmen under countdown
  $("#overlay").hidden = true;

  countdown.hidden = false;

  countdownSound.currentTime = 0;
  countdownSound.play();

  const steps = ["3", "2", "1", "SLICE!"];
  let index = 0;

  function showNumber() {
    number.textContent = steps[index];

    // Genstart animationen
    number.style.animation = "none";
    void number.offsetWidth;
    number.style.animation = "countdownPop 0.8s ease-out";
  }

  showNumber();

  const interval = setInterval(() => {
    index++;

    if (index < steps.length) {
      showNumber();
    } else {
      clearInterval(interval);

      countdown.hidden = true;
      countdownRunning = false;

      start();
    }
  }, 1000);
};

/* =========================================
   PAUSE
========================================= */

function togglePause() {
  if (!playing) return;

  paused = !paused;

  $("#pause").textContent = paused ? "▶" : "Ⅱ";

  $("#overlay").hidden = !paused;

  if (paused) {
    action = "resume";

    $("#overlayTag").textContent = "TAG EN LILLE PAUSE";

    $("#overlayTitle").innerHTML = "JULEN KAN<br>GODT VENTE.";

    $("#overlayText").textContent = "Din tid og dine point venter på dig.";

    $("#start").innerHTML = "FORTSÆT <span>↗</span>";
  } else {
    action = "start";

    last = performance.now();
    canvas.focus();
  }

  drag = false;
  previous = null;
}

$("#pause").onclick = togglePause;

document.addEventListener("visibilitychange", () => {
  if (document.hidden && playing && !paused) {
    togglePause();
  }
});

/* =========================================
   AFSLUT RUNDE
========================================= */

function finish() {
  playing = false;
  paused = false;
  drag = false;

  const wasDone = completed === 4;

  if (!wasDone) {
    completed++;

    try {
      localStorage.setItem(KEY, completed);
    } catch {
      // Fremgangen gemmes kun i sessionen
    }
  }

  updateProgress();

  $("#pause").hidden = true;
  $("#overlay").hidden = false;

  $("#overlayTag").textContent = wasDone
    ? "BARE FOR SJOV"
    : completed + " AF 4 ADVENTSDAGE";

  $("#overlayTitle").innerHTML =
    completed === 4
      ? "DIN JULESMAG<br>VENTER PÅ DIG."
      : "GODT SKÅRET.<br>VI SES IGEN!";

  $("#overlayText").innerHTML = `
    Du fik <strong>${score} point</strong>.
    <br>
    ${
      completed === 4
        ? "Alle fire adventsrunder er gennemført!"
        : "Din deltagelse er registreret."
    }
    <br>
    ${
      completed === 4
        ? "Åbn din demovoucher i adventsoversigten."
        : "I demoen kan du prøve næste advent med det samme."
    }
  `;

  $("#start").innerHTML =
    completed < 4
      ? `SPIL ${completed + 1}. ADVENT <span>↗</span>`
      : "SPIL IGEN <span>↗</span>";

  $("#overlayFine").textContent = "+10 for frugt. -20 for julekugle.";

  action = "start";

  $("#announce").textContent =
    `Runde gennemført med ${score} point. ` + `${completed} af 4 adventsdage.`;
}

/* =========================================
   OPRET FRUGTER OG BOMBER
========================================= */

function makeFruit() {
  const radius = 30 + Math.random() * 12;

  // 15 % chance for en julekugle
  const isBomb = Math.random() < BOMB_CHANCE;

  let type;

  if (isBomb) {
    // Vælg mellem de to julekugler
    type = Math.random() < 0.5 ? 5 : 6;
  } else {
    // Vælg mellem fem ingredienser
    type = Math.floor(Math.random() * 5);
  }

  fruits.push({
    x: w * (0.16 + Math.random() * 0.68),

    y: h + radius,

    vx: (Math.random() - 0.5) * 110,

    vy: -(470 + Math.random() * 140) * Math.pow(h / 580, 0.5),

    r: radius,

    type: type,
    isBomb: isBomb,

    a: Math.random() * 6,

    spin: (Math.random() - 0.5) * 2,

    cut: false,
  });
}

/* =========================================
   TEGN FRUGTER OG BLINKENDE JULEKUGLER
========================================= */

function fruit(f) {
  const image = fruitImages[f.type];

  if (!image || !image.complete || !image.naturalWidth) {
    return;
  }

  ctx.save();

  ctx.translate(f.x, f.y);
  ctx.rotate(f.a);

  const r = f.r;

  /* JULEKUGLER – DISKRET BLINKEEFFEKT */

  if (f.isBomb) {
    const time = performance.now() / 1000;

    // Blød og langsom blinkeeffekt
    const blink = (Math.sin(time * 7) + 1) / 2;

    // Diskret rød glød
    ctx.shadowColor = "#ff0000ff";
    ctx.shadowBlur = 50 + blink * 28;
    ctx.shadowOffsetY = 0;

    // Let variation i gennemsigtighed
    ctx.globalAlpha = 0.85 + blink * 0.15;
  } else {
    /* ALMINDELIGE FRUGTER */

    ctx.shadowColor = "#0008";
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 5;
  }

  /* OPDEL FRUGTEN VED SLICE */

  if (f.cut && f.side) {
    ctx.rotate(f.side * 0.4);

    ctx.beginPath();

    if (f.side < 0) {
      ctx.rect(-r, -r, r, r * 2);
    } else {
      ctx.rect(0, -r, r, r * 2);
    }

    ctx.clip();
  }

  /* BEHOLD BILLEDETS PROPORTIONER */

  const maxSize = r * 2;

  const scale = Math.min(
    maxSize / image.naturalWidth,
    maxSize / image.naturalHeight,
  );

  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;

  /* TEGN BILLEDET */

  ctx.drawImage(image, -width / 2, -height / 2, width, height);

  ctx.restore();
}

/* =========================================
   RAM EN FRUGT ELLER JULEKUGLE
========================================= */

function slice(f) {
  if (f.cut) return;

  f.cut = true;

  /* RAMT JULEKUGLE */

  if (f.isBomb) {
    bombSound.currentTime = 0;
    bombSound.play();

    score = Math.max(0, score + POINTS_BOMB);

    updateScore();

    combo = 0;
    comboTime = 0;

    // Vis -20 på skærmen
    floats.push({
      x: f.x,
      y: f.y,
      text: "-20",
      color: "#ff5b7e",
      t: 0.9,
      maxT: 0.9,
    });

    // Rød eksplosion
    for (let i = 0; i < 25; i++) {
      particles.push({
        x: f.x,
        y: f.y,

        vx: (Math.random() - 0.5) * 400,
        vy: (Math.random() - 0.5) * 400,

        r: 2 + Math.random() * 5,

        t: 0.7,
        maxT: 0.7,

        color: Math.random() < 0.5 ? "#ff4166" : "#ffd5e8",
      });
    }

    $("#announce").textContent = "Du ramte en julekugle. Minus 20 point.";

    return;
  }

  /* RAMT FRUGT */
  playSliceSound();

  function playBombSound() {
    bombSound.currentTime = 0;
    bombSound.play();
  }

  combo = comboTime > 0 ? combo + 1 : 1;
  comboTime = 0.4;

  score += POINTS_FRUIT;

  updateScore();

  // Saftpartikler
  for (let i = 0; i < 15; i++) {
    particles.push({
      x: f.x,
      y: f.y,

      vx: (Math.random() - 0.5) * 300,
      vy: (Math.random() - 0.5) * 250,

      r: 2 + Math.random() * 4,

      t: 0.65,
      maxT: 0.65,

      color: palette[f.type],
    });
  }

  // To halve frugter
  for (const side of [-1, 1]) {
    particles.push({
      ...f,

      side: side,
      cut: true,

      vx: side * 95,
      vy: -65,

      t: 0.65,
      maxT: 0.65,

      half: true,
    });
  }

  // Pointtekst
  floats.push({
    x: f.x,
    y: f.y,

    text: combo > 1 ? `+10 · ${combo}×` : "+10",

    color: "#ffd5e8",

    t: 0.65,
    maxT: 0.65,
  });
}

/* =========================================
   AFSTAND FRA SWIPE TIL FRUGT
========================================= */

function segment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;

  const t = Math.max(
    0,
    Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1)),
  );

  return Math.hypot(px - ax - t * dx, py - ay - t * dy);
}

/* =========================================
   MUS OG TOUCH
========================================= */

function pointer(event) {
  const rect = canvas.getBoundingClientRect();

  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}

function swipe(point) {
  if (!playing || paused) return;

  const from = previous || point;

  for (const f of fruits) {
    const distance = segment(
      f.x,
      f.y,

      from.x,
      from.y,

      point.x,
      point.y,
    );

    if (!f.cut && distance < f.r + 7) {
      slice(f);
    }
  }

  trail.push({
    ...point,
    t: 0.16,
  });

  previous = point;
}

canvas.addEventListener("pointerdown", (event) => {
  if (!playing || paused) return;

  drag = true;
  previous = null;

  canvas.setPointerCapture(event.pointerId);

  swipe(pointer(event));
});

canvas.addEventListener("pointermove", (event) => {
  if (drag) {
    swipe(pointer(event));
  }
});

for (const eventName of ["pointerup", "pointercancel", "lostpointercapture"]) {
  canvas.addEventListener(eventName, () => {
    drag = false;
    previous = null;
  });
}

/* =========================================
   TASTATUR
========================================= */

canvas.addEventListener("keydown", (event) => {
  if (event.code === "Space") {
    event.preventDefault();

    if (playing && !paused) {
      const target = fruits.find((f) => !f.cut && f.y < h - 20);

      if (target) {
        slice(target);
      }
    }
  }

  if (event.code === "Escape") {
    togglePause();
  }
});

/* =========================================
   ANIMATION OG SPILLOOP
========================================= */

function frame(timestamp) {
  const elapsed = last ? Math.max(0, (timestamp - last) / 1000) : 0;

  const dt = Math.min(elapsed, 0.035);

  last = timestamp;

  ctx.clearRect(0, 0, w, h);

  if (playing && !paused) {
    /* NEDTÆLLING */

    remaining -= dt;
    comboTime -= dt;
    spawn -= dt;

    /* OPRET NYE FRUGTER */

    if (spawn <= 0) {
      const numberOfFruits = 2 + Math.floor(Math.random() * 2);

      for (let i = 0; i < numberOfFruits; i++) {
        makeFruit();
      }

      spawn = 0.85;
    }

    $("#time").textContent = Math.max(0, Math.ceil(remaining));

    /* FRUGTERNES FYSIK */

    for (const f of fruits) {
      f.x += f.vx * dt;
      f.y += f.vy * dt;

      f.vy += 450 * dt;
      f.a += f.spin * dt;
    }

    fruits = fruits.filter((f) => f.y < h + 100 && !f.cut);

    /* PARTIKLER OG HALVE FRUGTER */

    for (const p of particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      p.vy += 350 * dt;
      p.t -= dt;

      if (p.half) {
        p.a += p.side * dt * 3;
      }
    }

    /* FLYVENDE POINT */

    for (const f of floats) {
      f.y -= 45 * dt;
      f.t -= dt;
    }

    /* TIDEN ER GÅET */

    if (remaining <= 0) {
      remaining = 0;
      $("#time").textContent = "0";

      finish();
    }
  }

  /* TEGN FRUGTER OG BOMBER */

  for (const f of fruits) {
    fruit(f);
  }

  /* TEGN PARTIKLER */

  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, p.t / p.maxT);

    if (p.half) {
      fruit(p);
    } else {
      ctx.fillStyle = p.color;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);

      ctx.fill();
    }
  }

  ctx.globalAlpha = 1;

  particles = particles.filter((p) => p.t > 0);

  /* OPDATER SWIPE-SPOR */

  if (playing && !paused) {
    for (const point of trail) {
      point.t -= dt;
    }
  }

  trail = trail.filter((point) => point.t > 0);

  /* TEGN SWIPE-EFFEKT */

  if (trail.length > 1) {
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.shadowColor = "#ff88c6";
    ctx.shadowBlur = 18;

    ctx.strokeStyle = "#ffabd4";
    ctx.lineWidth = 5;

    ctx.beginPath();

    trail.forEach((point, index) => {
      if (index === 0) {
        ctx.moveTo(point.x, point.y);
      } else {
        ctx.lineTo(point.x, point.y);
      }
    });

    ctx.stroke();

    ctx.shadowBlur = 0;

    ctx.strokeStyle = "#fff1f8";
    ctx.lineWidth = 2;

    ctx.stroke();
  }

  /* TEGN POINTTEKST */

  ctx.font = "bold 22px Arial";
  ctx.textAlign = "center";

  for (const f of floats) {
    ctx.globalAlpha = Math.max(0, f.t / f.maxT);

    ctx.fillStyle = f.color;

    ctx.fillText(f.text, f.x, f.y);
  }

  ctx.globalAlpha = 1;

  floats = floats.filter((f) => f.t > 0);

  requestAnimationFrame(frame);
}

/* START ANIMATIONSLOOP */

requestAnimationFrame(frame);

// AFSPIL LYD VED KNAPKLIK
document.addEventListener("click", (event) => {
  if (event.target.closest("button")) {
    playButtonSound();
  }
});
