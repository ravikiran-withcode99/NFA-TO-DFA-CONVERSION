// ============================================================
// auth-nfa.js — Authentication logic for Thompson NFA project
// Connects to backend at http://localhost:5000/api
// ============================================================

// Backend URL: localhost:5000 for local development
const API = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5000/api'
  : `${window.location.origin}/api`;

// ── UTILITIES ────────────────────────────────────────────────

function showAlert(msg, type) {
  const box = document.getElementById('alertBox');
  box.className = `alert-box alert-${type}`;
  box.textContent = (type === 'success' ? '✓ ' : '✗ ') + msg;
  box.classList.remove('d-none');
  setTimeout(() => box.classList.add('d-none'), 5000);
}

function clearErrors(formId) {
  document.querySelectorAll(`#${formId} .nfa-input`).forEach(el => {
    el.classList.remove('is-invalid', 'is-valid');
  });
  document.querySelectorAll(`#${formId} .invalid-feedback`).forEach(el => {
    el.textContent = ''; el.classList.remove('show');
  });
}

function fieldError(inputId, errId, msg) {
  const el = document.getElementById(inputId);
  const er = document.getElementById(errId);
  if (el) el.classList.add('is-invalid');
  if (er) { er.textContent = msg; er.classList.add('show'); }
}

function fieldOk(inputId) {
  const el = document.getElementById(inputId);
  if (el) { el.classList.remove('is-invalid'); el.classList.add('is-valid'); }
}

function setLoading(btnId, on) {
  const btn = document.getElementById(btnId);
  btn.querySelector('.btn-text').classList.toggle('d-none', on);
  btn.querySelector('.btn-loader').classList.toggle('d-none', !on);
  btn.disabled = on;
}

function togglePw(id, btn) {
  const inp = document.getElementById(id);
  inp.type = inp.type === 'password' ? 'text' : 'password';
  btn.textContent = inp.type === 'password' ? '👁' : '🙈';
}

// ── TAB SWITCHING ────────────────────────────────────────────

function showTab(tab) {
  document.getElementById('alertBox').classList.add('d-none');
  const isLogin = tab === 'login';
  document.getElementById('loginForm').classList.toggle('d-none', !isLogin);
  document.getElementById('registerForm').classList.toggle('d-none', isLogin);
  document.getElementById('loginTabBtn').classList.toggle('active', isLogin);
  document.getElementById('registerTabBtn').classList.toggle('active', !isLogin);
  clearErrors(isLogin ? 'loginForm' : 'registerForm');
}

// ── PASSWORD STRENGTH ────────────────────────────────────────

