// ─── State ───────────────────────────────────────────────────────────────────
let restDuration  = 90;
let remaining     = 90;
let totalDuration = 90;
let running       = false;
let interval      = null;
let phase         = 'idle';
let restEndTime   = null;   // epoch ms; source of truth while resting (survives throttling)
let wakeLock      = null;
let sets          = 0;
let totalRests    = 0;
let sessionStart     = null;
let sessionClockStart    = null;
let sessionClockInterval = null;
let prCelebTimeout          = null;
let currentPlan             = [];
let routineSelectedExercises = new Set();
let currentRoutineType      = null;
let completedExercises      = new Set();
let activeExercise          = null;

const CIRCUMFERENCE = 2 * Math.PI * 118;

// ─── Elements ────────────────────────────────────────────────────────────────
const btnTheme        = document.getElementById('btnTheme');
const timeDisplay     = document.getElementById('timeDisplay');
const timeLabel       = document.getElementById('timeLabel');
const ringProgress    = document.getElementById('ringProgress');
const setsDisplay     = document.getElementById('setsDisplay');
const setsDots        = document.getElementById('setsDots');
const statSets        = document.getElementById('statSets');
const statRests       = document.getElementById('statRests');
const statTime        = document.getElementById('statTime');
const btnPlay         = document.getElementById('btnPlay');
const btnReset        = document.getElementById('btnReset');
const btnSet          = document.getElementById('btnSet');
const pills           = document.querySelectorAll('.pill');
const customInput     = document.getElementById('customInput');
const flash           = document.getElementById('flash');
const toast           = document.getElementById('toast');
const setsDown        = document.getElementById('setsDown');
const setsUp          = document.getElementById('setsUp');
const logExercise     = document.getElementById('logExercise');
const logSetsList     = document.getElementById('logSetsList');
const btnLogAddSet    = document.getElementById('btnLogAddSet');
const btnLogSave      = document.getElementById('btnLogSave');
const sessionLog      = document.getElementById('sessionLog');
const btnHistory      = document.getElementById('btnHistory');
const historyPanel    = document.getElementById('historyPanel');
const btnCloseHistory = document.getElementById('btnCloseHistory');
const historyContent  = document.getElementById('historyContent');
const sessionClock        = document.getElementById('sessionClock');
const sessionClockDisplay = document.getElementById('sessionClockDisplay');
const btnEndSession       = document.getElementById('btnEndSession');
const btnResetClock       = document.getElementById('btnResetClock');
const prCelebration       = document.getElementById('prCelebration');
const prCelName           = document.getElementById('prCelName');
const prCelWeight         = document.getElementById('prCelWeight');
const prPanel             = document.getElementById('prPanel');
const prPanelContent      = document.getElementById('prPanelContent');
const btnPRs              = document.getElementById('btnPRs');
const btnClosePr          = document.getElementById('btnClosePr');
const btnStartSession      = document.getElementById('btnStartSession');
const routinePanel         = document.getElementById('routinePanel');
const routineViewType      = document.getElementById('routineViewType');
const routineViewExercises = document.getElementById('routineViewExercises');
const routineTitle         = document.getElementById('routineTitle');
const routineExerciseList  = document.getElementById('routineExerciseList');
const btnRoutineStart      = document.getElementById('btnRoutineStart');
const btnRoutineBack       = document.getElementById('btnRoutineBack');
const sessionPlan          = document.getElementById('sessionPlan');
const planChips            = document.getElementById('planChips');
const activeExerciseBar    = document.getElementById('activeExerciseBar');
const activeExName         = document.getElementById('activeExName');
const btnActiveExDone      = document.getElementById('btnActiveExDone');
const activeExSetNum       = document.getElementById('activeExSetNum');
const activeExLast         = document.getElementById('activeExLast');
const stWeightVal          = document.getElementById('stWeightVal');
const stWeightDown         = document.getElementById('stWeightDown');
const stWeightUp           = document.getElementById('stWeightUp');
const stRepsVal            = document.getElementById('stRepsVal');
const stRepsDown           = document.getElementById('stRepsDown');
const stRepsUp             = document.getElementById('stRepsUp');
const routineViewEdit      = document.getElementById('routineViewEdit');
const btnRoutineEdit       = document.getElementById('btnRoutineEdit');
const btnRoutineBackEdit   = document.getElementById('btnRoutineBackEdit');
const btnRoutineSave       = document.getElementById('btnRoutineSave');
const routineEditList      = document.getElementById('routineEditList');
const routineEditTitle     = document.getElementById('routineEditTitle');
const routineAddInput      = document.getElementById('routineAddInput');
const btnRoutineAdd        = document.getElementById('btnRoutineAdd');
const btnRoutineReset      = document.getElementById('btnRoutineReset');

