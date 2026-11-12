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

// LYD TIL SPILLETS SIDSTE 5 SEKUNDER
const finalCountdownSound = new Audio("sound/countdown5.mp3");
finalCountdownSound.preload = "auto";

let finalCountdownStarted = false;

// BOMBE-LYD
const bombSound = new Audio("sound/slice_the_secret_bomb_hit.wav");

// JULE-COUNTDOWN
const countdownSound = new Audio("sound/slice_the_secret_christmas_countdown_3_2_1.wav");

// KNAPLYD 🎄
const buttonSound = new Audio("sound/slice_the_secret_button_click.wav");

function playButtonSound() {
  buttonSound.currentTime = 0;
  buttonSound.play();
}

/* =========================================
   BILLEDER OG INGREDIENSER
========================================= */

// Billedstier er relative til index.html

const imagePaths = [
  "img/appelsin.png", // 0
  "img/hindbær.png", // 1
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

const GAME_DURATION = 20;

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

  const checkIcon = `
    <svg
      class="advent-check"
      viewBox="0 0 100 80"
      fill="none"
      aria-hidden="true"
    >
      <path d="M10 41 L36 67 L90 13" />
    </svg>
  `;

  const lockIcon = `
    <svg
      class="advent-lock"
      viewBox="0 0 48 56"
      fill="none"
      aria-hidden="true"
    >
      <path d="M13 24V15a11 11 0 0 1 22 0v9" />
      <rect x="7" y="24" width="34" height="27" rx="3" />
      <path d="M24 35v7" />
    </svg>
  `;

  $("#days").innerHTML = Array.from({ length: 4 }, (_, i) => {
    const done = i < completed;
    const current = i === completed;

    const status = done ? "done" : current ? "current" : "locked";
    const symbol = done ? checkIcon : current ? i + 1 : lockIcon;

    const description = done
      ? "Gennemført"
      : current
        ? "Klar til at spille"
        : "Låst";

    return `
      <div
        class="day ${status}"
        role="img"
        aria-label="${i + 1}. advent: ${description}"
      >
        <b aria-hidden="true">${symbol}</b>
        <small aria-hidden="true">${i + 1}. ADVENT</small>
      </div>
    `;
  }).join("");

  $("#voucher").hidden = completed < 4;

  $("#progressText").textContent =
    completed === 4
      ? "Alle fire adventsrunder er gennemført. Din voucher er klar!"
      : "Gennemfør alle 4 søndage og vind en voucher til vores Merry Berry Boost GRATIS.";
}

