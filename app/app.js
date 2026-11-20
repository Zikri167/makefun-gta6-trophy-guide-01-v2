'use strict';

/* Leonida Legend — tracker logic.
   State lives in localStorage on this machine only; the app fetches nothing but its own data file. */

const STORAGE_KEY = 'leonida-legend-tracker-v2';

const STAGE_INFO = [
  { n: 1, title: 'Story first — chapters, big missions and character arcs', hours: 40,
    blurb: 'Play the campaign straight through: four chapters, the final mission, every named one-off mission, and the five character finales as their chains unlock. Partner trophies and the choice counter ride along here, because both belong to the story you are already playing.' },
  { n: 2, title: 'Post-story cleanup — strands and staged moments', hours: 6,
    blurb: 'With the map fully open, close what the story left behind: the eight stranger strands, Bret\u2019s unique hunt, Cal\u2019s fishing challenge, and the scripted one-off moments at VCIA, in the showroom and in a Rhino.' },
  { n: 3, title: 'Collectibles and discovery sweeps', hours: 13,
    blurb: 'Fixed things in fixed places: meditation spots, card sets, WAiNK locations, vehicle discoveries and the 52 areas of Leonida. Sweep region by region and let the counters in this tracker keep score.' },
  { n: 4, title: 'Activities, mastery and money', hours: 28,
    blurb: 'The long tail: 250 stunts, gold on all 42 range challenges, race wins, robberies, challenges, laundered bills, shop spending, garages and registrations. Repeatable everything — this stage is patience, not risk.' },
  { n: 5, title: '100% and the platinum', hours: 3,
    blurb: 'When the in-game counter reads 100%, A Long Road lands, and with every other trophy banked the platinum follows by itself. Nothing to do here but check the stats screen and mop up whatever it names.' },
];

const KIND_LABELS = { story: 'Story', collectibles: 'Collectibles', activities: 'Activities', online: 'Online' };

let trophies = [];
let byId = new Map();
let state = loadState();
let activeKind = 'all';
let selectedId = null;

const el = (id) => document.getElementById(id);
const listEl = el('trophyList');
const detailEl = el('detailPanel');

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && parsed.progress) return parsed;
    }
  } catch (err) { /* a corrupt save should never break the guide */ }
  return { progress: {}, spoilers: false };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function entryFor(id) {
  if (!state.progress[id]) state.progress[id] = { earned: false, count: 0, note: '' };
  return state.progress[id];
}

function isEarned(t) { return !!entryFor(t.id).earned; }

function getCount(t) { return entryFor(t.id).count || 0; }

function fmtNum(n) { return n.toLocaleString('en-US'); }

function targetText(t) {
  const target = t.target;
  const shown = (target.prefix || '') + fmtNum(getCount(t));
  const goal = (target.prefix || '') + fmtNum(target.count);
  return shown + ' / ' + goal + ' ' + target.label;
}

function isMasked(t) {
  return state.spoilers && t.hidden && !isEarned(t);
}

function displayName(t) {
  return isMasked(t) ? 'Hidden trophy' : t.name;
}

function displayDesc(t) {
  return isMasked(t) ? 'Name and description hidden by the spoiler shield until this trophy is earned.' : t.description;
}

function makeBadge(grade) {
  const b = document.createElement('span');
  b.className = 'badge ' + grade;
  b.textContent = grade;
  return b;
}

function makeFlag(t) {
  if (!t.missable) return null;
  const f = document.createElement('span');
  f.className = 'flag ' + (t.missableLevel === 'high' ? 'missable-high' : 'missable-watch');
  f.textContent = t.missableLevel === 'high' ? 'Missable — high risk' : 'Missable — watch';
  return f;
}

function earnedTotal() {
  return trophies.filter(isEarned).length;
}

function renderProgress() {
  const total = trophies.length;
  const done = earnedTotal();
  const pct = total ? Math.round((done / total) * 100) : 0;
  el('earnedCount').textContent = done + '/' + total;
  el('progressPct').textContent = pct + '%';
  el('overallBar').style.width = pct + '%';
  el('ringFill').style.strokeDashoffset = String(251.3 * (1 - (total ? done / total : 0)));
  const chips = el('gradeChips');
  chips.textContent = '';
  for (const grade of ['platinum', 'gold', 'silver', 'bronze']) {
    const inGrade = trophies.filter((t) => t.grade === grade);
    const chip = document.createElement('span');
    chip.className = 'grade-chip';
    chip.textContent = grade + ' ' + inGrade.filter(isEarned).length + '/' + inGrade.length;
    chips.appendChild(chip);
  }
  if (done === total && total > 0) {
    el('hoursLine').textContent = 'Platinum complete — you are a Leonida Legend.';
    return;
  }
  let hoursLeft = 0;
  for (const stage of STAGE_INFO) {
    const inStage = trophies.filter((t) => t.stage === stage.n);
    const open = inStage.filter((t) => !isEarned(t)).length;
    if (inStage.length) hoursLeft += stage.hours * (open / inStage.length);
  }
  el('hoursLine').textContent = 'About ' + Math.max(1, Math.round(hoursLeft)) + ' hours of the roadmap left (75–95 in all)';
}

