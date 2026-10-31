// ShopEase System Reliability Lab Frontend Controller
import { showToast } from './components.js';

class ReliabilityLab {
  constructor() {
    this.pollInterval = null;
    this.currentTab = 'scenarios';
    this.state = {
      health: null,
      metrics: null,
      faults: null,
      logs: [],
      services: []
    };
  }

  init() {
    this.bindEvents();
    this.refreshAll();
    // Background polling every 3 seconds to keep header badge accurate
    setInterval(() => this.updateStatusBadgeOnly(), 3000);
  }

  bindEvents() {
    // Open Lab
    const labOpenBtn = document.getElementById('lab-open-btn');
    if (labOpenBtn) {
      labOpenBtn.addEventListener('click', () => this.openLab());
    }

    // Close Lab
    const labCloseBtn = document.getElementById('lab-close-btn');
    if (labCloseBtn) {
      labCloseBtn.addEventListener('click', () => this.closeLab());
    }

    const overlay = document.getElementById('lab-modal-overlay');
    if (overlay) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) this.closeLab();
      });
    }

    // Reset All Faults button
    const btnResetAll = document.getElementById('lab-btn-reset-all');
    if (btnResetAll) {
      btnResetAll.addEventListener('click', () => this.resetAllFaults());
    }

    // Refresh Now button
    const btnRefresh = document.getElementById('lab-btn-refresh');
    if (btnRefresh) {
      btnRefresh.addEventListener('click', () => this.refreshAll(true));
    }

    // Tab buttons
    document.querySelectorAll('.lab-tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tab = e.target.dataset.tab;
        this.switchTab(tab);
      });
    });

    // Delegated Scenario Actions (Inject, Resolve, Probe)
    const bodyContainer = document.getElementById('lab-tab-content');
    if (bodyContainer) {
      bodyContainer.addEventListener('click', async (e) => {
        const injectBtn = e.target.closest('[data-action="inject-fault"]');
        if (injectBtn) {
          const scenario = injectBtn.dataset.scenario;
          await this.injectFault(scenario);
          return;
        }

        const resolveBtn = e.target.closest('[data-action="resolve-fault"]');
        if (resolveBtn) {
          const scenario = resolveBtn.dataset.scenario;
          await this.resolveFault(scenario);
          return;
        }

        const probeBtn = e.target.closest('[data-action="probe-cb"]');
        if (probeBtn) {
          await this.probeCircuitBreaker();
          return;
        }
      });
    }
  }

  openLab() {
    const overlay = document.getElementById('lab-modal-overlay');
    if (overlay) {
      overlay.classList.add('open');
      document.body.style.overflow = 'hidden';
      this.refreshAll();
      this.startPolling();
    }
  }

  closeLab() {
    const overlay = document.getElementById('lab-modal-overlay');
    if (overlay) {
      overlay.classList.remove('open');
      document.body.style.overflow = '';
      this.stopPolling();
    }
  }

  startPolling() {
    this.stopPolling();
    this.pollInterval = setInterval(() => this.refreshAll(), 2000);
  }

  stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  switchTab(tab) {
    this.currentTab = tab;
    document.querySelectorAll('.lab-tab-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.tab === tab);
    });
    this.renderTabContent();
  }

  async updateStatusBadgeOnly() {
    try {
      const res = await fetch('/api/faults/status');
      const json = await res.json();
      if (json.success && json.data) {
        const activeCount = json.data.activeCount || 0;
        const dot = document.getElementById('lab-active-dot');
        const badge = document.getElementById('lab-active-count');
        if (dot) dot.classList.toggle('pulsing', activeCount > 0);
        if (badge) {
          badge.textContent = activeCount > 0 ? `${activeCount} Active` : 'Normal';
          badge.style.color = activeCount > 0 ? '#ef4444' : '#c7d2fe';
        }
      }
    } catch (e) {
      // ignore
    }
  }

  async refreshAll(showNotification = false) {
    try {
      const [hRes, mRes, fRes, lRes, sRes] = await Promise.all([
        fetch('/api/health').then(r => r.json()),
        fetch('/api/observability/metrics').then(r => r.json()),
        fetch('/api/faults/status').then(r => r.json()),
        fetch('/api/observability/logs?limit=40').then(r => r.json()),
        fetch('/api/observability/services').then(r => r.json())
      ]);

      this.state.health = hRes;
      this.state.metrics = mRes.success ? mRes.data : null;
      this.state.faults = fRes.success ? fRes.data : null;
      this.state.logs = lRes.success ? lRes.data : [];
      this.state.services = sRes.success ? sRes.services : [];

      this.updateHeaderSummary();
      this.renderTabContent();

      if (showNotification) {
        showToast('Observability metrics & lab state refreshed', 'success');
      }
    } catch (err) {
      console.error('Failed to refresh lab state:', err);
    }
  }

  updateHeaderSummary() {
    const health = this.state.health;
    const faults = this.state.faults;
    const statusPill = document.getElementById('lab-health-pill');
    const dot = document.getElementById('lab-active-dot');
    const badge = document.getElementById('lab-active-count');

    const activeCount = faults ? faults.activeCount : 0;
    if (dot) dot.classList.toggle('pulsing', activeCount > 0);
    if (badge) {
      badge.textContent = activeCount > 0 ? `${activeCount} Active` : 'Normal';
      badge.style.color = activeCount > 0 ? '#ef4444' : '#c7d2fe';
    }

    if (statusPill && health) {
      statusPill.className = `lab-badge-indicator ${health.status.toLowerCase()}`;
      statusPill.innerHTML = `
        <span>${health.status === 'HEALTHY' ? '●' : '▲'}</span>
        <span>${health.status} (${activeCount} Faults Active)</span>
      `;
    }
  }

  renderTabContent() {
    const container = document.getElementById('lab-tab-content');
    if (!container) return;

    switch (this.currentTab) {
      case 'scenarios':
        container.innerHTML = this.renderScenariosGrid();
        break;
      case 'metrics':
        container.innerHTML = this.renderMetricsView();
        break;
      case 'logs':
        container.innerHTML = this.renderLogsView();
        break;
      case 'services':
        container.innerHTML = this.renderServicesView();
        break;
    }
  }

  // ================= SCENARIOS TAB =================
  renderScenariosGrid() {
    const faults = (this.state.faults && this.state.faults.scenarios) || {};
    const metrics = this.state.metrics || {};
    const db = metrics.database || {};
    const cache = metrics.cache || {};
    const cb = metrics.circuitBreaker || {};
    const lat = metrics.latency || {};
    const req = metrics.requests || {};

    const f1 = faults.db_exhaustion || {};
    const f2 = faults.high_latency || {};
    const f3 = faults.service_error_spike || {};
    const f4 = faults.cache_failure || {};
    const f5 = faults.circuit_breaker_trip || {};

    return `
      <div class="scenarios-grid">
        
        <!-- 1. Database Connection Exhaustion -->
        <div class="scenario-card ${f1.active ? 'active-fault' : ''}" id="card-db-exhaustion">
          <div class="scenario-header">
            <div class="scenario-title-box">
              <span class="scenario-category">Database / Infrastructure</span>
              <h3 class="scenario-name">1. Database Connection Exhaustion</h3>
            </div>
            <span class="scenario-status-pill ${f1.active ? 'active' : 'inactive'}">
              ${f1.active ? 'ACTIVE (EXHAUSTED)' : 'INACTIVE (NORMAL)'}
            </span>
          </div>

          <p class="scenario-desc">${f1.description || 'Holds database connections to exhaust the PostgreSQL connection pool.'}</p>
          
          <div class="scenario-impact-box">
            <strong>Impact:</strong> Database-dependent API queries hang and return 500/503 timeouts. Active pool connections max out at 20/20.
          </div>

          <div class="scenario-metrics-strip">
            <div class="metric-item">
              <span class="metric-label">Active Connections</span>
              <span class="metric-val ${db.activeConnections >= 15 ? 'highlight-err' : 'highlight-ok'}">${db.activeConnections || 0} / ${db.maxPoolSize || 20}</span>
            </div>
            <div class="metric-item">
              <span class="metric-label">Idle Clients</span>
              <span class="metric-val">${db.idleCount || 0}</span>
            </div>
            <div class="metric-item">
              <span class="metric-label">Waiting Queries</span>
              <span class="metric-val ${db.waitingCount > 0 ? 'highlight-err' : ''}">${db.waitingCount || 0}</span>
            </div>
            <div class="metric-item">
              <span class="metric-label">Auto-Release</span>
              <span class="metric-val">${f1.active ? '60s Timeout' : 'Safe'}</span>
            </div>
          </div>

          <div class="scenario-actions-row">
            ${f1.active ? `
              <button type="button" class="btn-fault-resolve" data-action="resolve-fault" data-scenario="db_exhaustion">
                ✓ Resolve Fault (Release Connections)
              </button>
            ` : `
              <button type="button" class="btn-fault-inject" data-action="inject-fault" data-scenario="db_exhaustion">
                ⚡ Inject Fault (Exhaust Pool)
              </button>
            `}
          </div>
        </div>

        <!-- 2. High API Latency -->
        <div class="scenario-card ${f2.active ? 'active-fault' : ''}" id="card-high-latency">
          <div class="scenario-header">
            <div class="scenario-title-box">
              <span class="scenario-category">Network / Performance</span>
              <h3 class="scenario-name">2. High API Latency</h3>
            </div>
            <span class="scenario-status-pill ${f2.active ? 'active' : 'inactive'}">
              ${f2.active ? `ACTIVE (+${f2.params.delayMs || 2000}ms)` : 'INACTIVE (NORMAL)'}
            </span>
          </div>

          <p class="scenario-desc">${f2.description || 'Introduces configurable delay on catalogue and product API requests.'}</p>
          
          <div class="scenario-impact-box">
            <strong>Impact:</strong> API response duration spikes to >2000ms. Visible in p95 and average latency telemetry metrics.
          </div>

          <div class="scenario-metrics-strip">
            <div class="metric-item">
              <span class="metric-label">Configured Delay</span>
              <span class="metric-val ${f2.active ? 'highlight-warn' : ''}">${f2.active ? `${f2.params.delayMs} ms` : '0 ms'}</span>
            </div>
            <div class="metric-item">
              <span class="metric-label">Measured Avg</span>
              <span class="metric-val ${lat.avgMs > 1000 ? 'highlight-warn' : 'highlight-ok'}">${lat.avgMs || 0} ms</span>
            </div>
            <div class="metric-item">
              <span class="metric-label">p95 Latency</span>
              <span class="metric-val">${lat.p95Ms || 0} ms</span>
            </div>
            <div class="metric-item">
              <span class="metric-label">Max Recorded</span>
              <span class="metric-val">${lat.maxMs || 0} ms</span>
            </div>
          </div>

          <div class="scenario-actions-row">
            ${f2.active ? `
              <button type="button" class="btn-fault-resolve" data-action="resolve-fault" data-scenario="high_latency">
                ✓ Resolve Fault (Remove Delay)
              </button>
            ` : `
              <button type="button" class="btn-fault-inject" data-action="inject-fault" data-scenario="high_latency">
                ⚡ Inject Fault (+2000ms Delay)
              </button>
            `}
          </div>
        </div>

        <!-- 3. Service Error Spike -->
        <div class="scenario-card ${f3.active ? 'active-fault' : ''}" id="card-service-error">
          <div class="scenario-header">
            <div class="scenario-title-box">
              <span class="scenario-category">Application / Stability</span>
              <h3 class="scenario-name">3. Service Error Spike</h3>
            </div>
            <span class="scenario-status-pill ${f3.active ? 'active' : 'inactive'}">
              ${f3.active ? 'ACTIVE (HTTP 500)' : 'INACTIVE (NORMAL)'}
            </span>
          </div>

          <p class="scenario-desc">${f3.description || 'Forces checkout/order service to return genuine HTTP 500 errors.'}</p>
          
          <div class="scenario-impact-box">
            <strong>Impact:</strong> Order creation requests fail with HTTP 500. Server error rate and 5xx metric counts elevate.
          </div>

          <div class="scenario-metrics-strip">
            <div class="metric-item">
              <span class="metric-label">Target Service</span>
              <span class="metric-val">${f3.params ? f3.params.targetService : 'order-service'}</span>
            </div>
            <div class="metric-item">
              <span class="metric-label">HTTP Status</span>
              <span class="metric-val ${f3.active ? 'highlight-err' : 'highlight-ok'}">${f3.active ? '500 ERROR' : '200 / 201'}</span>
            </div>
            <div class="metric-item">
              <span class="metric-label">5xx Errors</span>
              <span class="metric-val ${req.serverError5xx > 0 ? 'highlight-err' : ''}">${req.serverError5xx || 0}</span>
            </div>
            <div class="metric-item">
              <span class="metric-label">Error Rate</span>
              <span class="metric-val ${req.errorRatePercent > 0 ? 'highlight-err' : ''}">${req.errorRatePercent || 0}%</span>
            </div>
          </div>

          <div class="scenario-actions-row">
            ${f3.active ? `
              <button type="button" class="btn-fault-resolve" data-action="resolve-fault" data-scenario="service_error_spike">
                ✓ Resolve Fault (Restore 200/201)
              </button>
            ` : `
              <button type="button" class="btn-fault-inject" data-action="inject-fault" data-scenario="service_error_spike">
                ⚡ Inject Fault (Force HTTP 500)
              </button>
            `}
          </div>
        </div>

        <!-- 4. Cache Failure -->
        <div class="scenario-card ${f4.active ? 'active-fault' : ''}" id="card-cache-failure">
          <div class="scenario-header">
            <div class="scenario-title-box">
              <span class="scenario-category">Caching / Degradation</span>
              <h3 class="scenario-name">4. Cache Failure</h3>
            </div>
            <span class="scenario-status-pill ${f4.active ? 'active' : 'inactive'}">
              ${f4.active ? 'ACTIVE (OUTAGE)' : 'INACTIVE (AVAILABLE)'}
            </span>
          </div>

          <p class="scenario-desc">${f4.description || 'Simulates cache cluster unavailability, forcing fallback to database.'}</p>
          
          <div class="scenario-impact-box">
            <strong>Impact:</strong> Cache status reports UNAVAILABLE. Cache hit ratio drops to 0%, cache error logs are recorded.
          </div>

          <div class="scenario-metrics-strip">
            <div class="metric-item">
              <span class="metric-label">Cache State</span>
              <span class="metric-val ${cache.status === 'AVAILABLE' ? 'highlight-ok' : 'highlight-err'}">${cache.status || 'AVAILABLE'}</span>
            </div>
            <div class="metric-item">
              <span class="metric-label">Cache Hits</span>
              <span class="metric-val">${cache.hits || 0}</span>
            </div>
            <div class="metric-item">
              <span class="metric-label">Cache Misses</span>
              <span class="metric-val">${cache.misses || 0}</span>
            </div>
            <div class="metric-item">
              <span class="metric-label">Hit Ratio</span>
              <span class="metric-val ${cache.hitRatioPercent > 0 ? 'highlight-ok' : ''}">${cache.hitRatioPercent || 0}%</span>
            </div>
          </div>

          <div class="scenario-actions-row">
            ${f4.active ? `
              <button type="button" class="btn-fault-resolve" data-action="resolve-fault" data-scenario="cache_failure">
                ✓ Resolve Fault (Restore Cache)
              </button>
            ` : `
              <button type="button" class="btn-fault-inject" data-action="inject-fault" data-scenario="cache_failure">
                ⚡ Inject Fault (Simulate Outage)
              </button>
            `}
          </div>
        </div>

        <!-- 5. Circuit Breaker Trip -->
        <div class="scenario-card ${f5.active || cb.state !== 'CLOSED' ? 'active-fault' : ''}" id="card-circuit-breaker">
          <div class="scenario-header">
            <div class="scenario-title-box">
              <span class="scenario-category">Resilience / Cascading Failures</span>
              <h3 class="scenario-name">5. Circuit Breaker Trip</h3>
            </div>
            <span class="scenario-status-pill ${cb.state === 'OPEN' ? 'active' : 'inactive'}">
              ${cb.state === 'OPEN' ? 'STATE: OPEN (TRIPPED)' : cb.state === 'HALF_OPEN' ? 'STATE: HALF_OPEN' : 'STATE: CLOSED (HEALTHY)'}
            </span>
          </div>

          <p class="scenario-desc">${f5.description || 'Protects the inventory dependency by tripping open upon repeated failures.'}</p>
          
          <div class="scenario-impact-box">
            <strong>Impact:</strong> Consecutive failures >= 3 trip circuit to OPEN, rejecting calls with 503 until reset timeout transitions to HALF_OPEN.
          </div>

          <div class="scenario-metrics-strip">
            <div class="metric-item">
              <span class="metric-label">Circuit State</span>
              <span class="metric-val ${cb.state === 'CLOSED' ? 'highlight-ok' : cb.state === 'HALF_OPEN' ? 'highlight-warn' : 'highlight-err'}">${cb.state || 'CLOSED'}</span>
            </div>
            <div class="metric-item">
              <span class="metric-label">Failures Count</span>
              <span class="metric-val">${cb.failureCount || 0} / ${cb.failureThreshold || 3}</span>
            </div>
            <div class="metric-item">
              <span class="metric-label">Fast Rejections</span>
              <span class="metric-val ${cb.totalRejections > 0 ? 'highlight-warn' : ''}">${cb.totalRejections || 0}</span>
            </div>
            <div class="metric-item">
              <span class="metric-label">Reset Timeout</span>
              <span class="metric-val">${cb.remainingResetMs > 0 ? `${Math.ceil(cb.remainingResetMs / 1000)}s left` : '5000 ms'}</span>
            </div>
          </div>

          <div class="scenario-actions-row">
            ${cb.state !== 'CLOSED' || f5.active ? `
              <button type="button" class="btn-fault-resolve" data-action="resolve-fault" data-scenario="circuit_breaker_trip">
                ✓ Resolve Fault (Reset to CLOSED)
              </button>
              ${cb.state === 'OPEN' ? `
                <button type="button" class="btn btn-outline btn-sm" data-action="probe-cb" style="color: #38bdf8; border-color: #0284c7;">
                  🔍 Test Probe (HALF_OPEN)
                </button>
              ` : ''}
            ` : `
              <button type="button" class="btn-fault-inject" data-action="inject-fault" data-scenario="circuit_breaker_trip">
                ⚡ Inject Fault (Trip to OPEN)
              </button>
            `}
          </div>
        </div>

      </div>
    `;
  }

  // ================= METRICS TAB =================
  renderMetricsView() {
    const metrics = this.state.metrics || {};
    return `
      <div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
          <h4 style="font-size: 1.1rem; font-weight: 700;">Live Observability Metrics (GET /api/observability/metrics)</h4>
          <span style="font-size: 0.8rem; color: #94a3b8;">Refreshed at: ${metrics.timestamp || new Date().toISOString()}</span>
        </div>
        <div class="json-viewer-box">${escapeHtml(JSON.stringify(metrics, null, 2))}</div>
      </div>
    `;
  }

  // ================= LOGS TAB =================
  renderLogsView() {
    const logs = this.state.logs || [];
    if (logs.length === 0) {
      return `<div style="text-align: center; padding: 3rem; color: #64748b;">No logs recorded yet.</div>`;
    }

    const rows = logs.map(l => `
      <div class="log-row ${l.severity}">
        <span class="log-time">${l.timestamp.split('T')[1].slice(0, 8)}</span>
        <span class="log-service">[${escapeHtml(l.service)}]</span>
        <span style="font-weight: 700; color: ${l.severity === 'ERROR' ? '#ef4444' : l.severity === 'WARN' ? '#f59e0b' : '#38bdf8'}">${l.severity}</span>
        <span class="log-msg">${escapeHtml(l.message)}</span>
        ${l.durationMs ? `<span style="color: #64748b;">(${l.durationMs}ms)</span>` : ''}
      </div>
    `).join('');

    return `
      <div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
          <h4 style="font-size: 1.1rem; font-weight: 700;">Structured JSON Log Stream (GET /api/observability/logs)</h4>
          <span style="font-size: 0.8rem; color: #94a3b8;">PII Sanitized • Showing last ${logs.length} logs</span>
        </div>
        <div class="logs-console">${rows}</div>
      </div>
    `;
  }

  // ================= SERVICES TAB =================
  renderServicesView() {
    const services = this.state.services || [];
    return `
      <div>
        <h4 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 1rem;">Internal Services & Dependency Topology</h4>
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1rem;">
          ${services.map(s => `
            <div style="background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 1rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem;">
                <strong style="color: #38bdf8; font-size: 0.95rem;">${escapeHtml(s.name)}</strong>
                <span class="scenario-status-pill ${s.status.includes('UP') ? 'inactive' : 'active'}">${escapeHtml(s.status)}</span>
              </div>
              <p style="font-size: 0.8rem; color: #94a3b8; margin-bottom: 0.75rem;">${escapeHtml(s.description)}</p>
              <div style="font-size: 0.75rem; color: #64748b;">
                <strong>Dependencies:</strong> ${s.dependencies.length > 0 ? s.dependencies.join(', ') : 'None'}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // ================= ACTION HANDLERS =================
  async injectFault(scenario) {
    try {
      const res = await fetch('/api/faults/inject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario })
      });
      const json = await res.json();
      if (json.success) {
        showToast(`Injected "${scenario}" fault successfully`, 'success');
        await this.refreshAll();
      } else {
        showToast(json.error || 'Failed to inject fault', 'error');
      }
    } catch (e) {
      showToast('API connection error', 'error');
    }
  }

  async resolveFault(scenario) {
    try {
      const res = await fetch('/api/faults/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario })
      });
      const json = await res.json();
      if (json.success) {
        showToast(`Resolved "${scenario}" fault`, 'success');
        await this.refreshAll();
      } else {
        showToast(json.error || 'Failed to resolve fault', 'error');
      }
    } catch (e) {
      showToast('API connection error', 'error');
    }
  }

  async resetAllFaults() {
    try {
      const res = await fetch('/api/faults/reset', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        showToast('All fault scenarios reset to healthy baseline', 'success');
        await this.refreshAll();
      } else {
        showToast(json.error || 'Failed to reset faults', 'error');
      }
    } catch (e) {
      showToast('API connection error', 'error');
    }
  }

  async probeCircuitBreaker() {
    try {
      const res = await fetch('/api/faults/circuit-breaker/probe', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        showToast('Circuit breaker transitioned to HALF_OPEN probe mode', 'success');
        await this.refreshAll();
      }
    } catch (e) {
      showToast('Failed to trigger probe', 'error');
    }
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

document.addEventListener('DOMContentLoaded', () => {
  const lab = new ReliabilityLab();
  window.reliabilityLab = lab;
  lab.init();
});
