/* ================================================================
   AI COMMAND CENTER v2.0 — Extension JavaScript
   Auth, Projects, Tasks, Alerts, Profile, Chat
   ================================================================ */
'use strict';

// Route through Hono proxy so browser never calls localhost:5000 directly.
// Hono forwards /flask/api/* → Flask :5000/api/* server-side (no CORS/mixed-content).
const API = '/flask/api';
let currentUser   = null;
let currentProject = null;
let allProjects   = [];

// ============================================================
// TOAST NOTIFICATIONS
// ============================================================
function showToast(msg, type = 'info', duration = 3500) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const colors = { info:'#00D4FF', success:'#00FF9C', warning:'#FF8C00', error:'#FF4C4C' };
  const icons  = { info:'fas fa-info-circle', success:'fas fa-check-circle', warning:'fas fa-exclamation-circle', error:'fas fa-exclamation-triangle' };

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.style.borderColor = colors[type] || colors.info;
  toast.style.color = colors[type] || colors.info;
  toast.innerHTML = `<i class="${icons[type]||icons.info}"></i><span style="color:var(--white)">${msg}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('toast-out');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ============================================================
// API HELPERS
// ============================================================
async function apiCall(endpoint, method = 'GET', body = null) {
  try {
    const opts = {
      method,
      // 'include' works for same-origin proxy; no CORS issue
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    };
    if (body) opts.body = JSON.stringify(body);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000); // 12 s timeout
    opts.signal = controller.signal;

    const res = await fetch(API + endpoint, opts);
    clearTimeout(timer);

    // Always try to parse JSON; fall back gracefully
    let data;
    try {
      data = await res.json();
    } catch (_) {
      data = { success: false, error: `Server returned non-JSON (HTTP ${res.status})` };
    }
    return data;
  } catch (e) {
    // AbortError → timeout; TypeError → network down
    const offline = e.name === 'AbortError'
      ? 'Request timed out — Flask may be starting up, please retry'
      : 'Backend unreachable — check Flask is running on port 5000';
    console.warn('apiCall error:', endpoint, e.message);
    return { success: false, error: offline };
  }
}

// ============================================================
// AUTH INIT — Show login if not authenticated
// ============================================================
async function initAuth() {
  try {
    const res = await apiCall('/me');
    if (res.success && res.user) {
      currentUser = res.user;
      onAuthSuccess();
    } else {
      showAuthOverlay();
    }
  } catch (e) {
    // Never leave the user stuck — always show login
    console.warn('initAuth failed, showing login:', e);
    showAuthOverlay();
  }
}

function showAuthOverlay() {
  const overlay = document.getElementById('auth-overlay');
  if (overlay) {
    overlay.style.display = 'flex';
    // Start auth particles
    const authParticles = new ParticleSystem('particle-canvas-auth', {
      count: 50, color: '124,108,255', speed: 0.2
    });
    authParticles.start();
  }
}

function hideAuthOverlay() {
  const overlay = document.getElementById('auth-overlay');
  if (overlay) {
    overlay.style.transition = 'opacity 0.5s ease';
    overlay.style.opacity = '0';
    setTimeout(() => { overlay.style.display = 'none'; overlay.style.opacity = '1'; }, 500);
  }
}

function showPanel(type) {
  const login  = document.getElementById('login-panel');
  const signup = document.getElementById('signup-panel');
  if (!login || !signup) return;
  if (type === 'signup') {
    login.style.display  = 'none';
    signup.style.display = 'block';
  } else {
    signup.style.display = 'none';
    login.style.display  = 'block';
  }
}

function togglePwd(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  if (input.type === 'password') {
    input.type = 'text';
    btn.innerHTML = '<i class="fas fa-eye-slash"></i>';
  } else {
    input.type = 'password';
    btn.innerHTML = '<i class="fas fa-eye"></i>';
  }
}

async function doLogin() {
  const email    = document.getElementById('login-email')?.value.trim();
  const password = document.getElementById('login-password')?.value;
  const btn      = document.getElementById('login-btn');

  if (!email || !password) { showAuthError('login-error', 'Email and password required'); return; }

  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> AUTHENTICATING...'; }

  let res;
  try {
    res = await apiCall('/login', 'POST', { email, password });
  } catch (e) {
    res = { success: false, error: 'Backend unreachable — please try again' };
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> ENTER COMMAND CENTER'; }
  }

  if (res && res.success) {
    currentUser = res.user;
    hideAuthError('login-error');
    showToast(`Welcome back, ${res.user.name}!`, 'success');
    hideAuthOverlay();
    onAuthSuccess();
  } else {
    showAuthError('login-error', (res && res.error) || 'Authentication failed');
  }
}

async function doSignup() {
  const name     = document.getElementById('signup-name')?.value.trim();
  const email    = document.getElementById('signup-email')?.value.trim();
  const password = document.getElementById('signup-password')?.value;
  const role     = document.getElementById('signup-role')?.value;
  const btn      = document.getElementById('signup-btn');

  if (!name || !email || !password) { showAuthError('signup-error', 'All fields are required'); return; }
  if (password.length < 6) { showAuthError('signup-error', 'Password must be at least 6 characters'); return; }

  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> CREATING PROFILE...'; }

  let res;
  try {
    res = await apiCall('/signup', 'POST', { name, email, password, role });
  } catch (e) {
    res = { success: false, error: 'Backend unreachable — please try again' };
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-user-plus"></i> CREATE OPERATIVE PROFILE'; }
  }

  if (res.success) {
    currentUser = res.user;
    hideAuthError('signup-error');
    showToast(`Profile created! Welcome, ${res.user.name}!`, 'success');
    hideAuthOverlay();
    onAuthSuccess();
  } else {
    showAuthError('signup-error', res.error || 'Registration failed');
  }
}

function showAuthError(id, msg) {
  const el = document.getElementById(id);
  if (el) { el.textContent = msg; el.style.display = 'block'; }
}
function hideAuthError(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'none';
}

// ============================================================
// POST-AUTH SETUP
// ============================================================
function onAuthSuccess() {
  updateSidebarUser();
  loadDashboardData();
  loadAlerts();
  // Update logout button
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      await apiCall('/logout', 'POST');
      currentUser = null;
      allProjects = [];
      showAuthOverlay();
      showToast('Logged out successfully', 'info');
    });
  }
}

function updateSidebarUser() {
  if (!currentUser) return;
  const mini = document.getElementById('sidebar-user-mini');
  const name = document.getElementById('sui-name');
  const role = document.getElementById('sui-role');
  const ava  = document.getElementById('sui-avatar');
  if (mini) mini.style.display = 'flex';
  if (name) name.textContent = currentUser.name;
  if (role) role.textContent = currentUser.role;
  if (ava)  ava.innerHTML = `<i class="fas fa-user"></i>`;

  // Update top avatar
  const topAva = document.querySelector('.top-avatar img');
  if (topAva) topAva.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(currentUser.email)}&backgroundColor=0B0F14`;
}

