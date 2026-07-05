// VOLTA LITE — shares localStorage with the full app (same origin, same keys)

// ─── Shared storage ───────────────────────────────────────────────────────────
function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function loadLog() {
  try { return JSON.parse(localStorage.getItem('gym-timer-log') || '{}'); }
  catch (e) { return {}; }
}

function saveLog(log) {
  localStorage.setItem('gym-timer-log', JSON.stringify(log));
}

function loadFitNotes() {
  try { return JSON.parse(localStorage.getItem('gym-timer-fitnotes') || 'null'); }
  catch (e) { return null; }
}

function loadRestPrefs() {
  try { return JSON.parse(localStorage.getItem('gym-timer-rest-prefs') || '{}'); }
  catch (e) { return {}; }
}

function saveRestPrefs(p) {
  localStorage.setItem('gym-timer-rest-prefs', JSON.stringify(p));
}

// ─── Elements ─────────────────────────────────────────────────────────────────
const timeDisplay  = document.getElementById('timeDisplay');
const ringProgress = document.getElementById('ringProgress');
const ringWrap     = document.getElementById('ringWrap');
const pills        = document.querySelectorAll('.pill');
const btnReset     = document.getElementById('btnReset');
const cntVal       = document.getElementById('cntVal');
const cntDown      = document.getElementById('cntDown');
const cntUp        = document.getElementById('cntUp');
const exName       = document.getElementById('exName');
const exList       = document.getElementById('exList');
const lastLine     = document.getElementById('lastLine');
const todayLine    = document.getElementById('todayLine');
const wVal = document.getElementById('wVal');
const rVal = document.getElementById('rVal');
const btnSave = document.getElementById('btnSave');
const flash = document.getElementById('flash');
const toast = document.getElementById('toast');

