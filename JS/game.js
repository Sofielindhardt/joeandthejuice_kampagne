"use strict";

/* FIND HTML-ELEMENTER */

const $ = (selector) => document.querySelector(selector);

const canvas = $("#game");
const ctx = canvas.getContext("2d");

/* GEMT ADVENTSFREMGANG */

const KEY = "joe-advent-demo-v1";

let completed = 0;

try {
  completed = Math.max(0, Math.min(4, Number(localStorage.getItem(KEY)) || 0));
} catch {
  // Spillet virker også uden localStorage.
}

/* SPILLETS VARIABLER */

let w = 0;
let h = 0;
let dpr = 1;

let fruits = [];
let particles = [];
let trail = [];
let floats = [];

let playing = false;
let paused = false;
let remaining = 25;

let score = 0;
let round = 1;
let spawn = 0;
let last = 0;

let drag = false;
let previous = null;

let combo = 0;
let comboTime = 0;

let action = "start";

const palette = ["#e67b17", "#c41d43", "#9f183b", "#d64443", "#ce9e62"];

/* TILPAS CANVAS TIL SKÆRMEN */

function resize() {
  const rect = canvas.getBoundingClientRect();

  w = rect.width;
  h = rect.height;

  dpr = Math.min(window.devicePixelRatio || 1, 2);

  canvas.width = w * dpr;
  canvas.height = h * dpr;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

new ResizeObserver(resize).observe(canvas);

/* OPDATER ADVENTSOVERSIGTEN */

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

/* DIALOGER */

function showModal(html) {
  $("#modalContent").innerHTML = html;
  $("#modal").showModal();
}

$(".close").onclick = () => {
  $("#modal").close();
};

$("#modal").addEventListener("click", (event) => {
  if (event.target === $("#modal")) {
    $("#modal").close();
  }
});

/* SPILLEREGLER */

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
        Hold musen nede og træk gennem frugterne,
        eller stryg med fingeren.
        Med tastatur kan du trykke mellemrum.
      </li>

      <li>
        Spil runden færdig.
        Din deltagelse registreres uanset din score.
      </li>

      <li>
        Gennemfør alle fire runder for at se demovoucheren.
      </li>
    </ol>

    <p>
      <b>Prototype:</b>
      Her er alle søndage tilgængelige med det samme.
      Medlemskab og datoer er simuleret.
      Ingen rigtig præmie eller forbindelse til JOEs app.
    </p>
  `);
};

/* DEMOVOUCHER */

function voucher() {
  showModal(`
    <div class="eyebrow">
      4 AF 4 · GENNEMFØRT
    </div>

    <h2>
      FRA JULESWIPE<br>
      TIL JULESMAG.
    </h2>

    <div class="ticket">
      <span>DEMO · IKKE GYLDIG I BUTIK</span>

      <strong>
        ÉN GRATIS<br>
        MERRY BERRY BOOST
      </strong>

      <p>Din adventsrejse er gennemført.</p>
    </div>

    <p>
      I den færdige kampagne skulle voucheren ligge
      i appen med tydelig gyldighed og indløsningsvejledning.
      Denne prototype udsteder ingen rigtig voucher.
    </p>
  `);
}

$("#voucher").onclick = voucher;

/* NULSTIL DEMO */

$("#reset").onclick = () => {
  showModal(`
    <h2>START FORFRA?</h2>

    <p>
      Det nulstiller de fire adventsdage i denne browser.
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
      // Fortsæt uden localStorage.
    }

    fruits = [];
    particles = [];

    score = 0;
    remaining = 25;

    $("#score").textContent = "000";
    $("#time").textContent = "25";

    $("#pause").hidden = true;
    $("#overlay").hidden = false;

    $("#overlayTitle").innerHTML = "KLAR TIL<br>ET JULESWIPE?";

    $("#overlayText").innerHTML =
      "Hold musen nede eller stryg med fingeren.<br>" +
      "Skær frugterne, og nyd de næste 25 sekunder.";

    $("#overlayTag").textContent = "DIT ADVENTSØJEBLIK";

    action = "start";

    initial();

    $("#modal").close();
  };
};

/* START EN RUNDE */

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

  remaining = 25;
  score = 0;
  combo = 0;
  spawn = 0.1;

  playing = true;
  paused = false;
  drag = false;

  $("#overlay").hidden = true;
  $("#pause").hidden = false;
  $("#pause").textContent = "Ⅱ";

  $("#score").textContent = "000";
  $("#time").textContent = "25";
  $("#roundLabel").textContent = round + ". ADVENT";

  last = performance.now();
  canvas.focus();
}

$("#start").onclick = start;

/* PAUSE */

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

/* AFSLUT RUNDE */