// ============================================================
// DASHBOARD — Live Data
// ============================================================
async function loadDashboardData() {
  if (!currentUser) return;
  let res;
  try {
    res = await apiCall('/get_dashboard');
  } catch (e) {
    renderEmptyDashboard();
    return;
  }
  if (!res || !res.success) {
    renderEmptyDashboard();
    return;
  }

  if (!res.has_data) {
    renderEmptyDashboard();
    return;
  }

  // Update productivity ring target
  window._dashTarget = res.productivity;

  // Update metric cards
  const mcTasks  = document.getElementById('mc-tasks-val');
  const mcLoad   = document.getElementById('mc-load-val');
  const mcErrors = document.getElementById('mc-errors-val');
  if (mcTasks)  animateNumber('mc-tasks-val', 0, res.completed_tasks, 1200);
  if (mcLoad)   animateNumber('mc-load-val',  0, res.pending_tasks,   1000);
  if (mcErrors) mcErrors.textContent = res.project_count;

  // Update prod sublabel
  const sublabel = document.querySelector('.prod-sublabel');
  if (sublabel) sublabel.textContent = `${res.project_count} active project${res.project_count !== 1 ? 's' : ''}`;

  // Update productivity badge
  const badge = document.querySelector('.productivity-card .panel-badge');
  if (badge) {
    if (res.productivity >= 70) { badge.className = 'panel-badge green'; badge.textContent = 'OPTIMAL'; }
    else if (res.productivity >= 40) { badge.className = 'panel-badge'; badge.style.background = 'rgba(255,140,0,0.15)'; badge.style.color = '#FF8C00'; badge.textContent = 'PROGRESSING'; }
    else { badge.className = 'panel-badge red'; badge.textContent = 'NEEDS ATTENTION'; }
  }

  // Re-init ring with real data
  initProductivityRingDynamic(res.productivity);

  // Update agents panel with real project data
  updateAgentActivities(res);

  // Update alert badge
  const alertCount = (res.alerts || []).length;
  const navBadge    = document.getElementById('nav-alert-badge');
  const topBadge    = document.getElementById('topbar-alert-count');
  if (navBadge)  navBadge.textContent = alertCount;
  if (topBadge)  topBadge.textContent = alertCount;

  allProjects = res.projects || [];
}

