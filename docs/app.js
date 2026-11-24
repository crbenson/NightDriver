/* NightDriver Pattern Lab — dependency-free interactive pattern designer. */

'use strict';

const EFFECTS = [
  { id: 'palette',  name: 'Palette Wave',   firmwareId: 21, description: 'A smooth gradient that scrolls through your palette. The closest match to the firmware PaletteEffect.' },
  { id: 'rainbow',  name: 'Rainbow Fill',   firmwareId: 16, description: 'Classic hue wheel spread across the LEDs, moving at your chosen speed.' },
  { id: 'chase',    name: 'Chase / Carnival', firmwareId: 39, description: 'Pulsing segments separated by adjustable gaps — great with high contrast palettes.' },
  { id: 'bounce',   name: 'Bouncing Ball',  firmwareId: 1,  description: 'A bright head bouncing end to end with a soft, controllable trail.' },
  { id: 'fire',     name: 'Fire',           firmwareId: 8,  description: 'Layered noise and warmth gradients. Looks especially good on a matrix.' },
  { id: 'twinkle',  name: 'Twinkle',        firmwareId: 19, description: 'Independently blinking points of light, seeded so each LED has its own rhythm.' },
  { id: 'meteor',   name: 'Meteor',         firmwareId: 13, description: 'Streaks that sweep across the strip with fading tails.' },
  { id: 'snake',    name: 'Snake',          firmwareId: 28, description: 'A moving head followed by a solid body of light.' },
  { id: 'plasma',   name: 'Plasma',         firmwareId: null, description: 'Interfering sine waves sampled through your palette. A visual-only design tool.' },
  { id: 'crawl',    name: 'Slow Crawl',     firmwareId: 40, description: 'A gentle crawling gradient with fine ripples — a calm background effect.' }
];

const PALETTES = {
  sunset: ['#ff2d95', '#ff6b35', '#ffd23f', '#7b2cbf'],
  neon:   ['#00f5d4', '#00bbf9', '#f15bb5', '#fee440'],
  ocean:  ['#03045e', '#0077b6', '#00b4d8', '#90e0ef'],
  aurora: ['#2ec4b6', '#7ae582', '#b8f2e6', '#4361ee'],
  fire:   ['#2b0a0a', '#ff3d00', '#ff9100', '#ffe082'],
  ice:    ['#081c3a', '#3a86ff', '#8ecae6', '#f1faee'],
  candy:  ['#ff70a6', '#ff9770', '#ffd670', '#e9ff70'],
  mono:   ['#101010', '#495057', '#adb5bd', '#ffffff'],
  custom: null
};

const DEFAULT = {
  effect: 'palette', palette: 'sunset', colors: ['#ff2d95', '#ff6b35', '#ffd23f', '#4cc9f0'],
  layout: 'strip', cols: 16, rows: 16,
  ledCount: 64, speed: 1, density: 1.4, brightness: 0.9, gap: 0.18, glow: 12, trail: 0.35,
  name: 'Solar Bloom', playing: true
};

const WORDS_A = ['Neon', 'Solar', 'Midnight', 'Electric', 'Crystal', 'Velvet', 'Cosmic', 'Prism', 'Amber', 'Frost', 'Hyper', 'Quiet'];
const WORDS_B = ['Bloom', 'Drift', 'Cascade', 'Pulse', 'Comet', 'Mirage', 'Tide', 'Burst', 'Halo', 'Garden', 'Signal', 'Runway'];
const STORE_KEY = 'nightdriver.patternlab.presets.v1';

let state = { ...DEFAULT, colors: [...DEFAULT.colors] };
let gallery = [];
let exportFormat = 'json';
let simTime = 0;
let lastFrame = performance.now();
let frameCount = 0;
let fpsStamp = performance.now();
let toastTimer = null;
let activeTab = 'json';

const $ = (id) => document.getElementById(id);
const el = {
  effectSelect: $('effectSelect'), effectDescription: $('effectDescription'), effectIdPill: $('effectIdPill'),
  layoutSelect: $('layoutSelect'), matrixSizeField: $('matrixSizeField'), matrixSizeSelect: $('matrixSizeSelect'),
  paletteSelect: $('paletteSelect'), paletteSwatches: $('paletteSwatches'), customColors: $('customColors'),
  colorInputs: [$('colorA'), $('colorB'), $('colorC'), $('colorD')],
  patternName: $('patternName'), patternDna: $('patternDna'), previewCanvas: $('previewCanvas'),
  fpsOut: $('fpsOut'), playBtn: $('playBtn'), galleryGrid: $('galleryGrid'),
  presetName: $('presetName'), presetSelect: $('presetSelect'),
  codeOutput: $('codeOutput'), exportHint: $('exportHint'), toast: $('toast')
};

