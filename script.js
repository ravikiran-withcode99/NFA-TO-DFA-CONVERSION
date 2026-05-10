/**
 * script.js — Frontend for Thompson NFA Converter
 *
 * Responsibilities:
 *  - Send regex to backend API
 *  - Animate step-by-step construction
 *  - Render NFA graph with vis.js
 *  - Export graph as PNG
 *  - Play/Pause/Prev/Next step controls
 */

// ─── CONFIG ────────────────────────────────────────────────────────────────────
// API URL: localhost for local development
const API_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:5000/convert'
  : `${window.location.origin}/convert`;

// ─── STATE ─────────────────────────────────────────────────────────────────────
let steps = [];
let currentStep = -1;
let animTimer = null;
let isPlaying = false;
let networkInstance = null;
let allStepData = null;  // cached API response

// ─── DOM REFS ──────────────────────────────────────────────────────────────────
const regexInput     = document.getElementById('regexInput');
const convertBtn     = document.getElementById('convertBtn');
const resetBtn       = document.getElementById('resetBtn');
const loader         = document.getElementById('loader');
const inputError     = document.getElementById('inputError');
const postfixSection = document.getElementById('postfixSection');
const stepsSection   = document.getElementById('stepsSection');
const graphSection   = document.getElementById('graphSection');
const concatOutput   = document.getElementById('concatOutput');
const postfixOutput  = document.getElementById('postfixOutput');
const stepsContainer = document.getElementById('stepsContainer');
const stepProgress   = document.getElementById('stepProgress');
const playPauseBtn   = document.getElementById('playPauseBtn');
const prevStepBtn    = document.getElementById('prevStepBtn');
const nextStepBtn    = document.getElementById('nextStepBtn');
const exportBtn      = document.getElementById('exportBtn');
const fitBtn         = document.getElementById('fitBtn');
const speedSlider    = document.getElementById('speedSlider');
const speedLabel     = document.getElementById('speedLabel');
const transitionTable= document.getElementById('transitionTable');

// ─── SPEED SLIDER ──────────────────────────────────────────────────────────────
speedSlider.addEventListener('input', () => {
  const v = +speedSlider.value;
  const labels = { 200:'Very Fast', 500:'Fast', 900:'Normal', 1400:'Slow', 2000:'Very Slow' };
  const closest = Object.keys(labels).reduce((a,b) => Math.abs(b-v) < Math.abs(a-v) ? b : a);
  speedLabel.textContent = labels[closest] || 'Custom';
});

// ─── EXAMPLE CHIPS ─────────────────────────────────────────────────────────────
document.querySelectorAll('.example-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    regexInput.value = chip.dataset.val;
    regexInput.focus();
  });
});

// ─── RESET ─────────────────────────────────────────────────────────────────────
resetBtn.addEventListener('click', resetAll);

function resetAll() {
  stopAnimation();
  regexInput.value = '';
  hideError();
  postfixSection.classList.add('hidden');
  stepsSection.classList.add('hidden');
  graphSection.classList.add('hidden');
  stepsContainer.innerHTML = '';
  transitionTable.innerHTML = '';
  steps = [];
  currentStep = -1;
  allStepData = null;
  if (networkInstance) { networkInstance.destroy(); networkInstance = null; }
}

// ─── CONVERT BUTTON ────────────────────────────────────────────────────────────
convertBtn.addEventListener('click', runConvert);
regexInput.addEventListener('keydown', e => { if (e.key === 'Enter') runConvert(); });

async function runConvert() {
  const regex = regexInput.value.trim();
  if (!regex) { showError('Please enter a regular expression.'); return; }

  stopAnimation();
  hideError();
  showLoader(true);
  postfixSection.classList.add('hidden');
  stepsSection.classList.add('hidden');
  graphSection.classList.add('hidden');

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ regex })
    });

    const data = await res.json();

    if (!res.ok) {
      showError(data.error || 'Server error');
      return;
    }

    allStepData = data;
    displayResults(data);

  } catch (err) {
    showError('Cannot reach backend. Make sure server is running on port 3001.');
  } finally {
    showLoader(false);
  }
}

// ─── DISPLAY RESULTS ───────────────────────────────────────────────────────────
function displayResults(data) {
  // Postfix section
  concatOutput.textContent  = data.withConcat;
  postfixOutput.textContent = data.postfix;
  postfixSection.classList.remove('hidden');

  // Steps
  steps = data.steps;
  renderStepItems();
  stepsSection.classList.remove('hidden');

  // Graph
  graphSection.classList.remove('hidden');
  renderGraph(data.graph);
  renderTransitionTable(data.graph);

  // Start animation
  currentStep = -1;
  isPlaying = true;
  playPauseBtn.textContent = '⏸ Pause';
  playAnimation();
}