function renderEmptyDashboard() {
  const prodDisplay = document.getElementById('prod-display');
  if (prodDisplay) prodDisplay.innerHTML = '0<span>%</span>';
  initProductivityRingDynamic(0);

  const sublabel = document.querySelector('.prod-sublabel');
  if (sublabel) sublabel.textContent = 'No Active Projects';

  const badge = document.querySelector('.productivity-card .panel-badge');
  if (badge) { badge.className = 'panel-badge'; badge.style.background = 'rgba(74,96,128,0.2)'; badge.style.color = '#4a6080'; badge.textContent = 'IDLE'; }

  const mcTasks  = document.getElementById('mc-tasks-val');
  const mcLoad   = document.getElementById('mc-load-val');
  const mcErrors = document.getElementById('mc-errors-val');
  if (mcTasks)  mcTasks.textContent = '0';
  if (mcLoad)   mcLoad.innerHTML = '0<span style="font-size:0.5em">%</span>';
  if (mcErrors) mcErrors.textContent = '0';
}

function initProductivityRingDynamic(target) {
  const canvas = document.getElementById('productivity-ring');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = 240, H = 240, cx = 120, cy = 120, r = 95;
  let progress = 0;

  function draw(val) {
    ctx.clearRect(0, 0, W, H);
    const startAngle = -Math.PI / 2;
    const fullAngle  = startAngle + (val / 100) * 2 * Math.PI;

    ctx.beginPath(); ctx.arc(cx, cy, r, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(0,212,255,0.08)'; ctx.lineWidth = 14; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(0,255,156,0.04)'; ctx.lineWidth = 22; ctx.stroke();

    for (let i = 0; i < 60; i++) {
      const angle = (i / 60) * 2 * Math.PI - Math.PI / 2;
      const isMajor = i % 5 === 0;
      const r1 = r + 8, r2 = r + (isMajor ? 14 : 10);
      ctx.beginPath();
      ctx.moveTo(cx + r1 * Math.cos(angle), cy + r1 * Math.sin(angle));
      ctx.lineTo(cx + r2 * Math.cos(angle), cy + r2 * Math.sin(angle));
      ctx.strokeStyle = isMajor ? 'rgba(0,212,255,0.4)' : 'rgba(0,212,255,0.15)';
      ctx.lineWidth = isMajor ? 1.5 : 0.8; ctx.stroke();
    }

    if (val > 0) {
      const grad = ctx.createLinearGradient(cx - r, cy, cx + r, cy);
      grad.addColorStop(0, '#00D4FF'); grad.addColorStop(0.5, '#00FF9C'); grad.addColorStop(1, '#7C6CFF');
      ctx.beginPath(); ctx.arc(cx, cy, r, startAngle, fullAngle);
      ctx.strokeStyle = grad; ctx.lineWidth = 14; ctx.lineCap = 'round';
      ctx.shadowColor = '#00FF9C'; ctx.shadowBlur = 20; ctx.stroke(); ctx.shadowBlur = 0;

      ctx.beginPath();
      ctx.arc(cx + r * Math.cos(fullAngle), cy + r * Math.sin(fullAngle), 8, 0, 2 * Math.PI);
      ctx.fillStyle = '#00FF9C'; ctx.shadowColor = '#00FF9C'; ctx.shadowBlur = 16; ctx.fill(); ctx.shadowBlur = 0;
    }
  }

  const dispEl = document.getElementById('prod-display');
  const interval = setInterval(() => {
    progress += 1.5;
    if (progress >= target) { progress = target; clearInterval(interval); }
    draw(progress);
    if (dispEl) dispEl.innerHTML = `${Math.floor(progress)}<span>%</span>`;
  }, 18);
}

function updateAgentActivities(dashData) {
  const activities = [
    `Analyzing ${dashData.project_count} project(s)`,
    `Tracking ${dashData.total_tasks} total tasks`,
    `Optimizing ${dashData.pending_tasks} pending items`,
    `${dashData.alerts ? dashData.alerts.length : 0} alerts active`
  ];
  document.querySelectorAll('.agent-activity').forEach((el, i) => {
    if (activities[i]) el.textContent = activities[i];
  });
}

// ============================================================
// ALERTS SYSTEM
// ============================================================
async function loadAlerts() {
  if (!currentUser) return;
  const res = await apiCall('/alerts');
  if (!res.success) return;

  const alerts = res.alerts || [];
  renderAlerts(alerts, 'alerts-container');

  const navBadge = document.getElementById('nav-alert-badge');
  const topBadge = document.getElementById('topbar-alert-count');
  if (navBadge) navBadge.textContent = alerts.length;
  if (topBadge) topBadge.textContent = alerts.length;
}

function renderAlerts(alerts, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!alerts || alerts.length === 0) {
    container.innerHTML = `
      <div class="glass-panel" style="padding:20px">
        <div class="empty-state">
          <div class="empty-state-visual">
            <div class="empty-ring empty-ring-1" style="border-color:rgba(0,255,156,0.3)"></div>
            <div class="empty-ring empty-ring-2" style="border-color:rgba(0,255,156,0.2)"></div>
            <div class="empty-ring empty-ring-3" style="border-color:rgba(0,255,156,0.1)"></div>
            <div class="empty-state-icon" style="color:var(--green)"><i class="fas fa-shield-check"></i></div>
          </div>
          <div class="empty-title">NO ALERTS</div>
          <div class="empty-sub">System is actively monitoring all projects.<br>No risk patterns detected.</div>
        </div>
      </div>`;
    return;
  }

  const colorMap = {
    high:   { bg: 'rgba(255,76,76,0.08)',   border: '#FF4C4C', label: 'HIGH RISK' },
    medium: { bg: 'rgba(255,140,0,0.08)',   border: '#FF8C00', label: 'MEDIUM RISK' },
    low:    { bg: 'rgba(0,255,156,0.08)',   border: '#00FF9C', label: 'LOW RISK' },
  };

  const html = `<div class="alerts-grid">${alerts.map((a, i) => {
    const c = colorMap[a.type] || colorMap.low;
    return `
      <div class="alert-item" style="border-left-color:${c.border};background:${c.bg};animation-delay:${i*0.08}s">
        <div class="alert-icon" style="color:${c.border}"><i class="${a.icon || 'fas fa-bell'}"></i></div>
        <div class="alert-body">
          <div class="alert-title" style="color:${c.border}">${a.title}</div>
          <div class="alert-message">${a.message}</div>
          <div class="alert-meta"><i class="fas fa-clock"></i> ${a.time || 'Just now'} · ${a.project}</div>
        </div>
        <span class="alert-badge-pill" style="background:${c.bg};border:1px solid ${c.border};color:${c.border}">${c.label}</span>
      </div>`;
  }).join('')}</div>`;
  container.innerHTML = html;
}

