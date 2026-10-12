const $ = (id) => document.getElementById(id);

const COLOR = { wave: "#1a232a", sample: "#a8794a", level: "#4a6b78", axis: "#c2bab1", text: "#6f6862" };

const tests = [
  { name: "A", freq: 440, amp: 0.8, n: 8, bits: 3 },
  { name: "B", freq: 200, amp: 0.5, n: 6, bits: 4 },
  { name: "C", freq: 500, amp: 0.9, n: 5, bits: 3 },
];

let lastBinary = "";

function readNumber(id) {
  const text = $(id).value.trim();
  return text === "" ? NaN : Number(text);
}

function check(freq, amp, n, bits) {
  if (!(Number.isFinite(freq) && freq > 0)) return "Frequency must be a number greater than 0.";
  if (!(amp >= 0 && amp <= 1)) return "Amplitude must be a number from 0 to 1.";
  if (!(Number.isInteger(n) && n >= 2 && n <= 64)) return "Samples must be a whole number from 2 to 64.";
  if (!(Number.isInteger(bits) && bits >= 1 && bits <= 8)) return "Bits must be a whole number from 1 to 8.";
  return "";
}

function compute(freq, amp, n, bits) {
  const periodMs = 1000 / freq;
  const wavelength = 343 / freq;
  const levels = 2 ** bits;
  const rows = [];

  for (let i = 0; i < n; i++) {
    const height = amp * Math.sin((2 * Math.PI * i) / n);
    const level = Math.floor(((height + 1) / 2) * (levels - 1) + 0.5 + 1e-9);
    const binary = level.toString(2).padStart(bits, "0");

    rows.push({ num: i + 1, time: (i * periodMs) / n, height, level, binary });
  }

  return {
    rows,
    levels,
    periodText: periodMs.toFixed(2) + " ms",
    waveText: wavelength >= 1 ? wavelength.toFixed(2) + " m" : (wavelength * 100).toFixed(1) + " cm",
    binaryLine: rows.map((r) => r.binary).join(" "),
    totalBits: n * bits,
  };
}

function drawChart(result, amp) {
  const canvas = $("chart");
  const ctx = canvas.getContext("2d");
  const w = canvas.width, h = canvas.height;
  const pad = 36, midY = h / 2, scale = h / 2 - pad;
  const n = result.rows.length, levels = result.levels;

  const yOf = (v) => midY - v * scale;
  const xOf = (i) => pad + (i / n) * (w - 2 * pad);

  function stem(x, y1, y2, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y1);
    ctx.lineTo(x, y2);
    ctx.stroke();
  }

  ctx.clearRect(0, 0, w, h);

  if (levels <= 16) {
    ctx.strokeStyle = "rgba(74, 107, 120, 0.35)";
    ctx.setLineDash([4, 4]);

    for (let k = 0; k < levels; k++) {
      const y = yOf((k / (levels - 1)) * 2 - 1);
      ctx.beginPath();
      ctx.moveTo(pad, y);
      ctx.lineTo(w - pad, y);
      ctx.stroke();
    }

    ctx.setLineDash([]);
  }

  ctx.strokeStyle = COLOR.axis;
  ctx.beginPath();
  ctx.moveTo(pad, midY);
  ctx.lineTo(w - pad, midY);
  ctx.moveTo(pad, pad);
  ctx.lineTo(pad, h - pad);
  ctx.stroke();

  ctx.fillStyle = COLOR.text;
  ctx.font = "13px Figtree, Segoe UI, Arial";
  ctx.fillText("+1", 8, pad + 4);
  ctx.fillText("0", 14, midY + 4);
  ctx.fillText("-1", 10, h - pad + 4);
  ctx.fillText("0 ms", pad, h - 10);
  ctx.textAlign = "right";
  ctx.fillText(result.periodText, w - pad, h - 10);
  ctx.textAlign = "left";

  ctx.strokeStyle = COLOR.wave;
  ctx.lineWidth = 2.5;
  ctx.beginPath();

  for (let i = 0; i <= 400; i++) {
    const t = i / 400;
    const x = pad + t * (w - 2 * pad);
    const y = yOf(amp * Math.sin(2 * Math.PI * t));

    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }

  ctx.stroke();

  for (const [i, row] of result.rows.entries()) {
    const x = xOf(i);
    const sampleY = yOf(row.height);
    const levelY = yOf((row.level / (levels - 1)) * 2 - 1);

    stem(x, midY, sampleY, "rgba(168, 121, 74, 0.45)");
    stem(x, sampleY, levelY, "rgba(74, 107, 120, 0.85)");

    ctx.fillStyle = COLOR.level;
    ctx.fillRect(x - 4.5, levelY - 4.5, 9, 9);

    ctx.fillStyle = COLOR.sample;
    ctx.strokeStyle = "#fcfbfa";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, sampleY, 5, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
  }
}