function finish() {
  playing = false;
  drag = false;

  const wasDone = completed === 4;

  if (!wasDone) {
    completed++;

    try {
      localStorage.setItem(KEY, completed);
    } catch {
      // Fremgangen virker stadig, indtil siden lukkes.
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
    Du fik ${score} point.
    ${
      completed === 4
        ? "Alle fire deltagelser er registreret."
        : "Din deltagelse er registreret."
    }
    <br>
    ${
      completed === 4
        ? "Åbn din demovoucher i adventsoversigten."
        : "I demoen kan du prøve næste søndag med det samme."
    }
  `;

  $("#start").innerHTML =
    completed < 4
      ? `SPIL ${completed + 1}. ADVENT <span>↗</span>`
      : "SPIL IGEN <span>↗</span>";

  $("#overlayFine").textContent =
    "Deltagelse tæller — ikke en bestemt highscore.";

  action = "start";

  $("#announce").textContent =
    `Runde gennemført med ${score} point. ` + `${completed} af 4 adventsdage.`;
}

/* OPRET FRUGTER */

function makeFruit() {
  const radius = 25 + Math.random() * 12;

  fruits.push({
    x: w * (0.16 + Math.random() * 0.68),
    y: h + radius,

    vx: (Math.random() - 0.5) * 110,

    vy: -(470 + Math.random() * 140) * Math.pow(h / 580, 0.5),

    r: radius,

    // 0: appelsin, 1: hindbær, 2: tranebær,
    // 3: æble, 4: ingefær.
    type: Math.floor(Math.random() * 5),

    a: Math.random() * 6,
    spin: (Math.random() - 0.5) * 2,
    cut: false,
  });
}

/* TEGN FRUGTER PÅ CANVAS */

function fruit(f) {
  ctx.save();

  ctx.translate(f.x, f.y);
  ctx.rotate(f.a);

  const r = f.r;

  // Klip frugten i to, når den er skåret.
  if (f.cut) {
    ctx.rotate(f.side * 0.4);

    ctx.beginPath();

    ctx.rect(f.side < 0 ? -r * 2 : 0, -r * 2, r * 2, r * 4);

    ctx.clip();
  }

  ctx.shadowColor = "#0008";
  ctx.shadowBlur = 13;
  ctx.shadowOffsetY = 5;

  if (f.type === 1) {
    /* HINDBÆR */

    for (let y = -2; y <= 2; y++) {
      for (let x = -2; x <= 2; x++) {
        if (x * x + y * y > 6) continue;

        const px = x * r * 0.3;
        const py = y * r * 0.32;

        const gradient = ctx.createRadialGradient(
          px - 3,
          py - 4,
          1,
          px,
          py,
          r * 0.25,
        );

        gradient.addColorStop(0, "#ff7890");
        gradient.addColorStop(0.5, "#d62250");
        gradient.addColorStop(1, "#850d2c");

        ctx.fillStyle = gradient;

        ctx.beginPath();
        ctx.arc(px, py, r * 0.25, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (f.type === 4) {
    /* INGEFÆR */

    ctx.fillStyle = "#c89b62";
    ctx.strokeStyle = "#8d6038";
    ctx.lineWidth = 1.5;

    ctx.beginPath();

    ctx.roundRect(-r * 0.9, -r * 0.4, r * 1.8, r * 0.8, r * 0.35);

    ctx.fill();
    ctx.stroke();

    ctx.beginPath();

    ctx.roundRect(-r * 0.2, -r * 0.8, r * 0.6, r * 1.1, r * 0.3);

    ctx.fill();

    for (let i = -2; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(i * r * 0.28, -r * 0.2);

      ctx.lineTo(i * r * 0.28 + 0.1 * r, r * 0.25);

      ctx.stroke();
    }
  } else {
    /* APPELSIN, TRANEBÆR OG ÆBLE */

    const gradient = ctx.createRadialGradient(-r * 0.35, -r * 0.4, 2, 0, 0, r);

    const highlight =
      f.type === 0 ? "#ffd36b" : f.type === 2 ? "#f38493" : "#ff8b77";

    gradient.addColorStop(0, highlight);
    gradient.addColorStop(0.45, palette[f.type]);

    gradient.addColorStop(1, f.type === 0 ? "#b94c06" : "#630e25");

    ctx.fillStyle = gradient;

    ctx.beginPath();

    ctx.ellipse(0, 0, r, f.type === 3 ? r * 0.88 : r, 0, 0, Math.PI * 2);

    ctx.fill();
    ctx.shadowBlur = 0;

    if (f.type === 0) {
      /* APPELSINENS BÅDE */

      ctx.fillStyle = "#ffbd5d";

      ctx.beginPath();
      ctx.arc(0, 0, r * 0.82, 0, Math.PI * 2);
      ctx.fill();

      for (let i = 0; i < 9; i++) {
        const angle = (i * Math.PI * 2) / 9;

        ctx.fillStyle = i % 2 ? "#ff9b27" : "#ffad3e";

        ctx.beginPath();
        ctx.moveTo(0, 0);

        ctx.arc(0, 0, r * 0.73, angle + 0.05, angle + (Math.PI * 2) / 9 - 0.05);

        ctx.closePath();
        ctx.fill();
      }

      ctx.fillStyle = "#fff0c7";

      ctx.beginPath();
      ctx.arc(0, 0, r * 0.09, 0, 7);
      ctx.fill();
    } else {
      /* GLANS, STILK OG BLAD */

      ctx.fillStyle = "#ffffff66";

      ctx.beginPath();

      ctx.ellipse(-r * 0.3, -r * 0.4, r * 0.16, r * 0.09, -0.6, 0, 7);

      ctx.fill();

      ctx.strokeStyle = "#5a3925";
      ctx.lineWidth = 4;

      ctx.beginPath();
      ctx.moveTo(0, -r * 0.75);
      ctx.lineTo(4, -r * 1.1);
      ctx.stroke();

      ctx.fillStyle = "#697a42";

      ctx.beginPath();

      ctx.ellipse(r * 0.2, -r * 0.95, r * 0.27, r * 0.1, -0.4, 0, 7);

      ctx.fill();
    }
  }

  ctx.restore();
}

/* SKÆR EN FRUGT */

function slice(f) {
  if (f.cut) return;

  f.cut = true;

  combo = comboTime > 0 ? combo + 1 : 1;
  comboTime = 0.4;

  score += 10;

  $("#score").textContent = String(score).padStart(3, "0");

  // Saftpartikler.
  for (let i = 0; i < 15; i++) {
    particles.push({
      x: f.x,
      y: f.y,

      vx: (Math.random() - 0.5) * 300,
      vy: (Math.random() - 0.5) * 250,

      r: 2 + Math.random() * 4,
      t: 0.65,
      color: palette[f.type],
    });
  }

  // To halve frugter.
  for (const side of [-1, 1]) {
    particles.push({
      ...f,
      side,
      cut: true,
      vx: side * 95,
      vy: -65,
      t: 0.65,
      half: true,
    });
  }

  // Flyvende pointtekst.
  floats.push({
    x: f.x,
    y: f.y,
    text: combo > 1 ? `+10 · ${combo}×` : "+10",
    t: 0.65,
  });
}

/* AFSTAND FRA FRUGT TIL SWIPE-LINJE */

function segment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;

  const t = Math.max(
    0,
    Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1)),
  );

  return Math.hypot(px - ax - t * dx, py - ay - t * dy);
}

/* MUS OG TOUCH */

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
    const distance = segment(f.x, f.y, from.x, from.y, point.x, point.y);

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

/* TASTATUR */

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

/* ANIMATION OG SPILLOOP */

function frame(timestamp) {
  const elapsed = (timestamp - last) / 1000 || 0;

  // Begræns fysikkens spring mellem frames.
  const dt = Math.min(elapsed, 0.035);

  last = timestamp;

  ctx.clearRect(0, 0, w, h);

  if (playing && !paused) {
    remaining -= dt;
    comboTime -= dt;
    spawn -= dt;

    // Send nye frugter op fra bunden.
    if (spawn <= 0) {
      const numberOfFruits = 2 + Math.floor(Math.random() * 2);

      for (let i = 0; i < numberOfFruits; i++) {
        makeFruit();
      }

      spawn = 0.85;
    }

    $("#time").textContent = Math.max(0, Math.ceil(remaining));

    // Opdater frugternes position og rotation.
    for (const f of fruits) {
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      f.vy += 450 * dt;
      f.a += f.spin * dt;
    }

    fruits = fruits.filter((f) => f.y < h + 100 && !f.cut);

    // Opdater saftpartikler og halve frugter.
    for (const p of particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 350 * dt;
      p.t -= dt;

      if (p.half) {
        p.a += p.side * dt * 3;
      }
    }

    // Flyt pointteksten opad.
    for (const f of floats) {
      f.y -= 45 * dt;
      f.t -= dt;
    }

    if (remaining <= 0) {
      remaining = 0;
      $("#time").textContent = "0";
      finish();
    }
  }

  // Tegn hele frugter.
  for (const f of fruits) {
    fruit(f);
  }

  // Tegn partikler og halve frugter.
  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, p.t / 0.65);

    if (p.half) {
      fruit(p);
    } else {
      ctx.fillStyle = p.color;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, 7);
      ctx.fill();
    }
  }

  ctx.globalAlpha = 1;

  particles = particles.filter((p) => p.t > 0);

  // Opdater swipe-sporet.
  for (const point of trail) {
    point.t -= dt;
  }

  trail = trail.filter((point) => point.t > 0);

  // Tegn lysende rosa swipe.
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

  // Tegn pointtekst.
  ctx.font = "bold 22px Arial";
  ctx.textAlign = "center";

  for (const f of floats) {
    ctx.globalAlpha = Math.max(0, f.t / 0.65);
    ctx.fillStyle = "#ffd5e8";
    ctx.fillText(f.text, f.x, f.y);
  }

  ctx.globalAlpha = 1;

  floats = floats.filter((f) => f.t > 0);

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