// ============================================================
// PROJECTS SECTION
// ============================================================
function toggleCreateForm() {
  const form = document.getElementById('create-project-form');
  const btn  = document.getElementById('cpanel-toggle');
  if (!form) return;
  if (form.style.display === 'none' || form.style.display === '') {
    form.style.display = 'block';
    form.style.animation = 'sectionFadeIn 0.3s ease forwards';
    if (btn) btn.innerHTML = '<i class="fas fa-times"></i> CANCEL';
  } else {
    form.style.display = 'none';
    if (btn) btn.innerHTML = '<i class="fas fa-plus"></i> NEW PROJECT';
  }
}

async function createProject() {
  if (!currentUser) { showToast('Please login first', 'error'); return; }
  const name     = document.getElementById('proj-name')?.value.trim();
  const desc     = document.getElementById('proj-desc')?.value.trim();
  const deadline = document.getElementById('proj-deadline')?.value;

  if (!name) { showToast('Project name is required', 'error'); return; }

  const res = await apiCall('/create_project', 'POST', { name, description: desc, deadline: deadline || null });
  if (res.success) {
    showToast(`Project "${name}" launched!`, 'success');
    document.getElementById('proj-name').value = '';
    document.getElementById('proj-desc').value = '';
    document.getElementById('proj-deadline').value = '';
    toggleCreateForm();
    await loadProjects();
    await loadDashboardData();
    await loadAlerts();
  } else {
    showToast(res.error || 'Failed to create project', 'error');
  }
}

