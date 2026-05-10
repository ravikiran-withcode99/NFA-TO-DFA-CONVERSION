/**
 * nfa.js — Core NFA logic
 * Implements:
 *   1. Explicit concatenation insertion
 *   2. Infix → Postfix (Shunting-Yard)
 *   3. Thompson's Construction
 */

// ─── State counter (global, reset per call) ───────────────────────────────────
let stateId = 0;
const newState = () => ({ id: stateId++, transitions: {} });

// ─── Helper: add a transition ─────────────────────────────────────────────────
function addTransition(state, symbol, target) {
  if (!state.transitions[symbol]) state.transitions[symbol] = [];
  state.transitions[symbol].push(target.id);
}

// ─── 1. Insert explicit concatenation operator '.' ────────────────────────────
function addConcatenation(regex) {
  const result = [];
  const atoms = new Set([')', '*', '+', '?']);
  const nonAtomStart = new Set(['(', '|']);

  for (let i = 0; i < regex.length; i++) {
    const c = regex[i];
    result.push(c);

    if (i + 1 < regex.length) {
      const next = regex[i + 1];
      // Insert '.' between: (atom/closing/star) followed by (atom/opening)
      if (
        (c !== '(' && c !== '|') &&
        (next !== ')' && next !== '|' && next !== '*' && next !== '+' && next !== '?')
      ) {
        result.push('.');
      }
    }
  }
  return result.join('');
}

// ─── 2. Infix → Postfix (Shunting-Yard) ──────────────────────────────────────
function toPostfix(regex) {
  const precedence = { '|': 1, '.': 2, '*': 3, '+': 3, '?': 3 };
  const output = [];
  const stack = [];

  for (const c of regex) {
    if (c === '(') {
      stack.push(c);
    } else if (c === ')') {
      while (stack.length && stack[stack.length - 1] !== '(') output.push(stack.pop());
      stack.pop(); // pop '('
    } else if (precedence[c] !== undefined) {
      while (
        stack.length &&
        stack[stack.length - 1] !== '(' &&
        (precedence[stack[stack.length - 1]] || 0) >= precedence[c]
      ) {
        output.push(stack.pop());
      }
      stack.push(c);
    } else {
      output.push(c); // literal character
    }
  }

  while (stack.length) output.push(stack.pop());
  return output.join('');
}

// ─── 3. Thompson's Construction ───────────────────────────────────────────────
// Each NFA fragment = { start, accept, states[] }

function buildSymbolNFA(symbol, allStates, steps) {
  const s = newState();
  const a = newState();
  addTransition(s, symbol, a);
  allStates.push(s, a);

  steps.push({
    type: 'symbol',
    description: `Create NFA for symbol '${symbol}'`,
    detail: `State q${s.id} →[${symbol}]→ State q${a.id} (accept)`,
    highlight: [s.id, a.id],
  });

  return { start: s, accept: a, states: [s, a] };
}

function buildConcatNFA(nfa1, nfa2, allStates, steps) {
  // Connect accept of nfa1 to start of nfa2 via ε
  addTransition(nfa1.accept, 'ε', nfa2.start);

  steps.push({
    type: 'concat',
    description: 'Concatenate two NFAs',
    detail: `Connect q${nfa1.accept.id} →[ε]→ q${nfa2.start.id}`,
    highlight: [nfa1.accept.id, nfa2.start.id],
  });

  return {
    start: nfa1.start,
    accept: nfa2.accept,
    states: [...nfa1.states, ...nfa2.states],
  };
}

function buildUnionNFA(nfa1, nfa2, allStates, steps) {
  const s = newState();
  const a = newState();

  addTransition(s, 'ε', nfa1.start);
  addTransition(s, 'ε', nfa2.start);
  addTransition(nfa1.accept, 'ε', a);
  addTransition(nfa2.accept, 'ε', a);

  allStates.push(s, a);

  steps.push({
    type: 'union',
    description: 'Apply OR (|) — Union of two NFAs',
    detail: `New start q${s.id} →[ε]→ q${nfa1.start.id} and q${nfa2.start.id}; accepts q${nfa1.accept.id}, q${nfa2.accept.id} →[ε]→ new accept q${a.id}`,
    highlight: [s.id, a.id, nfa1.start.id, nfa2.start.id],
  });

  return {
    start: s,
    accept: a,
    states: [s, ...nfa1.states, ...nfa2.states, a],
  };
}

