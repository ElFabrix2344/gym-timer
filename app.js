// ─── State ───────────────────────────────────────────────────────────────────
let restDuration  = 90;
let remaining     = 90;
let totalDuration = 90;
let running       = false;
let interval      = null;
let phase         = 'idle';
let sets          = 0;
let totalRests    = 0;
let sessionStart  = null;

const CIRCUMFERENCE = 2 * Math.PI * 118;

// ─── Elements ────────────────────────────────────────────────────────────────
const btnTheme        = document.getElementById('btnTheme');
const timeDisplay     = document.getElementById('timeDisplay');
const timeLabel       = document.getElementById('timeLabel');
const ringProgress    = document.getElementById('ringProgress');
const phaseBadge      = document.getElementById('phaseBadge');
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
const logWeight       = document.getElementById('logWeight');
const logSets         = document.getElementById('logSets');
const logReps         = document.getElementById('logReps');
const btnLogSave      = document.getElementById('btnLogSave');
const sessionLog      = document.getElementById('sessionLog');
const btnHistory      = document.getElementById('btnHistory');
const historyPanel    = document.getElementById('historyPanel');
const btnCloseHistory = document.getElementById('btnCloseHistory');
const historyContent  = document.getElementById('historyContent');

// ─── Timer helpers ────────────────────────────────────────────────────────────
function fmtTime(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}:${String(sec).padStart(2, '0')}` : `${sec}`;
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

function updateSessionTime() {
  if (!sessionStart) { statTime.textContent = '0m'; return; }
  statTime.textContent = Math.floor((Date.now() - sessionStart) / 60000) + 'm';
}

// ─── Timer logic ──────────────────────────────────────────────────────────────
function startRest() {
  phase = 'rest';
  remaining = totalDuration = restDuration;
  running = true;
  phaseBadge.textContent = 'DESCANSO';
  phaseBadge.className = 'phase-badge rest';
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
    if ('vibrate' in navigator) navigator.vibrate([200, 100, 200, 100, 200]);
    flashScreen();
    showToast('¡A TRABAJAR!');
    phaseBadge.textContent = 'TRABAJO';
    phaseBadge.className = 'phase-badge work';
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
  phaseBadge.textContent = 'TRABAJO';
  phaseBadge.className = 'phase-badge work';
  timeLabel.textContent = 'DESCANSO';
  btnPlay.classList.remove('rest-mode');
  ringProgress.classList.remove('rest-mode');
  btnPlay.textContent = '▶';
  timeDisplay.classList.remove('warning');
}

function registerSet() {
  if (!sessionStart) sessionStart = Date.now();
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

  const entry = {
    id:       Date.now(),
    exercise: name,
    weight:   logWeight.value.trim(),
    sets:     logSets.value.trim(),
    reps:     logReps.value.trim(),
    time:     new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
  };

  const log = loadLog();
  const key = getTodayKey();
  if (!log[key]) log[key] = [];
  log[key].unshift(entry);
  saveLog(log);

  logExercise.value = '';
  logWeight.value = '';
  logSets.value = '';
  logReps.value = '';
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
    meta.textContent = entries.length + ' ejercicio' + (entries.length !== 1 ? 's' : '');

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
  if (e.key === 'Enter') logWeight.focus();
});
logWeight.addEventListener('keydown', e => {
  if (e.key === 'Enter') logSets.focus();
});
logSets.addEventListener('keydown', e => {
  if (e.key === 'Enter') logReps.focus();
});
logReps.addEventListener('keydown', e => {
  if (e.key === 'Enter') saveEntry();
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
    weight:    headers.indexOf('Weight'),
    weightUnit:headers.indexOf('Weight Unit'),
    reps:      headers.indexOf('Reps'),
    distance:  headers.indexOf('Distance'),
    distUnit:  headers.indexOf('Distance Unit'),
    time:      headers.indexOf('Time'),
  };
  if (idx.date === -1 || idx.exercise === -1) return null;

  const map = {};
  let totalRows = 0;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const c = parseCSVLine(line);
    const date = c[idx.date]?.trim();
    const name = c[idx.exercise]?.trim();
    if (!date || !name) continue;
    totalRows++;
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

  return { importedAt: new Date().toISOString(), totalRows, exercises };
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

// ─── Init ─────────────────────────────────────────────────────────────────────
applyTheme(localStorage.getItem('gym-timer-theme') || 'light');
updateDisplay();
setRing(1);
renderCurrentSession();