async function loadProjects() {
  if (!currentUser) return;
  const res = await apiCall('/projects');
  if (!res.success) return;

  allProjects = res.projects || [];
  renderProjectCards(allProjects);
}

function renderProjectCards(projects) {
  const container = document.getElementById('projects-list-container');
  if (!container) return;

  if (!projects || projects.length === 0) {
    container.innerHTML = `
      <div class="glass-panel" style="padding:20px">
        <div class="empty-state">
          <div class="empty-state-visual">
            <div class="empty-ring empty-ring-1" style="border-color:rgba(0,212,255,0.3)"></div>
            <div class="empty-ring empty-ring-2" style="border-color:rgba(0,212,255,0.2)"></div>
            <div class="empty-ring empty-ring-3" style="border-color:rgba(0,212,255,0.1)"></div>
            <div class="empty-state-icon" style="color:var(--blue)"><i class="fas fa-project-diagram"></i></div>
          </div>
          <div class="empty-title">NO ACTIVE PROJECTS</div>
          <div class="empty-sub">Upload a project to begin AI monitoring.<br>Click "NEW PROJECT" above to start.</div>
        </div>
      </div>`;
    return;
  }

  const getRiskStyle = (pct) => {
    if (pct < 30)  return { bg:'rgba(255,76,76,0.12)',  border:'#FF4C4C', label:'HIGH RISK',    fill:'#FF4C4C' };
    if (pct < 60)  return { bg:'rgba(255,140,0,0.12)',  border:'#FF8C00', label:'MEDIUM RISK',  fill:'#FF8C00' };
    return          { bg:'rgba(0,255,156,0.12)',  border:'#00FF9C', label:'LOW RISK',    fill:'#00FF9C' };
  };

  const html = `<div class="project-cards-grid">` +
    projects.map(p => {
      const style = getRiskStyle(p.completion);
      return `
        <div class="project-card" style="border-color:rgba(0,212,255,0.15)" onclick="openTaskModal(${p.id})">
          <div class="project-card-header">
            <div>
              <div class="project-card-name">${escHtml(p.name)}</div>
              <div class="project-card-desc">${escHtml(p.description || 'No description')}</div>
            </div>
            <span class="project-card-risk" style="background:${style.bg};border:1px solid ${style.border};color:${style.border}">${style.label}</span>
          </div>
          <div class="project-card-progress">
            <div class="project-card-prog-label">
              <span>COMPLETION</span><span style="color:${style.fill}">${p.completion}%</span>
            </div>
            <div class="project-card-prog-bar">
              <div class="project-card-prog-fill" style="width:${p.completion}%;background:${style.fill};box-shadow:0 0 6px ${style.fill}"></div>
            </div>
          </div>
          <div class="project-card-footer">
            <div class="project-card-stats">
              <span class="pcs-item"><strong style="color:var(--green)">${p.completed_tasks}</strong> done</span>
              <span class="pcs-item"><strong style="color:var(--orange)">${p.pending_tasks}</strong> pending</span>
              <span class="pcs-item"><strong>${p.total_tasks}</strong> total</span>
            </div>
            <div class="project-card-actions" onclick="event.stopPropagation()">
              <button class="pca-btn" style="border-color:rgba(0,212,255,0.2);color:var(--blue)" onclick="openTaskModal(${p.id})" title="Manage Tasks"><i class="fas fa-tasks"></i></button>
              <button class="pca-btn" style="border-color:rgba(255,76,76,0.2);color:var(--red)" onclick="deleteProject(${p.id})" title="Delete"><i class="fas fa-trash"></i></button>
            </div>
          </div>
          ${p.deadline ? `<div style="margin-top:8px;font-family:var(--font-mono);font-size:0.6rem;color:var(--muted)"><i class="fas fa-calendar"></i> Deadline: ${new Date(p.deadline).toLocaleDateString()}</div>` : ''}
        </div>`;
    }).join('') + `</div>`;
  container.innerHTML = html;
}