// ─── STEP ITEMS (DOM) ──────────────────────────────────────────────────────────
const stepTypeMap = {
  symbol:   { tag: 'Symbol',      cls: 'tag-symbol'   },
  concat:   { tag: 'Concat (.)',   cls: 'tag-concat'   },
  union:    { tag: 'Union (|)',    cls: 'tag-union'    },
  kleene:   { tag: 'Kleene (*)',   cls: 'tag-kleene'   },
  plus:     { tag: 'Plus (+)',     cls: 'tag-plus'     },
  optional: { tag: 'Optional (?)', cls: 'tag-optional' },
};

function renderStepItems() {
  stepsContainer.innerHTML = '';
  steps.forEach((s, i) => {
    const meta = stepTypeMap[s.type] || { tag: s.type, cls: 'tag-symbol' };
    const div = document.createElement('div');
    div.className = 'step-item';
    div.id = `step-${i}`;
    div.innerHTML = `
      <div class="step-num">${i + 1}</div>
      <div class="step-content">
        <div class="step-type-tag ${meta.cls}">${meta.tag}</div>
        <div class="step-title">${s.description}</div>
        <div class="step-detail">${s.detail}</div>
      </div>`;
    stepsContainer.appendChild(div);
  });
  stepProgress.style.width = '0%';
}

// ─── ANIMATION CONTROLS ────────────────────────────────────────────────────────
playPauseBtn.addEventListener('click', () => {
  if (isPlaying) { stopAnimation(); isPlaying = false; playPauseBtn.textContent = '▶ Play'; }
  else {
    isPlaying = true; playPauseBtn.textContent = '⏸ Pause';
    if (currentStep >= steps.length - 1) currentStep = -1;
    playAnimation();
  }
});

nextStepBtn.addEventListener('click', () => {
  stopAnimation(); isPlaying = false; playPauseBtn.textContent = '▶ Play';
  advanceStep();
});

prevStepBtn.addEventListener('click', () => {
  stopAnimation(); isPlaying = false; playPauseBtn.textContent = '▶ Play';
  if (currentStep > 0) { deactivateStep(currentStep); currentStep--; activateStep(currentStep); }
});

function playAnimation() {
  const delay = 2200 - +speedSlider.value;  // invert: higher slider = slower
  animTimer = setTimeout(() => {
    if (!isPlaying) return;
    const advanced = advanceStep();
    if (advanced) playAnimation();
    else { isPlaying = false; playPauseBtn.textContent = '▶ Play'; }
  }, delay);
}

function stopAnimation() {
  clearTimeout(animTimer);
  animTimer = null;
}

function advanceStep() {
  if (currentStep >= steps.length - 1) return false;
  if (currentStep >= 0) deactivateStep(currentStep);
  currentStep++;
  activateStep(currentStep);
  return true;
}

function activateStep(i) {
  const el = document.getElementById(`step-${i}`);
  if (!el) return;
  el.classList.add('active');
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  // Mark previous as done
  for (let j = 0; j < i; j++) {
    document.getElementById(`step-${j}`)?.classList.add('done');
  }
  // Update progress bar
  stepProgress.style.width = `${((i + 1) / steps.length) * 100}%`;
  // Highlight nodes in graph
  highlightNodes(steps[i].highlight || []);
}

function deactivateStep(i) {
  document.getElementById(`step-${i}`)?.classList.remove('active');
}