/* ------------------------------------------------------------------ colors */

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgbToHex([r, g, b]) {
  return '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
}
function mix(a, b, t) { return a + (b - a) * t; }
function clamp01(v) { return Math.max(0, Math.min(1, v)); }
function fract(v) { return v - Math.floor(v); }

function paletteRgb(name, colors) {
  return (name === 'custom' ? colors : PALETTES[name] || PALETTES.sunset).map(hexToRgb);
}
function colorAt(colors, t) {
  t = fract(t);
  const scaled = t * (colors.length - 1);
  const i = Math.min(colors.length - 2, Math.floor(scaled));
  const f = scaled - i;
  return [0, 1, 2].map((c) => mix(colors[i][c], colors[i + 1][c], f));
}
function hsvToRgb(h, s, v) {
  const i = Math.floor(h * 6), f = h * 6 - i;
  const p = v * (1 - s), q = v * (1 - f * s), t = v * (1 - (1 - f) * s);
  const table = [[v, t, p], [q, v, p], [p, v, t], [p, q, v], [t, p, v], [v, p, q]];
  return table[i % 6].map((c) => c * 255);
}
function hash(n) { return fract(Math.sin(n * 127.1 + 78.233) * 43758.5453); }

/* ----------------------------------------------------------------- effects */

const EFFECT_FNS = {
  palette(u, v, i, t, c, s) {
    const wave = Math.sin(v * 7 + t * 1.1) * 0.03;
    return colorAt(c, u * s.density + t * 0.18 + wave);
  },
  rainbow(u, v, i, t, c, s) {
    return hsvToRgb(fract(u * s.density + t * 0.22), 0.94, 1);
  },
  chase(u, v, i, t, c, s) {
    const phase = fract(u * s.density - t * 1.6);
    const width = 0.06 + (1 - s.gap) * 0.22;
    const light = Math.exp(-Math.pow(phase / width, 2));
    const echo = Math.pow(phase, 5) * s.trail;
    return colorAt(c, u * s.density * 0.4 + t * 0.05).map((x) => x * clamp01(light + echo));
  },
  bounce(u, v, i, t, c, s) {
    const head = 0.5 + 0.5 * Math.sin(t * 1.7);
    const d = Math.abs(u - head);
    const intensity = Math.exp(-d * (14 - s.trail * 9));
    return colorAt(c, 0.2 + head * 0.6).map((x) => x * intensity);
  },
  fire(u, v, i, t, c, s) {
    const n = Math.sin(u * 9 * s.density + t * 3) * 0.45
      + Math.sin(u * 23 * s.density - t * 2) * 0.25
      + hash(i) * 0.3;
    const height = 0.55 + n * 0.45 - (1 - v) * 0.35;
    return colorAt(c, clamp01(height)).map((x, k) => x * clamp01(height * 1.4 + (k === 0 ? 0.15 : 0)));
  },
  twinkle(u, v, i, t, c, s) {
    const seed = hash(i * 1.73);
    const blink = Math.pow(Math.max(0, Math.sin(t * (1.2 + seed * 2.6) + seed * 30)), 10);
    return colorAt(c, seed).map((x) => x * clamp01(0.06 + blink * (0.7 + s.trail * 0.3)));
  },
  meteor(u, v, i, t, c, s) {
    const head = fract(t * 0.38 + hash(i * 0.17) * 0.1);
    let d = fract(head - u);
    const intensity = d < 0.24 ? Math.pow(1 - d / 0.24, 1.6) : 0.02;
    return colorAt(c, head).map((x) => x * intensity);
  },
  snake(u, v, i, t, c, s) {
    const head = fract(t * 0.26);
    const d = fract(head - u);
    const body = 0.16 + s.gap * 0.55 + s.trail * 0.2;
    const intensity = d < body ? 0.35 + 0.65 * (1 - d / body) : 0.02;
    return colorAt(c, d * 0.6).map((x) => x * intensity);
  },
  plasma(u, v, i, t, c, s) {
    const w = Math.sin(u * 10 * s.density + t)
      + Math.sin(v * 8 * s.density - t * 1.3)
      + Math.sin((u + v) * 6 * s.density + t * 0.7);
    return colorAt(c, (w / 3 + 1) / 2);
  },
  crawl(u, v, i, t, c, s) {
    const ripple = 0.5 + 0.5 * Math.sin(u * 28 * s.density - t * 2.2);
    return colorAt(c, fract(u * s.density * 0.7 - t * 0.12)).map((x) => x * (0.55 + ripple * 0.45));
  }
};