// ─── Timer helpers ────────────────────────────────────────────────────────────
function fmtTime(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}:${String(sec).padStart(2, '0')}` : `${sec}`;
}

function fmtDuration(totalSec) {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

function setRing(ratio) {
  ringProgress.style.strokeDashoffset = CIRCUMFERENCE * (1 - ratio);
}

function updateDisplay() {
  timeDisplay.textContent = fmtTime(remaining);
  timeDisplay.classList.toggle('warning', remaining <= 5 && running);
}

function flashScreen() {
  flash.classList.remove('active');
  void flash.offsetWidth;
  flash.classList.add('active');
}

function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2000);
}

function beep(type = 'end') {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (type === 'end') {
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
    } else {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = 1100;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.08);
    }
  } catch(e) {}
}

function updateDots() {
  setsDots.innerHTML = '';
  for (let i = 0; i < Math.min(sets, 8); i++) {
    const d = document.createElement('div');
    d.className = 'dot done';
    setsDots.appendChild(d);
  }
}

function startSessionClock(startAt = Date.now()) {
  if (sessionClockInterval) return;
  sessionClockStart = startAt;
  btnStartSession.style.display = 'none';
  sessionClock.classList.add('active');
  sessionClockDisplay.textContent = fmtDuration(Math.floor((Date.now() - startAt) / 1000));
  sessionClockInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - sessionClockStart) / 1000);
    sessionClockDisplay.textContent = fmtDuration(elapsed);
  }, 1000);
  requestWakeLock();
  saveLiveState();
}

function resetSessionClock() {
  if (!sessionClockStart) return;
  sessionClockStart = Date.now();
  sessionClockDisplay.textContent = fmtDuration(0);
  saveLiveState();
}

function endSession() {
  if (!sessionClockStart) return;

  const elapsed  = Math.floor((Date.now() - sessionClockStart) / 1000);
  const dateKey  = getTodayKey();
  const log      = loadLog();
  const entries  = log[dateKey] || [];

  const confirmed = confirm(
    `¿Terminar la sesión?\n\n` +
    `⏱  Duración: ${fmtDuration(elapsed)}\n` +
    `💪 Series: ${sets}   Descansos: ${totalRests}\n` +
    `📋 Ejercicios: ${entries.length}\n\n` +
    `Los datos quedarán guardados en el historial.`
  );
  if (!confirmed) return;

  // Persist: save duration + summary to session meta
  const meta = loadSessionMeta();
  meta[dateKey] = { duration: fmtDuration(elapsed), sets, rests: totalRests };
  saveSessionMeta(meta);

  // Stop clock
  clearInterval(sessionClockInterval);
  sessionClockInterval = null;
  sessionClockStart    = null;
  sessionClock.classList.remove('active');
  sessionClockDisplay.textContent = '00:00:00';

  // Reset all counters
  sets        = 0;
  totalRests  = 0;
  sessionStart = null;
  setsDisplay.textContent  = '0';
  statSets.textContent     = '0';
  statRests.textContent    = '0';
  statTime.textContent     = '0m';
  updateDots();
  reset();

  btnStartSession.style.display = '';
  currentPlan = [];
  completedExercises = new Set();
  clearActiveExercise();
  sessionPlan.style.display = 'none';
  planChips.innerHTML = '';

  releaseWakeLock();
  saveLiveState();
  showToast('Sesión guardada ✓');
}

function updateSessionTime() {
  if (!sessionStart) { statTime.textContent = '0m'; return; }
  statTime.textContent = Math.floor((Date.now() - sessionStart) / 60000) + 'm';
}

// ─── Wake lock ────────────────────────────────────────────────────────────────
async function requestWakeLock() {
  if (!('wakeLock' in navigator)) return;
  try {
    if (wakeLock) return;
    wakeLock = await navigator.wakeLock.request('screen');
    wakeLock.addEventListener('release', () => { wakeLock = null; });
  } catch (e) {}
}

function releaseWakeLock() {
  if (wakeLock) {
    wakeLock.release().catch(() => {});
    wakeLock = null;
  }
}

// ─── Timer logic ──────────────────────────────────────────────────────────────
// The countdown is timestamp-based: setInterval only refreshes the display, so
// background throttling can't freeze or drift the timer — it self-corrects.
function startRest() {
  phase = 'rest';
  remaining = totalDuration = restDuration;
  restEndTime = Date.now() + restDuration * 1000;
  running = true;
  timeLabel.textContent = 'DESCANSO';
  btnPlay.classList.add('rest-mode');
  ringProgress.classList.add('rest-mode');
  btnPlay.textContent = '⏸';
  setRing(1);
  clearInterval(interval);
  interval = setInterval(tick, 500);
  requestWakeLock();
  saveLiveState();
}

function tick() {
  remaining = Math.max(0, Math.ceil((restEndTime - Date.now()) / 1000));
  updateDisplay();
  setRing(remaining / totalDuration);
  if (remaining <= 0) finishRest();
}

function finishRest() {
  clearInterval(interval);
  running = false;
  phase = 'idle';
  restEndTime = null;
  statRests.textContent = ++totalRests;
  beep('end');
  console.log('[VOLTA] Timer en cero — ejecutando vibración');
  if ('vibrate' in navigator) navigator.vibrate([200, 100, 200, 100, 200]);
  if (navigator.serviceWorker && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'SHOW_NOTIFICATION' });
  }
  flashScreen();
  showToast('¡A TRABAJAR!');
  timeLabel.textContent = 'DESCANSO';
  btnPlay.classList.remove('rest-mode');
  ringProgress.classList.remove('rest-mode');
  btnPlay.textContent = '▶';
  remaining = restDuration;
  updateDisplay();
  setRing(1);
  saveLiveState();
}

function pauseResume() {
  if (phase === 'idle' && !running) {
    if (!sessionStart) sessionStart = Date.now();
    startRest();
    return;
  }
  if (running) {
    remaining = Math.max(0, Math.ceil((restEndTime - Date.now()) / 1000));
    clearInterval(interval);
    running = false;
    restEndTime = null;
    btnPlay.textContent = '▶';
  } else {
    restEndTime = Date.now() + remaining * 1000;
    running = true;
    btnPlay.textContent = '⏸';
    interval = setInterval(tick, 500);
  }
  saveLiveState();
}

function reset() {
  clearInterval(interval);
  running = false;
  phase = 'idle';
  restEndTime = null;
  remaining = totalDuration = restDuration;
  updateDisplay();
  setRing(1);
  timeLabel.textContent = 'DESCANSO';
  btnPlay.classList.remove('rest-mode');
  ringProgress.classList.remove('rest-mode');
  btnPlay.textContent = '▶';
  timeDisplay.classList.remove('warning');
  saveLiveState();
}

// Coming back to the foreground: correct the display instantly and re-grab the lock
document.addEventListener('visibilitychange', () => {
  if (document.hidden) return;
  if (running && restEndTime) tick();
  if (sessionClockStart || running) requestWakeLock();
});

function registerSet() {
  if (!sessionStart) sessionStart = Date.now();
  if (!sessionClockStart) startSessionClock();
  sets++;
  setsDisplay.textContent = sets;
  statSets.textContent = sets;
  updateDots();

  // Mirror the set into the log form of the active exercise:
  // add a fresh row (keeping the weight) only if the last one already has data
  if (activeExercise) {
    if (!logExercise.value.trim()) logExercise.value = activeExercise;
    const rows = logSetsList.querySelectorAll('.log-set-row');
    const last = rows[rows.length - 1];
    if (last) {
      const w = last.querySelector('.log-set-weight').value.trim();
      const r = last.querySelector('.log-set-reps').value.trim();
      if (w || r) addLogSetRow(w);
    }
  }

  beep('set');
  showToast('¡SERIE COMPLETADA!');
  startRest();
}

// ─── Duration selection ───────────────────────────────────────────────────────
pills.forEach(p => {
  p.addEventListener('click', () => {
    pills.forEach(x => x.classList.remove('active'));
    p.classList.add('active');
    restDuration = parseInt(p.dataset.val);
    customInput.value = '';
    if (!running) {
      remaining = totalDuration = restDuration;
      updateDisplay();
      setRing(1);
    }
    rememberRestPref();
    saveLiveState();
  });
});

customInput.addEventListener('input', () => {
  const v = parseInt(customInput.value);
  if (v >= 5 && v <= 600) {
    pills.forEach(x => x.classList.remove('active'));
    restDuration = v;
    if (!running) {
      remaining = totalDuration = restDuration;
      updateDisplay();
      setRing(1);
    }
    rememberRestPref();
    saveLiveState();
  }
});

// ─── Manual set counter ───────────────────────────────────────────────────────
setsDown.addEventListener('click', () => {
  if (sets > 0) {
    sets--;
    setsDisplay.textContent = sets;
    statSets.textContent = sets;
    updateDots();
    saveLiveState();
  }
});

setsUp.addEventListener('click', () => {
  sets++;
  setsDisplay.textContent = sets;
  statSets.textContent = sets;
  updateDots();
  saveLiveState();
});

// ─── Button listeners ─────────────────────────────────────────────────────────
btnPlay.addEventListener('click', pauseResume);
btnReset.addEventListener('click', reset);
btnSet.addEventListener('click', registerSet);

setInterval(updateSessionTime, 30000);

// ─── Theme toggle ─────────────────────────────────────────────────────────────
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  btnTheme.textContent = theme === 'dark' ? '☀' : '🌙';
}

btnTheme.addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  localStorage.setItem('gym-timer-theme', next);
});

// ─── Session log – persistence ────────────────────────────────────────────────
function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function loadLog() {
  try { return JSON.parse(localStorage.getItem('gym-timer-log') || '{}'); }
  catch(e) { return {}; }
}

function saveLog(log) {
  localStorage.setItem('gym-timer-log', JSON.stringify(log));
}

function loadSessionMeta() {
  try { return JSON.parse(localStorage.getItem('gym-timer-session-meta') || '{}'); }
  catch(e) { return {}; }
}

function saveSessionMeta(meta) {
  localStorage.setItem('gym-timer-session-meta', JSON.stringify(meta));
}

// ─── Live session persistence ─────────────────────────────────────────────────
// Snapshot of the in-progress session so a killed/reloaded PWA can pick up
// exactly where it left off. Cleared when the session ends.
function saveLiveState() {
  if (!sessionClockStart) { localStorage.removeItem('gym-timer-live'); return; }
  const rows = Array.from(logSetsList.querySelectorAll('.log-set-row')).map(r => ({
    weight: r.querySelector('.log-set-weight').value,
    reps:   r.querySelector('.log-set-reps').value,
  }));
  const state = {
    savedAt: Date.now(),
    sessionClockStart, sessionStart, sets, totalRests,
    currentPlan,
    completed: Array.from(completedExercises),
    activeExercise,
    formName: logExercise.value,
    formRows: rows,
    restDuration,
    timer: (running && restEndTime) ? { endTime: restEndTime, total: totalDuration } : null,
  };
  try { localStorage.setItem('gym-timer-live', JSON.stringify(state)); } catch (e) {}
}

function updateRestUI(seconds) {
  let matched = false;
  pills.forEach(p => {
    const is = parseInt(p.dataset.val) === seconds;
    p.classList.toggle('active', is);
    if (is) matched = true;
  });
  customInput.value = matched ? '' : seconds;
}

// ─── Rest preference per exercise ─────────────────────────────────────────────
function loadRestPrefs() {
  try { return JSON.parse(localStorage.getItem('gym-timer-rest-prefs') || '{}'); }
  catch (e) { return {}; }
}

function rememberRestPref() {
  if (!activeExercise) return;
  const p = loadRestPrefs();
  p[activeExercise.toLowerCase()] = restDuration;
  localStorage.setItem('gym-timer-rest-prefs', JSON.stringify(p));
}

function applyRestPref(name) {
  const pref = loadRestPrefs()[name.toLowerCase()];
  if (!pref || pref === restDuration) return;
  restDuration = pref;
  updateRestUI(pref);
  if (!running) {
    remaining = totalDuration = restDuration;
    updateDisplay();
    setRing(1);
  }
}

function restoreLiveState() {
  let s;
  try { s = JSON.parse(localStorage.getItem('gym-timer-live') || 'null'); }
  catch (e) { return; }
  if (!s || !s.sessionClockStart) return;
  // Stale snapshot (half a day old) → the session is over, drop it
  if (Date.now() - (s.savedAt || 0) > 12 * 3600 * 1000) {
    localStorage.removeItem('gym-timer-live');
    return;
  }

  sets         = s.sets || 0;
  totalRests   = s.totalRests || 0;
  sessionStart = s.sessionStart || null;
  setsDisplay.textContent = sets;
  statSets.textContent    = sets;
  statRests.textContent   = totalRests;
  updateDots();
  updateSessionTime();

  startSessionClock(s.sessionClockStart);

  currentPlan        = s.currentPlan || [];
  completedExercises = new Set(s.completed || []);
  renderPlanChips();

  if (s.restDuration) {
    restDuration = s.restDuration;
    updateRestUI(restDuration);
  }

  logExercise.value = s.formName || '';
  logSetsList.innerHTML = '';
  const rows = (s.formRows && s.formRows.length) ? s.formRows : [{ weight: '', reps: '' }];
  rows.forEach(r => addLogSetRow(r.weight, r.reps));

  if (s.activeExercise) setActiveExercise(s.activeExercise);

  if (s.timer && s.timer.endTime > Date.now()) {
    // Rest was running: resume the countdown from the saved end time
    phase = 'rest';
    running = true;
    restEndTime = s.timer.endTime;
    totalDuration = s.timer.total || restDuration;
    timeLabel.textContent = 'DESCANSO';
    btnPlay.classList.add('rest-mode');
    ringProgress.classList.add('rest-mode');
    btnPlay.textContent = '⏸';
    clearInterval(interval);
    interval = setInterval(tick, 500);
    tick();
  } else {
    remaining = totalDuration = restDuration;
    updateDisplay();
    setRing(1);
    if (s.timer) showToast('El descanso terminó mientras la app estaba cerrada');
  }

  requestWakeLock();
  saveLiveState();
}

// ─── PR helpers ───────────────────────────────────────────────────────────────
function getPRForExercise(name) {
  const lower = name.toLowerCase();
  let maxWeight = 0;
  let maxDate   = '';
  let maxUnit   = 'kg';

  const fn = loadFitNotes();
  if (fn && fn.exercises) {
    for (const [exName, sessions] of Object.entries(fn.exercises)) {
      if (exName.toLowerCase() !== lower) continue;
      for (const session of sessions) {
        for (const set of session.sets) {
          const w = parseFloat(set.weight);
          if (w > maxWeight) { maxWeight = w; maxDate = session.date; maxUnit = set.weightUnit || 'kg'; }
        }
      }
    }
  }

  const log = loadLog();
  for (const [dateKey, entries] of Object.entries(log)) {
    for (const entry of entries) {
      if (!entry.exercise || entry.exercise.toLowerCase() !== lower) continue;
      if (Array.isArray(entry.sets)) {
        for (const s of entry.sets) {
          const w = parseFloat(s.weight);
          if (w > maxWeight) { maxWeight = w; maxDate = dateKey; maxUnit = 'kg'; }
        }
      } else {
        const w = parseFloat(entry.weight);
        if (w > maxWeight) { maxWeight = w; maxDate = dateKey; maxUnit = 'kg'; }
      }
    }
  }

  return maxWeight > 0 ? { weight: maxWeight, unit: maxUnit, date: maxDate } : null;
}

function getAllPRs() {
  const exerciseMap = new Map();

  const fn = loadFitNotes();
  if (fn && fn.exercises) {
    for (const name of Object.keys(fn.exercises)) exerciseMap.set(name.toLowerCase(), name);
  }

  const log = loadLog();
  for (const entries of Object.values(log)) {
    for (const entry of entries) {
      if (entry.exercise) {
        const lower = entry.exercise.toLowerCase();
        if (!exerciseMap.has(lower)) exerciseMap.set(lower, entry.exercise);
      }
    }
  }

  const prs = [];
  for (const displayName of exerciseMap.values()) {
    const pr = getPRForExercise(displayName);
    if (pr) prs.push({ name: displayName, ...pr });
  }
  return prs.sort((a, b) => a.name.localeCompare(b.name));
}

function showPRCelebration(name, weight, unit) {
  prCelName.textContent   = name;
  prCelWeight.textContent = weight + (unit ? ' ' + unit : '');
  prCelebration.classList.add('show');
  clearTimeout(prCelebTimeout);
  prCelebTimeout = setTimeout(() => prCelebration.classList.remove('show'), 3500);
}

function checkPR(name, weightStr) {
  const newWeight = parseFloat(weightStr);
  if (!(newWeight > 0)) return;
  const pr = getPRForExercise(name);
  if (pr && newWeight > pr.weight) showPRCelebration(name, newWeight, 'kg');
}

function renderPRPanel() {
  prPanelContent.innerHTML = '';
  const prs = getAllPRs();

  if (prs.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'pr-empty';
    empty.textContent = 'Sin récords aún. Importa un CSV de FitNotes o registra ejercicios con peso.';
    prPanelContent.appendChild(empty);
    return;
  }

  prs.forEach(pr => {
    const row = document.createElement('div');
    row.className = 'pr-row';

    const nameEl = document.createElement('div');
    nameEl.className = 'pr-row-name';
    nameEl.textContent = pr.name;

    const right = document.createElement('div');
    right.className = 'pr-row-right';

    const weightEl = document.createElement('span');
    weightEl.className = 'pr-row-weight';
    weightEl.textContent = pr.weight + ' ' + (pr.unit || 'kg');

    const dateEl = document.createElement('span');
    dateEl.className = 'pr-row-date';
    dateEl.textContent = pr.date ? formatDateKey(pr.date) : '';

    right.append(weightEl, dateEl);
    row.append(nameEl, right);
    row.addEventListener('click', () => renderPRChart(pr.name));
    prPanelContent.appendChild(row);
  });
}

// ─── Progress chart ───────────────────────────────────────────────────────────
// Per-session top weight and volume, merged from FitNotes + local log
function getExerciseTimeline(name) {
  const lower = name.toLowerCase();
  const byDate = new Map();
  const add = (date, w, r) => {
    const weight = parseFloat(w) || 0;
    const reps = parseInt(r) || 0;
    if (!(weight > 0)) return;
    const cur = byDate.get(date) || { top: 0, volume: 0 };
    cur.top = Math.max(cur.top, weight);
    cur.volume += weight * (reps || 1);
    byDate.set(date, cur);
  };

  const fn = loadFitNotes();
  if (fn && fn.exercises) {
    for (const [n, sessions] of Object.entries(fn.exercises)) {
      if (n.toLowerCase() !== lower) continue;
      for (const s of sessions) for (const set of s.sets) add(s.date, set.weight, set.reps);
    }
  }
  const log = loadLog();
  for (const [date, entries] of Object.entries(log)) {
    for (const e of entries) {
      if (!e.exercise || e.exercise.toLowerCase() !== lower) continue;
      if (Array.isArray(e.sets)) e.sets.forEach(s => add(date, s.weight, s.reps));
      else add(date, e.weight, e.reps);
    }
  }
  return Array.from(byDate.entries())
    .map(([date, v]) => ({ date, ...v }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function formatChartDate(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function chartStat(value, label) {
  const box = document.createElement('div');
  box.className = 'chart-stat';
  const v = document.createElement('div');
  v.className = 'chart-stat-value';
  v.textContent = value;
  const l = document.createElement('div');
  l.className = 'chart-stat-label';
  l.textContent = label;
  box.append(v, l);
  return box;
}

function renderPRChart(name) {
  prPanelContent.innerHTML = '';

  const back = document.createElement('button');
  back.className = 'btn-chart-back';
  back.textContent = '← Récords';
  back.addEventListener('click', renderPRPanel);
  prPanelContent.appendChild(back);

  const title = document.createElement('div');
  title.className = 'chart-title';
  title.textContent = name;
  prPanelContent.appendChild(title);

  const data = getExerciseTimeline(name);
  if (data.length === 0) {
    const msg = document.createElement('p');
    msg.className = 'pr-empty';
    msg.textContent = 'Sin registros con peso para este ejercicio.';
    prPanelContent.appendChild(msg);
    return;
  }

  const first = data[0];
  const last  = data[data.length - 1];
  const top   = Math.max(...data.map(d => d.top));
  const delta = last.top - first.top;

  const stats = document.createElement('div');
  stats.className = 'chart-stats';
  stats.append(
    chartStat(top + ' kg', 'PR'),
    chartStat(last.top + ' kg', 'Última'),
    chartStat((delta >= 0 ? '+' : '') + Math.round(delta * 10) / 10 + ' kg', 'Progreso'),
    chartStat(String(data.length), 'Sesiones'),
  );
  prPanelContent.appendChild(stats);

  if (data.length < 2) {
    const msg = document.createElement('p');
    msg.className = 'chart-note';
    msg.textContent = 'Con al menos 2 sesiones verás la curva de progreso.';
    prPanelContent.appendChild(msg);
    return;
  }

  const W = 340, H = 190, padL = 40, padR = 12, padT = 14, padB = 26;
  const vals = data.map(d => d.top);
  let lo = Math.min(...vals);
  let hi = Math.max(...vals);
  if (hi === lo) { hi += 5; lo = Math.max(0, lo - 5); }
  const xs = i => padL + (W - padL - padR) * (i / (data.length - 1));
  const ys = v => padT + (H - padT - padB) * (1 - (v - lo) / (hi - lo));
  const midVal = Math.round((lo + hi) / 2 * 10) / 10;

  const points = data.map((d, i) => `${xs(i).toFixed(1)},${ys(d.top).toFixed(1)}`).join(' ');
  const dots = data.map((d, i) =>
    `<circle cx="${xs(i).toFixed(1)}" cy="${ys(d.top).toFixed(1)}" r="3.2" style="fill:var(--accent)"/>`
  ).join('');

  const wrap = document.createElement('div');
  wrap.className = 'chart-wrap';
  wrap.innerHTML =
    `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">` +
    `<line x1="${padL}" y1="${ys(midVal)}" x2="${W - padR}" y2="${ys(midVal)}" style="stroke:var(--border);stroke-width:1;stroke-dasharray:3 4"/>` +
    `<line x1="${padL}" y1="${padT}" x2="${padL}" y2="${H - padB}" style="stroke:var(--border);stroke-width:1"/>` +
    `<text x="${padL - 6}" y="${ys(hi) + 3}" text-anchor="end" style="fill:var(--muted);font-size:9px;font-family:'DM Sans',sans-serif">${hi}</text>` +
    `<text x="${padL - 6}" y="${ys(midVal) + 3}" text-anchor="end" style="fill:var(--muted);font-size:9px;font-family:'DM Sans',sans-serif">${midVal}</text>` +
    `<text x="${padL - 6}" y="${ys(lo) + 3}" text-anchor="end" style="fill:var(--muted);font-size:9px;font-family:'DM Sans',sans-serif">${lo}</text>` +
    `<polyline points="${points}" style="fill:none;stroke:var(--accent);stroke-width:2;stroke-linejoin:round;stroke-linecap:round"/>` +
    dots +
    `<text x="${padL}" y="${H - 8}" style="fill:var(--muted);font-size:9px;font-family:'DM Sans',sans-serif">${formatChartDate(first.date)}</text>` +
    `<text x="${W - padR}" y="${H - 8}" text-anchor="end" style="fill:var(--muted);font-size:9px;font-family:'DM Sans',sans-serif">${formatChartDate(last.date)}</text>` +
    `</svg>`;
  prPanelContent.appendChild(wrap);

  const note = document.createElement('p');
  note.className = 'chart-note';
  note.textContent = 'Peso máximo por sesión (kg)';
  prPanelContent.appendChild(note);
}