function checkStrength(pw) {
  const div = document.getElementById('pwStrength');
  const txt = document.getElementById('strengthText');
  const bars = [1,2,3,4].map(i => document.getElementById('bar' + i));
  bars.forEach(b => b.style.background = 'rgba(255,255,255,0.08)');
  if (!pw) { div.classList.remove('visible'); return; }
  div.classList.add('visible');
  let score = 0;
  if (pw.length >= 6)  score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw))    score++;
  if (/[!@#$%^&*]/.test(pw)) score = Math.min(score + 1, 4);
  score = Math.min(score, 4);
  const cfg = [
    null,
    { c: '#ef4444', l: 'Weak' },
    { c: '#ffd93d', l: 'Fair' },
    { c: '#22c55e', l: 'Good' },
    { c: '#a78bfa', l: 'Strong' }
  ];
  if (score > 0) {
    const { c, l } = cfg[score];
    for (let i = 0; i < score; i++) bars[i].style.background = c;
    txt.textContent = l; txt.style.color = c;
  }
}

// ── VALIDATION ───────────────────────────────────────────────

function validateLogin() {
  clearErrors('loginForm');
  let ok = true;
  const email = document.getElementById('loginEmail').value.trim();
  const pw    = document.getElementById('loginPassword').value;
  if (!email) { fieldError('loginEmail','loginEmailError','⚠ Email is required'); ok = false; }
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { fieldError('loginEmail','loginEmailError','⚠ Invalid email format'); ok = false; }
  else fieldOk('loginEmail');
  if (!pw) { fieldError('loginPassword','loginPasswordError','⚠ Password is required'); ok = false; }
  else fieldOk('loginPassword');
  return ok;
}

function validateRegister() {
  clearErrors('registerForm');
  let ok = true;
  const name = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const pw    = document.getElementById('regPassword').value;
  const cpw   = document.getElementById('regConfirm').value;
  const terms = document.getElementById('termsCheck').checked;

  if (!name || name.length < 2) { fieldError('regName','regNameError','⚠ Full name required (min 2 chars)'); ok = false; }
  else fieldOk('regName');

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { fieldError('regEmail','regEmailError','⚠ Valid email required'); ok = false; }
  else fieldOk('regEmail');

  if (!pw || pw.length < 6) { fieldError('regPassword','regPasswordError','⚠ Min 6 characters'); ok = false; }
  else if (!/\d/.test(pw))  { fieldError('regPassword','regPasswordError','⚠ Must contain a number'); ok = false; }
  else fieldOk('regPassword');

  if (!cpw)         { fieldError('regConfirm','regConfirmError','⚠ Please confirm password'); ok = false; }
  else if (pw !== cpw) { fieldError('regConfirm','regConfirmError','⚠ Passwords do not match'); ok = false; }
  else fieldOk('regConfirm');

  if (!terms) { document.getElementById('termsError').classList.add('show'); ok = false; }

  return ok;
}

// ── API CALL ─────────────────────────────────────────────────

async function apiCall(endpoint, body) {
  const res = await fetch(`${API}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  return { data, ok: res.ok };
}

// ── LOGIN HANDLER ────────────────────────────────────────────

document.getElementById('loginForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  if (!validateLogin()) return;
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  setLoading('loginBtn', true);
  try {
    const { data, ok } = await apiCall('/auth/login', { email, password });
    if (ok && data.success) {
      localStorage.setItem('nfa_token', data.token);
      localStorage.setItem('nfa_user', data.user.name);
      localStorage.setItem('nfa_email', data.user.email);
      showAlert('Login successful! Redirecting…', 'success');
      setTimeout(() => { window.location.href = 'index.html'; }, 900);
    } else {
      showAlert(data.message || 'Login failed. Check your credentials.', 'danger');
    }
  } catch {
    showAlert('Cannot connect to backend. Make sure it is running on port 5000.', 'danger');
  } finally {
    setLoading('loginBtn', false);
  }
});

// ── REGISTER HANDLER ─────────────────────────────────────────

document.getElementById('registerForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  if (!validateRegister()) return;
  const name  = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;
  const confirmPassword = document.getElementById('regConfirm').value;
  setLoading('registerBtn', true);
  try {
    const { data, ok } = await apiCall('/auth/register', { name, email, password, confirmPassword });
    if (ok && data.success) {
      localStorage.setItem('nfa_token', data.token);
      localStorage.setItem('nfa_user', data.user.name);
      localStorage.setItem('nfa_email', data.user.email);
      showAlert('Account created! Redirecting…', 'success');
      setTimeout(() => { window.location.href = 'index.html'; }, 1000);
    } else {
      showAlert(data.message || 'Registration failed. Please try again.', 'danger');
    }
  } catch {
    showAlert('Cannot connect to backend. Make sure it is running on port 5000.', 'danger');
  } finally {
    setLoading('registerBtn', false);
  }
});

// ── AUTO-REDIRECT if already logged in ──────────────────────
(function() {
  if (localStorage.getItem('nfa_token')) {
    window.location.href = 'index.html';
  }
})();

// ── GOOGLE SIGN-IN HANDLER ───────────────────────────────────

let googleTokenClient = null; // holds the GIS token client instance

/**
 * Called after GIS token client gets an access token.
 * Fetches user info from Google, then authenticates with our backend.
 */
async function handleGoogleToken(tokenResponse) {
  const btn = document.getElementById('googleSignInBtn');
  const btnText = btn?.querySelector('span');

  if (tokenResponse.error) {
    if (btn) btn.disabled = false;
    if (btnText) btnText.textContent = 'Continue with Google';
    showAlert('Google sign-in was cancelled.', 'danger');
    return;
  }

  try {
    // Step 1: Fetch user profile from Google using access token
    const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
    });
    const userInfo = await userRes.json();

    if (!userInfo.email) {
      throw new Error('Could not retrieve Google account info.');
    }

    // Step 2: Send user info to our backend
    const res = await fetch(`${API}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        googleId: userInfo.sub,
        email:    userInfo.email,
        name:     userInfo.name,
        picture:  userInfo.picture
      })
    });
    const data = await res.json();

    if (res.ok && data.success) {
      localStorage.setItem('nfa_token',   data.token);
      localStorage.setItem('nfa_user',    data.user.name);
      localStorage.setItem('nfa_email',   data.user.email);
      if (data.user.picture) localStorage.setItem('nfa_picture', data.user.picture);

      showAlert(`Welcome, ${data.user.name}! Redirecting…`, 'success');
      setTimeout(() => { window.location.href = 'index.html'; }, 900);
    } else {
      showAlert(data.message || 'Google sign-in failed.', 'danger');
      if (btn) btn.disabled = false;
      if (btnText) btnText.textContent = 'Continue with Google';
    }

  } catch (err) {
    console.error('Google auth error:', err);
    showAlert('Cannot connect to backend on port 5000.', 'danger');
    if (btn) btn.disabled = false;
    if (btnText) btnText.textContent = 'Continue with Google';
  }
}

/**
 * Initialize GIS token client — uses popup, never suppressed.
 */
function initGoogleSignIn() {
  const clientId = document.querySelector('meta[name="google-client-id"]')
                     ?.getAttribute('content');

  if (!clientId || clientId === 'YOUR_GOOGLE_CLIENT_ID_HERE') {
    const btn = document.getElementById('googleSignInBtn');
    if (btn) btn.disabled = true;
    return;
  }

  // initTokenClient uses a real popup — NOT suppressible like One Tap
  googleTokenClient = google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope:     'openid email profile',
    callback:  handleGoogleToken
  });
}

/**
 * Called when user clicks the custom Google button.
 */
function triggerGoogleSignIn() {
  const btn = document.getElementById('googleSignInBtn');
  const btnText = btn?.querySelector('span');

  if (!googleTokenClient) {
    showAlert('Google Sign-In is not configured. Check your Client ID.', 'danger');
    return;
  }

  if (btn) btn.disabled = true;
  if (btnText) btnText.textContent = 'Signing in…';

  googleTokenClient.requestAccessToken({ prompt: 'select_account' });
}


// Wait for GSI script to load, then initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initGoogleSignIn);
} else {
  // Small delay to ensure GSI script has loaded
  setTimeout(initGoogleSignIn, 500);
}
