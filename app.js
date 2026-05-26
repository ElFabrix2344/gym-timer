// ─── State ───────────────────────────────────────────────────────────────────
let restDuration  = 90;
let remaining     = 90;
let totalDuration = 90;
let running       = false;
let interval      = null;
let phase         = 'idle';
let sets          = 0;
let totalRests    = 0;
let sessionStart     = null;
let sessionClockStart    = null;
let sessionClockInterval = null;
let prCelebTimeout          = null;
let currentPlan             = [];
let routineSelectedExercises = new Set();
let currentRoutineType      = null;

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

function startSessionClock() {
  if (sessionClockInterval) return;
  sessionClockStart = Date.now();
  btnStartSession.style.display = 'none';
  sessionClock.classList.add('active');
  sessionClockDisplay.textContent = fmtDuration(0);
  sessionClockInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - sessionClockStart) / 1000);
    sessionClockDisplay.textContent = fmtDuration(elapsed);
  }, 1000);
}

function resetSessionClock() {
  if (!sessionClockStart) return;
  sessionClockStart = Date.now();
  sessionClockDisplay.textContent = fmtDuration(0);
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
  sessionPlan.style.display = 'none';
  planChips.innerHTML = '';

  showToast('Sesión guardada ✓');
}

function updateSessionTime() {
  if (!sessionStart) { statTime.textContent = '0m'; return; }
  statTime.textContent = Math.floor((Date.now() - sessionStart) / 60000) + 'm';
}

// ─── Timer logic ──────────────────────────────────────────────────────────────
function startRest() {
  phase = 'rest';
  remaining = totalDuration = restDuration;
  running = true;
  timeLabel.textContent = 'DESCANSO';
  btnPlay.classList.add('rest-mode');
  ringProgress.classList.add('rest-mode');
  btnPlay.textContent = '⏸';
  setRing(1);
  clearInterval(interval);
  interval = setInterval(tick, 1000);
}

function tick() {
  remaining--;
  updateDisplay();
  setRing(remaining / totalDuration);
  if (remaining <= 0) {
    clearInterval(interval);
    running = false;
    phase = 'idle';
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
  }
}

function pauseResume() {
  if (phase === 'idle' && !running) {
    if (!sessionStart) sessionStart = Date.now();
    startRest();
    return;
  }
  if (running) {
    clearInterval(interval);
    running = false;
    btnPlay.textContent = '▶';
  } else {
    running = true;
    btnPlay.textContent = '⏸';
    interval = setInterval(tick, 1000);
  }
}

function reset() {
  clearInterval(interval);
  running = false;
  phase = 'idle';
  remaining = totalDuration = restDuration;
  updateDisplay();
  setRing(1);
  timeLabel.textContent = 'DESCANSO';
  btnPlay.classList.remove('rest-mode');
  ringProgress.classList.remove('rest-mode');
  btnPlay.textContent = '▶';
  timeDisplay.classList.remove('warning');
}

function registerSet() {
  if (!sessionStart) sessionStart = Date.now();
  if (!sessionClockStart) startSessionClock();
  sets++;
  setsDisplay.textContent = sets;
  statSets.textContent = sets;
  updateDots();
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
  }
});

// ─── Manual set counter ───────────────────────────────────────────────────────
setsDown.addEventListener('click', () => {
  if (sets > 0) {
    sets--;
    setsDisplay.textContent = sets;
    statSets.textContent = sets;
    updateDots();
  }
});

setsUp.addEventListener('click', () => {
  sets++;
  setsDisplay.textContent = sets;
  statSets.textContent = sets;
  updateDots();
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
    prPanelContent.appendChild(row);
  });
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
  return row;
}

function renumberSetRows() {
  logSetsList.querySelectorAll('.log-set-num').forEach((n, i) => n.textContent = i + 1);
}

function saveEntry() {
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
  logExercise.focus();

  renderCurrentSession();
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
    meta.textContent = sessions.length + ' sesión' + (sessions.length !== 1 ? 'es' : '');

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
    const chip = document.createElement('button');
    chip.className = 'plan-chip';
    chip.textContent = name;
    chip.addEventListener('click', () => {
      logExercise.value = name;
      logExercise.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const firstWeight = logSetsList.querySelector('.log-set-weight');
      if (firstWeight) firstWeight.focus();
    });
    planChips.appendChild(chip);
  });
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

  // Populate datalist from FitNotes for autocomplete
  const fnExList = document.getElementById('fnExercisesList');
  fnExList.innerHTML = '';
  const fn = loadFitNotes();
  if (fn && fn.exercises) {
    Object.keys(fn.exercises).sort().forEach(name => {
      const opt = document.createElement('option');
      opt.value = name;
      fnExList.appendChild(opt);
    });
  }

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
  closeRoutinePanel();
  if (!sessionClockStart) startSessionClock();
  renderPlanChips();
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

if ('Notification' in window && Notification.permission === 'default') {
  Notification.requestPermission();
}