// ─── Log set row helpers ──────────────────────────────────────────────────────
function addLogSetRow(weight = '', reps = '') {
  const row = document.createElement('div');
  row.className = 'log-set-row';

  const num = document.createElement('span');
  num.className = 'log-set-num';
  num.textContent = logSetsList.children.length + 1;

  const wField = document.createElement('div');
  wField.className = 'log-set-field';
  const wInput = document.createElement('input');
  wInput.className = 'log-set-weight';
  wInput.type = 'number';
  wInput.inputMode = 'numeric';
  wInput.min = '0';
  wInput.step = '0.5';
  wInput.placeholder = 'Peso';
  if (weight) wInput.value = weight;
  const wUnit = document.createElement('span');
  wUnit.className = 'log-set-unit';
  wUnit.textContent = 'kg';
  wField.append(wInput, wUnit);

  const xSep = document.createElement('span');
  xSep.className = 'log-set-x';
  xSep.textContent = '×';

  const rField = document.createElement('div');
  rField.className = 'log-set-field';
  const rInput = document.createElement('input');
  rInput.className = 'log-set-reps';
  rInput.type = 'number';
  rInput.inputMode = 'numeric';
  rInput.min = '1';
  rInput.placeholder = 'Reps';
  if (reps) rInput.value = reps;
  rField.append(rInput);

  const del = document.createElement('button');
  del.className = 'btn-log-del-set';
  del.type = 'button';
  del.textContent = '×';
  del.title = 'Eliminar serie';
  del.addEventListener('click', () => {
    if (logSetsList.children.length > 1) {
      row.remove();
      renumberSetRows();
      syncCardFromRow();
    }
  });

  wInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); rInput.focus(); }
  });
  rInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const allRows = Array.from(logSetsList.querySelectorAll('.log-set-row'));
      if (row === allRows[allRows.length - 1]) {
        // last row → add new row pre-filled with same weight
        addLogSetRow(wInput.value.trim());
        const newWeights = logSetsList.querySelectorAll('.log-set-weight');
        newWeights[newWeights.length - 1].focus();
      } else {
        const idx = allRows.indexOf(row);
        allRows[idx + 1].querySelector('.log-set-weight').focus();
      }
    }
  });

  row.append(num, wField, xSep, rField, del);
  logSetsList.appendChild(row);
  syncCardFromRow();
  return row;
}