function convert() {
  const freq = readNumber("frequency");
  const amp = readNumber("amplitude");
  const n = readNumber("samples");
  const bits = readNumber("bits");

  const error = check(freq, amp, n, bits);
  $("warning").style.display = error ? "block" : "none";
  $("warning").textContent = "Warning: " + error;
  $("results").style.display = error ? "none" : "grid";

  if (error) return;

  const result = compute(freq, amp, n, bits);
  lastBinary = result.binaryLine;

  $("factAmp").textContent = $("amplitude").value.trim();
  $("factFreq").textContent = $("frequency").value.trim() + " Hz";
  $("factPeriod").textContent = result.periodText;
  $("factWave").textContent = result.waveText;

  $("sampleBody").innerHTML = result.rows.map((r) => {
    const height = Math.abs(r.height) < 0.005 ? 0 : r.height;

    return `<tr>
      <td>${r.num}</td><td>${r.time.toFixed(2)}</td><td>${height.toFixed(2)}</td>
      <td>${r.level}</td><td class="binary">${r.binary}</td>
    </tr>`;
  }).join("");

  $("binaryLine").textContent = result.binaryLine;
  $("totalBits").textContent = result.totalBits;

  drawChart(result, amp);
}

function copyBinary() {
  const label = $("copyLabel");

  const show = (text) => {
    label.textContent = text;
    setTimeout(() => (label.textContent = "Copy"), 1500);
  };

  navigator.clipboard.writeText(lastBinary).then(
    () => show("Copied"),
    () => show("Not copied")
  );
}

function playTone() {
  const freq = readNumber("frequency");
  const warning = $("warning");

  if (!(freq > 0)) {
    warning.textContent = "Warning: Frequency must be a number greater than 0.";
    warning.style.display = "block";
    return;
  }

  warning.style.display = "none";

  const audio = new (window.AudioContext || window.webkitAudioContext)();
  const osc = audio.createOscillator();
  const volume = audio.createGain();

  osc.frequency.value = freq;
  volume.gain.value = 0.15;
  osc.connect(volume);
  volume.connect(audio.destination);
  osc.start();
  osc.stop(audio.currentTime + 1);
}

function buildTests() {
  $("testBody").innerHTML = tests.map((t, i) => {
    const r = compute(t.freq, t.amp, t.n, t.bits);

    return `<tr>
      <td>${t.name}</td><td>${t.freq} Hz</td><td>${t.amp}</td><td>${t.n}</td><td>${t.bits}</td>
      <td>${r.periodText}</td><td>${r.waveText}</td><td>${r.totalBits}</td>
      <td class="left">${r.binaryLine}</td>
      <td><button class="small" data-test="${i}">Try it</button></td>
    </tr>`;
  }).join("");
}

function loadTest(i) {
  const t = tests[i];

  $("frequency").value = t.freq;
  $("amplitude").value = t.amp;
  $("samples").value = t.n;
  $("bits").value = t.bits;

  convert();
  $("converter").scrollIntoView();
}

$("convertBtn").onclick = convert;
$("playBtn").onclick = playTone;
$("copyBtn").onclick = copyBinary;

$("testBody").onclick = (e) => {
  if (e.target.dataset.test) loadTest(Number(e.target.dataset.test));
};

for (const id of ["frequency", "amplitude", "samples", "bits"]) {
  $(id).onkeydown = (e) => {
    if (e.key === "Enter") convert();
  };
}

buildTests();
convert();