// ─── GRAPH RENDERING (vis.js) ──────────────────────────────────────────────────
function renderGraph(graph) {
  if (networkInstance) networkInstance.destroy();

  const nodes = new vis.DataSet(graph.nodes.map(n => ({
    id: n.id,
    label: n.label,
    shape: 'ellipse',
    color: nodeColor(n),
    font: { color: '#d6dff5', size: 14, face: 'JetBrains Mono' },
    borderWidth: n.isStart ? 3 : (n.isAccept ? 3 : 1),
    shadow: { enabled: true, size: 8, color: nodeShadow(n) },
  })));

  // Group duplicate edges (same from/to) to curve them
  const edgeCounts = {};
  graph.edges.forEach(e => {
    const key = `${e.from}-${e.to}`;
    edgeCounts[key] = (edgeCounts[key] || 0) + 1;
  });
  const edgeSeen = {};

  const edges = new vis.DataSet(graph.edges.map((e, idx) => {
    const key = `${e.from}-${e.to}`;
    edgeSeen[key] = (edgeSeen[key] || 0) + 1;
    const count = edgeCounts[key];
    const isEps = e.label === 'ε';

    return {
      id: idx,
      from: e.from,
      to: e.to,
      label: e.label,
      font: { color: isEps ? '#a78bfa' : '#d6dff5', size: 12, face: 'JetBrains Mono', strokeWidth: 0 },
      color: { color: isEps ? '#a78bfa' : '#60a5fa', opacity: 0.85 },
      dashes: isEps,
      arrows: { to: { enabled: true, scaleFactor: 0.7 } },
      smooth: count > 1
        ? { type: 'curvedCW', roundness: 0.2 * edgeSeen[key] }
        : e.from === e.to
          ? { type: 'curvedCW', roundness: 0.6 }
          : { type: 'dynamic' },
    };
  }));

  const container = document.getElementById('nfaGraph');
  const options = {
    layout: { hierarchical: false },
    physics: {
      enabled: true,
      solver: 'forceAtlas2Based',
      forceAtlas2Based: { gravitationalConstant: -60, springLength: 120, springConstant: 0.05 },
      stabilization: { iterations: 200 },
    },
    interaction: { hover: true, zoomView: true, dragView: true },
    nodes: { borderWidthSelected: 3 },
    edges: { width: 1.5, selectionWidth: 2 },
  };

  networkInstance = new vis.Network(container, { nodes, edges }, options);

  // ── Export PNG ────────────────────────────────────
  exportBtn.addEventListener('click', () => {
    const canvas = container.querySelector('canvas');
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = 'nfa-graph.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  });

  // ── Fit button ────────────────────────────────────
  fitBtn.addEventListener('click', () => networkInstance?.fit({ animation: true }));
}

function nodeColor(n) {
  if (n.isStart && n.isAccept) return { background:'#1e3a5f', border:'#34d399', highlight:{background:'#1e3a5f',border:'#34d399'} };
  if (n.isStart)  return { background:'#0f2044', border:'#3b82f6', highlight:{background:'#1a3060',border:'#60a5fa'} };
  if (n.isAccept) return { background:'#14532d', border:'#22c55e', highlight:{background:'#15803d',border:'#4ade80'} };
  return { background:'#111628', border:'#1f2a4a', highlight:{background:'#1a2040',border:'#3b82f6'} };
}
function nodeShadow(n) {
  if (n.isAccept) return 'rgba(34,197,94,0.3)';
  if (n.isStart)  return 'rgba(59,130,246,0.3)';
  return 'rgba(0,0,0,0)';
}

function highlightNodes(ids) {
  if (!networkInstance || !ids.length) return;
  // Flash selected nodes by temporarily selecting them
  networkInstance.selectNodes(ids);
  setTimeout(() => networkInstance.unselectAll(), 600);
}

// ─── TRANSITION TABLE ──────────────────────────────────────────────────────────
function renderTransitionTable(graph) {
  // Collect all symbols
  const symbols = [...new Set(graph.edges.map(e => e.label))].sort((a,b) => a==='ε'?1:b==='ε'?-1:a.localeCompare(b));

  // Build map: stateId → { symbol → [targets] }
  const transMap = {};
  graph.nodes.forEach(n => { transMap[n.id] = {}; });
  graph.edges.forEach(e => {
    if (!transMap[e.from][e.label]) transMap[e.from][e.label] = [];
    transMap[e.from][e.label].push(`q${e.to}`);
  });

  let html = `<h3>Transition Table</h3><table>
    <thead><tr>
      <th>State</th>
      ${symbols.map(s => `<th>${s}</th>`).join('')}
    </tr></thead><tbody>`;

  graph.nodes.forEach(n => {
    const isStart  = n.id === graph.startId;
    const isAccept = n.id === graph.acceptId;
    const marker   = (isStart ? '→' : '') + (isAccept ? '*' : '');
    const cls      = isAccept ? 'td-accept' : isStart ? 'td-start' : '';
    html += `<tr>
      <td class="${cls}">${marker} q${n.id}</td>
      ${symbols.map(s => {
        const targets = transMap[n.id][s];
        const epsCls = s === 'ε' ? 'td-eps' : '';
        return `<td class="${epsCls}">${targets ? `{${targets.join(', ')}}` : '—'}</td>`;
      }).join('')}
    </tr>`;
  });

  html += `</tbody></table>`;
  transitionTable.innerHTML = html;
}

// ─── UI HELPERS ────────────────────────────────────────────────────────────────
function showError(msg) {
  inputError.textContent = msg;
  inputError.classList.remove('hidden');
  regexInput.style.borderColor = 'var(--red)';
}
function hideError() {
  inputError.classList.add('hidden');
  regexInput.style.borderColor = '';
}
function showLoader(show) {
  loader.classList.toggle('hidden', !show);
  convertBtn.disabled = show;
}