function renumberSetRows() {
  logSetsList.querySelectorAll('.log-set-num').forEach((n, i) => n.textContent = i + 1);
}

function saveEntry(refocus = true) {
  const name = logExercise.value.trim();
  if (!name) {
    logExercise.classList.remove('shake');
    void logExercise.offsetWidth;
    logExercise.classList.add('shake');
    logExercise.focus();
    setTimeout(() => logExercise.classList.remove('shake'), 400);
    return;
  }

  const rows = logSetsList.querySelectorAll('.log-set-row');
  const setsData = Array.from(rows).map(r => ({
    weight: r.querySelector('.log-set-weight').value.trim(),
    reps:   r.querySelector('.log-set-reps').value.trim(),
  })).filter(s => s.weight || s.reps);

  const entry = {
    id:       Date.now(),
    exercise: name,
    sets:     setsData,
    time:     new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
  };

  const maxW = setsData.reduce((mx, s) => Math.max(mx, parseFloat(s.weight) || 0), 0);
  if (maxW > 0) checkPR(name, String(maxW));

  if (!sessionClockStart) startSessionClock();

  const log = loadLog();
  const key = getTodayKey();
  if (!log[key]) log[key] = [];
  log[key].unshift(entry);
  saveLog(log);

  logExercise.value = '';
  logSetsList.innerHTML = '';
  addLogSetRow();
  if (refocus !== false) logExercise.focus();

  renderCurrentSession();
  populateExerciseDatalist();
  saveLiveState();
  showToast('Ejercicio guardado');
}

function deleteEntry(dateKey, id) {
  const log = loadLog();
  if (!log[dateKey]) return;
  log[dateKey] = log[dateKey].filter(e => e.id !== id);
  if (log[dateKey].length === 0) delete log[dateKey];
  saveLog(log);
  renderCurrentSession();
  if (historyPanel.classList.contains('open')) renderHistory();
}

function deleteDay(dateKey) {
  const log = loadLog();
  delete log[dateKey];
  saveLog(log);
  renderHistory();
  if (dateKey === getTodayKey()) renderCurrentSession();
}

function buildEntryRow(entry, dateKey) {
  const row = document.createElement('div');
  row.className = 'entry-row';

  const name = document.createElement('div');
  name.className = 'entry-name';
  name.textContent = entry.exercise;

  const chips = document.createElement('div');
  chips.className = 'entry-chips';

  if (Array.isArray(entry.sets)) {
    entry.sets.forEach(s => {
      const c = document.createElement('span');
      c.className = 'chip';
      const parts = [];
      if (s.weight) parts.push(s.weight + 'kg');
      if (s.reps)   parts.push(s.reps + 'r');
      c.textContent = parts.join(' × ') || '—';
      chips.appendChild(c);
    });
  } else {
    // backward compat: old format {weight, sets (string), reps}
    if (entry.weight) {
      const c = document.createElement('span');
      c.className = 'chip';
      c.textContent = entry.weight + 'kg';
      chips.appendChild(c);
    }
    if (entry.sets) {
      const c = document.createElement('span');
      c.className = 'chip';
      c.textContent = entry.sets + 's';
      chips.appendChild(c);
    }
    if (entry.reps) {
      const c = document.createElement('span');
      c.className = 'chip';
      c.textContent = entry.reps + 'r';
      chips.appendChild(c);
    }
  }

  const time = document.createElement('span');
  time.className = 'entry-time';
  time.textContent = entry.time || '';

  const del = document.createElement('button');
  del.className = 'entry-delete';
  del.textContent = '×';
  del.title = 'Eliminar';
  del.addEventListener('click', () => deleteEntry(dateKey, entry.id));

  row.append(name, chips, time, del);
  return row;
}

function renderCurrentSession() {
  const log = loadLog();
  const entries = log[getTodayKey()] || [];
  sessionLog.innerHTML = '';

  if (entries.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'session-empty';
    empty.textContent = 'Sin ejercicios registrados hoy';
    sessionLog.appendChild(empty);
    return;
  }

  const header = document.createElement('div');
  header.className = 'session-log-header';
  const title = document.createElement('span');
  title.className = 'session-log-title';
  title.textContent = 'Sesión de hoy';
  const count = document.createElement('span');
  count.className = 'session-log-count';
  count.textContent = entries.length + ' ejercicio' + (entries.length !== 1 ? 's' : '');
  header.append(title, count);
  sessionLog.appendChild(header);

  entries.forEach(e => sessionLog.appendChild(buildEntryRow(e, getTodayKey())));
}

// ─── History panel ────────────────────────────────────────────────────────────
function formatDateKey(key) {
  if (key === getTodayKey()) return 'Hoy';
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });
}