function roadmapOrder() {
  return [...trophies].sort((a, b) => (a.stage - b.stage) || (a.id - b.id));
}

function renderNextUp() {
  const list = el('nextUpList');
  list.textContent = '';
  const upcoming = roadmapOrder().filter((t) => !isEarned(t)).slice(0, 6);
  if (!upcoming.length) {
    const li = document.createElement('li');
    li.textContent = 'Everything is earned. The platinum is yours.';
    list.appendChild(li);
  }
  for (const t of upcoming) {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = displayName(t);
    btn.addEventListener('click', () => goToTrophy(t.id));
    li.appendChild(btn);
    const meta = document.createElement('span');
    meta.className = 'nextup-stage';
    meta.textContent = ' — stage ' + t.stage + ', ' + t.grade + (t.missable ? ', missable: clear on first pass' : '');
    li.appendChild(meta);
    list.appendChild(li);
  }
  const started = trophies
    .filter((t) => t.target && !isEarned(t) && getCount(t) > 0)
    .sort((a, b) => (getCount(b) / b.target.count) - (getCount(a) / a.target.count))
    .slice(0, 3);
  el('closestCounters').textContent = started.length
    ? 'Closest counters: ' + started.map((t) => t.name + ' ' + targetText(t)).join(' · ')
    : 'No counters started yet — log progress on any counted trophy and your closest finishes will show here.';
}