function buildKleeneNFA(nfa, allStates, steps) {
  const s = newState();
  const a = newState();

  addTransition(s, 'ε', nfa.start);
  addTransition(s, 'ε', a);           // skip (zero occurrences)
  addTransition(nfa.accept, 'ε', nfa.start); // loop back
  addTransition(nfa.accept, 'ε', a);  // exit loop

  allStates.push(s, a);

  steps.push({
    type: 'kleene',
    description: 'Apply Kleene Star (*)',
    detail: `New start q${s.id} →[ε]→ q${nfa.start.id} (and accept q${a.id}); q${nfa.accept.id} loops back and exits to q${a.id}`,
    highlight: [s.id, a.id, nfa.start.id, nfa.accept.id],
  });

  return {
    start: s,
    accept: a,
    states: [s, ...nfa.states, a],
  };
}

function buildPlusNFA(nfa, allStates, steps) {
  // a+ = aa*  → simulated as: keep nfa, add loop without skip
  const s = newState();
  const a = newState();

  addTransition(s, 'ε', nfa.start);
  addTransition(nfa.accept, 'ε', nfa.start);
  addTransition(nfa.accept, 'ε', a);

  allStates.push(s, a);

  steps.push({
    type: 'plus',
    description: 'Apply Plus (+) — one or more',
    detail: `q${s.id} →[ε]→ q${nfa.start.id}; q${nfa.accept.id} loops and exits to q${a.id}`,
    highlight: [s.id, a.id, nfa.start.id, nfa.accept.id],
  });

  return { start: s, accept: a, states: [s, ...nfa.states, a] };
}

function buildOptionalNFA(nfa, allStates, steps) {
  const s = newState();
  const a = newState();

  addTransition(s, 'ε', nfa.start);
  addTransition(s, 'ε', a);
  addTransition(nfa.accept, 'ε', a);

  allStates.push(s, a);

  steps.push({
    type: 'optional',
    description: 'Apply Optional (?) — zero or one',
    detail: `q${s.id} →[ε]→ q${nfa.start.id} or q${a.id}; q${nfa.accept.id} →[ε]→ q${a.id}`,
    highlight: [s.id, a.id],
  });

  return { start: s, accept: a, states: [s, ...nfa.states, a] };
}

// ─── 4. Build NFA from postfix string ─────────────────────────────────────────
function buildNFA(postfix) {
  stateId = 0;
  const stack = [];
  const allStates = [];
  const steps = [];

  for (const c of postfix) {
    if (c === '.') {
      const nfa2 = stack.pop();
      const nfa1 = stack.pop();
      stack.push(buildConcatNFA(nfa1, nfa2, allStates, steps));
    } else if (c === '|') {
      const nfa2 = stack.pop();
      const nfa1 = stack.pop();
      stack.push(buildUnionNFA(nfa1, nfa2, allStates, steps));
    } else if (c === '*') {
      const nfa = stack.pop();
      stack.push(buildKleeneNFA(nfa, allStates, steps));
    } else if (c === '+') {
      const nfa = stack.pop();
      stack.push(buildPlusNFA(nfa, allStates, steps));
    } else if (c === '?') {
      const nfa = stack.pop();
      stack.push(buildOptionalNFA(nfa, allStates, steps));
    } else {
      stack.push(buildSymbolNFA(c, allStates, steps));
    }
  }

  return { nfa: stack[0], steps };
}

// ─── 5. Serialize NFA to JSON (nodes + edges) ─────────────────────────────────
function serializeNFA(nfaFragment) {
  const { start, accept, states } = nfaFragment;
  const nodes = states.map(s => ({
    id: s.id,
    label: `q${s.id}`,
    isStart: s.id === start.id,
    isAccept: s.id === accept.id,
  }));

  const edges = [];
  for (const s of states) {
    for (const [symbol, targets] of Object.entries(s.transitions)) {
      for (const targetId of targets) {
        edges.push({ from: s.id, to: targetId, label: symbol });
      }
    }
  }

  return { nodes, edges, startId: start.id, acceptId: accept.id };
}

// ─── 6. Input validation ───────────────────────────────────────────────────────
function validateRegex(regex) {
  if (!regex || regex.trim() === '') return 'Regex cannot be empty';
  let depth = 0;
  for (const c of regex) {
    if (c === '(') depth++;
    if (c === ')') depth--;
    if (depth < 0) return 'Unmatched closing parenthesis';
  }
  if (depth !== 0) return 'Unmatched opening parenthesis';
  if (/[*+?|]{2,}/.test(regex)) return 'Consecutive operators are not allowed';
  if (/^[*+?|]/.test(regex)) return 'Regex cannot start with an operator';
  if (/[|]$/.test(regex)) return 'Regex cannot end with |';
  return null;
}

// ─── 7. Main conversion function ──────────────────────────────────────────────
function convertRegex(regex) {
  const error = validateRegex(regex);
  if (error) throw new Error(error);

  const withConcat = addConcatenation(regex);
  const postfix = toPostfix(withConcat);
  const { nfa, steps } = buildNFA(postfix);
  const graph = serializeNFA(nfa);

  return { postfix, withConcat, graph, steps };
}

module.exports = { convertRegex };