// ─── Weekly summary ───────────────────────────────────────────────────────────
// Monday of the week containing the given date, as YYYY-MM-DD
function getWeekKey(d) {
  const dt = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  dt.setDate(dt.getDate() - ((dt.getDay() + 6) % 7));
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

function weekKeyOfDateStr(key) {
  const [y, m, d] = key.split('-').map(Number);
  return getWeekKey(new Date(y, m - 1, d));
}

function buildWeeklySummaryEl() {
  const log = loadLog();
  if (Object.keys(log).length === 0) return null;

  const thisWeek = getWeekKey(new Date());
  const fn = loadFitNotes();
  const catFor = name => {
    if (!fn || !fn.categories || !name) return null;
    if (fn.categories[name]) return fn.categories[name];
    const k = Object.keys(fn.categories).find(k => k.toLowerCase() === name.toLowerCase());
    return k ? fn.categories[k] : null;
  };

  let sessions = 0, setCount = 0, volume = 0;
  const groups = {};
  for (const [date, entries] of Object.entries(log)) {
    if (weekKeyOfDateStr(date) !== thisWeek) continue;
    sessions++;
    for (const e of entries) {
      const sets = Array.isArray(e.sets) ? e.sets : [{ weight: e.weight, reps: e.reps }];
      const valid = sets.filter(s =>
        (s.weight || '').toString().trim() || (s.reps || '').toString().trim());
      setCount += valid.length;
      valid.forEach(s => {
        volume += (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0);
      });
      const cat = catFor(e.exercise) || 'Otros';
      groups[cat] = (groups[cat] || 0) + valid.length;
    }
  }

  // Streak: consecutive weeks with at least one logged day, counting back.
  // An empty current week doesn't break the streak (it just isn't counted yet).
  const weekSet = new Set(Object.keys(log).map(weekKeyOfDateStr));
  let streak = 0;
  const cursor = new Date();
  if (!weekSet.has(thisWeek)) cursor.setDate(cursor.getDate() - 7);
  while (weekSet.has(getWeekKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 7);
  }

  const el = document.createElement('div');
  el.className = 'week-summary';

  const label = document.createElement('div');
  label.className = 'week-summary-label';
  label.textContent = 'ESTA SEMANA';

  const main = document.createElement('div');
  main.className = 'week-summary-main';
  main.textContent = sessions === 0
    ? 'Sin sesiones todavía'
    : `${sessions} ${sessions === 1 ? 'sesión' : 'sesiones'} · ${setCount} series · ${Math.round(volume).toLocaleString('es-ES')} kg`;

  el.append(label, main);

  const groupNames = Object.keys(groups).sort((a, b) => groups[b] - groups[a]);
  if (groupNames.length > 0 && !(groupNames.length === 1 && groupNames[0] === 'Otros')) {
    const gr = document.createElement('div');
    gr.className = 'week-summary-groups';
    gr.textContent = groupNames.map(g => `${g} ${groups[g]}`).join(' · ');
    el.appendChild(gr);
  }

  if (streak > 0) {
    const st = document.createElement('div');
    st.className = 'week-summary-streak';
    st.textContent = `${streak >= 2 ? '🔥 ' : ''}Racha: ${streak} semana${streak !== 1 ? 's' : ''} entrenando`;
    el.appendChild(st);
  }

  return el;
}

function renderHistory() {
  const log = loadLog();
  const keys = Object.keys(log).sort((a, b) => b.localeCompare(a));
  historyContent.innerHTML = '';

  if (keys.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'history-empty';
    empty.textContent = 'Aún no hay sesiones guardadas';
    historyContent.appendChild(empty);
    return;
  }

  const weekSummary = buildWeeklySummaryEl();
  if (weekSummary) historyContent.appendChild(weekSummary);

  keys.forEach(key => {
    const entries = log[key];

    const day = document.createElement('div');
    day.className = 'history-day';

    const hdr = document.createElement('div');
    hdr.className = 'history-day-header';

    const dateEl = document.createElement('span');
    dateEl.className = 'history-day-date';
    dateEl.textContent = formatDateKey(key);

    const meta = document.createElement('span');
    meta.className = 'history-day-meta';
    const sessionMeta = loadSessionMeta();
    const sm  = sessionMeta[key];
    const dur = sm ? (typeof sm === 'object' ? sm.duration : sm) : null;
    meta.textContent = entries.length + ' ejercicio' + (entries.length !== 1 ? 's' : '') + (dur ? ' · ' + dur : '');

    const delDay = document.createElement('button');
    delDay.className = 'history-day-delete';
    delDay.textContent = 'Borrar';
    delDay.addEventListener('click', () => {
      if (confirm(`¿Borrar toda la sesión del ${formatDateKey(key)}?`)) deleteDay(key);
    });

    hdr.append(dateEl, meta, delDay);
    day.appendChild(hdr);

    entries.forEach(e => day.appendChild(buildEntryRow(e, key)));
    historyContent.appendChild(day);
  });
}

btnHistory.addEventListener('click', () => {
  renderHistory();
  historyPanel.classList.add('open');
  document.body.style.overflow = 'hidden';
});

btnCloseHistory.addEventListener('click', () => {
  historyPanel.classList.remove('open');
  document.body.style.overflow = '';
});

// ─── Data export / backup ─────────────────────────────────────────────────────
const btnExportCsv     = document.getElementById('btnExportCsv');
const btnBackupJson    = document.getElementById('btnBackupJson');
const restoreFileInput = document.getElementById('restoreFileInput');

const BACKUP_KEYS = [
  'gym-timer-log', 'gym-timer-session-meta', 'gym-timer-fitnotes',
  'gym-timer-custom-routines', 'gym-timer-rest-prefs', 'gym-timer-theme',
];

function csvEscape(v) {
  v = String(v == null ? '' : v);
  return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
}

// FitNotes-compatible CSV with everything: imported history + local log.
// Reimportable both in FitNotes and in VOLTA itself.
function buildExportCSV() {
  const header = 'Date,Exercise,Category,Weight,Weight Unit,Reps,Distance,Distance Unit,Time';
  const rows = [];
  const fn = loadFitNotes();
  const catFor = name => {
    if (!fn || !fn.categories || !name) return '';
    if (fn.categories[name]) return fn.categories[name];
    const k = Object.keys(fn.categories).find(k => k.toLowerCase() === name.toLowerCase());
    return k ? fn.categories[k] : '';
  };

  if (fn && fn.exercises) {
    for (const [name, sessions] of Object.entries(fn.exercises)) {
      for (const sess of sessions) {
        for (const set of sess.sets) {
          rows.push([sess.date, name, catFor(name), set.weight, set.weightUnit,
                     set.reps, set.distance, set.distUnit, set.time].map(csvEscape).join(','));
        }
      }
    }
  }

  const log = loadLog();
  for (const [date, entries] of Object.entries(log)) {
    for (const e of entries) {
      const sets = Array.isArray(e.sets) ? e.sets : [{ weight: e.weight, reps: e.reps }];
      for (const s of sets) {
        if (!(s.weight || '').toString().trim() && !(s.reps || '').toString().trim()) continue;
        rows.push([date, e.exercise, catFor(e.exercise), s.weight || '',
                   s.weight ? 'kgs' : '', s.reps || '', '', '', ''].map(csvEscape).join(','));
      }
    }
  }

  rows.sort();
  return [header, ...rows].join('\n');
}

function buildBackup() {
  const data = { app: 'VOLTA', version: 1, exportedAt: new Date().toISOString(), store: {} };
  BACKUP_KEYS.forEach(k => {
    const v = localStorage.getItem(k);
    if (v !== null) data.store[k] = v;
  });
  return JSON.stringify(data);
}

function downloadFile(name, content, type) {
  const blob = new Blob([content], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

btnExportCsv.addEventListener('click', () => {
  downloadFile(`volta-export-${getTodayKey()}.csv`, buildExportCSV(), 'text/csv');
  showToast('CSV exportado');
});

btnBackupJson.addEventListener('click', () => {
  downloadFile(`volta-respaldo-${getTodayKey()}.json`, buildBackup(), 'application/json');
  showToast('Respaldo descargado');
});

restoreFileInput.addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const data = JSON.parse(ev.target.result);
      if (!data || data.app !== 'VOLTA' || !data.store) {
        alert('Archivo de respaldo inválido.');
        return;
      }
      if (!confirm('¿Restaurar respaldo? Se reemplazarán los datos actuales de la app.')) return;
      Object.entries(data.store).forEach(([k, v]) => {
        if (BACKUP_KEYS.includes(k)) localStorage.setItem(k, v);
      });
      location.reload();
    } catch (err) {
      alert('No se pudo leer el respaldo.');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
});

btnLogSave.addEventListener('click', saveEntry);

logExercise.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    e.preventDefault();
    const firstWeight = logSetsList.querySelector('.log-set-weight');
    if (firstWeight) firstWeight.focus();
  }
});

btnLogAddSet.addEventListener('click', () => {
  const allWeights = logSetsList.querySelectorAll('.log-set-weight');
  const lastWeight = allWeights.length ? allWeights[allWeights.length - 1].value.trim() : '';
  addLogSetRow(lastWeight);
  const newWeights = logSetsList.querySelectorAll('.log-set-weight');
  newWeights[newWeights.length - 1].focus();
});

// ─── FitNotes – elements ──────────────────────────────────────────────────────
const btnFitNotes      = document.getElementById('btnFitNotes');
const fnPanel          = document.getElementById('fnPanel');
const btnCloseFn       = document.getElementById('btnCloseFn');
const btnFnBack        = document.getElementById('btnFnBack');
const fnFileInput      = document.getElementById('fnFileInput');
const fnViewEmpty      = document.getElementById('fnViewEmpty');
const fnViewSearch     = document.getElementById('fnViewSearch');
const fnViewExercise   = document.getElementById('fnViewExercise');
const fnSearchInput    = document.getElementById('fnSearchInput');
const fnResults        = document.getElementById('fnResults');
const fnImportInfo     = document.getElementById('fnImportInfo');
const fnExerciseContent = document.getElementById('fnExerciseContent');
const fnTitle          = document.getElementById('fnTitle');

// ─── FitNotes – storage ───────────────────────────────────────────────────────
function loadFitNotes() {
  try { return JSON.parse(localStorage.getItem('gym-timer-fitnotes') || 'null'); }
  catch(e) { return null; }
}

function saveFitNotes(data) {
  try { localStorage.setItem('gym-timer-fitnotes', JSON.stringify(data)); }
  catch(e) { alert('Archivo demasiado grande para el almacenamiento local (límite ~5 MB).'); }
}

// Fills #fnExercisesList (autocomplete for log form and routine editor)
// with FitNotes names + locally logged names, deduped case-insensitively
function populateExerciseDatalist() {
  const dl = document.getElementById('fnExercisesList');
  dl.innerHTML = '';

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

  Array.from(byLower.values())
    .sort((a, b) => a.localeCompare(b))
    .forEach(name => {
      const opt = document.createElement('option');
      opt.value = name;
      dl.appendChild(opt);
    });
}

// ─── FitNotes – CSV parser ────────────────────────────────────────────────────
function parseCSVLine(line) {
  const result = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') { field += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (c === ',' && !inQuotes) {
      result.push(field); field = '';
    } else {
      field += c;
    }
  }
  result.push(field);
  return result;
}

function processCSV(text) {
  text = text.replace(/^﻿/, '');
  const lines = text.split(/\r?\n/);
  if (lines.length < 2) return null;

  const headers = parseCSVLine(lines[0]).map(h => h.trim());
  const idx = {
    date:      headers.indexOf('Date'),
    exercise:  headers.indexOf('Exercise'),
    category:  headers.indexOf('Category'),
    weight:    headers.indexOf('Weight'),
    weightUnit:headers.indexOf('Weight Unit'),
    reps:      headers.indexOf('Reps'),
    distance:  headers.indexOf('Distance'),
    distUnit:  headers.indexOf('Distance Unit'),
    time:      headers.indexOf('Time'),
  };
  if (idx.date === -1 || idx.exercise === -1) return null;

  const map = {};
  const categories = {};
  let totalRows = 0;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const c = parseCSVLine(line);
    const date = c[idx.date]?.trim();
    const name = c[idx.exercise]?.trim();
    if (!date || !name) continue;
    totalRows++;
    if (idx.category >= 0 && c[idx.category]?.trim()) {
      categories[name] = c[idx.category].trim();
    }
    const set = {
      weight:    idx.weight     >= 0 ? c[idx.weight]?.trim()     || '' : '',
      weightUnit:idx.weightUnit >= 0 ? c[idx.weightUnit]?.trim() || '' : '',
      reps:      idx.reps       >= 0 ? c[idx.reps]?.trim()       || '' : '',
      distance:  idx.distance   >= 0 ? c[idx.distance]?.trim()   || '' : '',
      distUnit:  idx.distUnit   >= 0 ? c[idx.distUnit]?.trim()   || '' : '',
      time:      idx.time       >= 0 ? c[idx.time]?.trim()       || '' : '',
    };
    if (!map[name]) map[name] = {};
    if (!map[name][date]) map[name][date] = [];
    map[name][date].push(set);
  }

  const exercises = {};
  for (const [name, dateMap] of Object.entries(map)) {
    exercises[name] = Object.entries(dateMap)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([date, sets]) => ({ date, sets }));
  }

  return { importedAt: new Date().toISOString(), totalRows, exercises, categories };
}