function initial() {
  updateProgress();

  $("#start").innerHTML = `
  ${completed < 4
    ? `SPIL ${completed + 1}. ADVENT`
    : "SPIL IGEN"
  }

  <svg
    class="start-arrow"
    viewBox="0 0 80 70"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M8 60 L63 13"
      stroke="currentColor"
      stroke-width="3"
    />
    <path
      d="M48 10 L73 5 L65 29 Z"
      fill="currentColor"
    />
  </svg>
`;

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

if ($("#rulesBtn"))
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
        for at låse op for voucheren.
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
    <article class="christmas-voucher">
      <div class="christmas-voucher-top">
        <img
          class="christmas-voucher-image"
          src="img/merryberryboost.png"
          alt="Merry Berry Boost juledrink"
        >

        <div class="christmas-voucher-copy">
          <h2>MERRY BERRY<br>BOOST</h2>


          <hr>

          <p class="christmas-voucher-details">
            Gyldig til og med d.31 december 2026.
          </p>
        </div>
      </div>

      <button
  type="button"
  class="christmas-wallet-button"
  id="addVoucherToWallet"
>
  <span>TILFØJ I WALLET</span>

  <svg class="voucher-arrow" viewBox="0 0 80 70"
       fill="none" aria-hidden="true">
    <path d="M8 60 L63 13"
          stroke="currentColor" stroke-width="3" />
    <path d="M48 10 L73 5 L65 29 Z"
          fill="currentColor" />
  </svg>
</button>

      <p
        class="christmas-wallet-status"
        id="walletStatus"
        role="status"
      >
    
    </article>
  `);

  const walletButton = $("#addVoucherToWallet");
  const walletStatus = $("#walletStatus");

  function showSavedVoucher() {
    walletButton.disabled = true;

    walletButton.innerHTML = `
  <span>TILFØJET I WALLET</span>

  
`;
    walletStatus.textContent =
      "";
  }

  try {
    if (localStorage.getItem("joe-christmas-voucher-demo") === "saved") {
      showSavedVoucher();
    }
  } catch {
    // Knappen kan stadig bruges uden localStorage
  }

  walletButton.onclick = () => {
    try {
      localStorage.setItem("joe-christmas-voucher-demo", "saved");
      showSavedVoucher();
  
      // Luk voucherboksen efter gemning
      $("#modal").close();
  
      // Flyt fokus tilbage til voucherknappen på siden
      $("#voucher").focus({ preventScroll: true });
    } catch {
      walletStatus.textContent =
        "Browseren kunne ikke gemme voucheren. Prøv igen.";
    }
  };
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
  finalCountdownSound.pause();
  finalCountdownSound.currentTime = 0;
  finalCountdownStarted = false;

  $(".timer").classList.remove("is-urgent", "is-paused", "timer-tick");

  playing = false;
  canvas.classList.remove("is-playing");
  paused = false;
  completed = 0;

  savedDeals = {};
  activeDealRound = null;

  try {
    localStorage.removeItem(KEY);
    localStorage.removeItem(DEALS_KEY);
    localStorage.removeItem("joe-christmas-voucher-demo");
  } catch {
    // Fortsæt uden localStorage
  }

  // Resten af din eksisterende nulstillingskode fortsætter her

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

    $("#overlayTitle").innerHTML = "KLAR TIL<br>AT SLICE?";

    $("#overlayText").innerHTML =
      "Stryg med fingeren.<br>" +
      "Skær frugterne, og undgå julekuglerne!";

    $("#overlayTag").textContent = "JOE & THE JUICE";

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
  
    finalCountdownSound.pause();
    finalCountdownSound.currentTime = 0;
    finalCountdownStarted = false;
  
    // Her beholder du resten af din eksisterende kode

  $(".timer").classList.remove("is-urgent", "is-paused", "timer-tick");

  round = Math.min(completed + 1, 4);

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
  canvas.classList.add("is-playing");
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

/* =========================================
   REGLER → COUNTDOWN → SPIL
========================================= */

let countdownRunning = false;
let countdownInterval = null;

const rulesDialog = $("#rulesDialog");
const rulesStart = $("#rulesStart");
const closeRules = $("#closeRules");

/* Den oprindelige spilknap åbner reglerne */
$("#start").onclick = () => {
  // Fortsæt et pauset spil uden regler og countdown
  if (action === "resume") {
    start();
    return;
  }

  if (playing || countdownRunning || rulesDialog.open) {
    return;
  }

  rulesDialog.showModal();

  // Fokus på overskriften, så kortet starter øverst
  $("#rulesTitle").focus();
};

/* Luk reglerne uden at starte noget */
closeRules.onclick = () => {
  rulesDialog.close();
};

/* Start først countdown, når brugeren bekræfter */
rulesStart.onclick = () => {
  if (countdownRunning || playing) return;

  rulesDialog.close();
  beginCountdown();
};

function beginCountdown() {
  if (countdownRunning || playing) return;

  countdownRunning = true;

  const countdown = $("#countdown");
  const number = $("#countdownNumber");
  const steps = ["3", "2", "1", "SLICE!"];

  let index = 0;

  // Skjul startskærmen. Selve spillet er ikke startet endnu.
  $("#overlay").hidden = true;
  countdown.hidden = false;

  // Undgå nulstilling eller andre dialoger under countdown
  $("#reset").disabled = true;
  $("#voucher").disabled = true;

  if ($("#rulesBtn")) {
    $("#rulesBtn").disabled = true;
  }

  countdownSound.currentTime = 0;

  // Countdown virker også, hvis browseren blokerer lyden
  countdownSound.play().catch(() => {});

  function showNumber() {
    number.textContent = steps[index];

    number.style.animation = "none";
    void number.offsetWidth;
    number.style.animation = "countdownPop 0.8s ease-out";
  }

  showNumber();

  countdownInterval = window.setInterval(() => {
    index++;

    if (index < steps.length) {
      showNumber();
      return;
    }

    clearCountdown();

    // Først nu starter spillet og dets 20 sekunder
    start();
  }, 1000);
}

function clearCountdown() {
  window.clearInterval(countdownInterval);

  countdownInterval = null;
  countdownRunning = false;

  $("#countdown").hidden = true;

  countdownSound.pause();
  countdownSound.currentTime = 0;

  $("#reset").disabled = false;
  $("#voucher").disabled = false;

  if ($("#rulesBtn")) {
    $("#rulesBtn").disabled = false;
  }
}

/* Forlad fanen under countdown → gå tilbage til start */
document.addEventListener("visibilitychange", () => {
  if (document.hidden && countdownRunning) {
    clearCountdown();
    $("#overlay").hidden = false;
  }
});

/* =========================================
   PAUSE
========================================= */

function togglePause() {
  if (!playing) return;

  paused = !paused;
  if (paused) {
    finalCountdownSound.pause();
  } else if (finalCountdownStarted && remaining > 0) {
    finalCountdownSound.play().catch(() => {});
  }
  canvas.classList.toggle("is-playing", !paused);

  $(".timer").classList.toggle("is-paused", paused);

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
  finalCountdownSound.pause();
  finalCountdownSound.currentTime = 0;
  finalCountdownStarted = false;

  $(".timer").classList.remove("is-urgent", "is-paused", "timer-tick");

  playing = false;
  canvas.classList.remove("is-playing");
  paused = false;
  drag = false;
  
    // Fjern frugter, bomber, partikler og swipe-spor
    fruits = [];
    particles = [];
    trail = [];
    floats = [];
    previous = null;
  
    // Ryd selve tegnefladen
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  
    canvas.classList.remove("is-playing");

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
      ? "DIN VOUCHER<br>VENTER PÅ DIG."
      : "GODT SKÅRET.<br>VI SES NÆSTE SØNDAG!";

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
        ? "Åbn din voucher i adventsoversigten."
        : "Prøv næste advent med det samme."
    }
  `;

  $("#start").innerHTML = `
  ${completed < 4
    ? `SPIL ${completed + 1}. ADVENT`
    : "SPIL IGEN"
  }

  <svg
    class="start-arrow"
    viewBox="0 0 80 70"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M8 60 L63 13"
      stroke="currentColor"
      stroke-width="3"
    />
    <path
      d="M48 10 L73 5 L65 29 Z"
      fill="currentColor"
    />
  </svg>
`;

  $("#overlayFine").textContent = "+10 for frugt. -20 for julekugle.";

  action = "start";

  $("#announce").textContent =
    `Runde gennemført med ${score} point. ` + `${completed} af 4 adventsdage.`;

    // Ét tilbud for hver af de fire adventsrunder
if (!wasDone) {
  openDeals(completed);
}

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
    // Tallene henviser til billederne i imagePaths:
    // 0 = appelsin
    // 1 = hindbær
    // 2 = tranebær
    // 3 = æble
    // 4 = ingefær
  
    const adventIngredients = [
      [1, 2],          // 1. advent: hindbær og tranebær
      [1, 2, 0],       // 2. advent: + appelsin
      [1, 2, 0, 3],    // 3. advent: + æble
      [1, 2, 0, 3, 4]  // 4. advent: + ingefær
    ];
  
    const available = adventIngredients[round - 1];
  
    type = available[
      Math.floor(Math.random() * available.length)
    ];
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
    shakeGame();
  
    // Kort vibration på telefoner, der understøtter det
    if (typeof navigator.vibrate === "function") {
      navigator.vibrate(100);
    }
  
    bombSound.currentTime = 0;
    bombSound.play().catch(() => {});

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
    // Afspil én gang, når der er 5 sekunder tilbage
if (
  remaining > 0 &&
  remaining <= 5 &&
  !finalCountdownStarted
) {
  finalCountdownStarted = true;
  finalCountdownSound.currentTime = 0;
  finalCountdownSound.play().catch(() => {});
}
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

    const secondsLeft = Math.max(0, Math.ceil(remaining));
    const timer = $(".timer");
    const timeText = $("#time");
    
    // Tjek, om tallet har skiftet, før vi opdaterer det
    const secondChanged = timeText.textContent.trim() !== String(secondsLeft);
    
    timeText.textContent = secondsLeft;
    
    const urgent = secondsLeft > 0 && secondsLeft <= 5;
    
    timer.classList.toggle("is-urgent", urgent);
    
    if (urgent && secondChanged) {
      // Start en ny puls præcis ved hvert sekundskift
      timer.classList.remove("timer-tick");
      void timer.offsetWidth;
      timer.classList.add("timer-tick");
    }
    
    if (!urgent) {
      timer.classList.remove("timer-tick");
    }

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


/* SNE I BAGGRUNDEN */
(() => {
  const container = document.getElementById("snowfall");
  if (!container) return;

  container.replaceChildren();

  const amount = window.innerWidth < 600 ? 25 : 45;
  const fragment = document.createDocumentFragment();

  for (let i = 0; i < amount; i++) {
    const flake = document.createElement("span");
    flake.className = "snowflake";

    const duration = 18 + Math.random() * 14;

    flake.style.setProperty("--snow-left", `${Math.random() * 100}%`);
    flake.style.setProperty("--snow-size", `${4 + Math.random() * 5}px`);
    flake.style.setProperty("--snow-duration", `${duration}s`);

    // Sneen er allerede fordelt på skærmen ved indlæsning
    flake.style.setProperty(
      "--snow-delay",
      `${-Math.random() * duration}s`
    );

    flake.style.setProperty(
      "--snow-drift",
      `${Math.random() * 80 - 40}px`
    );

    fragment.appendChild(flake);
  }

  container.appendChild(fragment);
})();

/* =========================================
   TILBUD EFTER HVER ADVENTSRUNDE
========================================= */

const DEALS_KEY = "joe-advent-deals-demo-v1";

/* Forslag til produkter og demopriser */
const dealProducts = {
  storm: {
    name: "Iced Sesame Storm",
    description: "En kold kaffepause.",
    image: "img/stormlatte.png",
    price: 60
  },

  avocado: {
    name: "Avocado",
    description: "En sandwich til din pause.",
    image: "img/avocado.png",
    price: 81
  },

  carrot: {
    name: "Carrot Cake",
    description: "Noget sødt til kaffen.",
    image: "img/carrotcake.png",
    price: 40
  },

  feelgood: {
    name: "Feel Good",
    description: "En frisk pause i december.",
    image: "img/feelgood.png",
    price: 65
  },

  muscle: {
    name: "Muscle Up",
    description: "Prøv noget andet næste gang.",
    image: "img/muscleup.png",
    price: 70
  },

  latte: {
    name: "Iced Latte",
    description: "Din kaffepause på is.",
    image: "img/icedlatte.png",
    price: 55
  },

  matcha: {
    name: "Iced Matcha",
    description: "En grøn pause på is.",
    image: "img/icedmatcha.png",
    price: 60
  }
};

/* Tre forskellige valgmuligheder i hver runde */
const adventDeals = [
  ["storm", "avocado", "carrot"],
  ["feelgood", "latte", "matcha"],
  ["muscle", "avocado", "carrot"],
  ["matcha", "storm", "feelgood"]
];

const dealsDialog = document.getElementById("dealsDialog");
const dealsForm = document.getElementById("dealsForm");
const dealCards = document.getElementById("dealCards");
const confirmDeal = document.getElementById("confirmDeal");

let activeDealRound = null;

function formatDealPrice(price) {
  return price.toLocaleString("da-DK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }) + " kr.";
}

/* Hent tidligere valg fra denne browser */
function readSavedDeals() {
  try {
    const saved = JSON.parse(localStorage.getItem(DEALS_KEY));

    if (saved && typeof saved === "object" && !Array.isArray(saved)) {
      return saved;
    }
  } catch {
    // Fortsæt, selvom lagring ikke er tilgængelig
  }

  return {};
}

let savedDeals = readSavedDeals();

function openDeals(roundNumber) {
  const choices = adventDeals[roundNumber - 1];

  if (!choices || savedDeals[roundNumber]) return;

  activeDealRound = roundNumber;
  confirmDeal.disabled = true;

  document.getElementById("dealStatus").textContent = "";

  dealCards.innerHTML = choices.map((productId) => {
    const product = dealProducts[productId];
    const discountPrice = product.price * 0.8;

    return `
      <label class="deal-option">
        <input
          class="deal-radio"
          type="radio"
          name="adventDeal"
          value="${productId}"
          required
        >

        <span class="deal-card">
          <img
            class="deal-image"
            src="${product.image}"
            alt=""
          >

          <span class="deal-copy">
            <span class="deal-name">
              ${product.name}
            </span>

            <span class="deal-description">
              ${product.description}
            </span>

            <span class="deal-prices">
              <del>
                <span class="sr">Demopris før rabat: </span>
                ${formatDealPrice(product.price)}
              </del>

              <strong>
                <span class="sr">Demopris med 20 procent rabat: </span>
                ${formatDealPrice(discountPrice)}
              </strong>
            </span>

            <span class="deal-selected" aria-hidden="true">
              ✓ DIT VALG
            </span>
          </span>
        </span>
      </label>
    `;
  }).join("");

  if (!dealsDialog.open) {
    dealsDialog.showModal();
  }

  document.getElementById("dealsTitle").focus();
}

/* Samme radio-navn betyder, at kun ét tilbud kan vælges */
dealsForm.addEventListener("change", () => {
  const selected = dealsForm.querySelector(
    'input[name="adventDeal"]:checked'
  );

  confirmDeal.disabled = !selected;
});

/* Gem først, når brugeren trykker FORTSÆT */
dealsForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const selected = dealsForm.querySelector(
    'input[name="adventDeal"]:checked'
  );

  if (!selected || activeDealRound === null) return;

  const productId = selected.value;
  const choices = adventDeals[activeDealRound - 1];

  if (!choices.includes(productId)) return;

  const product = dealProducts[productId];

  savedDeals[activeDealRound] = {
    productId,
    name: product.name,
    discountPercent: 20,
    price: Math.round(product.price * 0.8 * 100) / 100
  };

  let stored = true;

  try {
    localStorage.setItem(DEALS_KEY, JSON.stringify(savedDeals));
  } catch {
    stored = false;
  }

  activeDealRound = null;
  dealsDialog.close();

  document.getElementById("overlayText").textContent =
    `Du har valgt 20 % rabat på ${product.name}. ` +
    (stored
      ? "Dit tilbud er gemt."
      : "Dit tilbud er gemt under din JOE Wallet.");

  document.getElementById("announce").textContent =
    `Du har valgt tilbuddet på ${product.name}.`;

  document.getElementById("start").focus({ preventScroll: true });
});