function effectFn(id) { return EFFECT_FNS[id] || EFFECT_FNS.palette; }

/* ---------------------------------------------------------------- renderer */

function renderFrame(ctx, width, height, cfg, time) {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#070a12';
  ctx.fillRect(0, 0, width, height);

  const colors = paletteRgb(cfg.palette, cfg.colors);
  const fn = effectFn(cfg.effect);
  const layout = cfg.layout;
  let points = [];

  if (layout === 'matrix') {
    const cols = cfg.cols, rows = cfg.rows;
    const cell = Math.min((width - 36) / cols, (height - 36) / rows);
    const ox = (width - cols * cell) / 2, oy = (height - rows * cell) / 2;
    const radius = Math.max(1.4, cell * 0.37);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        points.push({
          x: ox + (x + 0.5) * cell, y: oy + (y + 0.5) * cell,
          r: radius, u: cols === 1 ? 0.5 : x / (cols - 1), v: rows === 1 ? 0.5 : y / (rows - 1),
          i: y * cols + x
        });
      }
    }
  } else if (layout === 'ring') {
    const n = cfg.ledCount;
    const radius = Math.min(width, height) * 0.36;
    const cx = width / 2, cy = height / 2;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2;
      points.push({ x: cx + Math.cos(a) * radius, y: cy + Math.sin(a) * radius, r: Math.max(1.5, Math.min(5, (2 * Math.PI * radius / n) * 0.38)), u: i / n, v: 0.5, i });
    }
  } else {
    const n = cfg.ledCount;
    const margin = Math.max(18, width * 0.045);
    const spacing = (width - margin * 2) / Math.max(1, n - 1);
    for (let i = 0; i < n; i++) {
      points.push({ x: margin + i * spacing, y: height / 2, r: Math.max(1.6, Math.min(8, spacing * 0.38)), u: i / Math.max(1, n - 1), v: 0.5, i });
    }
  }

  const t = time * cfg.speed;
  ctx.save();
  ctx.shadowBlur = cfg.glow;
  for (const p of points) {
    const rgb = fn(p.u, p.v, p.i, t, colors, cfg);
    const b = cfg.brightness;
    const r = Math.max(0, Math.min(255, rgb[0] * b));
    const g = Math.max(0, Math.min(255, rgb[1] * b));
    const bl = Math.max(0, Math.min(255, rgb[2] * b));
    const fill = `rgb(${r | 0},${g | 0},${bl | 0})`;
    ctx.shadowColor = fill;
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  if (layout === 'strip') {
    ctx.fillStyle = 'rgba(255,255,255,.06)';
    ctx.fillRect(Math.max(18, width * 0.045) - 10, height / 2 + 13, width - Math.max(18, width * 0.045) * 2 + 20, 3);
  }
}

function canvasSize(canvas, ctx) {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const w = Math.max(1, Math.round(rect.width)), h = Math.max(1, Math.round(rect.height));
  if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  return { w, h };
}

const previewCtx = el.previewCanvas.getContext('2d');
function renderOnce() {
  const { w, h } = canvasSize(el.previewCanvas, previewCtx);
  renderFrame(previewCtx, w, h, state, simTime);
}
function animate(now) {
  const dt = Math.min(0.1, (now - lastFrame) / 1000);
  lastFrame = now;
  if (state.playing) simTime += dt;
  renderOnce();
  frameCount++;
  if (now - fpsStamp > 1000) {
    el.fpsOut.textContent = `${Math.round(frameCount * 1000 / (now - fpsStamp))} fps`;
    frameCount = 0; fpsStamp = now;
  }
  requestAnimationFrame(animate);
}

/* --------------------------------------------------------------------- UI */