// ─── FitNotes – display helpers ───────────────────────────────────────────────
function formatSet(set) {
  const parts = [];
  if (set.weight && parseFloat(set.weight) > 0)
    parts.push(`${set.weight} ${set.weightUnit}`.trim());
  if (set.reps && parseInt(set.reps) > 0)
    parts.push(`× ${set.reps}`);
  if (set.distance && parseFloat(set.distance) > 0)
    parts.push(`${set.distance} ${set.distUnit}`.trim());
  if (set.time && set.time !== '00:00:00' && set.time !== '')
    parts.push(set.time);
  return parts.join('  ') || '—';
}

function formatDateLong(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-ES', {
    day: 'numeric', month: 'long', year: 'numeric'
  });
}

// ─── FitNotes – view switching ────────────────────────────────────────────────
function showFnView(view) {
  fnViewEmpty.style.display    = view === 'empty'    ? 'flex' : 'none';
  fnViewSearch.style.display   = view === 'search'   ? 'flex' : 'none';
  fnViewExercise.style.display = view === 'exercise' ? 'flex' : 'none';
  btnFnBack.style.display      = view === 'exercise' ? 'flex' : 'none';
}

// ─── FitNotes – render search ─────────────────────────────────────────────────
function renderFnSearch(query) {
  const data = loadFitNotes();
  fnResults.innerHTML = '';
  if (!data) { showFnView('empty'); return; }

  const q = query.toLowerCase().trim();
  const names = Object.keys(data.exercises).sort();
  const filtered = q ? names.filter(n => n.toLowerCase().includes(q)) : names;

  if (filtered.length === 0) {
    const msg = document.createElement('p');
    msg.className = 'fn-no-results';
    msg.textContent = q ? `Sin resultados para "${query}"` : 'Sin ejercicios';
    fnResults.appendChild(msg);
    return;
  }

  filtered.forEach(name => {
    const sessions = data.exercises[name];
    const btn = document.createElement('button');
    btn.className = 'fn-exercise-btn';

    const nameEl = document.createElement('span');
    nameEl.className = 'fn-exercise-btn-name';
    nameEl.textContent = name;

    const meta = document.createElement('span');
    meta.className = 'fn-exercise-btn-meta';
    meta.textContent = sessions.length + (sessions.length === 1 ? ' sesión' : ' sesiones');

    btn.append(nameEl, meta);
    btn.addEventListener('click', () => renderFnExercise(name));
    fnResults.appendChild(btn);
  });
}

// ─── FitNotes – render exercise history ──────────────────────────────────────
function renderFnExercise(name) {
  const data = loadFitNotes();
  if (!data || !data.exercises[name]) return;

  const sessions = data.exercises[name];
  fnTitle.textContent = name.length > 22 ? name.slice(0, 20) + '…' : name;
  fnExerciseContent.innerHTML = '';
  showFnView('exercise');

  // Last session — pinned reference card
  const last = sessions[0];
  const lastCard = document.createElement('div');
  lastCard.className = 'fn-last-card';

  const lastHdr = document.createElement('div');
  lastHdr.className = 'fn-last-header';
  const badge = document.createElement('span');
  badge.className = 'fn-last-badge';
  badge.textContent = 'ÚLTIMA SESIÓN';
  const lastDateEl = document.createElement('span');
  lastDateEl.className = 'fn-last-date';
  lastDateEl.textContent = formatDateLong(last.date);
  lastHdr.append(badge, lastDateEl);

  const lastSets = document.createElement('div');
  lastSets.className = 'fn-sets-list';
  last.sets.forEach((set, i) => {
    const row = document.createElement('div');
    row.className = 'fn-set-row fn-set-last';
    const num = document.createElement('span');
    num.className = 'fn-set-num';
    num.textContent = i + 1;
    const val = document.createElement('span');
    val.className = 'fn-set-val';
    val.textContent = formatSet(set);
    row.append(num, val);
    lastSets.appendChild(row);
  });

  lastCard.append(lastHdr, lastSets);
  fnExerciseContent.appendChild(lastCard);

  // Full history
  if (sessions.length > 1) {
    const histLabel = document.createElement('div');
    histLabel.className = 'fn-hist-label';
    histLabel.textContent = 'HISTORIAL COMPLETO';
    fnExerciseContent.appendChild(histLabel);

    sessions.slice(1).forEach(session => {
      const block = document.createElement('div');
      block.className = 'fn-session-block';

      const dateRow = document.createElement('div');
      dateRow.className = 'fn-session-date-row';
      const dateEl = document.createElement('span');
      dateEl.className = 'fn-session-date';
      dateEl.textContent = formatDateLong(session.date);
      const countEl = document.createElement('span');
      countEl.className = 'fn-session-count';
      countEl.textContent = session.sets.length + ' ser.';
      dateRow.append(dateEl, countEl);

      const setsList = document.createElement('div');
      setsList.className = 'fn-sets-list';
      session.sets.forEach((set, i) => {
        const row = document.createElement('div');
        row.className = 'fn-set-row';
        const num = document.createElement('span');
        num.className = 'fn-set-num';
        num.textContent = i + 1;
        const val = document.createElement('span');
        val.className = 'fn-set-val';
        val.textContent = formatSet(set);
        row.append(num, val);
        setsList.appendChild(row);
      });

      block.append(dateRow, setsList);
      fnExerciseContent.appendChild(block);
    });
  }

  fnExerciseContent.scrollTop = 0;
}

// ─── FitNotes – CSV import ────────────────────────────────────────────────────
fnFileInput.addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    const data = processCSV(ev.target.result);
    if (!data) {
      alert('Formato incorrecto. Asegúrate de que sea un CSV exportado desde FitNotes.');
      return;
    }
    saveFitNotes(data);
    populateExerciseDatalist();
    const count = Object.keys(data.exercises).length;
    fnImportInfo.textContent = `${count} ejercicios · ${data.totalRows} registros`;
    fnSearchInput.value = '';
    showFnView('search');
    renderFnSearch('');
    showToast(`${count} ejercicios importados`);
  };
  reader.readAsText(file, 'UTF-8');
  e.target.value = '';
});

// Search debounce
let fnSearchTimer;
fnSearchInput.addEventListener('input', () => {
  clearTimeout(fnSearchTimer);
  fnSearchTimer = setTimeout(() => renderFnSearch(fnSearchInput.value), 180);
});

// Back button
btnFnBack.addEventListener('click', () => {
  fnTitle.textContent = 'FITNOTES';
  showFnView('search');
  fnSearchInput.focus();
});

// Open panel
btnFitNotes.addEventListener('click', () => {
  fnPanel.classList.add('open');
  document.body.style.overflow = 'hidden';
  const data = loadFitNotes();
  if (data) {
    fnTitle.textContent = 'FITNOTES';
    fnImportInfo.textContent = `${Object.keys(data.exercises).length} ejercicios · ${data.totalRows} registros`;
    showFnView('search');
    renderFnSearch(fnSearchInput.value);
  } else {
    showFnView('empty');
  }
});

// Close panel
btnCloseFn.addEventListener('click', () => {
  fnPanel.classList.remove('open');
  document.body.style.overflow = '';
  fnTitle.textContent = 'FITNOTES';
  if (fnViewExercise.style.display !== 'none') showFnView('search');
});

btnEndSession.addEventListener('click', endSession);
btnResetClock.addEventListener('click', resetSessionClock);

// ─── Routine selector ────────────────────────────────────────────────────────
const ROUTINE_MAP = {
  push: ['Chest', 'Shoulders', 'Triceps'],
  pull: ['Back', 'Biceps', 'Forearms'],
  legs: ['Legs', 'Glutes', 'Quads', 'Hamstrings', 'Calves'],
};

function getExercisesForRoutine(type) {
  const cats = ROUTINE_MAP[type];
  if (!cats) return [];
  const fn = loadFitNotes();
  if (!fn || !fn.exercises) return [];
  const catsLower = cats.map(c => c.toLowerCase());
  const result = [];
  for (const [name, sessions] of Object.entries(fn.exercises)) {
    const cat = fn.categories && fn.categories[name];
    if (!cat || !catsLower.includes(cat.toLowerCase())) continue;
    const lastSession = sessions[0];
    const lastSet = lastSession ? lastSession.sets[lastSession.sets.length - 1] : null;
    result.push({
      name,
      category: cat,
      lastWeight: lastSet ? parseFloat(lastSet.weight) || 0 : 0,
      lastReps:   lastSet ? parseInt(lastSet.reps)    || 0 : 0,
      lastUnit:   lastSet ? (lastSet.weightUnit || 'kg') : 'kg',
    });
  }
  return result.sort((a, b) => {
    const ia = catsLower.indexOf(a.category.toLowerCase());
    const ib = catsLower.indexOf(b.category.toLowerCase());
    if (ia !== ib) return ia - ib;
    return a.name.localeCompare(b.name);
  });
}

function loadCustomRoutines() {
  try { return JSON.parse(localStorage.getItem('gym-timer-custom-routines') || '{}'); }
  catch(e) { return {}; }
}

function saveCustomRoutines(r) {
  localStorage.setItem('gym-timer-custom-routines', JSON.stringify(r));
}

// Returns enriched exercise list: custom if exists, else FitNotes-derived
function getRoutineExercises(type) {
  const custom = loadCustomRoutines();
  if (custom[type] && custom[type].length > 0) {
    const fn = loadFitNotes();
    return custom[type].map(name => {
      let lastWeight = 0, lastReps = 0, lastUnit = 'kg';
      if (fn && fn.exercises) {
        for (const [exName, sessions] of Object.entries(fn.exercises)) {
          if (exName.toLowerCase() !== name.toLowerCase()) continue;
          const lastSet = sessions[0]?.sets[sessions[0].sets.length - 1];
          if (lastSet) {
            lastWeight = parseFloat(lastSet.weight) || 0;
            lastReps   = parseInt(lastSet.reps)    || 0;
            lastUnit   = lastSet.weightUnit || 'kg';
          }
          break;
        }
      }
      return { name, category: '', lastWeight, lastReps, lastUnit };
    });
  }
  return getExercisesForRoutine(type);
}

