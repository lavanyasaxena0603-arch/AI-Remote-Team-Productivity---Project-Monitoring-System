/* ================================================================
   AI COMMAND CENTER — MASTER JAVASCRIPT
   ================================================================ */
'use strict';

// ============================================================
// PARTICLE SYSTEM
// ============================================================
class ParticleSystem {
  constructor(canvasId, opts = {}) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.opts = {
      count: opts.count || 80,
      maxDist: opts.maxDist || 120,
      speed: opts.speed || 0.3,
      color: opts.color || '0,212,255',
      size: opts.size || 1.5,
    };
    this.particles = [];
    this.raf = null;
    this.resize();
    this.init();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    if (!this.canvas) return;
    this.canvas.width  = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  init() {
    this.particles = [];
    for (let i = 0; i < this.opts.count; i++) {
      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        vx: (Math.random() - 0.5) * this.opts.speed,
        vy: (Math.random() - 0.5) * this.opts.speed,
        size: Math.random() * this.opts.size + 0.5,
        alpha: Math.random() * 0.6 + 0.2,
      });
    }
  }

  draw() {
    if (!this.canvas) return;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.particles.forEach((p, i) => {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0) p.x = this.canvas.width;
      if (p.x > this.canvas.width) p.x = 0;
      if (p.y < 0) p.y = this.canvas.height;
      if (p.y > this.canvas.height) p.y = 0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${this.opts.color},${p.alpha})`;
      ctx.fill();

      // Connect nearby particles
      for (let j = i + 1; j < this.particles.length; j++) {
        const p2 = this.particles[j];
        const dx = p.x - p2.x, dy = p.y - p2.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < this.opts.maxDist) {
          const alpha = (1 - dist / this.opts.maxDist) * 0.15;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = `rgba(${this.opts.color},${alpha})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    });

    this.raf = requestAnimationFrame(() => this.draw());
  }

  start() { this.draw(); }
  stop() { cancelAnimationFrame(this.raf); }
}

// ============================================================
// LOADING SEQUENCE
// ============================================================
function runLoadingSequence() {
  const loaderParticles = new ParticleSystem('particle-canvas-loader', {
    count: 60, color: '0,212,255', speed: 0.2
  });
  loaderParticles.start();

  const bar     = document.getElementById('loader-bar');
  const percent = document.getElementById('loader-percent');
  const status  = document.getElementById('loader-status');
  const ready   = document.getElementById('system-ready');
  const title   = document.getElementById('loader-main-title');
  const svg     = document.getElementById('neural-connections-svg');

  const statusMessages = [
    'Booting Core Systems...',
    'Loading Neural Models...',
    'Connecting Data Pipelines...',
    'Synchronizing Intelligence...',
    'Calibrating Agent Matrix...',
    'Establishing Uplink...',
    'SYSTEM READY',
  ];

  const agentColors = ['#7C6CFF', '#00FF9C', '#00D4FF', '#FF4C4C'];
  let progressVal = 0;
  let msgIdx = 0;

  // Step 1 – fade in title
  setTimeout(() => {
    title.style.opacity = '0';
    title.style.transition = 'opacity 0.5s';
    setTimeout(() => { title.style.opacity = '1'; }, 100);
  }, 400);

  // Step 2 – activate agents one-by-one
  function activateAgent(idx) {
    if (idx > 3) return;
    const el = document.getElementById(`agent-load-${idx}`);
    if (!el) return;
    el.classList.add('activated');
    const statusEl = el.querySelector('.agent-load-status');
    if (statusEl) statusEl.textContent = 'ONLINE';

    // Draw neural connection in SVG
    const positions = [75, 225, 375, 525];
    if (idx > 0) {
      const line = document.createElementNS('http://www.w3.org/2000/svg','line');
      line.setAttribute('x1', positions[idx-1]);
      line.setAttribute('y1', '40');
      line.setAttribute('x2', positions[idx]);
      line.setAttribute('y2', '40');
      line.setAttribute('stroke', agentColors[idx]);
      line.setAttribute('stroke-width', '1.5');
      line.setAttribute('stroke-dasharray', '150');
      line.setAttribute('stroke-dashoffset', '150');
      line.setAttribute('opacity', '0.7');
      svg.appendChild(line);
      svg.classList.add('visible');
      setTimeout(() => {
        line.style.transition = 'stroke-dashoffset 0.6s ease';
        line.setAttribute('stroke-dashoffset', '0');
      }, 50);
    }

    setTimeout(() => activateAgent(idx + 1), 450);
  }

  setTimeout(() => activateAgent(0), 700);

  // Step 3 – progress bar
  const interval = setInterval(() => {
    progressVal += Math.random() * 8 + 3;
    if (progressVal > 100) progressVal = 100;

    bar.style.width = progressVal + '%';
    if (percent) percent.textContent = Math.floor(progressVal) + '%';

    const newMsgIdx = Math.floor((progressVal / 100) * (statusMessages.length - 1));
    if (newMsgIdx !== msgIdx) {
      msgIdx = newMsgIdx;
      if (status) {
        status.style.opacity = '0';
        setTimeout(() => {
          status.textContent = statusMessages[msgIdx];
          status.style.opacity = '1';
          status.style.transition = 'opacity 0.3s';
        }, 150);
      }
    }

    if (progressVal >= 100) {
      clearInterval(interval);
      if (status) status.textContent = 'SYSTEM READY';

      setTimeout(() => {
        ready.classList.add('show');
        setTimeout(() => launchMainApp(loaderParticles), 900);
      }, 300);
    }
  }, 80);
}