function populateSelects() {
  EFFECTS.forEach((e) => el.effectSelect.add(new Option(e.name, e.id)));
  Object.keys(PALETTES).forEach((p) => el.paletteSelect.add(new Option(p[0].toUpperCase() + p.slice(1), p)));
}
function syncControls() {
  el.effectSelect.value = state.effect;
  el.layoutSelect.value = state.layout;
  el.matrixSizeField.hidden = state.layout !== 'matrix';
  el.matrixSizeSelect.value = `${state.cols},${state.rows}`;
  el.paletteSelect.value = state.palette;
  el.patternName.value = state.name;
  el.customColors.hidden = state.palette !== 'custom';
  el.colorInputs.forEach((input, i) => { input.value = state.colors[i]; });

  const effect = EFFECTS.find((e) => e.id === state.effect);
  el.effectDescription.textContent = effect.description;
  el.effectIdPill.textContent = effect.firmwareId ? `effect #${effect.firmwareId}` : 'visual only';

  const swatches = paletteRgb(state.palette, state.colors);
  el.paletteSwatches.innerHTML = swatches.map((c) => `<i style="background:${rgbToHex(c)}"></i>`).join('');

  const outputs = {
    ledCount: `${state.ledCount}`, speed: `${state.speed.toFixed(2)}×`, density: state.density.toFixed(2),
    brightness: `${Math.round(state.brightness * 100)}%`, gap: state.gap.toFixed(2),
    glow: `${state.glow}`, trail: state.trail.toFixed(2)
  };
  Object.keys(outputs).forEach((key) => { $(key + 'Out').textContent = outputs[key]; $(key).value = state[key]; });
  el.playBtn.textContent = state.playing ? '⏸ Pause' : '▶ Play';
  updateDna();
}
function updateDna() {
  el.patternDna.textContent = `${state.effect} · ${state.palette} · ${state.layout} · ${state.ledCount} LEDs · spd ${state.speed.toFixed(2)} · dns ${state.density.toFixed(2)} · bns ${state.brightness.toFixed(2)} · gap ${state.gap.toFixed(2)}`;
}
function applyConfig(cfg) {
  state = { ...state, ...cfg, colors: [...(cfg.colors || state.colors)] };
  simTime = 0;
  syncControls();
  updateCode();
  if (!state.playing) renderOnce();
}
function toast(message) {
  el.toast.textContent = message;
  el.toast.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.toast.classList.remove('is-visible'), 2200);
}

const RANGES = ['ledCount', 'speed', 'density', 'brightness', 'gap', 'glow', 'trail'];
function bindControls() {
  RANGES.forEach((key) => $(key).addEventListener('input', (e) => {
    state[key] = parseFloat(e.target.value);
    syncControls(); updateCode();
  }));
  el.effectSelect.addEventListener('change', (e) => { state.effect = e.target.value; syncControls(); updateCode(); });
  el.paletteSelect.addEventListener('change', (e) => { state.palette = e.target.value; syncControls(); updateCode(); });
  el.colorInputs.forEach((input, i) => input.addEventListener('input', (e) => {
    state.colors[i] = e.target.value;
    state.palette = 'custom';
    syncControls(); updateCode();
  }));
  el.layoutSelect.addEventListener('change', (e) => { state.layout = e.target.value; syncControls(); updateCode(); });
  el.matrixSizeSelect.addEventListener('change', (e) => {
    [state.cols, state.rows] = e.target.value.split(',').map(Number);
    syncControls(); updateCode();
  });
  el.patternName.addEventListener('input', (e) => { state.name = e.target.value; updateCode(); });

  el.playBtn.addEventListener('click', () => { state.playing = !state.playing; syncControls(); });
  $('stepBtn').addEventListener('click', () => { simTime += 0.08; renderOnce(); });
  $('generateBtn').addEventListener('click', () => generate(false));
  $('randomBtn').addEventListener('click', () => generate(true));
  $('resetBtn').addEventListener('click', () => { applyConfig({ ...DEFAULT, colors: [...DEFAULT.colors] }); toast('Restored defaults'); });

  $('jsonTab').addEventListener('click', () => setTab('json'));
  $('cppTab').addEventListener('click', () => setTab('cpp'));
  $('copyCodeBtn').addEventListener('click', copyCode);
  $('downloadBtn').addEventListener('click', downloadPattern);
  $('savePresetBtn').addEventListener('click', savePreset);
  $('loadPresetBtn').addEventListener('click', loadPreset);
  $('deletePresetBtn').addEventListener('click', deletePreset);

  document.addEventListener('keydown', (e) => {
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
    if (e.code === 'Space') { e.preventDefault(); el.playBtn.click(); }
    if (e.key.toLowerCase() === 'g') $('generateBtn').click();
    if (e.key.toLowerCase() === 'r') $('randomBtn').click();
  });
  new ResizeObserver(renderOnce).observe(el.previewCanvas.parentElement);
}