const CIRC = 2 * Math.PI * 90;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtTime(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}:${String(sec).padStart(2, '0')}` : `${sec}`;
}

function setRing(ratio) {
  ringProgress.style.strokeDashoffset = CIRC * (1 - ratio);
}

let toastTimeout = null;
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove('show'), 1800);
}

function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.18, 0.36].forEach((delay, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = i === 2 ? 880 : 660;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.3, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.15);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.15);
    });
  } catch (e) {}
}

// ─── Wake lock ────────────────────────────────────────────────────────────────
let wakeLock = null;
async function requestWakeLock() {
  if (!('wakeLock' in navigator)) return;
  try {
    if (wakeLock) return;
    wakeLock = await navigator.wakeLock.request('screen');
    wakeLock.addEventListener('release', () => { wakeLock = null; });
  } catch (e) {}
}

// ─── Timer (timestamp-based) ──────────────────────────────────────────────────
let restDuration = 90;
let remaining    = 90;
let total        = 90;
let endTime      = null;
let running      = false;
let iv           = null;

function updateTimeDisplay() {
  timeDisplay.textContent = fmtTime(remaining);
  const warn = remaining <= 5 && running;
  timeDisplay.classList.toggle('warning', warn);
  ringProgress.classList.toggle('warning', warn);
}

function startRest() {
  remaining = total = restDuration;
  endTime = Date.now() + restDuration * 1000;
  running = true;
  setRing(1);
  updateTimeDisplay();
  clearInterval(iv);
  iv = setInterval(tick, 500);
  requestWakeLock();
}

function tick() {
  remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
  updateTimeDisplay();
  setRing(remaining / total);
  if (remaining <= 0) finishRest();
}

function finishRest() {
  clearInterval(iv);
  running = false;
  endTime = null;
  beep();
  if ('vibrate' in navigator) navigator.vibrate([200, 100, 200, 100, 200]);
  flash.classList.remove('active');
  void flash.offsetWidth;
  flash.classList.add('active');
  showToast('¡A TRABAJAR!');
  remaining = restDuration;
  updateTimeDisplay();
  setRing(1);
}

function toggleTimer() {
  if (running) {
    remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
    clearInterval(iv);
    running = false;
    endTime = null;
    updateTimeDisplay();
  } else if (remaining > 0 && remaining < restDuration) {
    // paused mid-rest → resume
    endTime = Date.now() + remaining * 1000;
    running = true;
    iv = setInterval(tick, 500);
  } else {
    startRest();
  }
}

function resetTimer() {
  clearInterval(iv);
  running = false;
  endTime = null;
  remaining = total = restDuration;
  updateTimeDisplay();
  setRing(1);
}

ringWrap.addEventListener('click', toggleTimer);
btnReset.addEventListener('click', resetTimer);

pills.forEach(p => {
  p.addEventListener('click', () => {
    pills.forEach(x => x.classList.remove('active'));
    p.classList.add('active');
    restDuration = parseInt(p.dataset.val);
    if (!running) { remaining = total = restDuration; updateTimeDisplay(); setRing(1); }
    rememberRestPref();
  });
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) return;
  if (running && endTime) tick();
  requestWakeLock();
});

// ─── Set counter (persisted per day) ──────────────────────────────────────────
let count = 0;

function loadCount() {
  try {
    const c = JSON.parse(localStorage.getItem('gym-timer-lite-count') || 'null');
    if (c && c.date === getTodayKey()) return c.n;
  } catch (e) {}
  return 0;
}

function saveCount() {
  localStorage.setItem('gym-timer-lite-count', JSON.stringify({ date: getTodayKey(), n: count }));
}

function setCount(n) {
  count = Math.max(0, n);
  cntVal.textContent = count;
  saveCount();
}

cntDown.addEventListener('click', () => setCount(count - 1));
cntUp.addEventListener('click', () => setCount(count + 1));

// ─── Exercise: datalist, last time, prefill, rest pref ────────────────────────
function populateDatalist() {
  exList.innerHTML = '';
  const byLower = new Map();
  const fn = loadFitNotes();
  if (fn && fn.exercises) {
    for (const name of Object.keys(fn.exercises)) byLower.set(name.toLowerCase(), name);
  }
  const log = loadLog();
  for (const entries of Object.values(log)) {
    for (const e of entries) {
      if (e.exercise && !byLower.has(e.exercise.toLowerCase())) {
        byLower.set(e.exercise.toLowerCase(), e.exercise);
      }
    }
  }
  Array.from(byLower.values()).sort((a, b) => a.localeCompare(b)).forEach(name => {
    const opt = document.createElement('option');
    opt.value = name;
    exList.appendChild(opt);
  });
}

function entrySets(e) {
  return Array.isArray(e.sets) ? e.sets : [{ weight: e.weight, reps: e.reps }];
}

function validSets(sets) {
  return sets.filter(s =>
    (s.weight || '').toString().trim() || (s.reps || '').toString().trim());
}

function formatSetShort(s) {
  const w = parseFloat(s.weight);
  const r = (s.reps || '').toString().trim();
  if (w > 0 && r) return w + '×' + r;
  if (w > 0) return w + 'kg';
  if (r) return '×' + r;
  return '';
}

// Most recent session before today (local log first, FitNotes fallback)
function getLastSession(name) {
  const lower = name.toLowerCase();
  const today = getTodayKey();
  const log = loadLog();
  const keys = Object.keys(log).sort((a, b) => b.localeCompare(a));
  for (const key of keys) {
    if (key === today) continue;
    for (const e of log[key]) {
      if (!e.exercise || e.exercise.toLowerCase() !== lower) continue;
      const valid = validSets(entrySets(e));
      if (valid.length) return { date: key, sets: valid };
    }
  }
  const fn = loadFitNotes();
  if (fn && fn.exercises) {
    for (const [exN, sessions] of Object.entries(fn.exercises)) {
      if (exN.toLowerCase() !== lower) continue;
      if (sessions[0] && sessions[0].sets.length) return { date: sessions[0].date, sets: sessions[0].sets };
    }
  }
  return null;
}

function getTodayEntry(name) {
  const lower = name.toLowerCase();
  const log = loadLog();
  const entries = log[getTodayKey()] || [];
  return entries.find(e => e.exercise && e.exercise.toLowerCase() === lower && Array.isArray(e.sets)) || null;
}

function updateExerciseInfo() {
  const name = exName.value.trim();
  if (!name) {
    lastLine.style.display = 'none';
    todayLine.style.display = 'none';
    return;
  }

  const last = getLastSession(name);
  if (last) {
    const [y, m, d] = last.date.split('-').map(Number);
    const dateStr = new Date(y, m - 1, d).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    lastLine.innerHTML = '';
    const lbl = document.createElement('span');
    lbl.textContent = `Última vez (${dateStr}): `;
    const strong = document.createElement('strong');
    strong.textContent = last.sets.map(formatSetShort).filter(Boolean).join(' · ');
    lastLine.append(lbl, strong);
    lastLine.style.display = '';
  } else {
    lastLine.style.display = 'none';
  }

  updateTodayLine(name);

  // Prefill weight: today's last set → last session's last set
  if (!wVal.value.trim()) {
    const todayEntry = getTodayEntry(name);
    let w = '';
    if (todayEntry && todayEntry.sets.length) {
      w = todayEntry.sets[todayEntry.sets.length - 1].weight || '';
    } else if (last) {
      for (let i = last.sets.length - 1; i >= 0; i--) {
        const pw = parseFloat(last.sets[i].weight);
        if (pw > 0) { w = String(pw); break; }
      }
    }
    if (w) wVal.value = w;
  }

  // Shared per-exercise rest preference
  const pref = loadRestPrefs()[name.toLowerCase()];
  if (pref && pref !== restDuration) {
    restDuration = pref;
    let matched = false;
    pills.forEach(p => {
      const is = parseInt(p.dataset.val) === pref;
      p.classList.toggle('active', is);
      if (is) matched = true;
    });
    if (!matched) pills.forEach(p => p.classList.remove('active'));
    if (!running) { remaining = total = restDuration; updateTimeDisplay(); setRing(1); }
  }
}

function rememberRestPref() {
  const name = exName.value.trim();
  if (!name) return;
  const p = loadRestPrefs();
  p[name.toLowerCase()] = restDuration;
  saveRestPrefs(p);
}

function updateTodayLine(name) {
  const entry = getTodayEntry(name);
  if (!entry || !entry.sets.length) { todayLine.style.display = 'none'; return; }
  todayLine.innerHTML = '';
  const lbl = document.createElement('span');
  lbl.textContent = 'Hoy: ';
  const strong = document.createElement('strong');
  strong.textContent = entry.sets.map(formatSetShort).filter(Boolean).join(' · ');
  todayLine.append(lbl, strong);
  todayLine.style.display = '';
}

exName.addEventListener('change', updateExerciseInfo);
exName.addEventListener('blur', updateExerciseInfo);

// ─── Steppers ─────────────────────────────────────────────────────────────────
function step(input, delta, min) {
  const cur = parseFloat(input.value);
  let next = (isNaN(cur) ? 0 : cur) + delta;
  if (next < min) next = min;
  input.value = String(parseFloat(next.toFixed(1)));
}

document.getElementById('wDown').addEventListener('click', () => step(wVal, -2.5, 0));
document.getElementById('wUp').addEventListener('click',   () => step(wVal,  2.5, 0));
document.getElementById('rDown').addEventListener('click', () => step(rVal, -1, 0));
document.getElementById('rUp').addEventListener('click',   () => step(rVal,  1, 0));

// ─── Save one set ─────────────────────────────────────────────────────────────
// Appends to today's entry for the exercise (same format as the full app)
btnSave.addEventListener('click', () => {
  const name = exName.value.trim();
  if (!name) {
    exName.classList.remove('shake');
    void exName.offsetWidth;
    exName.classList.add('shake');
    exName.focus();
    setTimeout(() => exName.classList.remove('shake'), 400);
    return;
  }

  const weight = wVal.value.trim();
  const reps   = rVal.value.trim();
  if (!weight && !reps) { showToast('Pon peso o reps'); return; }

  const log = loadLog();
  const key = getTodayKey();
  if (!log[key]) log[key] = [];
  const entry = log[key].find(e =>
    e.exercise && e.exercise.toLowerCase() === name.toLowerCase() && Array.isArray(e.sets));
  if (entry) {
    entry.sets.push({ weight, reps });
  } else {
    log[key].unshift({
      id: Date.now(),
      exercise: name,
      sets: [{ weight, reps }],
      time: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
    });
  }
  saveLog(log);

  setCount(count + 1);
  rVal.value = '';
  updateTodayLine(name);
  populateDatalist();
  if ('vibrate' in navigator) navigator.vibrate(50);
  showToast('SERIE GUARDADA');
  startRest();
});

// ─── Init ─────────────────────────────────────────────────────────────────────
setCount(loadCount());
updateTimeDisplay();
setRing(1);
populateDatalist();