// ============================================================
// LAUNCH MAIN APP
// ============================================================
function launchMainApp(loaderParticles) {
  const loader = document.getElementById('loading-screen');
  const app    = document.getElementById('main-app');

  loader.style.transition = 'opacity 0.8s ease';
  loader.style.opacity = '0';

  setTimeout(() => {
    loader.style.display = 'none';
    loaderParticles && loaderParticles.stop();

    app.classList.remove('hidden');
    app.style.opacity = '0';
    app.style.transition = 'opacity 0.8s ease';
    requestAnimationFrame(() => {
      app.style.opacity = '1';
      initMainApp();
    });
  }, 800);
}

// ============================================================
// MAIN APP INITIALIZATION
// ============================================================
function initMainApp() {
  // Particles
  const mainParticles = new ParticleSystem('particle-canvas-main', {
    count: 50, color: '0,212,255', speed: 0.15
  });
  mainParticles.start();

  // Clock
  updateClock();
  setInterval(updateClock, 1000);

  // Navigation
  initNavigation();

  // Charts
  initCharts();

  // Counter animations
  animateCounters();

  // Sidebar toggle
  document.getElementById('sidebar-toggle')?.addEventListener('click', toggleSidebar);

  // Live data updates
  setInterval(liveDataUpdate, 4000);
}

// ============================================================
// CLOCK
// ============================================================
function updateClock() {
  const el = document.getElementById('top-time');
  if (!el) return;
  const now = new Date();
  const h = String(now.getHours()).padStart(2,'0');
  const m = String(now.getMinutes()).padStart(2,'0');
  const s = String(now.getSeconds()).padStart(2,'0');
  el.textContent = `${h}:${m}:${s}`;
}

// ============================================================
// NAVIGATION
// ============================================================
function initNavigation() {
  const navItems = document.querySelectorAll('.nav-item[data-section]');
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const section = item.dataset.section;
      switchSection(section);

      navItems.forEach(n => n.classList.remove('active'));
      item.classList.add('active');

      const label = item.querySelector('.nav-label');
      const current = document.getElementById('current-section');
      if (current && label) current.textContent = label.textContent.toUpperCase();
    });
  });
}

function switchSection(name) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(`section-${name}`);
  if (target) {
    target.classList.add('active');
    if (name === 'analytics') initAnalyticsSection();
    if (name === 'agents') reinitAgentCards();
  }
}

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;
  sidebar.style.transform = sidebar.style.transform === 'translateX(-220px)' 
    ? 'translateX(0)' : 'translateX(-220px)';
}