function matchesFilters(t) {
  if (activeKind === 'missable' && !t.missable) return false;
  if (activeKind !== 'all' && activeKind !== 'missable' && t.kind !== activeKind) return false;
  const grade = el('gradeFilter').value;
  if (grade !== 'all' && t.grade !== grade) return false;
  if (el('hideEarned').checked && isEarned(t)) return false;
  const q = el('searchBox').value.trim().toLowerCase();
  if (q) {
    const hay = (t.name + ' ' + t.description + ' ' + t.guide + ' ' + t.kind).toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

function renderList() {
  listEl.textContent = '';
  const shown = trophies.filter(matchesFilters);
  el('resultCount').textContent = 'Showing ' + shown.length + ' of ' + trophies.length + ' trophies';
  if (!shown.length) {
    const li = document.createElement('li');
    li.className = 'empty-state';
    li.textContent = activeKind === 'online'
      ? 'The official PlayStation 5 list contains no online trophies — all 55 are earned in the single-player game. This filter exists so the tracker mirrors the official kinds; it is honestly, permanently empty.'
      : 'No trophies match the current search and filters.';
    listEl.appendChild(li);
    return;
  }
  for (const t of shown) {
    listEl.appendChild(buildRow(t));
  }
}

function buildRow(t) {
  const li = document.createElement('li');
  li.className = 'trophy-row' + (isEarned(t) ? ' earned' : '') + (selectedId === t.id ? ' selected' : '');
  li.dataset.id = String(t.id);
  const box = document.createElement('input');
  box.type = 'checkbox';
  box.checked = isEarned(t);
  box.setAttribute('aria-label', 'Mark ' + t.name + ' as earned');
  box.addEventListener('click', (ev) => ev.stopPropagation());
  box.addEventListener('change', () => setEarned(t, box.checked));
  li.appendChild(box);
  const main = document.createElement('div');
  main.className = 'row-main';
  const top = document.createElement('div');
  top.className = 'row-top';
  top.appendChild(makeBadge(t.grade));
  const name = document.createElement('span');
  name.className = 'row-name';
  name.textContent = displayName(t);
  top.appendChild(name);
  const flag = makeFlag(t);
  if (flag) top.appendChild(flag);
  if (t.hidden && !isMasked(t)) {
    const h = document.createElement('span');
    h.className = 'flag hidden-flag';
    h.textContent = 'Hidden on PSN';
    top.appendChild(h);
  }
  const stageTag = document.createElement('span');
  stageTag.className = 'flag stage-flag';
  stageTag.textContent = 'Stage ' + t.stage + ' of 5';
  top.appendChild(stageTag);
  main.appendChild(top);
  const desc = document.createElement('p');
  desc.className = 'row-desc';
  desc.textContent = displayDesc(t);
  main.appendChild(desc);
  if (t.target) {
    const counter = document.createElement('p');
    counter.className = 'row-counter';
    counter.textContent = targetText(t);
    main.appendChild(counter);
  }
  li.appendChild(main);
  li.addEventListener('click', () => selectTrophy(t.id));
  return li;
}

function setEarned(t, earned) {
  const entry = entryFor(t.id);
  entry.earned = earned;
  if (earned && t.target) entry.count = t.target.count;
  saveState();
  renderAll();
}

function setCount(t, value) {
  const entry = entryFor(t.id);
  entry.count = Math.max(0, Math.min(t.target.count, Math.round(value)));
  if (entry.count >= t.target.count) entry.earned = true;
  saveState();
  renderAll();
}

function selectTrophy(id) {
  selectedId = id;
  renderList();
  renderDetail();
}

function goToTrophy(id) {
  switchView('tracker');
  activeKind = 'all';
  document.querySelectorAll('.chip').forEach((c) => c.classList.toggle('active', c.dataset.kind === 'all'));
  el('gradeFilter').value = 'all';
  el('searchBox').value = '';
  el('hideEarned').checked = false;
  selectedId = id;
  renderAll();
  const row = listEl.querySelector('[data-id="' + id + '"]');
  if (row) row.scrollIntoView({ block: 'center', behavior: 'smooth' });
}

function detailSection(title, bodyText) {
  const wrap = document.createElement('div');
  const h = document.createElement('h3');
  h.textContent = title;
  wrap.appendChild(h);
  const p = document.createElement('p');
  p.textContent = bodyText;
  wrap.appendChild(p);
  return wrap;
}

function renderDetail() {
  detailEl.textContent = '';
  const t = byId.get(selectedId);
  if (!t) {
    const p = document.createElement('p');
    p.className = 'detail-empty';
    p.textContent = 'Pick any trophy from the list and its full guide opens here: the official description, our step-by-step advice in our own words, its missable reasoning, its sources, a progress counter where PlayStation tracks one, and a notes field that saves on this machine.';
    detailEl.appendChild(p);
    return;
  }
  const top = document.createElement('div');
  top.className = 'row-top';
  top.appendChild(makeBadge(t.grade));
  const flag = makeFlag(t);
  if (flag) top.appendChild(flag);
  const stageTag = document.createElement('span');
  stageTag.className = 'flag hidden-flag';
  stageTag.textContent = 'Roadmap stage ' + t.stage + ' · ' + (KIND_LABELS[t.kind] || t.kind);
  top.appendChild(stageTag);
  detailEl.appendChild(top);

  const h = document.createElement('h2');
  h.textContent = displayName(t);
  detailEl.appendChild(h);
  const desc = document.createElement('p');
  desc.className = 'official-desc';
  desc.textContent = '\u201C' + displayDesc(t) + '\u201D — official description';
  detailEl.appendChild(desc);

  detailEl.appendChild(detailSection('The guide', t.guide));

  const stepsWrap = document.createElement('div');
  const sh = document.createElement('h3');
  sh.textContent = 'Steps';
  stepsWrap.appendChild(sh);
  const ol = document.createElement('ol');
  for (const step of t.steps) {
    const li = document.createElement('li');
    li.textContent = step;
    ol.appendChild(li);
  }
  stepsWrap.appendChild(ol);
  detailEl.appendChild(stepsWrap);

  if (t.missable && t.missableNote) {
    const note = document.createElement('div');
    note.className = 'missable-note' + (t.missableLevel === 'high' ? ' high' : '');
    const nh = document.createElement('h3');
    nh.textContent = t.missableLevel === 'high' ? 'Missable — high risk' : 'Missable — watch item';
    note.appendChild(nh);
    const np = document.createElement('p');
    np.textContent = t.missableNote;
    note.appendChild(np);
    detailEl.appendChild(note);
  }

  if (t.target) {
    const cw = document.createElement('div');
    const ch = document.createElement('h3');
    ch.textContent = 'Your progress';
    cw.appendChild(ch);
    const box = document.createElement('div');
    box.className = 'counter-box';
    const stepSize = t.target.count >= 10000 ? 1000 : 1;
    const minus = document.createElement('button');
    minus.type = 'button';
    minus.textContent = '−';
    minus.setAttribute('aria-label', 'Decrease progress');
    minus.addEventListener('click', () => setCount(t, getCount(t) - stepSize));
    const value = document.createElement('span');
    value.className = 'counter-value';
    value.textContent = targetText(t);
    const plus = document.createElement('button');
    plus.type = 'button';
    plus.textContent = '+';
    plus.setAttribute('aria-label', 'Increase progress');
    plus.addEventListener('click', () => setCount(t, getCount(t) + stepSize));
    box.appendChild(minus);
    box.appendChild(value);
    box.appendChild(plus);
    cw.appendChild(box);
    const hint = document.createElement('p');
    hint.className = 'counter-label';
    hint.textContent = 'Steps of ' + fmtNum(stepSize) + '. Reaching the target marks the trophy earned.';
    cw.appendChild(hint);
    detailEl.appendChild(cw);
  }

  const sw = document.createElement('div');
  const sh2 = document.createElement('h3');
  sh2.textContent = 'Sources';
  sw.appendChild(sh2);
  const sul = document.createElement('ul');
  sul.className = 'sources';
  for (const source of t.sources) {
    const li = document.createElement('li');
    li.textContent = source;
    sul.appendChild(li);
  }
  sw.appendChild(sul);
  detailEl.appendChild(sw);

  const nw = document.createElement('div');
  const nh2 = document.createElement('h3');
  nh2.textContent = 'Your notes';
  nw.appendChild(nh2);
  const ta = document.createElement('textarea');
  ta.placeholder = 'Your own notes on this trophy — saved on this machine only.';
  ta.value = entryFor(t.id).note || '';
  ta.addEventListener('input', () => {
    entryFor(t.id).note = ta.value;
    saveState();
  });
  nw.appendChild(ta);
  detailEl.appendChild(nw);

  const toggle = document.createElement('label');
  toggle.className = 'earned-toggle';
  const cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.checked = isEarned(t);
  cb.addEventListener('change', () => setEarned(t, cb.checked));
  toggle.appendChild(cb);
  toggle.appendChild(document.createTextNode('Earned'));
  detailEl.appendChild(toggle);
}

function renderRoadmap() {
  const wrap = el('stageList');
  wrap.textContent = '';
  for (const stage of STAGE_INFO) {
    const inStage = trophies.filter((t) => t.stage === stage.n);
    const done = inStage.filter(isEarned).length;
    const card = document.createElement('div');
    card.className = 'stage-card';
    const head = document.createElement('div');
    head.className = 'stage-head';
    const h = document.createElement('h3');
    h.textContent = 'Stage ' + stage.n + ' — ' + stage.title;
    head.appendChild(h);
    const count = document.createElement('span');
    count.className = 'stage-count';
    count.textContent = done + '/' + inStage.length + ' earned · about ' + stage.hours + ' hours';
    head.appendChild(count);
    card.appendChild(head);
    const bar = document.createElement('div');
    bar.className = 'bar';
    const fill = document.createElement('div');
    fill.className = 'bar-fill';
    fill.style.width = (inStage.length ? (done / inStage.length) * 100 : 0) + '%';
    bar.appendChild(fill);
    card.appendChild(bar);
    const blurb = document.createElement('p');
    blurb.className = 'stage-blurb';
    blurb.textContent = stage.blurb;
    card.appendChild(blurb);
    const ul = document.createElement('ul');
    ul.className = 'stage-trophies';
    for (const t of inStage) {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = (isMasked(t) ? 'Hidden trophy' : t.name) + (t.missable ? ' ⚠' : '');
      if (isEarned(t)) btn.className = 'done';
      btn.addEventListener('click', () => goToTrophy(t.id));
      li.appendChild(btn);
      ul.appendChild(li);
    }
    card.appendChild(ul);
    wrap.appendChild(card);
  }
}

function renderMissables() {
  const wrap = el('missableList');
  wrap.textContent = '';
  const groups = [
    { level: 'high', title: 'High risk — build your run around these three' },
    { level: 'watch', title: 'Watch list — clear each one on first pass' },
  ];
  for (const group of groups) {
    const items = trophies.filter((t) => t.missable && t.missableLevel === group.level);
    const section = document.createElement('div');
    section.className = 'missable-group';
    const h = document.createElement('h3');
    h.textContent = group.title;
    section.appendChild(h);
    for (const t of items) {
      const item = document.createElement('div');
      item.className = 'missable-item' + (group.level === 'high' ? ' high' : '');
      const nameLine = document.createElement('span');
      nameLine.className = 'mi-name';
      nameLine.textContent = t.name + ' ';
      item.appendChild(nameLine);
      item.appendChild(makeBadge(t.grade));
      const p = document.createElement('p');
      p.textContent = t.missableNote || '';
      item.appendChild(p);
      item.addEventListener('click', () => goToTrophy(t.id));
      section.appendChild(item);
    }
    wrap.appendChild(section);
  }
  const safe = document.createElement('p');
  safe.className = 'missable-intro';
  const safeCount = trophies.filter((t) => !t.missable).length;
  safe.textContent = 'The other ' + safeCount + ' trophies are not flagged: their descriptions describe repeatable activities, fixed collectibles, cumulative counters or unavoidable story beats, so they can be finished in free roam after the credits.';
  wrap.appendChild(safe);
}

function renderAll() {
  renderProgress();
  renderNextUp();
  renderList();
  renderDetail();
  renderRoadmap();
  renderMissables();
}

function switchView(name) {
  document.querySelectorAll('.tab').forEach((tab) => tab.classList.toggle('active', tab.dataset.view === name));
  document.querySelectorAll('.view').forEach((view) => view.classList.toggle('hidden', view.id !== 'view-' + name));
}

function exportProgress() {
  const payload = {
    app: 'Leonida Legend — GTA VI trophy tracker',
    exportedAt: new Date().toISOString(),
    progress: state.progress,
    spoilers: state.spoilers,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'leonida-legend-progress.json';
  a.click();
  URL.revokeObjectURL(url);
}

function importProgress(file) {
  const reader = new FileReader();
  reader.addEventListener('load', () => {
    try {
      const parsed = JSON.parse(String(reader.result));
      if (!parsed || typeof parsed !== 'object' || !parsed.progress) throw new Error('not a progress file');
      state.progress = parsed.progress;
      state.spoilers = !!parsed.spoilers;
      el('spoilerToggle').checked = state.spoilers;
      saveState();
      renderAll();
    } catch (err) {
      alert('That file is not a Leonida Legend progress export — nothing was imported.');
    }
  });
  reader.readAsText(file);
}

function wireControls() {
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => switchView(tab.dataset.view));
  });
  document.querySelectorAll('.chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      activeKind = chip.dataset.kind;
      document.querySelectorAll('.chip').forEach((c) => c.classList.toggle('active', c === chip));
      renderList();
    });
  });
  el('searchBox').addEventListener('input', renderList);
  el('gradeFilter').addEventListener('change', renderList);
  el('hideEarned').addEventListener('change', renderList);
  el('spoilerToggle').checked = !!state.spoilers;
  el('spoilerToggle').addEventListener('change', () => {
    state.spoilers = el('spoilerToggle').checked;
    saveState();
    renderAll();
  });
  el('exportBtn').addEventListener('click', exportProgress);
  el('importFile').addEventListener('change', () => {
    if (el('importFile').files[0]) importProgress(el('importFile').files[0]);
    el('importFile').value = '';
  });
  el('resetBtn').addEventListener('click', () => {
    if (confirm('Clear every tick, counter and note in this tracker?')) {
      state = { progress: {}, spoilers: state.spoilers };
      saveState();
      renderAll();
    }
  });
  document.addEventListener('keydown', (ev) => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || '');
    if (typing || ev.metaKey || ev.ctrlKey || ev.altKey) return;
    if (ev.key === '/') {
      ev.preventDefault();
      el('searchBox').focus();
    } else if (ev.key.toLowerCase() === 'n') {
      ev.preventDefault();
      jumpToNextUnearned();
    }
  });
}

function jumpToNextUnearned() {
  const order = roadmapOrder();
  const start = selectedId == null ? -1 : order.findIndex((t) => t.id === selectedId);
  for (let step = 1; step <= order.length; step++) {
    const candidate = order[(start + step) % order.length];
    if (!isEarned(candidate)) {
      goToTrophy(candidate.id);
      return;
    }
  }
}

async function init() {
  const response = await fetch('data/trophies.json');
  const data = await response.json();
  trophies = data.trophies;
  byId = new Map(trophies.map((t) => [t.id, t]));
  wireControls();
  selectedId = 17; /* The Shootist: opens on a counter, a full guide and its sources */
  renderAll();
}

init();