function showRoutineView(view) {
  routineViewType.style.display      = view === 'type'      ? 'flex' : 'none';
  routineViewExercises.style.display = view === 'exercises' ? 'flex' : 'none';
  routineViewEdit.style.display      = view === 'edit'      ? 'flex' : 'none';
}

function updateRoutineStartBtn() {
  const n = routineSelectedExercises.size;
  btnRoutineStart.textContent = n > 0
    ? `Empezar con ${n} ejercicio${n !== 1 ? 's' : ''}`
    : 'Empezar sin selección';
}

function showRoutineEmpty(title, body) {
  routineExerciseList.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'routine-empty';
  const t = document.createElement('strong');
  t.textContent = title;
  const p = document.createElement('p');
  p.textContent = body;
  wrap.append(t, p);
  routineExerciseList.appendChild(wrap);
}

function renderRoutineExercises(type) {
  routineExerciseList.innerHTML = '';
  routineSelectedExercises = new Set();
  currentRoutineType = type;
  routineTitle.textContent = type.toUpperCase();

  const custom = loadCustomRoutines();
  const hasCustom = custom[type] && custom[type].length > 0;

  // Only check FitNotes state when no custom routine exists
  if (!hasCustom) {
    const fn = loadFitNotes();
    const exCount  = fn && fn.exercises  ? Object.keys(fn.exercises).length  : 0;
    const catCount = fn && fn.categories ? Object.keys(fn.categories).length : 0;
    console.log('[VOLTA] routine:', type, '| fn exercises:', exCount, '| categories:', catCount);

    if (!fn || exCount === 0) {
      showRoutineEmpty(
        'Sin datos de FitNotes',
        'Importa tu historial desde "Historial FitNotes", o pulsa Editar para añadir ejercicios manualmente.'
      );
      updateRoutineStartBtn();
      showRoutineView('exercises');
      return;
    }
    if (catCount === 0) {
      showRoutineEmpty(
        'Reimporta tu historial',
        'Tu CSV fue importado con una versión anterior. Ve a "Historial FitNotes" → Importar CSV, o pulsa Editar para añadir ejercicios manualmente.'
      );
      updateRoutineStartBtn();
      showRoutineView('exercises');
      return;
    }
  }

  const exercises = getRoutineExercises(type);
  console.log('[VOLTA]', type, exercises.length, 'exercises', hasCustom ? '(custom)' : '(FitNotes)');

  if (exercises.length === 0) {
    showRoutineEmpty(
      `Sin ejercicios para ${type.toUpperCase()}`,
      'No hay ejercicios para esta categoría. Pulsa Editar para añadirlos manualmente.'
    );
    updateRoutineStartBtn();
    showRoutineView('exercises');
    return;
  }

  routineSelectedExercises = new Set(exercises.map(e => e.name));

  let currentCat = null;
  exercises.forEach(ex => {
    if (!hasCustom && ex.category && ex.category !== currentCat) {
      currentCat = ex.category;
      const catLabel = document.createElement('div');
      catLabel.className = 'routine-cat-label';
      catLabel.textContent = ex.category.toUpperCase();
      routineExerciseList.appendChild(catLabel);
    }

    const item = document.createElement('div');
    item.className = 'routine-exercise-item selected';
    item.dataset.name = ex.name;

    const left = document.createElement('div');
    left.className = 'routine-item-left';

    const check = document.createElement('span');
    check.className = 'routine-item-check';
    check.textContent = '✓';

    const nameEl = document.createElement('span');
    nameEl.className = 'routine-item-name';
    nameEl.textContent = ex.name;

    left.append(check, nameEl);

    const ref = document.createElement('div');
    ref.className = 'routine-item-ref';
    if (ex.lastWeight > 0) {
      ref.textContent = ex.lastWeight + ' ' + ex.lastUnit + (ex.lastReps > 0 ? ' × ' + ex.lastReps : '');
    }

    item.append(left, ref);
    item.addEventListener('click', () => {
      if (routineSelectedExercises.has(ex.name)) {
        routineSelectedExercises.delete(ex.name);
        item.classList.remove('selected');
      } else {
        routineSelectedExercises.add(ex.name);
        item.classList.add('selected');
      }
      updateRoutineStartBtn();
    });
    routineExerciseList.appendChild(item);
  });

  updateRoutineStartBtn();
  showRoutineView('exercises');
}

function renderPlanChips() {
  planChips.innerHTML = '';
  if (currentPlan.length === 0) { sessionPlan.style.display = 'none'; return; }
  sessionPlan.style.display = 'flex';
  currentPlan.forEach(name => {
    const wrap = document.createElement('div');
    wrap.className = 'plan-chip-wrap';
    wrap.dataset.name = name.toLowerCase();
    if (completedExercises.has(name.toLowerCase())) wrap.classList.add('done');
    if (activeExercise && activeExercise.toLowerCase() === name.toLowerCase()) wrap.classList.add('active');

    const chip = document.createElement('button');
    chip.className = 'plan-chip';
    chip.type = 'button';
    chip.textContent = name;
    chip.addEventListener('click', () => {
      // Switching exercise with unsaved data → bank it first so nothing is lost
      const formName = logExercise.value.trim();
      if (formName && formName.toLowerCase() !== name.toLowerCase() && logFormHasData()) {
        saveEntry(false);
      }
      setActiveExercise(name);
      logExercise.value = name;
      activeExerciseBar.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    const check = document.createElement('button');
    check.className = 'plan-chip-check';
    check.type = 'button';
    check.textContent = '✓';
    check.title = 'Terminar ejercicio';
    check.addEventListener('click', () => finishExercise(name));

    wrap.append(chip, check);
    planChips.appendChild(wrap);
  });
}

function markPlanChipDone(name) {
  const lower = name.toLowerCase();
  completedExercises.add(lower);
  planChips.querySelectorAll('.plan-chip-wrap').forEach(wrap => {
    if (wrap.dataset.name === lower) wrap.classList.add('done');
  });
  if (activeExercise && activeExercise.toLowerCase() === lower) clearActiveExercise();
  saveLiveState();
}

// ─── Active exercise ──────────────────────────────────────────────────────────
function updateActiveChipStyles() {
  planChips.querySelectorAll('.plan-chip-wrap').forEach(wrap => {
    wrap.classList.toggle('active',
      activeExercise !== null && wrap.dataset.name === activeExercise.toLowerCase());
  });
}

// Last weight used for an exercise: local log first, then FitNotes
function getLastKnownWeight(name) {
  const lower = name.toLowerCase();
  const log = loadLog();
  const keys = Object.keys(log).sort((a, b) => b.localeCompare(a));
  for (const key of keys) {
    for (const entry of log[key]) {
      if (!entry.exercise || entry.exercise.toLowerCase() !== lower) continue;
      if (Array.isArray(entry.sets)) {
        for (let i = entry.sets.length - 1; i >= 0; i--) {
          if (entry.sets[i].weight) return entry.sets[i].weight;
        }
      } else if (entry.weight) {
        return entry.weight;
      }
    }
  }
  const fn = loadFitNotes();
  if (fn && fn.exercises) {
    for (const [exName, sessions] of Object.entries(fn.exercises)) {
      if (exName.toLowerCase() !== lower) continue;
      const sets = (sessions[0] && sessions[0].sets) || [];
      for (let i = sets.length - 1; i >= 0; i--) {
        const w = parseFloat(sets[i].weight);
        if (w > 0) return String(w);
      }
    }
  }
  return '';
}

// Full set list of the most recent session of an exercise (local log, then FitNotes)
function getLastSessionSets(name) {
  const lower = name.toLowerCase();
  const log = loadLog();
  const keys = Object.keys(log).sort((a, b) => b.localeCompare(a));
  for (const key of keys) {
    for (const e of log[key]) {
      if (!e.exercise || e.exercise.toLowerCase() !== lower) continue;
      const sets = Array.isArray(e.sets) ? e.sets : [{ weight: e.weight, reps: e.reps }];
      const valid = sets.filter(s =>
        (s.weight || '').toString().trim() || (s.reps || '').toString().trim());
      if (valid.length) return { date: key, sets: valid };
    }
  }
  const fn = loadFitNotes();
  if (fn && fn.exercises) {
    for (const [exName, sessions] of Object.entries(fn.exercises)) {
      if (exName.toLowerCase() !== lower) continue;
      if (sessions[0] && sessions[0].sets.length) return { date: sessions[0].date, sets: sessions[0].sets };
    }
  }
  return null;
}

function formatSetShort(s) {
  const w = parseFloat(s.weight);
  const r = (s.reps || '').toString().trim();
  if (w > 0 && r) return w + '×' + r;
  if (w > 0) return w + 'kg';
  if (r) return '×' + r;
  return '';
}

function updateActiveExLast(name) {
  const last = getLastSessionSets(name);
  if (!last) { activeExLast.style.display = 'none'; return; }
  const [y, m, d] = last.date.split('-').map(Number);
  const dateStr = new Date(y, m - 1, d).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  const setsStr = last.sets.map(formatSetShort).filter(Boolean).join(' · ');
  activeExLast.innerHTML = '';
  const label = document.createElement('span');
  label.textContent = `Última vez (${dateStr}): `;
  const vals = document.createElement('strong');
  vals.textContent = setsStr;
  activeExLast.append(label, vals);
  activeExLast.style.display = '';
}

function lastLogRow() {
  const rows = logSetsList.querySelectorAll('.log-set-row');
  return rows.length ? rows[rows.length - 1] : null;
}

function logFormHasData() {
  return Array.from(logSetsList.querySelectorAll('.log-set-row')).some(r =>
    r.querySelector('.log-set-weight').value.trim() ||
    r.querySelector('.log-set-reps').value.trim());
}

// The card's steppers edit the LAST set row of the log form (the current set)
function syncCardFromRow() {
  if (!activeExercise) return;
  const row = lastLogRow();
  const n = logSetsList.querySelectorAll('.log-set-row').length;
  activeExSetNum.textContent = 'SERIE ' + Math.max(n, 1);
  stWeightVal.value = row ? row.querySelector('.log-set-weight').value : '';
  stRepsVal.value   = row ? row.querySelector('.log-set-reps').value   : '';
}

function syncRowFromCard() {
  const row = lastLogRow();
  if (!row) return;
  row.querySelector('.log-set-weight').value = stWeightVal.value;
  row.querySelector('.log-set-reps').value   = stRepsVal.value;
  saveLiveState();
}

function stepCardValue(input, delta, min) {
  const cur = parseFloat(input.value);
  let next = (isNaN(cur) ? 0 : cur) + delta;
  if (next < min) next = min;
  input.value = String(parseFloat(next.toFixed(1)));
  syncRowFromCard();
}

function setActiveExercise(name) {
  activeExercise = name;
  activeExName.textContent = name;
  activeExerciseBar.classList.add('show');
  updateActiveExLast(name);
  applyRestPref(name);
  // Untouched form → prefill weight from the last known session
  const rows = logSetsList.querySelectorAll('.log-set-row');
  if (rows.length === 1 && !logFormHasData()) {
    const lw = getLastKnownWeight(name);
    if (lw) rows[0].querySelector('.log-set-weight').value = lw;
  }
  syncCardFromRow();
  updateActiveChipStyles();
  saveLiveState();
}

function clearActiveExercise() {
  activeExercise = null;
  activeExerciseBar.classList.remove('show');
  updateActiveChipStyles();
  saveLiveState();
}

// ✓ Terminar: save whatever is in the form for this exercise, then mark it done
function finishExercise(name) {
  const formName = logExercise.value.trim();
  if (logFormHasData() && formName && formName.toLowerCase() === name.toLowerCase()) {
    saveEntry(false);
  }
  markPlanChipDone(name);
}

function addEditRow(name) {
  const row = document.createElement('div');
  row.className = 'routine-edit-row';

  const input = document.createElement('input');
  input.className = 'routine-edit-input';
  input.type = 'text';
  input.value = name;
  input.autocomplete = 'off';

  const del = document.createElement('button');
  del.className = 'btn-routine-del';
  del.textContent = '×';
  del.title = 'Eliminar';
  del.addEventListener('click', () => row.remove());

  row.append(input, del);
  routineEditList.appendChild(row);
  return input;
}

function renderRoutineEdit(type) {
  routineEditList.innerHTML = '';
  routineEditTitle.textContent = 'EDITAR ' + type.toUpperCase();

  populateExerciseDatalist();

  // Seed from custom or FitNotes-derived list
  const custom = loadCustomRoutines();
  const seedList = (custom[type] && custom[type].length > 0)
    ? custom[type]
    : getExercisesForRoutine(type).map(e => e.name);

  seedList.forEach(name => addEditRow(name));
  showRoutineView('edit');
}

function closeRoutinePanel() {
  routinePanel.classList.remove('open');
  document.body.style.overflow = '';
  showRoutineView('type');
}

// Routine type buttons
document.querySelectorAll('.routine-type-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const type = btn.dataset.type;
    if (type === 'libre') {
      closeRoutinePanel();
      if (!sessionClockStart) startSessionClock();
    } else {
      renderRoutineExercises(type);
    }
  });
});