/* Valget skal afsluttes med FORTSÆT */
dealsDialog.addEventListener("cancel", (event) => {
  event.preventDefault();

  document.getElementById("dealStatus").textContent =
    "Vælg ét tilbud og tryk fortsæt.";
});

/* KORT RYSTELSE, NÅR MAN RAMMER EN BOMBE */
let bombShakeAnimation = null;

function shakeGame() {
  // Respektér indstillingen for mindre bevægelse
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  const arena = document.querySelector(".arena");

  if (!arena) return;

  // Undgå at flere rystelser lægges oven i hinanden
  if (bombShakeAnimation) {
    bombShakeAnimation.cancel();
  }

  bombShakeAnimation = arena.animate(
    [
      { transform: "translate(0, 0)" },
      { transform: "translate(-6px, 2px)" },
      { transform: "translate(6px, -2px)" },
      { transform: "translate(-4px, -1px)" },
      { transform: "translate(4px, 1px)" },
      { transform: "translate(-2px, 0)" },
      { transform: "translate(0, 0)" }
    ],
    {
      duration: 300,
      easing: "ease-out"
    }
  );
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Tab") {
    document.body.classList.add("keyboard-navigation");
  }
});

document.addEventListener("pointerdown", () => {
  document.body.classList.remove("keyboard-navigation");
});