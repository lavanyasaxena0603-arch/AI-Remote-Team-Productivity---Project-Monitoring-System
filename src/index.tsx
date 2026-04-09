import { Hono } from 'hono'
import { serveStatic } from 'hono/cloudflare-workers'

const FLASK_BASE = 'http://127.0.0.1:5000'

const app = new Hono()

app.use('/static/*', serveStatic({ root: './public' }))

// ── Flask Proxy ────────────────────────────────────────────────
// All /flask/* requests are proxied server-side to Flask on :5000.
// Because the browser talks to the SAME origin (port 3000), there are
// no CORS or mixed-content issues regardless of HTTP/HTTPS.
app.all('/flask/*', async (c) => {
  const url    = new URL(c.req.url)
  // Strip leading /flask prefix to get the real Flask path
  const path   = url.pathname.slice('/flask'.length) + (url.search || '')
  const target = FLASK_BASE + path

  try {
    const reqHeaders = new Headers()

    // Forward Content-Type so Flask can parse JSON bodies
    const ct = c.req.header('content-type')
    if (ct) reqHeaders.set('content-type', ct)

    // Forward browser cookies upstream so Flask sessions work
    const cookie = c.req.header('cookie')
    if (cookie) reqHeaders.set('cookie', cookie)

    // Read body for non-GET methods
    const body = ['GET', 'HEAD', 'OPTIONS'].includes(c.req.method.toUpperCase())
      ? undefined
      : await c.req.arrayBuffer()

    const upstream = await fetch(target, {
      method:  c.req.method,
      headers: reqHeaders,
      body,
    })

    // Build response headers — pass Set-Cookie back so sessions persist
    const resHeaders = new Headers()
    const contentType = upstream.headers.get('content-type') || 'application/json'
    resHeaders.set('content-type', contentType)

    // Forward ALL Set-Cookie headers — rewrite attributes so cookie works
    // on the HTTPS sandbox domain (SameSite=None;Secure) AND on plain HTTP
    // (SameSite=Lax). Remove Domain so the browser scope stays on this host.
    upstream.headers.forEach((val, key) => {
      if (key.toLowerCase() === 'set-cookie') {
        let rewritten = val
          // Remove any Domain= directive (Flask sets it to 127.0.0.1)
          .replace(/;\s*Domain=[^;]*/gi, '')
          // Upgrade SameSite to None so the cookie survives the HTTPS proxy
          .replace(/;\s*SameSite=\w+/gi, '; SameSite=None')
        // Add Secure flag required by SameSite=None
        if (!/;\s*Secure/i.test(rewritten)) {
          rewritten += '; Secure'
        }
        resHeaders.append('set-cookie', rewritten)
      }
    })

    const data = await upstream.arrayBuffer()
    return new Response(data, {
      status:  upstream.status,
      headers: resHeaders,
    })
  } catch (e: unknown) {
    const msg = 'Flask proxy error: ' + (e instanceof Error ? e.message : String(e))
    return c.json({ success: false, error: msg, message: msg }, 502)
  }
})

// Silence favicon 404
app.get('/favicon.ico', (c) => c.body(null, 204))

app.get('/api/metrics', (c) => {
  return c.json({
    productivity: 87,
    tasksCompleted: 1245,
    avgResponseTime: '1.5 MIN',
    systemLoad: 34,
    errorsResolved: 12,
    agents: [
      { id: 1, name: 'Agent Alpha', status: 'active', color: '#00FF9C', tasks: 342 },
      { id: 2, name: 'Agent Beta', status: 'active', color: '#7C6CFF', tasks: 289 },
      { id: 3, name: 'Agent Gamma', status: 'analyzing', color: '#00D4FF', tasks: 378 },
      { id: 4, name: 'Agent Delta', status: 'alert', color: '#FF4C4C', tasks: 236 },
    ],
    performanceData: [45, 70, 95, 80, 120, 145, 170],
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  })
})