async function deleteProject(pid) {
  if (!confirm('Delete this project and all its tasks?')) return;
  const res = await apiCall('/projects/' + pid, 'DELETE');
  if (res.success) {
    showToast('Project deleted', 'warning');
    await loadProjects();
    await loadDashboardData();
    await loadAlerts();
  } else {
    showToast(res.error || 'Delete failed', 'error');
  }
}

// ============================================================
// TASK MODAL
// ============================================================
async function openTaskModal(pid) {
  currentProject = allProjects.find(p => p.id === pid) || null;
  if (!currentProject) {
    const res = await apiCall('/projects/' + pid);
    if (res.success) currentProject = res.project;
  }
  if (!currentProject) return;

  const modal = document.getElementById('task-modal');
  document.getElementById('modal-project-name').textContent = currentProject.name.toUpperCase();
  document.getElementById('modal-project-desc').textContent = currentProject.description || '';
  updateModalCompletion(currentProject.completion);

  await refreshModalTasks(pid);

  // Clear chat
  const chatMsgs = document.getElementById('modal-chat-messages');
  if (chatMsgs) chatMsgs.innerHTML = '<div class="chat-msg ai-msg"><div class="chat-bubble"><div class="chat-who" style="color:var(--blue)">◈ AI ASSISTANT</div><div class="chat-text" style="color:var(--muted)">Project loaded. Ask me anything about this project.</div></div></div>';

  if (modal) modal.classList.add('open');
  document.getElementById('new-task-name')?.focus();
}

function closeTaskModal() {
  const modal = document.getElementById('task-modal');
  if (modal) modal.classList.remove('open');
  currentProject = null;
}

function updateModalCompletion(pct) {
  const bar    = document.getElementById('modal-bar');
  const pctEl  = document.getElementById('modal-completion-pct');
  if (bar)   bar.style.width = pct + '%';
  if (pctEl) pctEl.textContent = pct + '%';
}

async function refreshModalTasks(pid) {
  const res = await apiCall('/tasks/' + pid);
  if (!res.success) return;
  renderModalTasks(res.tasks || []);
  // Update project in allProjects
  const idx = allProjects.findIndex(p => p.id === pid);
  if (idx > -1 && currentProject) {
    const pRes = await apiCall('/projects/' + pid);
    if (pRes.success) {
      allProjects[idx] = pRes.project;
      currentProject   = pRes.project;
      updateModalCompletion(pRes.project.completion);
    }
  }
}

function renderModalTasks(tasks) {
  const container = document.getElementById('modal-tasks-list');
  if (!container) return;

  if (!tasks || tasks.length === 0) {
    container.innerHTML = `
      <div style="text-align:center;padding:24px;color:var(--muted);font-family:var(--font-mono);font-size:0.72rem">
        <i class="fas fa-list-ul" style="font-size:2rem;display:block;margin-bottom:10px;opacity:0.3"></i>
        No tasks yet. Add tasks above to start tracking.
      </div>`;
    return;
  }

  const priorityColors = { high: 'var(--red)', medium: 'var(--orange)', low: 'var(--green)' };

  container.innerHTML = tasks.map(t => {
    const isDone = t.status === 'completed';
    const pc = priorityColors[t.priority] || priorityColors.medium;
    return `
      <div class="task-item ${isDone ? 'done' : ''}" id="task-row-${t.id}">
        <div class="task-checkbox" style="border-color:${isDone ? 'var(--green)' : pc};background:${isDone ? 'rgba(0,255,156,0.15)' : 'transparent'};color:var(--green)"
             onclick="toggleTask(${t.id}, '${isDone ? 'pending' : 'completed'}')">
          ${isDone ? '<i class="fas fa-check"></i>' : ''}
        </div>
        <div class="task-name">${escHtml(t.name)}</div>
        <span class="task-priority prio-${t.priority}">${t.priority.toUpperCase()}</span>
        <button class="task-del-btn" onclick="deleteTask(${t.id})" title="Delete task"><i class="fas fa-times"></i></button>
      </div>`;
  }).join('');
}