// ============================================================
// CHARTS
// ============================================================
function initCharts() {
  initProductivityRing();
  initPerformanceChart();
  initContributorChart();
}

// PRODUCTIVITY RING (custom canvas)
function initProductivityRing() {
  const canvas = document.getElementById('productivity-ring');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = 240, H = 240, cx = 120, cy = 120, r = 95;
  let progress = 0;
  const target = 87;

  function draw(val) {
    ctx.clearRect(0, 0, W, H);
    const startAngle = -Math.PI / 2;
    const fullAngle  = startAngle + (val / 100) * 2 * Math.PI;

    // Background track
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(0,212,255,0.08)';
    ctx.lineWidth = 14;
    ctx.stroke();

    // Outer glow ring
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(0,255,156,0.04)';
    ctx.lineWidth = 22;
    ctx.stroke();

    // Tick marks
    for (let i = 0; i < 60; i++) {
      const angle = (i / 60) * 2 * Math.PI - Math.PI / 2;
      const isMajor = i % 5 === 0;
      const r1 = r + 8, r2 = r + (isMajor ? 14 : 10);
      ctx.beginPath();
      ctx.moveTo(cx + r1 * Math.cos(angle), cy + r1 * Math.sin(angle));
      ctx.lineTo(cx + r2 * Math.cos(angle), cy + r2 * Math.sin(angle));
      ctx.strokeStyle = isMajor ? 'rgba(0,212,255,0.4)' : 'rgba(0,212,255,0.15)';
      ctx.lineWidth = isMajor ? 1.5 : 0.8;
      ctx.stroke();
    }

    // Gradient arc
    const grad = ctx.createLinearGradient(cx - r, cy, cx + r, cy);
    grad.addColorStop(0,   '#00D4FF');
    grad.addColorStop(0.5, '#00FF9C');
    grad.addColorStop(1,   '#7C6CFF');

    ctx.beginPath();
    ctx.arc(cx, cy, r, startAngle, fullAngle);
    ctx.strokeStyle = grad;
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.shadowColor = '#00FF9C';
    ctx.shadowBlur = 20;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Endpoint dot
    ctx.beginPath();
    ctx.arc(
      cx + r * Math.cos(fullAngle),
      cy + r * Math.sin(fullAngle),
      8, 0, 2 * Math.PI
    );
    ctx.fillStyle = '#00FF9C';
    ctx.shadowColor = '#00FF9C';
    ctx.shadowBlur = 16;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Segment markers
    const markers = [25, 50, 75];
    markers.forEach(m => {
      const a = startAngle + (m / 100) * 2 * Math.PI;
      ctx.beginPath();
      ctx.arc(cx + r * Math.cos(a), cy + r * Math.sin(a), 4, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(0,212,255,0.4)';
      ctx.fill();
    });
  }

  // Animate counter
  const dispEl = document.getElementById('prod-display');
  const animInterval = setInterval(() => {
    progress += 1.2;
    if (progress >= target) { progress = target; clearInterval(animInterval); }
    draw(progress);
    if (dispEl) dispEl.innerHTML = `${Math.floor(progress)}<span>%</span>`;
  }, 20);
}

// PERFORMANCE LINE CHART
function initPerformanceChart() {
  const canvas = document.getElementById('performance-chart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const dataA = [45, 70, 95, 80, 120, 145, 170];
  const dataB = [30, 50, 65, 90, 75, 110, 140];

  new Chart(ctx, {
    type: 'line',
    data: {
      labels: days,
      datasets: [
        {
          label: 'Metrics A',
          data: dataA,
          borderColor: '#00FF9C',
          backgroundColor: 'rgba(0,255,156,0.08)',
          borderWidth: 2.5,
          pointBackgroundColor: '#00FF9C',
          pointBorderColor: '#0B0F14',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 8,
          tension: 0.4,
          fill: true,
        },
        {
          label: 'Metrics B',
          data: dataB,
          borderColor: '#7C6CFF',
          backgroundColor: 'rgba(124,108,255,0.08)',
          borderWidth: 2.5,
          pointBackgroundColor: '#7C6CFF',
          pointBorderColor: '#0B0F14',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 8,
          tension: 0.4,
          fill: true,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 1500, easing: 'easeInOutQuart' },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(10,15,22,0.95)',
          borderColor: 'rgba(0,212,255,0.3)',
          borderWidth: 1,
          titleFont: { family: 'Orbitron', size: 10 },
          bodyFont: { family: 'Share Tech Mono', size: 11 },
          titleColor: '#00D4FF',
          bodyColor: '#E8F4FF',
          padding: 10,
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(0,212,255,0.05)', drawBorder: false },
          ticks: { color: 'rgba(255,255,255,0.3)', font: { family: 'Share Tech Mono', size: 10 } }
        },
        y: {
          grid: { color: 'rgba(0,212,255,0.05)', drawBorder: false },
          ticks: { color: 'rgba(255,255,255,0.3)', font: { family: 'Share Tech Mono', size: 10 } },
          beginAtZero: true,
        }
      }
    }
  });
}

// CONTRIBUTOR BAR CHART
function initContributorChart() {
  const canvas = document.getElementById('contributor-chart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Agent Alpha', 'Beta', 'Gamma', 'Delta'],
      datasets: [
        {
          label: 'Output',
          data: [85, 72, 90, 58],
          backgroundColor: 'rgba(0,255,156,0.7)',
          borderColor: '#00FF9C',
          borderWidth: 1,
          borderRadius: 4,
          borderSkipped: false,
        },
        {
          label: 'Efficiency',
          data: [70, 65, 78, 52],
          backgroundColor: 'rgba(124,108,255,0.7)',
          borderColor: '#7C6CFF',
          borderWidth: 1,
          borderRadius: 4,
          borderSkipped: false,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 1200, easing: 'easeOutBounce' },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(10,15,22,0.95)',
          borderColor: 'rgba(0,212,255,0.3)',
          borderWidth: 1,
          titleFont: { family: 'Orbitron', size: 10 },
          bodyFont: { family: 'Share Tech Mono', size: 11 },
          titleColor: '#00D4FF',
          bodyColor: '#E8F4FF',
          padding: 10,
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: 'rgba(255,255,255,0.3)', font: { family: 'Share Tech Mono', size: 10 } }
        },
        y: {
          grid: { color: 'rgba(0,212,255,0.05)', drawBorder: false },
          ticks: { color: 'rgba(255,255,255,0.3)', font: { family: 'Share Tech Mono', size: 10 } },
          beginAtZero: true, max: 100,
        }
      }
    }
  });
}