app.get('/', (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>AI Command Center</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;700;900&family=Rajdhani:wght@300;400;500;600;700&family=Share+Tech+Mono&display=swap" rel="stylesheet" />
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet" />
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <link rel="stylesheet" href="/static/styles.css" />
</head>
<body>

<!-- ============================================================ -->
<!-- LOADING SCREEN -->
<!-- ============================================================ -->
<div id="loading-screen">
  <canvas id="particle-canvas-loader"></canvas>
  
  <div class="loader-content">
    <div class="loader-top-text">NEURAL NETWORK INTERFACE v4.2.1</div>
    
    <div class="neural-brain-container">
      <div class="brain-outer-ring"></div>
      <div class="brain-middle-ring"></div>
      <div class="brain-inner-ring"></div>
      <div class="brain-core">
        <svg viewBox="0 0 120 120" class="brain-svg">
          <defs>
            <filter id="glow-brain">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>
          <!-- Brain nodes -->
          <circle cx="60" cy="30" r="5" class="brain-node node-0" filter="url(#glow-brain)"/>
          <circle cx="35" cy="50" r="4" class="brain-node node-1" filter="url(#glow-brain)"/>
          <circle cx="85" cy="50" r="4" class="brain-node node-2" filter="url(#glow-brain)"/>
          <circle cx="25" cy="75" r="4" class="brain-node node-3" filter="url(#glow-brain)"/>
          <circle cx="60" cy="70" r="6" class="brain-node node-4" filter="url(#glow-brain)"/>
          <circle cx="95" cy="75" r="4" class="brain-node node-5" filter="url(#glow-brain)"/>
          <circle cx="45" cy="95" r="3" class="brain-node node-6" filter="url(#glow-brain)"/>
          <circle cx="75" cy="95" r="3" class="brain-node node-7" filter="url(#glow-brain)"/>
          <!-- Neural connections -->
          <line x1="60" y1="30" x2="35" y2="50" class="neural-line"/>
          <line x1="60" y1="30" x2="85" y2="50" class="neural-line"/>
          <line x1="35" y1="50" x2="25" y2="75" class="neural-line"/>
          <line x1="35" y1="50" x2="60" y2="70" class="neural-line"/>
          <line x1="85" y1="50" x2="95" y2="75" class="neural-line"/>
          <line x1="85" y1="50" x2="60" y2="70" class="neural-line"/>
          <line x1="25" y1="75" x2="45" y2="95" class="neural-line"/>
          <line x1="60" y1="70" x2="45" y2="95" class="neural-line"/>
          <line x1="60" y1="70" x2="75" y2="95" class="neural-line"/>
          <line x1="95" y1="75" x2="75" y2="95" class="neural-line"/>
          <line x1="60" y1="30" x2="60" y2="70" class="neural-line"/>
        </svg>
      </div>
    </div>

    <div class="loader-title" id="loader-main-title">INITIALIZING AI WORKFORCE</div>
    
    <div class="agents-activation-row">
      <div class="agent-activation-item" id="agent-load-0">
        <div class="agent-load-icon strategist">
          <i class="fas fa-chess-king"></i>
          <div class="agent-load-ring"></div>
        </div>
        <div class="agent-load-name">STRATEGIST</div>
        <div class="agent-load-status">STANDBY</div>
      </div>
      <div class="agent-activation-item" id="agent-load-1">
        <div class="agent-load-icon analyst">
          <i class="fas fa-chart-line"></i>
          <div class="agent-load-ring"></div>
        </div>
        <div class="agent-load-name">ANALYST</div>
        <div class="agent-load-status">STANDBY</div>
      </div>
      <div class="agent-activation-item" id="agent-load-2">
        <div class="agent-load-icon optimizer">
          <i class="fas fa-cube"></i>
          <div class="agent-load-ring"></div>
        </div>
        <div class="agent-load-name">OPTIMIZER</div>
        <div class="agent-load-status">STANDBY</div>
      </div>
      <div class="agent-activation-item" id="agent-load-3">
        <div class="agent-load-icon risk-mgr">
          <i class="fas fa-shield-alt"></i>
          <div class="agent-load-ring"></div>
        </div>
        <div class="agent-load-name">RISK MGR</div>
        <div class="agent-load-status">STANDBY</div>
      </div>
    </div>

    <svg id="neural-connections-svg" viewBox="0 0 600 80"></svg>

    <div class="loader-progress-container">
      <div class="loader-status-text" id="loader-status">Booting Core Systems...</div>
      <div class="loader-bar-wrap">
        <div class="loader-bar" id="loader-bar"></div>
        <div class="loader-bar-glow"></div>
      </div>
      <div class="loader-percent" id="loader-percent">0%</div>
    </div>

    <div class="system-ready-text" id="system-ready">◈ SYSTEM READY ◈</div>
  </div>
</div>

<!-- ============================================================ -->
<!-- MAIN APP -->
<!-- ============================================================ -->
<div id="main-app" class="hidden">
  <canvas id="particle-canvas-main"></canvas>

  <!-- SIDEBAR -->
  <aside class="sidebar" id="sidebar">
    <div class="sidebar-logo">
      <div class="logo-icon">
        <i class="fas fa-brain"></i>
        <div class="logo-pulse"></div>
      </div>
      <div class="logo-text">
        <span class="logo-ai">AI</span>
        <span class="logo-cc">COMMAND</span>
      </div>
    </div>

    <nav class="sidebar-nav">
      <a href="#dashboard" class="nav-item active" data-section="dashboard">
        <span class="nav-icon"><i class="fas fa-th-large"></i></span>
        <span class="nav-label">Dashboard</span>
        <span class="nav-indicator"></span>
      </a>
      <a href="#team" class="nav-item" data-section="team">
        <span class="nav-icon"><i class="fas fa-users"></i></span>
        <span class="nav-label">Team Monitoring</span>
        <span class="nav-indicator"></span>
      </a>
      <a href="#analytics" class="nav-item" data-section="analytics">
        <span class="nav-icon"><i class="fas fa-chart-bar"></i></span>
        <span class="nav-label">Analytics</span>
        <span class="nav-indicator"></span>
      </a>
      <a href="#agents" class="nav-item" data-section="agents">
        <span class="nav-icon"><i class="fas fa-robot"></i></span>
        <span class="nav-label">AI Agents</span>
        <span class="nav-indicator"></span>
        <span class="nav-badge">4</span>
      </a>
      <a href="#projects" class="nav-item" data-section="projects">
        <span class="nav-icon"><i class="fas fa-project-diagram"></i></span>
        <span class="nav-label">Projects</span>
        <span class="nav-indicator"></span>
      </a>
      <a href="#notifications" class="nav-item" data-section="notifications">
        <span class="nav-icon"><i class="fas fa-bell"></i></span>
        <span class="nav-label">Alerts</span>
        <span class="nav-indicator"></span>
        <span class="nav-badge alert-badge" id="nav-alert-badge" style="background:var(--red)">0</span>
      </a>
      <a href="#profile" class="nav-item" data-section="profile">
        <span class="nav-icon"><i class="fas fa-user-circle"></i></span>
        <span class="nav-label">Profile</span>
        <span class="nav-indicator"></span>
      </a>
      <a href="#about" class="nav-item" data-section="about">
        <span class="nav-icon"><i class="fas fa-info-circle"></i></span>
        <span class="nav-label">About</span>
        <span class="nav-indicator"></span>
      </a>
    </nav>

    <div class="sidebar-bottom">
      <div class="system-status-mini">
        <div class="status-dot active-dot"></div>
        <span>System Online</span>
      </div>
      <div class="sidebar-user-mini" id="sidebar-user-mini" style="display:none">
        <div class="sui-avatar" id="sui-avatar"></div>
        <div class="sui-info">
          <div class="sui-name" id="sui-name">Commander</div>
          <div class="sui-role" id="sui-role">individual</div>
        </div>
      </div>
      <a class="nav-item logout-item" id="logout-btn" href="#">
        <span class="nav-icon"><i class="fas fa-sign-out-alt"></i></span>
        <span class="nav-label">Logout</span>
      </a>
    </div>
  </aside>

  <!-- MAIN CONTENT -->
  <main class="main-content">

    <!-- TOP BAR -->
    <header class="top-bar">
      <div class="top-bar-left">
        <button class="sidebar-toggle" id="sidebar-toggle">
          <i class="fas fa-bars"></i>
        </button>
        <div class="breadcrumb">
          <span class="breadcrumb-root">AI COMMAND CENTER</span>
          <span class="breadcrumb-sep">›</span>
          <span class="breadcrumb-current" id="current-section">DASHBOARD</span>
        </div>
      </div>
      <div class="top-bar-center">
        <div class="live-indicator">
          <span class="live-dot"></span>
          <span>LIVE</span>
        </div>
        <div class="top-time" id="top-time">00:00:00</div>
      </div>
      <div class="top-bar-right">
        <div class="top-search">
          <i class="fas fa-search"></i>
          <input type="text" placeholder="Search systems..." />
        </div>
        <button class="top-btn" title="Notifications" onclick="switchSection('notifications')" id="topbar-alerts-btn">
          <i class="fas fa-bell"></i>
          <span class="btn-badge" id="topbar-alert-count">0</span>
        </button>
        <button class="top-btn" title="Settings">
          <i class="fas fa-cog"></i>
        </button>
        <div class="top-avatar">
          <img src="https://api.dicebear.com/7.x/bottts/svg?seed=commander&backgroundColor=0B0F14" alt="Commander" />
          <div class="avatar-status"></div>
        </div>
      </div>
    </header>

    <!-- SECTIONS CONTAINER -->
    <div class="sections-container">

      <!-- ============================== -->
      <!-- DASHBOARD SECTION -->
      <!-- ============================== -->
      <section class="section active" id="section-dashboard">
        <div class="section-header">
          <h1 class="section-title">
            <i class="fas fa-th-large"></i>
            COMMAND CENTER
          </h1>
          <div class="section-subtitle">Real-time AI operations overview</div>
        </div>

        <div class="dashboard-grid">

          <!-- PRODUCTIVITY METER -->
          <div class="grid-item productivity-card glass-panel">
            <div class="panel-header">
              <span class="panel-label">PRODUCTIVITY INDEX</span>
              <span class="panel-badge green">OPTIMAL</span>
            </div>
            <div class="productivity-meter-container">
              <canvas id="productivity-ring" width="240" height="240"></canvas>
              <div class="productivity-center">
                <div class="prod-value" id="prod-display">0<span>%</span></div>
                <div class="prod-label">EFFICIENCY</div>
                <div class="prod-sublabel">↑ 12% vs last week</div>
              </div>
            </div>
            <div class="prod-metrics-row">
              <div class="prod-metric">
                <div class="pm-val green">1,245</div>
                <div class="pm-lbl">Tasks Done</div>
              </div>
              <div class="prod-metric">
                <div class="pm-val blue">1.5m</div>
                <div class="pm-lbl">Avg Time</div>
              </div>
              <div class="prod-metric">
                <div class="pm-val purple">99.9%</div>
                <div class="pm-lbl">Uptime</div>
              </div>
            </div>
          </div>

          <!-- ACTIVE AGENTS PANEL -->
          <div class="grid-item agents-status-card glass-panel">
            <div class="panel-header">
              <span class="panel-label">ACTIVE AGENTS</span>
              <span class="panel-badge green">4 ONLINE</span>
            </div>
            <div class="agents-list" id="agents-list">
              <div class="agent-status-item" data-color="#7C6CFF">
                <div class="agent-avatar strategist-mini">
                  <i class="fas fa-chess-king"></i>
                  <div class="agent-pulse"></div>
                </div>
                <div class="agent-info">
                  <div class="agent-name">Agent Alpha <span class="agent-tag">#7C6CFF</span></div>
                  <div class="agent-activity">Strategizing mission objectives</div>
                  <div class="agent-progress-bar">
                    <div class="agent-progress" style="width: 78%; background: #7C6CFF;"></div>
                  </div>
                </div>
                <div class="agent-score" style="color:#7C6CFF">78%</div>
              </div>
              <div class="agent-status-item" data-color="#00FF9C">
                <div class="agent-avatar analyst-mini">
                  <i class="fas fa-chart-line"></i>
                  <div class="agent-pulse"></div>
                </div>
                <div class="agent-info">
                  <div class="agent-name">Agent Beta <span class="agent-tag">#00FF9C</span></div>
                  <div class="agent-activity">Analyzing data streams</div>
                  <div class="agent-progress-bar">
                    <div class="agent-progress" style="width: 92%; background: #00FF9C;"></div>
                  </div>
                </div>
                <div class="agent-score" style="color:#00FF9C">92%</div>
              </div>
              <div class="agent-status-item" data-color="#00D4FF">
                <div class="agent-avatar optimizer-mini">
                  <i class="fas fa-cube"></i>
                  <div class="agent-pulse"></div>
                </div>
                <div class="agent-info">
                  <div class="agent-name">Agent Gamma <span class="agent-tag">#00D4FF</span></div>
                  <div class="agent-activity">Optimizing resource allocation</div>
                  <div class="agent-progress-bar">
                    <div class="agent-progress" style="width: 65%; background: #00D4FF;"></div>
                  </div>
                </div>
                <div class="agent-score" style="color:#00D4FF">65%</div>
              </div>
              <div class="agent-status-item" data-color="#FF4C4C">
                <div class="agent-avatar risk-mini">
                  <i class="fas fa-shield-alt"></i>
                  <div class="agent-pulse"></div>
                </div>
                <div class="agent-info">
                  <div class="agent-name">Agent Delta <span class="agent-tag">#FF4C4C</span></div>
                  <div class="agent-activity">Monitoring risk vectors</div>
                  <div class="agent-progress-bar">
                    <div class="agent-progress" style="width: 54%; background: #FF4C4C;"></div>
                  </div>
                </div>
                <div class="agent-score" style="color:#FF4C4C">54%</div>
              </div>
            </div>
          </div>

          <!-- TEAM PERFORMANCE LINE CHART -->
          <div class="grid-item performance-chart-card glass-panel">
            <div class="panel-header">
              <span class="panel-label">TEAM PERFORMANCE OVER TIME</span>
              <div class="chart-legend">
                <span class="legend-dot" style="background:#00FF9C"></span><span>Metrics A</span>
                <span class="legend-dot" style="background:#7C6CFF; margin-left:12px"></span><span>Metrics B</span>
              </div>
              <button class="panel-menu-btn"><i class="fas fa-ellipsis-h"></i></button>
            </div>
            <div class="chart-container">
              <canvas id="performance-chart"></canvas>
            </div>
          </div>

          <!-- METRIC CARDS ROW -->
          <div class="grid-item metrics-row">
            <div class="metric-card glass-panel green-card" id="mc-tasks">
              <div class="mc-icon"><i class="fas fa-check-circle"></i></div>
              <div class="mc-content">
                <div class="mc-label">TASKS COMPLETED</div>
                <div class="mc-value" id="mc-tasks-val">0</div>
                <div class="mc-trend"><i class="fas fa-arrow-up"></i> +8.3%</div>
              </div>
              <div class="mc-glow-bg"></div>
            </div>
            <div class="metric-card glass-panel blue-card" id="mc-time">
              <div class="mc-icon"><i class="fas fa-bolt"></i></div>
              <div class="mc-content">
                <div class="mc-label">AVG. RESPONSE TIME</div>
                <div class="mc-value">1.5 <span style="font-size:0.5em">MIN</span></div>
                <div class="mc-trend"><i class="fas fa-arrow-down"></i> -0.3m</div>
              </div>
              <div class="mc-glow-bg"></div>
            </div>
            <div class="metric-card glass-panel purple-card" id="mc-load">
              <div class="mc-icon"><i class="fas fa-microchip"></i></div>
              <div class="mc-content">
                <div class="mc-label">SYSTEM LOAD</div>
                <div class="mc-value" id="mc-load-val">0<span style="font-size:0.5em">%</span></div>
                <div class="mc-trend"><i class="fas fa-arrow-down"></i> Optimal</div>
              </div>
              <div class="mc-glow-bg"></div>
            </div>
            <div class="metric-card glass-panel red-card" id="mc-errors">
              <div class="mc-icon"><i class="fas fa-bug"></i></div>
              <div class="mc-content">
                <div class="mc-label">ERRORS RESOLVED</div>
                <div class="mc-value" id="mc-errors-val">0</div>
                <div class="mc-trend"><i class="fas fa-shield-alt"></i> All cleared</div>
              </div>
              <div class="mc-glow-bg"></div>
            </div>
          </div>

          <!-- INDIVIDUAL CONTRIBUTOR BAR CHART -->
          <div class="grid-item contributor-chart-card glass-panel">
            <div class="panel-header">
              <span class="panel-label">INDIVIDUAL CONTRIBUTOR METRICS</span>
              <div class="chart-legend">
                <span class="legend-dot" style="background:#00FF9C"></span><span>Output</span>
                <span class="legend-dot" style="background:#7C6CFF; margin-left:12px"></span><span>Efficiency</span>
              </div>
              <button class="panel-menu-btn"><i class="fas fa-ellipsis-h"></i></button>
            </div>
            <div class="chart-container">
              <canvas id="contributor-chart"></canvas>
            </div>
          </div>

          <!-- SYSTEM STATUS PANEL -->
          <div class="grid-item system-status-card glass-panel">
            <div class="panel-header">
              <span class="panel-label">SYSTEM STATUS</span>
              <span class="panel-badge green">ALL NOMINAL</span>
            </div>
            <div class="system-status-list">
              <div class="ss-item">
                <div class="ss-name"><i class="fas fa-network-wired" style="color:#00FF9C"></i> Neural Network</div>
                <div class="ss-bar-wrap"><div class="ss-bar" style="width:96%; background:linear-gradient(90deg,#00FF9C,#00D4FF)"></div></div>
                <div class="ss-val green">96%</div>
              </div>
              <div class="ss-item">
                <div class="ss-name"><i class="fas fa-database" style="color:#00D4FF"></i> Data Pipeline</div>
                <div class="ss-bar-wrap"><div class="ss-bar" style="width:88%; background:linear-gradient(90deg,#00D4FF,#7C6CFF)"></div></div>
                <div class="ss-val blue">88%</div>
              </div>
              <div class="ss-item">
                <div class="ss-name"><i class="fas fa-brain" style="color:#7C6CFF"></i> AI Models</div>
                <div class="ss-bar-wrap"><div class="ss-bar" style="width:100%; background:linear-gradient(90deg,#7C6CFF,#00FF9C)"></div></div>
                <div class="ss-val purple">100%</div>
              </div>
              <div class="ss-item">
                <div class="ss-name"><i class="fas fa-shield-virus" style="color:#FF4C4C"></i> Security</div>
                <div class="ss-bar-wrap"><div class="ss-bar" style="width:73%; background:linear-gradient(90deg,#FF4C4C,#FF8C00)"></div></div>
                <div class="ss-val red">73%</div>
              </div>
              <div class="ss-item">
                <div class="ss-name"><i class="fas fa-satellite" style="color:#00FF9C"></i> Uplink</div>
                <div class="ss-bar-wrap"><div class="ss-bar" style="width:100%; background:linear-gradient(90deg,#00FF9C,#00FF9C)"></div></div>
                <div class="ss-val green">ACTIVE</div>
              </div>
            </div>
          </div>

        </div>
      </section>

      <!-- ============================== -->
      <!-- AI AGENTS SECTION -->
      <!-- ============================== -->
      <section class="section" id="section-agents">
        <div class="section-header">
          <h1 class="section-title">
            <i class="fas fa-robot"></i>
            AI AGENTS
          </h1>
          <div class="section-subtitle">Multi-agent intelligence workforce — 4 active units</div>
        </div>

        <div class="agents-grid">

          <!-- STRATEGIST CARD -->
          <div class="agent-card glass-panel strategist-card" id="card-strategist" onclick="openAgentPanel('strategist')">
            <div class="card-glow strategist-glow"></div>
            <div class="card-corner tl"></div>
            <div class="card-corner tr"></div>
            <div class="card-corner bl"></div>
            <div class="card-corner br"></div>
            <div class="agent-card-header">
              <span class="agent-card-num">01</span>
              <span class="agent-status-badge status-analyzing">● ANALYZING</span>
            </div>
            <div class="agent-visual-container">
              <div class="agent-visual-bg strategist-bg">
                <div class="visual-ring r1 strategist-ring"></div>
                <div class="visual-ring r2 strategist-ring" style="animation-delay:-1s"></div>
                <div class="visual-ring r3 strategist-ring" style="animation-delay:-2s"></div>
                <div class="agent-face-icon strategist-icon">
                  <i class="fas fa-chess-king"></i>
                  <div class="icon-particles" id="sp-particles"></div>
                </div>
                <!-- Chess pieces floating -->
                <div class="float-elem fe-1"><i class="fas fa-chess-rook" style="color:#7C6CFF;opacity:0.7;font-size:14px"></i></div>
                <div class="float-elem fe-2"><i class="fas fa-chess-knight" style="color:#7C6CFF;opacity:0.6;font-size:12px"></i></div>
                <div class="float-elem fe-3"><i class="fas fa-chess-bishop" style="color:#b0a0ff;opacity:0.5;font-size:10px"></i></div>
              </div>
            </div>
            <div class="agent-card-info">
              <div class="agent-card-name">PROJECT<br/><span>STRATEGIST</span></div>
              <div class="agent-card-role">Strategic Planning & Mission Design</div>
              <div class="agent-card-stats">
                <div class="acs-item"><span class="acs-val" style="color:#7C6CFF">342</span><span class="acs-lbl">Tasks</span></div>
                <div class="acs-item"><span class="acs-val" style="color:#7C6CFF">94%</span><span class="acs-lbl">Success</span></div>
                <div class="acs-item"><span class="acs-val" style="color:#7C6CFF">2.1s</span><span class="acs-lbl">Latency</span></div>
              </div>
              <div class="agent-card-action">
                <span>EXPAND DETAILS</span>
                <i class="fas fa-chevron-right"></i>
              </div>
            </div>
          </div>

          <!-- ANALYST CARD -->
          <div class="agent-card glass-panel analyst-card" id="card-analyst" onclick="openAgentPanel('analyst')">
            <div class="card-glow analyst-glow"></div>
            <div class="card-corner tl"></div>
            <div class="card-corner tr"></div>
            <div class="card-corner bl"></div>
            <div class="card-corner br"></div>
            <div class="agent-card-header">
              <span class="agent-card-num">02</span>
              <span class="agent-status-badge status-active">● ACTIVE</span>
            </div>
            <div class="agent-visual-container">
              <div class="agent-visual-bg analyst-bg">
                <div class="visual-ring r1 analyst-ring"></div>
                <div class="visual-ring r2 analyst-ring" style="animation-delay:-1s"></div>
                <div class="visual-ring r3 analyst-ring" style="animation-delay:-2s"></div>
                <div class="agent-face-icon analyst-icon">
                  <i class="fas fa-eye"></i>
                  <div class="icon-particles" id="ap-particles"></div>
                </div>
                <!-- Chart elements floating -->
                <div class="float-elem fe-1"><i class="fas fa-chart-bar" style="color:#00FF9C;opacity:0.7;font-size:13px"></i></div>
                <div class="float-elem fe-2"><i class="fas fa-chart-pie" style="color:#00FF9C;opacity:0.6;font-size:11px"></i></div>
                <div class="float-elem fe-3"><i class="fas fa-signal" style="color:#00D4FF;opacity:0.5;font-size:10px"></i></div>
              </div>
            </div>
            <div class="agent-card-info">
              <div class="agent-card-name">PRODUCTIVITY<br/><span>ANALYST</span></div>
              <div class="agent-card-role">Data Analysis & Performance Tracking</div>
              <div class="agent-card-stats">
                <div class="acs-item"><span class="acs-val" style="color:#00FF9C">289</span><span class="acs-lbl">Tasks</span></div>
                <div class="acs-item"><span class="acs-val" style="color:#00FF9C">97%</span><span class="acs-lbl">Success</span></div>
                <div class="acs-item"><span class="acs-val" style="color:#00FF9C">0.8s</span><span class="acs-lbl">Latency</span></div>
              </div>
              <div class="agent-card-action">
                <span>EXPAND DETAILS</span>
                <i class="fas fa-chevron-right"></i>
              </div>
            </div>
          </div>

          <!-- OPTIMIZER CARD -->
          <div class="agent-card glass-panel optimizer-card" id="card-optimizer" onclick="openAgentPanel('optimizer')">
            <div class="card-glow optimizer-glow"></div>
            <div class="card-corner tl"></div>
            <div class="card-corner tr"></div>
            <div class="card-corner bl"></div>
            <div class="card-corner br"></div>
            <div class="agent-card-header">
              <span class="agent-card-num">03</span>
              <span class="agent-status-badge status-active">● ACTIVE</span>
            </div>
            <div class="agent-visual-container">
              <div class="agent-visual-bg optimizer-bg">
                <div class="visual-ring r1 optimizer-ring"></div>
                <div class="visual-ring r2 optimizer-ring" style="animation-delay:-1s"></div>
                <div class="visual-ring r3 optimizer-ring" style="animation-delay:-2s"></div>
                <div class="agent-face-icon optimizer-icon">
                  <div class="cube-container">
                    <div class="cube">
                      <div class="cube-face cube-front"></div>
                      <div class="cube-face cube-back"></div>
                      <div class="cube-face cube-left"></div>
                      <div class="cube-face cube-right"></div>
                      <div class="cube-face cube-top"></div>
                      <div class="cube-face cube-bottom"></div>
                    </div>
                  </div>
                </div>
                <div class="float-elem fe-1"><i class="fas fa-cogs" style="color:#00D4FF;opacity:0.7;font-size:13px"></i></div>
                <div class="float-elem fe-2"><i class="fas fa-bolt" style="color:#00D4FF;opacity:0.6;font-size:11px"></i></div>
                <div class="float-elem fe-3"><i class="fas fa-project-diagram" style="color:#00D4FF;opacity:0.5;font-size:10px"></i></div>
              </div>
            </div>
            <div class="agent-card-info">
              <div class="agent-card-name">RESOURCE<br/><span>OPTIMIZER</span></div>
              <div class="agent-card-role">Resource Allocation & Efficiency</div>
              <div class="agent-card-stats">
                <div class="acs-item"><span class="acs-val" style="color:#00D4FF">378</span><span class="acs-lbl">Tasks</span></div>
                <div class="acs-item"><span class="acs-val" style="color:#00D4FF">91%</span><span class="acs-lbl">Success</span></div>
                <div class="acs-item"><span class="acs-val" style="color:#00D4FF">1.4s</span><span class="acs-lbl">Latency</span></div>
              </div>
              <div class="agent-card-action">
                <span>EXPAND DETAILS</span>
                <i class="fas fa-chevron-right"></i>
              </div>
            </div>
          </div>

          <!-- RISK MANAGER CARD -->
          <div class="agent-card glass-panel risk-card" id="card-risk" onclick="openAgentPanel('risk')">
            <div class="card-glow risk-glow"></div>
            <div class="card-corner tl"></div>
            <div class="card-corner tr"></div>
            <div class="card-corner bl"></div>
            <div class="card-corner br"></div>
            <div class="agent-card-header">
              <span class="agent-card-num">04</span>
              <span class="agent-status-badge status-alert">⚠ ALERT</span>
            </div>
            <div class="agent-visual-container">
              <div class="agent-visual-bg risk-bg">
                <div class="visual-ring r1 risk-ring"></div>
                <div class="visual-ring r2 risk-ring" style="animation-delay:-1s"></div>
                <div class="visual-ring r3 risk-ring" style="animation-delay:-2s"></div>
                <div class="agent-face-icon risk-icon">
                  <i class="fas fa-shield-alt"></i>
                  <div class="icon-particles risk-particles" id="rp-particles"></div>
                </div>
                <div class="float-elem fe-1"><i class="fas fa-exclamation-triangle" style="color:#FF4C4C;opacity:0.9;font-size:13px"></i></div>
                <div class="float-elem fe-2"><i class="fas fa-skull-crossbones" style="color:#FF4C4C;opacity:0.6;font-size:11px"></i></div>
                <div class="float-elem fe-3"><i class="fas fa-radiation" style="color:#FF8C00;opacity:0.5;font-size:10px"></i></div>
              </div>
            </div>
            <div class="agent-card-info">
              <div class="agent-card-name">RISK<br/><span>MANAGER</span></div>
              <div class="agent-card-role">Threat Detection & Risk Mitigation</div>
              <div class="agent-card-stats">
                <div class="acs-item"><span class="acs-val" style="color:#FF4C4C">236</span><span class="acs-lbl">Tasks</span></div>
                <div class="acs-item"><span class="acs-val" style="color:#FF4C4C">88%</span><span class="acs-lbl">Success</span></div>
                <div class="acs-item"><span class="acs-val" style="color:#FF4C4C">3.2s</span><span class="acs-lbl">Latency</span></div>
              </div>
              <div class="agent-card-action">
                <span>EXPAND DETAILS</span>
                <i class="fas fa-chevron-right"></i>
              </div>
            </div>
          </div>

        </div>
      </section>

      <!-- ============================== -->
      <!-- TEAM MONITORING SECTION -->
      <!-- ============================== -->
      <section class="section" id="section-team">
        <div class="section-header">
          <h1 class="section-title"><i class="fas fa-users"></i> TEAM MONITORING</h1>
          <div class="section-subtitle">Real-time agent performance & coordination matrix</div>
        </div>
        <div class="dashboard-grid">
          <div class="grid-item glass-panel" style="grid-column: 1 / -1; padding: 32px;">
            <div class="panel-header"><span class="panel-label">AGENT COORDINATION MATRIX</span></div>
            <div style="display:grid; grid-template-columns: repeat(4,1fr); gap:20px; margin-top:20px;">
              <div class="team-agent-box" style="border-color:#7C6CFF">
                <div style="color:#7C6CFF; font-size:2rem; margin-bottom:8px"><i class="fas fa-chess-king"></i></div>
                <div style="font-family:Orbitron; color:#fff; font-size:0.9rem">ALPHA</div>
                <div style="color:#7C6CFF; font-size:0.75rem">Strategist</div>
                <div class="team-agent-meter" style="--c:#7C6CFF; --w:78%"></div>
                <div style="color:#7C6CFF; font-size:1.1rem; font-family:Orbitron">78%</div>
              </div>
              <div class="team-agent-box" style="border-color:#00FF9C">
                <div style="color:#00FF9C; font-size:2rem; margin-bottom:8px"><i class="fas fa-chart-line"></i></div>
                <div style="font-family:Orbitron; color:#fff; font-size:0.9rem">BETA</div>
                <div style="color:#00FF9C; font-size:0.75rem">Analyst</div>
                <div class="team-agent-meter" style="--c:#00FF9C; --w:92%"></div>
                <div style="color:#00FF9C; font-size:1.1rem; font-family:Orbitron">92%</div>
              </div>
              <div class="team-agent-box" style="border-color:#00D4FF">
                <div style="color:#00D4FF; font-size:2rem; margin-bottom:8px"><i class="fas fa-cube"></i></div>
                <div style="font-family:Orbitron; color:#fff; font-size:0.9rem">GAMMA</div>
                <div style="color:#00D4FF; font-size:0.75rem">Optimizer</div>
                <div class="team-agent-meter" style="--c:#00D4FF; --w:65%"></div>
                <div style="color:#00D4FF; font-size:1.1rem; font-family:Orbitron">65%</div>
              </div>
              <div class="team-agent-box" style="border-color:#FF4C4C">
                <div style="color:#FF4C4C; font-size:2rem; margin-bottom:8px"><i class="fas fa-shield-alt"></i></div>
                <div style="font-family:Orbitron; color:#fff; font-size:0.9rem">DELTA</div>
                <div style="color:#FF4C4C; font-size:0.75rem">Risk Manager</div>
                <div class="team-agent-meter" style="--c:#FF4C4C; --w:54%"></div>
                <div style="color:#FF4C4C; font-size:1.1rem; font-family:Orbitron">54%</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ============================== -->
      <!-- ANALYTICS SECTION -->
      <!-- ============================== -->
      <section class="section" id="section-analytics">
        <div class="section-header">
          <h1 class="section-title"><i class="fas fa-chart-bar"></i> ANALYTICS</h1>
          <div class="section-subtitle">Deep intelligence metrics & pattern analysis</div>
        </div>
        <div class="dashboard-grid">
          <div class="grid-item glass-panel" style="grid-column: 1 / -1; min-height:300px; padding:32px;">
            <div class="panel-header"><span class="panel-label">INTELLIGENCE HEATMAP — 7 DAY OVERVIEW</span></div>
            <div id="analytics-heatmap" style="margin-top:20px; display:grid; grid-template-columns: repeat(7,1fr); gap:8px;"></div>
          </div>
          <div class="grid-item glass-panel" style="grid-column: span 2; padding:32px;">
            <div class="panel-header"><span class="panel-label">PERFORMANCE RADAR</span></div>
            <div class="chart-container" style="height:280px;">
              <canvas id="radar-chart"></canvas>
            </div>
          </div>
          <div class="grid-item glass-panel" style="padding:32px;">
            <div class="panel-header"><span class="panel-label">TASK DISTRIBUTION</span></div>
            <div class="chart-container" style="height:280px;">
              <canvas id="doughnut-chart"></canvas>
            </div>
          </div>
        </div>
      </section>

      <!-- ============================== -->
      <!-- PROJECTS SECTION -->
      <!-- ============================== -->
      <section class="section" id="section-projects">
        <div class="section-header">
          <h1 class="section-title"><i class="fas fa-project-diagram"></i> PROJECTS</h1>
          <div class="section-subtitle">Manage projects, tasks &amp; AI monitoring</div>
        </div>
        <div class="glass-panel create-project-panel" id="create-project-panel">
          <div class="panel-header">
            <span class="panel-label">CREATE NEW PROJECT</span>
            <button class="cpanel-toggle" id="cpanel-toggle" onclick="toggleCreateForm()">
              <i class="fas fa-plus"></i> NEW PROJECT
            </button>
          </div>
          <div id="create-project-form" style="display:none">
            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">PROJECT NAME *</label>
                <input type="text" class="form-input" id="proj-name" placeholder="Enter project name..." />
              </div>
              <div class="form-group">
                <label class="form-label">DEADLINE (OPTIONAL)</label>
                <input type="date" class="form-input" id="proj-deadline" />
              </div>
              <div class="form-group" style="grid-column:1/-1">
                <label class="form-label">DESCRIPTION</label>
                <textarea class="form-input form-textarea" id="proj-desc" placeholder="Describe your project..."></textarea>
              </div>
            </div>
            <div class="form-actions">
              <button class="btn-cancel" onclick="toggleCreateForm()">CANCEL</button>
              <button class="btn-create" onclick="createProject()">
                <i class="fas fa-rocket"></i> LAUNCH PROJECT
              </button>
            </div>
          </div>
        </div>
        <div id="projects-list-container" style="margin-top:20px"></div>
        <!-- Task Modal -->
        <div class="modal-overlay" id="task-modal" onclick="closeTaskModal()">
          <div class="modal-panel glass-panel" onclick="event.stopPropagation()">
            <div class="modal-header">
              <div>
                <div class="modal-title" id="modal-project-name">PROJECT TASKS</div>
                <div class="modal-subtitle" id="modal-project-desc"></div>
              </div>
              <button class="panel-close-btn" onclick="closeTaskModal()"><i class="fas fa-times"></i></button>
            </div>
            <div class="modal-completion-bar">
              <div class="modal-completion-label">
                <span>COMPLETION</span>
                <span id="modal-completion-pct">0%</span>
              </div>
              <div class="modal-bar-wrap"><div class="modal-bar" id="modal-bar"></div></div>
            </div>
            <div class="add-task-row">
              <input type="text" class="form-input" id="new-task-name" placeholder="Add new task..." style="flex:1" onkeydown="if(event.key==='Enter') addTask()" />
              <select class="form-input" id="new-task-priority" style="width:120px">
                <option value="low">Low</option>
                <option value="medium" selected>Medium</option>
                <option value="high">High</option>
              </select>
              <button class="btn-create" style="padding:10px 20px" onclick="addTask()">
                <i class="fas fa-plus"></i> ADD
              </button>
            </div>
            <div id="modal-tasks-list" style="margin-top:16px;max-height:280px;overflow-y:auto"></div>
            <div class="modal-chat-section">
              <div class="panel-label" style="margin-bottom:10px"><i class="fas fa-robot" style="color:var(--blue)"></i> AI ASSISTANT</div>
              <div class="chat-messages" id="modal-chat-messages"></div>
              <div class="chat-input-row">
                <input type="text" class="form-input" id="modal-chat-input" placeholder="Ask AI: what is wrong? suggestions? status?" onkeydown="if(event.key==='Enter') sendModalChat()" />
                <button class="btn-create" style="padding:10px 18px" onclick="sendModalChat()"><i class="fas fa-paper-plane"></i></button>
              </div>
              <div class="chat-quick-btns">
                <button class="quick-chat-btn" onclick="quickChat('What is wrong?')">What is wrong?</button>
                <button class="quick-chat-btn" onclick="quickChat('Why delay?')">Why delay?</button>
                <button class="quick-chat-btn" onclick="quickChat('Give me suggestions')">Suggestions</button>
                <button class="quick-chat-btn" onclick="quickChat('Show status report')">Status</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ============================== -->
      <!-- NOTIFICATIONS / ALERTS -->
      <!-- ============================== -->
      <section class="section" id="section-notifications">
        <div class="section-header">
          <h1 class="section-title"><i class="fas fa-bell"></i> AI ALERT SYSTEM</h1>
          <div class="section-subtitle">Intelligent risk monitoring — High / Medium / Low</div>
        </div>
        <div id="alerts-container"></div>
      </section>

      <!-- ============================== -->
      <!-- PROFILE -->
      <!-- ============================== -->
      <section class="section" id="section-profile">
        <div class="section-header">
          <h1 class="section-title"><i class="fas fa-user-circle"></i> PROFILE</h1>
          <div class="section-subtitle">User intelligence dossier &amp; productivity stats</div>
        </div>
        <div id="profile-container"></div>
      </section>

      <!-- ============================== -->
      <!-- ABOUT -->
      <!-- ============================== -->
      <section class="section" id="section-about">
        <div class="section-header">
          <h1 class="section-title"><i class="fas fa-info-circle"></i> ABOUT</h1>
          <div class="section-subtitle">System documentation &amp; development team</div>
        </div>
        <div class="about-grid">
          <div class="glass-panel about-hero" style="grid-column:1/-1">
            <div class="about-hero-content">
              <div class="about-hero-visual">
                <div class="brain-outer-ring" style="width:120px;height:120px;position:absolute"></div>
                <div class="brain-middle-ring" style="width:90px;height:90px;position:absolute"></div>
                <div class="brain-inner-ring" style="width:60px;height:60px;position:absolute"></div>
                <div style="font-size:2.5rem;color:var(--blue);filter:drop-shadow(0 0 20px var(--blue));position:relative;z-index:2"><i class="fas fa-brain"></i></div>
              </div>
              <div class="about-hero-text">
                <div class="about-badge">◈ SYSTEM OVERVIEW</div>
                <h2 class="about-title">AI COMMAND CENTER</h2>
                <p class="about-desc">A cutting-edge multi-agent AI productivity monitoring system designed for enterprise-grade project management. Four specialized AI agents work in concert to analyze, optimize, and safeguard project operations in real-time.</p>
                <div class="about-status-row">
                  <span class="about-status-pill dev">⚙ Currently Under Development</span>
                  <span class="about-status-pill date"><i class="fas fa-calendar"></i> 20 January 2026</span>
                </div>
              </div>
            </div>
          </div>
          <div class="glass-panel about-section-card">
            <div class="about-section-title"><i class="fas fa-robot" style="color:var(--blue)"></i> AI AGENTS</div>
            <div class="about-agents-list">
              <div class="about-agent-item" style="border-color:rgba(124,108,255,0.3)"><i class="fas fa-chess-king" style="color:#7C6CFF;font-size:1.4rem;flex-shrink:0"></i><div><div style="color:#7C6CFF;font-family:var(--font-main);font-size:0.75rem;letter-spacing:2px">PROJECT STRATEGIST</div><div style="color:var(--muted);font-size:0.82rem;margin-top:4px">Designs mission blueprints, coordinates multi-agent workflows and optimizes execution strategies.</div></div></div>
              <div class="about-agent-item" style="border-color:rgba(0,255,156,0.3)"><i class="fas fa-eye" style="color:#00FF9C;font-size:1.4rem;flex-shrink:0"></i><div><div style="color:#00FF9C;font-family:var(--font-main);font-size:0.75rem;letter-spacing:2px">PRODUCTIVITY ANALYST</div><div style="color:var(--muted);font-size:0.82rem;margin-top:4px">Monitors data streams, processes KPIs in real-time and delivers actionable performance insights.</div></div></div>
              <div class="about-agent-item" style="border-color:rgba(0,212,255,0.3)"><i class="fas fa-cube" style="color:#00D4FF;font-size:1.4rem;flex-shrink:0"></i><div><div style="color:#00D4FF;font-family:var(--font-main);font-size:0.75rem;letter-spacing:2px">RESOURCE OPTIMIZER</div><div style="color:var(--muted);font-size:0.82rem;margin-top:4px">Manages computational resources, balances workloads and maximizes system throughput.</div></div></div>
              <div class="about-agent-item" style="border-color:rgba(255,76,76,0.3)"><i class="fas fa-shield-alt" style="color:#FF4C4C;font-size:1.4rem;flex-shrink:0"></i><div><div style="color:#FF4C4C;font-family:var(--font-main);font-size:0.75rem;letter-spacing:2px">RISK MANAGER</div><div style="color:var(--muted);font-size:0.82rem;margin-top:4px">Scans for threats and risks, initiates countermeasures and triggers emergency protocols.</div></div></div>
            </div>
          </div>
          <div class="glass-panel about-section-card">
            <div class="about-section-title"><i class="fas fa-code" style="color:var(--green)"></i> TECH STACK</div>
            <div class="tech-stack-grid">
              <div class="tech-item"><i class="fas fa-server" style="color:var(--orange)"></i><span>Flask</span><span class="tech-sub">Backend API</span></div>
              <div class="tech-item"><i class="fas fa-database" style="color:var(--blue)"></i><span>SQLAlchemy</span><span class="tech-sub">ORM / SQLite</span></div>
              <div class="tech-item"><i class="fas fa-bolt" style="color:var(--green)"></i><span>Hono</span><span class="tech-sub">Edge Runtime</span></div>
              <div class="tech-item"><i class="fas fa-cloud" style="color:var(--blue)"></i><span>Cloudflare</span><span class="tech-sub">Pages</span></div>
              <div class="tech-item"><i class="fab fa-js-square" style="color:#F7DF1E"></i><span>JavaScript</span><span class="tech-sub">ES6+ Vanilla</span></div>
              <div class="tech-item"><i class="fas fa-chart-area" style="color:var(--purple)"></i><span>Chart.js</span><span class="tech-sub">Visualizations</span></div>
              <div class="tech-item"><i class="fab fa-css3-alt" style="color:#2965F1"></i><span>CSS3</span><span class="tech-sub">Glassmorphism</span></div>
              <div class="tech-item"><i class="fas fa-brain" style="color:var(--purple)"></i><span>Rule AI</span><span class="tech-sub">Chat Engine</span></div>
            </div>
          </div>
          <div class="glass-panel about-section-card" style="grid-column:1/-1">
            <div class="about-section-title"><i class="fas fa-users" style="color:var(--purple)"></i> CREATED BY</div>
            <div class="team-cards-row">
              <div class="team-card">
                <div class="team-avatar"><i class="fas fa-user-astronaut" style="font-size:2rem;color:var(--purple)"></i><div class="brain-inner-ring" style="width:70px;height:70px;position:absolute;top:-5px;left:-5px"></div></div>
                <div class="team-info">
                  <div class="team-name">Lavanya Saxena</div>
                  <div class="team-role">Lead AI Systems Engineer</div>
                  <div class="team-tags"><span style="color:var(--purple)">Full-Stack</span><span style="color:var(--green)">AI/ML</span><span style="color:var(--blue)">UX Design</span></div>
                </div>
              </div>
              <div class="team-card">
                <div class="team-avatar"><i class="fas fa-user-cog" style="font-size:2rem;color:var(--blue)"></i><div class="brain-inner-ring" style="width:70px;height:70px;position:absolute;top:-5px;left:-5px;border-color:var(--blue)"></div></div>
                <div class="team-info">
                  <div class="team-name">Development Team</div>
                  <div class="team-role">Backend &amp; Infrastructure</div>
                  <div class="team-tags"><span style="color:var(--blue)">Flask</span><span style="color:var(--green)">DevOps</span><span style="color:var(--orange)">APIs</span></div>
                </div>
              </div>
            </div>
            <div class="about-footer-info">
              <div class="about-info-item"><i class="fas fa-calendar-alt" style="color:var(--blue)"></i><span class="about-info-label">CREATED ON</span><span class="about-info-val">20 January 2026</span></div>
              <div class="about-info-item"><i class="fas fa-code-branch" style="color:var(--green)"></i><span class="about-info-label">VERSION</span><span class="about-info-val">v2.0.0</span></div>
              <div class="about-info-item"><i class="fas fa-tools" style="color:var(--orange)"></i><span class="about-info-label">STATUS</span><span class="about-info-val" style="color:var(--orange)">⚙ Under Development</span></div>
              <div class="about-info-item"><i class="fas fa-globe" style="color:var(--purple)"></i><span class="about-info-label">PLATFORM</span><span class="about-info-val">Cloudflare Pages</span></div>
            </div>
          </div>
        </div>
      </section>

    </div><!-- end sections-container -->
  </main>
</div>

<!-- AUTH OVERLAY -->
<div id="auth-overlay" class="auth-overlay" style="display:none">
  <canvas id="particle-canvas-auth"></canvas>
  <div class="auth-container">
    <div class="auth-panel glass-panel" id="login-panel">
      <div class="auth-logo">
        <div class="logo-icon" style="width:56px;height:56px;font-size:1.6rem"><i class="fas fa-brain"></i><div class="logo-pulse"></div></div>
        <div><div class="logo-ai" style="font-size:1.4rem">AI COMMAND CENTER</div><div class="logo-cc" style="font-size:0.6rem;margin-top:2px">NEURAL INTELLIGENCE PLATFORM</div></div>
      </div>
      <div class="auth-title">AUTHENTICATE</div>
      <div class="auth-subtitle">Enter your neural access credentials</div>
      <div id="login-error" class="auth-error" style="display:none"></div>
      <div class="form-group"><label class="form-label"><i class="fas fa-envelope"></i> EMAIL ADDRESS</label><input type="email" class="form-input" id="login-email" placeholder="operative@command.ai" autocomplete="email" /></div>
      <div class="form-group"><label class="form-label"><i class="fas fa-lock"></i> ACCESS CODE</label><div class="input-with-eye"><input type="password" class="form-input" id="login-password" placeholder="••••••••••" autocomplete="current-password" onkeydown="if(event.key==='Enter') doLogin()" /><button class="eye-btn" onclick="togglePwd('login-password',this)"><i class="fas fa-eye"></i></button></div></div>
      <button class="btn-auth" id="login-btn" onclick="doLogin()"><i class="fas fa-sign-in-alt"></i> ENTER COMMAND CENTER</button>
      <div class="auth-switch">No account? <a href="#" onclick="showPanel('signup')">CREATE OPERATIVE PROFILE →</a></div>
      <div class="auth-demo-hint"><i class="fas fa-info-circle"></i> Register with any email, min 6-char password</div>
    </div>
    <div class="auth-panel glass-panel" id="signup-panel" style="display:none">
      <div class="auth-logo">
        <div class="logo-icon" style="width:56px;height:56px;font-size:1.6rem"><i class="fas fa-brain"></i><div class="logo-pulse"></div></div>
        <div><div class="logo-ai" style="font-size:1.4rem">AI COMMAND CENTER</div><div class="logo-cc" style="font-size:0.6rem;margin-top:2px">NEURAL INTELLIGENCE PLATFORM</div></div>
      </div>
      <div class="auth-title">REGISTER</div>
      <div class="auth-subtitle">Create your operative identity</div>
      <div id="signup-error" class="auth-error" style="display:none"></div>
      <div class="form-grid">
        <div class="form-group"><label class="form-label"><i class="fas fa-user"></i> OPERATIVE NAME</label><input type="text" class="form-input" id="signup-name" placeholder="Commander..." /></div>
        <div class="form-group"><label class="form-label"><i class="fas fa-id-badge"></i> ROLE</label><select class="form-input" id="signup-role"><option value="individual">Individual</option><option value="company">Company</option></select></div>
        <div class="form-group" style="grid-column:1/-1"><label class="form-label"><i class="fas fa-envelope"></i> EMAIL ADDRESS</label><input type="email" class="form-input" id="signup-email" placeholder="operative@command.ai" /></div>
        <div class="form-group" style="grid-column:1/-1"><label class="form-label"><i class="fas fa-lock"></i> ACCESS CODE (min 6 chars)</label><div class="input-with-eye"><input type="password" class="form-input" id="signup-password" placeholder="••••••••••" onkeydown="if(event.key==='Enter') doSignup()" /><button class="eye-btn" onclick="togglePwd('signup-password',this)"><i class="fas fa-eye"></i></button></div></div>
      </div>
      <button class="btn-auth" id="signup-btn" onclick="doSignup()"><i class="fas fa-user-plus"></i> CREATE OPERATIVE PROFILE</button>
      <div class="auth-switch">Already registered? <a href="#" onclick="showPanel('login')">← BACK TO LOGIN</a></div>
    </div>
  </div>
</div>

<!-- AGENT DETAIL PANEL OVERLAY -->
<div class="agent-panel-overlay" id="agent-overlay" onclick="closeAgentPanel()">
  <div class="agent-detail-panel glass-panel" id="agent-detail-panel" onclick="event.stopPropagation()">
    <button class="panel-close-btn" onclick="closeAgentPanel()"><i class="fas fa-times"></i></button>
    <div id="agent-detail-content"></div>
  </div>
</div>

<!-- TOAST NOTIFICATIONS -->
<div id="toast-container" style="position:fixed;bottom:24px;right:24px;z-index:9000;display:flex;flex-direction:column;gap:8px;pointer-events:none"></div>

<script src="/static/app.js"></script>
<script src="/static/app2.js"></script>
</body>
</html>`)

})

export default app