function setTab(tab) {
  activeTab = tab;
  $('jsonTab').classList.toggle('is-active', tab === 'json');
  $('cppTab').classList.toggle('is-active', tab === 'cpp');
  $('jsonTab').setAttribute('aria-selected', String(tab === 'json'));
  $('cppTab').setAttribute('aria-selected', String(tab === 'cpp'));
  updateCode();
}

/* -------------------------------------------------------------- generation */

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function rand(a, b) { return a + Math.random() * (b - a); }
function makeName() { return `${pick(WORDS_A)} ${pick(WORDS_B)}`; }

function generate(allRandom) {
  const cfg = {
    effect: pick(EFFECTS).id,
    palette: pick(Object.keys(PALETTES).filter((p) => p !== 'custom')),
    speed: +rand(0.4, 2.8).toFixed(2),
    density: +rand(0.6, 4.6).toFixed(2),
    brightness: +rand(0.65, 1).toFixed(2),
    gap: +rand(0, 0.65).toFixed(2),
    glow: Math.round(rand(5, 24)),
    trail: +rand(0.1, 0.85).toFixed(2),
    name: makeName()
  };
  if (allRandom) {
    cfg.layout = pick(['strip', 'matrix', 'ring']);
    cfg.ledCount = Math.round(rand(24, 160) / 8) * 8;
    cfg.cols = pick([8, 16, 32]);
    cfg.rows = pick([8, 16]);
  }
  applyConfig(cfg);
  addToGallery({ ...state, colors: [...state.colors] });
  toast(`Generated “${cfg.name}”`);
}

function addToGallery(cfg) {
  gallery.unshift({ ...cfg, colors: [...cfg.colors] });
  gallery = gallery.slice(0, 12);
  renderGallery();
}
function renderGallery() {
  if (!gallery.length) {
    el.galleryGrid.innerHTML = '<div class="gallery-empty">No generated patterns yet — press <strong>Generate new pattern</strong> to create your first one.</div>';
    return;
  }
  el.galleryGrid.innerHTML = '';
  gallery.forEach((cfg, idx) => {
    const card = document.createElement('div');
    card.className = 'gallery-card';
    card.innerHTML = `<canvas width="500" height="156"></canvas><div class="gallery-info"><strong></strong><small></small></div>`;
    const canvas = card.querySelector('canvas');
    const ctx = canvas.getContext('2d');
    renderFrame(ctx, 500, 156, cfg, 0.6);
    card.querySelector('strong').textContent = cfg.name;
    card.querySelector('small').textContent = `${cfg.effect} · #${idx + 1}`;
    card.addEventListener('click', () => {
      applyConfig(cfg);
      document.getElementById('lab').scrollIntoView({ behavior: 'smooth' });
      toast(`Loaded “${cfg.name}”`);
    });
    el.galleryGrid.appendChild(card);
  });
}

/* ------------------------------------------------------------------ export */