// RADAR + DOUGHNUT for Analytics section
function initAnalyticsSection() {
  if (document.getElementById('radar-chart').__chartInitialized) return;
  document.getElementById('radar-chart').__chartInitialized = true;

  // Heatmap
  const heatmap = document.getElementById('analytics-heatmap');
  if (heatmap && heatmap.children.length === 0) {
    const days = ['MON','TUE','WED','THU','FRI','SAT','SUN'];
    const colors = ['#00FF9C','#00D4FF','#7C6CFF','#FF4C4C'];
    days.forEach((d, i) => {
      const val = Math.floor(Math.random() * 100);
      const color = colors[Math.floor(val / 25)];
      const cell = document.createElement('div');
      cell.style.background = `rgba(${hexToRgb(color)},${0.1 + val/200})`;
      cell.style.border = `1px solid rgba(${hexToRgb(color)},0.3)`;
      cell.innerHTML = `<span style="color:${color};font-family:Orbitron;font-size:0.55rem;letter-spacing:1px">${d}</span><span style="color:${color};font-family:Orbitron;font-size:0.9rem;font-weight:700">${val}%</span>`;
      heatmap.appendChild(cell);
    });
  }

  // Radar
  const radarCanvas = document.getElementById('radar-chart');
  if (radarCanvas) {
    new Chart(radarCanvas.getContext('2d'), {
      type: 'radar',
      data: {
        labels: ['Strategy','Analysis','Optimization','Risk Mgmt','Speed','Accuracy'],
        datasets: [{
          label: 'Performance',
          data: [88, 92, 78, 85, 94, 91],
          borderColor: '#00FF9C',
          backgroundColor: 'rgba(0,255,156,0.1)',
          borderWidth: 2,
          pointBackgroundColor: '#00FF9C',
          pointRadius: 4,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          r: {
            grid: { color: 'rgba(0,212,255,0.1)' },
            angleLines: { color: 'rgba(0,212,255,0.1)' },
            pointLabels: { color: 'rgba(255,255,255,0.5)', font: { family: 'Share Tech Mono', size: 10 } },
            ticks: { display: false },
            suggestedMin: 0, suggestedMax: 100,
          }
        }
      }
    });
  }

  // Doughnut
  const doughnutCanvas = document.getElementById('doughnut-chart');
  if (doughnutCanvas) {
    new Chart(doughnutCanvas.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: ['Strategist','Analyst','Optimizer','Risk Mgr'],
        datasets: [{
          data: [27, 23, 30, 20],
          backgroundColor: ['rgba(124,108,255,0.7)','rgba(0,255,156,0.7)','rgba(0,212,255,0.7)','rgba(255,76,76,0.7)'],
          borderColor: ['#7C6CFF','#00FF9C','#00D4FF','#FF4C4C'],
          borderWidth: 2,
          hoverOffset: 8,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        cutout: '70%',
        plugins: {
          legend: {
            display: true,
            position: 'bottom',
            labels: {
              color: 'rgba(255,255,255,0.5)',
              font: { family: 'Share Tech Mono', size: 10 },
              padding: 12,
              boxWidth: 10,
            }
          },
          tooltip: {
            backgroundColor: 'rgba(10,15,22,0.95)',
            borderColor: 'rgba(0,212,255,0.3)',
            borderWidth: 1,
            titleFont: { family: 'Orbitron', size: 10 },
            bodyFont: { family: 'Share Tech Mono', size: 11 },
            titleColor: '#00D4FF', bodyColor: '#E8F4FF',
          }
        }
      }
    });
  }
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `${r},${g},${b}`;
}

// ============================================================
// COUNTER ANIMATIONS
// ============================================================
function animateCounters() {
  animateNumber('mc-tasks-val', 0, 1245, 1500);
  animateNumber('mc-load-val', 0, 34, 1200);
  animateNumber('mc-errors-val', 0, 12, 1000);
}

function animateNumber(id, from, to, duration) {
  const el = document.getElementById(id);
  if (!el) return;
  const start = performance.now();
  const inner = el.innerHTML.replace(/\d+/, '').replace(/<span.*?<\/span>/, '');

  requestAnimationFrame(function step(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    const val = Math.floor(from + (to - from) * ease);
    el.innerHTML = val.toLocaleString() + inner;
    if (progress < 1) requestAnimationFrame(step);
  });
}

// ============================================================
// LIVE DATA UPDATES
// ============================================================
function liveDataUpdate() {
  // Random fluctuations for realism
  const agents = document.querySelectorAll('.agent-progress');
  agents.forEach(bar => {
    const current = parseFloat(bar.style.width);
    const delta = (Math.random() - 0.5) * 6;
    const newVal = Math.max(30, Math.min(99, current + delta));
    bar.style.width = newVal + '%';

    // Update score display
    const scoreEl = bar.closest('.agent-status-item')?.querySelector('.agent-score');
    if (scoreEl) scoreEl.textContent = Math.floor(newVal) + '%';
  });

  // Flicker system status bars
  document.querySelectorAll('.ss-bar').forEach(bar => {
    const current = parseFloat(bar.style.width);
    if (current < 100) {
      const delta = (Math.random() - 0.5) * 4;
      bar.style.width = Math.max(20, Math.min(100, current + delta)) + '%';
    }
  });

  // Update tasks count randomly
  const tasksEl = document.getElementById('mc-tasks-val');
  if (tasksEl) {
    const current = parseInt(tasksEl.textContent.replace(',',''));
    if (!isNaN(current)) {
      tasksEl.textContent = (current + Math.floor(Math.random() * 3)).toLocaleString();
    }
  }
}

// ============================================================
// AGENT DETAIL PANEL
// ============================================================
const agentData = {
  strategist: {
    num: '01',
    name: 'PROJECT STRATEGIST',
    color: '#7C6CFF',
    colorRgb: '124,108,255',
    icon: 'fas fa-chess-king',
    status: 'ANALYZING',
    statusClass: 'status-analyzing',
    role: 'Strategic Planning & Mission Architecture',
    description: 'The Project Strategist is the master orchestrator of AI operations. It analyzes project requirements, designs execution blueprints, and coordinates multi-agent workflows to maximize mission success rates.',
    metrics: [
      { label: 'Tasks Completed', value: '342', icon: 'fas fa-check-double' },
      { label: 'Success Rate', value: '94%', icon: 'fas fa-bullseye' },
      { label: 'Avg Latency', value: '2.1s', icon: 'fas fa-bolt' },
      { label: 'Decisions Made', value: '1,204', icon: 'fas fa-brain' },
    ],
    capabilities: ['Mission Architecture', 'Resource Planning', 'Timeline Optimization', 'Risk Assessment', 'Cross-Agent Coordination'],
    logs: [
      { time: '14:32:18', msg: 'Strategic plan updated for Project Phoenix', type: 'info' },
      { time: '14:28:44', msg: 'Reallocating resources from Sector 3 to 7', type: 'action' },
      { time: '14:22:01', msg: 'Analyzing 14 competing objectives', type: 'analysis' },
      { time: '14:15:33', msg: 'Mission confidence score: 94%', type: 'success' },
    ]
  },
  analyst: {
    num: '02',
    name: 'PRODUCTIVITY ANALYST',
    color: '#00FF9C',
    colorRgb: '0,255,156',
    icon: 'fas fa-eye',
    status: 'ACTIVE',
    statusClass: 'status-active',
    role: 'Data Analysis & Performance Intelligence',
    description: 'The Productivity Analyst continuously monitors all data streams, processes performance metrics in real-time, and delivers actionable intelligence to optimize workforce output and system efficiency.',
    metrics: [
      { label: 'Tasks Completed', value: '289', icon: 'fas fa-check-double' },
      { label: 'Success Rate', value: '97%', icon: 'fas fa-bullseye' },
      { label: 'Avg Latency', value: '0.8s', icon: 'fas fa-bolt' },
      { label: 'Reports Gen.', value: '2,847', icon: 'fas fa-file-alt' },
    ],
    capabilities: ['Real-time Analytics', 'Pattern Recognition', 'Predictive Modeling', 'KPI Tracking', 'Anomaly Detection'],
    logs: [
      { time: '14:33:02', msg: 'Productivity peak detected — 97% efficiency', type: 'success' },
      { time: '14:29:17', msg: 'Generating weekly performance digest', type: 'action' },
      { time: '14:24:55', msg: 'Anomaly detected in Pipeline B — monitoring', type: 'warning' },
      { time: '14:18:22', msg: 'Data streams synchronized across 6 nodes', type: 'info' },
    ]
  },
  optimizer: {
    num: '03',
    name: 'RESOURCE OPTIMIZER',
    color: '#00D4FF',
    colorRgb: '0,212,255',
    icon: 'fas fa-cube',
    status: 'ACTIVE',
    statusClass: 'status-active',
    role: 'Resource Allocation & System Efficiency',
    description: 'The Resource Optimizer manages computational resources, balances workloads across the neural network, and continuously refines allocation algorithms to minimize waste and maximize throughput.',
    metrics: [
      { label: 'Tasks Completed', value: '378', icon: 'fas fa-check-double' },
      { label: 'Success Rate', value: '91%', icon: 'fas fa-bullseye' },
      { label: 'Avg Latency', value: '1.4s', icon: 'fas fa-bolt' },
      { label: 'Resources Saved', value: '34%', icon: 'fas fa-leaf' },
    ],
    capabilities: ['Load Balancing', 'Memory Optimization', 'Process Scheduling', 'Cache Management', 'Bottleneck Resolution'],
    logs: [
      { time: '14:32:45', msg: 'Load balanced across 8 neural processors', type: 'action' },
      { time: '14:27:30', msg: 'Cache hit rate improved to 89.3%', type: 'success' },
      { time: '14:21:14', msg: 'Bottleneck identified in Node 4 — resolving', type: 'warning' },
      { time: '14:16:58', msg: 'Resource allocation optimized — 34% reduction', type: 'success' },
    ]
  },
  risk: {
    num: '04',
    name: 'RISK MANAGER',
    color: '#FF4C4C',
    colorRgb: '255,76,76',
    icon: 'fas fa-shield-alt',
    status: 'ALERT',
    statusClass: 'status-alert',
    role: 'Threat Detection & Risk Mitigation',
    description: 'The Risk Manager operates as the system\'s defense layer, continuously scanning for threats, vulnerabilities, and operational risks. It initiates countermeasures and coordinates emergency protocols when critical thresholds are breached.',
    metrics: [
      { label: 'Tasks Completed', value: '236', icon: 'fas fa-check-double' },
      { label: 'Success Rate', value: '88%', icon: 'fas fa-bullseye' },
      { label: 'Avg Latency', value: '3.2s', icon: 'fas fa-bolt' },
      { label: 'Threats Blocked', value: '1,102', icon: 'fas fa-ban' },
    ],
    capabilities: ['Threat Detection', 'Vulnerability Scanning', 'Risk Scoring', 'Emergency Protocols', 'Compliance Monitoring'],
    logs: [
      { time: '14:33:11', msg: '⚠ Anomalous pattern detected — ALERT ACTIVE', type: 'alert' },
      { time: '14:30:22', msg: 'Vulnerability scan in progress — Sector 2', type: 'warning' },
      { time: '14:25:44', msg: 'Countermeasure deployed against vector X-7', type: 'action' },
      { time: '14:19:03', msg: 'Risk score elevated: 73/100 — monitoring', type: 'warning' },
    ]
  }
};

function openAgentPanel(type) {
  const data = agentData[type];
  if (!data) return;

  const overlay = document.getElementById('agent-overlay');
  const panel   = document.getElementById('agent-detail-panel');
  const content = document.getElementById('agent-detail-content');

  const logTypeMap = {
    info: { color: '#00D4FF', icon: 'fas fa-info-circle' },
    action: { color: '#7C6CFF', icon: 'fas fa-play-circle' },
    analysis: { color: '#00FF9C', icon: 'fas fa-chart-line' },
    success: { color: '#00FF9C', icon: 'fas fa-check-circle' },
    warning: { color: '#FF8C00', icon: 'fas fa-exclamation-circle' },
    alert: { color: '#FF4C4C', icon: 'fas fa-exclamation-triangle' },
  };

  const logsHtml = data.logs.map(log => {
    const t = logTypeMap[log.type] || logTypeMap.info;
    return `<div style="display:flex;align-items:flex-start;gap:10px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
      <i class="${t.icon}" style="color:${t.color};font-size:0.75rem;margin-top:2px;flex-shrink:0"></i>
      <span style="font-family:'Share Tech Mono',monospace;font-size:0.65rem;color:rgba(255,255,255,0.4);flex-shrink:0">${log.time}</span>
      <span style="font-family:'Rajdhani',sans-serif;font-size:0.8rem;color:rgba(255,255,255,0.75)">${log.msg}</span>
    </div>`;
  }).join('');

  const capHtml = data.capabilities.map(cap =>
    `<span style="display:inline-block;padding:4px 10px;border-radius:20px;background:rgba(${data.colorRgb},0.1);border:1px solid rgba(${data.colorRgb},0.3);color:${data.color};font-family:'Share Tech Mono',monospace;font-size:0.62rem;letter-spacing:1px;margin:3px">${cap}</span>`
  ).join('');

  const metricsHtml = data.metrics.map(m =>
    `<div style="text-align:center;padding:16px;background:rgba(${data.colorRgb},0.05);border:1px solid rgba(${data.colorRgb},0.15);border-radius:8px">
      <i class="${m.icon}" style="color:${data.color};font-size:1.2rem;display:block;margin-bottom:8px"></i>
      <div style="font-family:Orbitron,sans-serif;font-size:1.1rem;font-weight:700;color:${data.color}">${m.value}</div>
      <div style="font-family:'Share Tech Mono',monospace;font-size:0.6rem;color:rgba(255,255,255,0.4);margin-top:4px">${m.label}</div>
    </div>`
  ).join('');

  content.innerHTML = `
    <div style="border:1px solid rgba(${data.colorRgb},0.3);border-radius:16px;padding:24px;margin-bottom:20px;background:rgba(${data.colorRgb},0.03)">
      <div style="display:flex;align-items:center;gap:16px;margin-bottom:16px">
        <div style="width:60px;height:60px;border-radius:12px;background:rgba(${data.colorRgb},0.15);border:1px solid rgba(${data.colorRgb},0.4);display:flex;align-items:center;justify-content:center;font-size:1.8rem;color:${data.color};box-shadow:0 0 20px rgba(${data.colorRgb},0.3)">
          <i class="${data.icon}"></i>
        </div>
        <div>
          <div style="font-family:Orbitron,sans-serif;font-size:0.6rem;letter-spacing:2px;color:rgba(255,255,255,0.3)">AGENT #${data.num}</div>
          <div style="font-family:Orbitron,sans-serif;font-size:1.1rem;font-weight:700;color:${data.color};letter-spacing:2px">${data.name}</div>
          <div style="font-family:'Share Tech Mono',monospace;font-size:0.65rem;color:rgba(255,255,255,0.4);margin-top:4px">${data.role}</div>
        </div>
        <span class="agent-status-badge ${data.statusClass}" style="margin-left:auto">● ${data.status}</span>
      </div>
      <p style="font-family:Rajdhani,sans-serif;font-size:0.9rem;color:rgba(255,255,255,0.6);line-height:1.6">${data.description}</p>
    </div>

    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px">
      ${metricsHtml}
    </div>

    <div style="margin-bottom:20px">
      <div style="font-family:Orbitron,sans-serif;font-size:0.6rem;letter-spacing:2px;color:rgba(255,255,255,0.3);margin-bottom:10px">CAPABILITIES</div>
      <div>${capHtml}</div>
    </div>

    <div>
      <div style="font-family:Orbitron,sans-serif;font-size:0.6rem;letter-spacing:2px;color:rgba(255,255,255,0.3);margin-bottom:10px">ACTIVITY LOG</div>
      <div style="background:rgba(0,0,0,0.3);border-radius:8px;padding:12px;border:1px solid rgba(255,255,255,0.05)">
        ${logsHtml}
      </div>
    </div>
  `;

  // Set panel border color
  panel.style.borderColor = `rgba(${data.colorRgb},0.4)`;
  panel.style.boxShadow   = `0 0 40px rgba(${data.colorRgb},0.2)`;

  overlay.classList.add('open');
}

function closeAgentPanel() {
  document.getElementById('agent-overlay').classList.remove('open');
}

function reinitAgentCards() {
  // Re-trigger CSS animations by force-reflow
  document.querySelectorAll('.agent-card').forEach((card, i) => {
    card.style.animation = 'none';
    card.style.opacity = '0';
    card.style.transform = 'translateY(30px)';
    setTimeout(() => {
      card.style.transition = `all 0.6s cubic-bezier(0.34,1.56,0.64,1) ${i * 0.15}s`;
      card.style.opacity = '1';
      card.style.transform = 'translateY(0)';
      setTimeout(() => {
        card.style.animation = `cardFloat 4s ease-in-out ${i}s infinite`;
        card.style.transition = '';
      }, 600 + i * 150);
    }, 50);
  });
}

// ============================================================
// KEYBOARD SHORTCUTS
// ============================================================
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeAgentPanel();
});

// ============================================================
// START
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  runLoadingSequence();
});