async function addTask() {
  if (!currentProject) return;
  const nameInput = document.getElementById('new-task-name');
  const prioInput = document.getElementById('new-task-priority');
  const name = nameInput?.value.trim();
  const prio = prioInput?.value || 'medium';
  if (!name) { showToast('Task name required', 'warning'); return; }

  const res = await apiCall('/add_task', 'POST', {
    project_id: currentProject.id, name, priority: prio
  });
  if (res.success) {
    if (nameInput) nameInput.value = '';
    await refreshModalTasks(currentProject.id);
    renderProjectCards(allProjects);
    await loadDashboardData();
    await loadAlerts();
    showToast('Task added', 'success');
  } else {
    showToast(res.error || 'Failed to add task', 'error');
  }
}

async function toggleTask(tid, newStatus) {
  const res = await apiCall('/update_task', 'POST', { task_id: tid, status: newStatus });
  if (res.success) {
    await refreshModalTasks(currentProject.id);
    renderProjectCards(allProjects);
    await loadDashboardData();
    await loadAlerts();
    showToast(newStatus === 'completed' ? 'Task completed! ✓' : 'Task reopened', newStatus === 'completed' ? 'success' : 'info');
  }
}

async function deleteTask(tid) {
  const res = await apiCall('/delete_task/' + tid, 'DELETE');
  if (res.success) {
    await refreshModalTasks(currentProject.id);
    renderProjectCards(allProjects);
    await loadDashboardData();
    showToast('Task removed', 'warning');
  }
}

// ============================================================
// AI CHAT
// ============================================================
async function sendModalChat() {
  if (!currentProject) return;
  const input   = document.getElementById('modal-chat-input');
  const message = input?.value.trim();
  if (!message) return;
  input.value = '';

  addChatMsg(message, 'user');

  const res = await apiCall('/chat', 'POST', {
    message, project_id: currentProject.id
  });

  if (res.success) {
    addChatMsg(res.reply, 'ai', res.type);
  } else {
    addChatMsg('AI unavailable — Flask server offline', 'ai', 'alert');
  }
}

function quickChat(msg) {
  const input = document.getElementById('modal-chat-input');
  if (input) input.value = msg;
  sendModalChat();
}