function patternObject(cfg) {
  const effect = EFFECTS.find((e) => e.id === cfg.effect);
  return {
    name: cfg.name,
    generator: 'NightDriver Pattern Lab',
    version: 1,
    layout: cfg.layout,
    matrix: { cols: cfg.cols, rows: cfg.rows },
    effect: { id: cfg.effect, firmwareEffectId: effect.firmwareId, name: effect.name },
    palette: cfg.palette,
    colors: cfg.palette === 'custom' ? cfg.colors : PALETTES[cfg.palette],
    params: {
      ledCount: cfg.ledCount, speed: cfg.speed, density: cfg.density,
      brightness: cfg.brightness, gap: cfg.gap, glow: cfg.glow, trail: cfg.trail
    }
  };
}
function cppSnippet(cfg) {
  const colors = paletteRgb(cfg.palette, cfg.colors);
  const stops = Array.from({ length: 16 }, (_, i) => {
    const [r, g, b] = colorAt(colors, i / 15).map(Math.round);
    return `    CRGB(0x${r.toString(16).padStart(2, '0')}, 0x${g.toString(16).padStart(2, '0')}, 0x${b.toString(16).padStart(2, '0')})`;
  }).join(',\n');
  return `// "${cfg.name}" — generated by NightDriver Pattern Lab
// Paste into src/effects.cpp inside LoadEffectFactories() and add the palette above it.
// Effect id ${EFFECTS.find((e) => e.id === cfg.effect).firmwareId ?? 'n/a'} => ${cfg.effect}

static const CRGB generatedPalette[] = {
${stops}
};

ADD_EFFECT(EFFECT_STRIP_PALETTE, PaletteEffect, generatedPalette,
           ${cfg.density.toFixed(2)}f,   // density
           ${cfg.speed.toFixed(2)}f,   // paletteSpeed
           0.0f,                        // ledsPerSecond
           1.0f,                        // lightSize
           ${(1 - cfg.gap).toFixed(2)}f,   // gapSize
           LINEARBLEND, true,
           ${cfg.brightness.toFixed(2)}f); // brightness
`;
}
function updateCode() {
  el.codeOutput.textContent = activeTab === 'json'
    ? JSON.stringify(patternObject(state), null, 2)
    : cppSnippet(state);
  el.exportHint.textContent = activeTab === 'json'
    ? 'JSON presets describe the design in a firmware-neutral way.'
    : 'C++ uses the same PaletteEffect constructor pattern as src/effects.cpp.';
}
async function copyCode() {
  const text = el.codeOutput.textContent;
  try {
    await navigator.clipboard.writeText(text);
  } catch (e) {
    const ta = document.createElement('textarea');
    ta.value = text; document.body.appendChild(ta); ta.select();
    document.execCommand('copy'); ta.remove();
  }
  toast('Copied to clipboard');
}
function downloadPattern() {
  const blob = new Blob([JSON.stringify(patternObject(state), null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${state.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'pattern'}.nightdriver.json`;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
  toast('Downloaded pattern JSON');
}

/* ----------------------------------------------------------------- presets */

function loadStored() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; }
  catch (e) { return {}; }
}
function refreshPresets() {
  const presets = loadStored();
  el.presetSelect.innerHTML = '<option value="">Saved presets…</option>'
    + Object.keys(presets).map((n) => `<option value="${n.replace(/"/g, '&quot;')}">${n}</option>`).join('');
}
function savePreset() {
  const name = (el.presetName.value || state.name).trim();
  const presets = loadStored();
  presets[name] = { ...state, colors: [...state.colors] };
  localStorage.setItem(STORE_KEY, JSON.stringify(presets));
  refreshPresets();
  el.presetSelect.value = name;
  toast(`Saved “${name}”`);
}
function loadPreset() {
  const name = el.presetSelect.value;
  if (!name) return toast('Choose a saved preset first');
  const cfg = loadStored()[name];
  if (!cfg) return toast('Preset not found');
  applyConfig(cfg);
  toast(`Loaded “${name}”`);
}
function deletePreset() {
  const name = el.presetSelect.value;
  if (!name) return toast('Choose a preset to delete');
  const presets = loadStored();
  delete presets[name];
  localStorage.setItem(STORE_KEY, JSON.stringify(presets));
  refreshPresets();
  toast(`Deleted “${name}”`);
}

/* --------------------------------------------------------------- hero strip */

function animateHero() {
  const strip = document.getElementById('heroStrip');
  if (!strip) return;
  const leds = [];
  for (let i = 0; i < 48; i++) {
    const node = document.createElement('i');
    strip.appendChild(node); leds.push(node);
  }
  let t = 0;
  setInterval(() => {
    t += 0.03;
    leds.forEach((node, i) => {
      const hue = (i / leds.length * 300 + t * 45) % 360;
      node.style.background = `hsl(${hue} 95% 60%)`;
      node.style.color = `hsl(${hue} 95% 60%)`;
    });
  }, 33);
}

/* -------------------------------------------------------------------- init */

populateSelects();
bindControls();
syncControls();
updateCode();
renderGallery();
refreshPresets();
animateHero();
requestAnimationFrame(animate);