document.querySelectorAll('.btn-close-routine').forEach(btn => {
  btn.addEventListener('click', closeRoutinePanel);
});

btnRoutineBack.addEventListener('click', () => showRoutineView('type'));
btnRoutineBackEdit.addEventListener('click', () => showRoutineView('exercises'));
btnRoutineEdit.addEventListener('click', () => renderRoutineEdit(currentRoutineType));

btnRoutineSave.addEventListener('click', () => {
  const inputs = routineEditList.querySelectorAll('.routine-edit-input');
  const names = Array.from(inputs).map(i => i.value.trim()).filter(n => n.length > 0);
  const routines = loadCustomRoutines();
  routines[currentRoutineType] = names;
  saveCustomRoutines(routines);
  showRoutineView('exercises');
  renderRoutineExercises(currentRoutineType);
  showToast('Rutina guardada');
});

btnRoutineAdd.addEventListener('click', () => {
  const name = routineAddInput.value.trim();
  if (!name) return;
  const input = addEditRow(name);
  routineAddInput.value = '';
  routineAddInput.focus();
  input.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
});

routineAddInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') btnRoutineAdd.click();
});

btnRoutineReset.addEventListener('click', () => {
  if (!confirm(`¿Restaurar la rutina ${currentRoutineType.toUpperCase()} desde FitNotes? Se borrarán los cambios personalizados.`)) return;
  const routines = loadCustomRoutines();
  delete routines[currentRoutineType];
  saveCustomRoutines(routines);
  renderRoutineEdit(currentRoutineType);
  showToast('Rutina restaurada');
});

btnRoutineStart.addEventListener('click', () => {
  currentPlan = Array.from(routineSelectedExercises);
  completedExercises = new Set();
  clearActiveExercise();
  closeRoutinePanel();
  if (!sessionClockStart) startSessionClock();
  renderPlanChips();
  saveLiveState();
});

// Active exercise card: name → jump to log form; ✓ → save + finish exercise
activeExName.addEventListener('click', () => {
  if (!activeExercise) return;
  logExercise.value = activeExercise;
  logExercise.scrollIntoView({ behavior: 'smooth', block: 'center' });
});

btnActiveExDone.addEventListener('click', () => {
  if (activeExercise) finishExercise(activeExercise);
});

// Card steppers edit the current (last) set row
stWeightDown.addEventListener('click', () => stepCardValue(stWeightVal, -2.5, 0));
stWeightUp.addEventListener('click',   () => stepCardValue(stWeightVal,  2.5, 0));
stRepsDown.addEventListener('click',   () => stepCardValue(stRepsVal, -1, 0));
stRepsUp.addEventListener('click',     () => stepCardValue(stRepsVal,  1, 0));
stWeightVal.addEventListener('input', syncRowFromCard);
stRepsVal.addEventListener('input', syncRowFromCard);

// Typing directly in the form rows keeps the card in sync
logSetsList.addEventListener('input', () => { syncCardFromRow(); saveLiveState(); });
logExercise.addEventListener('input', () => saveLiveState());

// ─── Plate calculator ─────────────────────────────────────────────────────────
const plateModal    = document.getElementById('plateModal');
const plateWeight   = document.getElementById('plateWeight');
const plateResult   = document.getElementById('plateResult');
const btnPlates     = document.getElementById('btnPlates');
const btnPlateClose = document.getElementById('btnPlateClose');

const PLATE_SIZES = [25, 20, 15, 10, 5, 2.5, 1.25];

function calcPlates(total, bar) {
  let side = (total - bar) / 2;
  const plates = [];
  for (const p of PLATE_SIZES) {
    while (side >= p - 1e-9) { plates.push(p); side -= p; }
  }
  return { plates, rest: Math.round(side * 100) / 100 };
}

function renderPlates() {
  const w = parseFloat(stWeightVal.value) || 0;
  const bar = parseFloat(document.querySelector('.plate-bar-btn.active').dataset.bar);
  plateWeight.textContent = w + ' kg';
  plateResult.innerHTML = '';

  if (w <= 0) { plateResult.textContent = 'Pon un peso en la tarjeta primero.'; return; }
  if (w < bar) { plateResult.textContent = 'El peso es menor que la barra.'; return; }

  const res = calcPlates(w, bar);
  if (res.plates.length === 0 && res.rest === 0) {
    plateResult.textContent = 'Solo la barra.';
    return;
  }

  const chips = document.createElement('div');
  chips.className = 'plate-chips';
  res.plates.forEach(p => {
    const c = document.createElement('span');
    c.className = 'plate-chip';
    c.textContent = p;
    chips.appendChild(c);
  });
  plateResult.appendChild(chips);

  if (res.rest > 0) {
    const note = document.createElement('p');
    note.className = 'plate-note';
    note.textContent = `Quedan ${res.rest} kg sin cubrir por lado`;
    plateResult.appendChild(note);
  }
}

btnPlates.addEventListener('click', () => {
  renderPlates();
  plateModal.classList.add('show');
});

btnPlateClose.addEventListener('click', () => plateModal.classList.remove('show'));

plateModal.addEventListener('click', e => {
  if (e.target === plateModal) plateModal.classList.remove('show');
});

document.querySelectorAll('.plate-bar-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.plate-bar-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderPlates();
  });
});

btnStartSession.addEventListener('click', () => {
  showRoutineView('type');
  routinePanel.classList.add('open');
  document.body.style.overflow = 'hidden';
});

// ─── PR listeners ─────────────────────────────────────────────────────────────
btnPRs.addEventListener('click', () => {
  renderPRPanel();
  prPanel.classList.add('open');
  document.body.style.overflow = 'hidden';
});

btnClosePr.addEventListener('click', () => {
  prPanel.classList.remove('open');
  document.body.style.overflow = '';
});

prCelebration.addEventListener('click', () => {
  clearTimeout(prCelebTimeout);
  prCelebration.classList.remove('show');
});

// ─── Init ─────────────────────────────────────────────────────────────────────
applyTheme(localStorage.getItem('gym-timer-theme') || 'light');
updateDisplay();
setRing(1);
renderCurrentSession();
addLogSetRow();
populateExerciseDatalist();
restoreLiveState();
window.addEventListener('beforeunload', saveLiveState);

if ('Notification' in window && Notification.permission === 'default') {
  Notification.requestPermission();
}