function addChatMsg(text, role, type = 'info') {
  const container = document.getElementById('modal-chat-messages');
  if (!container) return;

  const div = document.createElement('div');
  div.className = `chat-msg ${role === 'user' ? 'user-msg' : `ai-msg ${type}-msg`}`;
  const whoColor = role === 'user' ? 'var(--blue)' : 'var(--purple)';
  const whoLabel = role === 'user' ? 'YOU' : '◈ AI ASSISTANT';
  div.innerHTML = `
    <div class="chat-bubble">
      <div class="chat-who" style="color:${whoColor}">${whoLabel}</div>
      <div class="chat-text">${escHtml(text)}</div>
    </div>`;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

// ============================================================
// PROFILE PAGE
// ============================================================
async function loadProfile() {
  if (!currentUser) return;
  const res = await apiCall('/profile');
  if (!res.success) return;

  const { user, projects, stats } = res;
  const container = document.getElementById('profile-container');
  if (!container) return;

  const projectsHtml = projects.length === 0
    ? `<div class="empty-state" style="min-height:200px"><div class="empty-state-visual" style="width:80px;height:80px"><div class="empty-ring empty-ring-1" style="border-color:rgba(0,212,255,0.2)"></div><div class="empty-state-icon" style="color:var(--muted);font-size:2rem"><i class="fas fa-project-diagram"></i></div></div><div class="empty-title" style="font-size:0.8rem">No Projects Yet</div></div>`
    : projects.map(p => `
        <div class="project-card" style="margin-bottom:10px" onclick="switchSection('projects'); setTimeout(()=>openTaskModal(${p.id}),300)">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <div class="project-card-name">${escHtml(p.name)}</div>
            <span style="font-family:var(--font-mono);font-size:0.65rem;color:var(--green)">${p.completion}%</span>
          </div>
          <div class="project-card-prog-bar" style="margin-top:8px">
            <div class="project-card-prog-fill" style="width:${p.completion}%;background:var(--green)"></div>
          </div>
          <div style="display:flex;gap:12px;margin-top:8px">
            <span class="pcs-item"><strong style="color:var(--green)">${p.completed_tasks}</strong> done</span>
            <span class="pcs-item"><strong style="color:var(--orange)">${p.pending_tasks}</strong> pending</span>
          </div>
        </div>`).join('');

  container.innerHTML = `
    <div class="profile-layout">
      <div class="glass-panel profile-card">
        <div class="profile-avatar-wrap"><i class="fas fa-user-astronaut"></i></div>
        <div class="profile-name">${escHtml(user.name)}</div>
        <div class="profile-role">${user.role.toUpperCase()} OPERATIVE</div>
        <div class="profile-stat-grid">
          <div class="profile-stat"><div class="ps-val green">${stats.project_count}</div><div class="ps-lbl">PROJECTS</div></div>
          <div class="profile-stat"><div class="ps-val blue">${stats.total_tasks}</div><div class="ps-lbl">TOTAL TASKS</div></div>
          <div class="profile-stat"><div class="ps-val" style="color:var(--green)">${stats.completed_tasks}</div><div class="ps-lbl">COMPLETED</div></div>
          <div class="profile-stat"><div class="ps-val" style="color:var(--purple)">${stats.productivity}%</div><div class="ps-lbl">EFFICIENCY</div></div>
        </div>
        <div style="margin-top:16px;padding-top:16px;border-top:1px solid rgba(0,212,255,0.1)">
          <div style="font-family:var(--font-mono);font-size:0.62rem;color:var(--muted);margin-bottom:6px">EMAIL</div>
          <div style="font-family:var(--font-body);font-size:0.85rem;color:var(--blue)">${escHtml(user.email)}</div>
        </div>
        <div style="margin-top:12px">
          <div style="font-family:var(--font-mono);font-size:0.62rem;color:var(--muted);margin-bottom:6px">MEMBER SINCE</div>
          <div style="font-family:var(--font-body);font-size:0.85rem">${new Date(user.created_at).toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'})}</div>
        </div>
      </div>
      <div>
        <div class="glass-panel" style="padding:24px">
          <div class="profile-projects-title"><i class="fas fa-project-diagram" style="color:var(--blue)"></i> MY PROJECTS (${projects.length})</div>
          ${projectsHtml}
        </div>
      </div>
    </div>`;
}

// ============================================================
// SECTION SWITCHING — EXTEND ORIGINAL
// ============================================================
// Override switchSection to load data when switching sections
const _origSwitchSection = window.switchSection;
window.switchSection = function(name) {
  if (_origSwitchSection) _origSwitchSection(name);
  else {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    const target = document.getElementById('section-' + name);
    if (target) target.classList.add('active');
  }

  // Load section-specific data
  if (name === 'projects')      { loadProjects(); }
  if (name === 'notifications') { loadAlerts(); }
  if (name === 'profile')       { loadProfile(); }
  if (name === 'dashboard')     { loadDashboardData(); }

  // Update breadcrumb
  const labels = {
    dashboard: 'DASHBOARD', team: 'TEAM MONITORING', analytics: 'ANALYTICS',
    agents: 'AI AGENTS', projects: 'PROJECTS', notifications: 'ALERTS',
    profile: 'PROFILE', about: 'ABOUT', settings: 'SETTINGS'
  };
  const current = document.getElementById('current-section');
  if (current) current.textContent = labels[name] || name.toUpperCase();

  // Update sidebar active
  document.querySelectorAll('.nav-item').forEach(n => {
    n.classList.remove('active');
    if (n.dataset.section === name) n.classList.add('active');
  });
};

// ============================================================
// UTILITY
// ============================================================
function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ============================================================
// STARTUP
// ============================================================
window.addEventListener('DOMContentLoaded', () => {
  // Wait for loading screen to finish before auth
  const authCheckInterval = setInterval(() => {
    const mainApp = document.getElementById('main-app');
    if (mainApp && !mainApp.classList.contains('hidden')) {
      clearInterval(authCheckInterval);
      initAuth();
    }
  }, 200);
});

// Also hook into initMainApp completion (set after loading)
const _origInitMainApp = window.initMainApp;
if (_origInitMainApp) {
  window.initMainApp = function() {
    _origInitMainApp();
    initAuth();
  };
}
