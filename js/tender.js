// js/tender.js
// Tender Detail Page Logic for Tenderix

// Current tender data
let currentTender = null;
let currentTab = 'gates';

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
  // Check authentication
  const isAuthed = await Auth.requireAuth();
  if (!isAuthed) return;

  // Get tender ID from URL
  const tenderId = Utils.getUrlParam('id');
  if (!tenderId) {
    Utils.showToast('error', 'מכרז לא נמצא', '');
    Utils.navigate(CONFIG.ROUTES.DASHBOARD);
    return;
  }

  // Initialize tender page
  await initTenderPage(tenderId);
});

async function initTenderPage(tenderId) {
  try {
    Utils.showLoading(true, 'טוען מכרז...');

    // Load tender data
    currentTender = await API.Tender.getById(tenderId);

    if (!currentTender) {
      Utils.showToast('error', 'מכרז לא נמצא', '');
      Utils.navigate(CONFIG.ROUTES.DASHBOARD);
      return;
    }

    // Render tender header
    renderTenderHeader(currentTender);

    // Setup tabs
    setupTabs();

    // Load initial tab content
    await loadTabContent(currentTab);

    // Setup event listeners
    setupEventListeners();

    // Log activity
    API.Activity.log(tenderId, 'view', { page: 'detail' });

  } catch (error) {
    console.error('Failed to load tender:', error);
    Utils.showToast('error', 'שגיאה בטעינת המכרז', error.message);
  } finally {
    Utils.showLoading(false);
  }
}

// ============================================
// RENDER HEADER
// ============================================

function renderTenderHeader(tender) {
  // Tender name and meta
  const titleEl = document.getElementById('tender-title');
  if (titleEl) titleEl.textContent = tender.name || 'ללא שם';

  const numberEl = document.getElementById('tender-number');
  if (numberEl) numberEl.textContent = `#${tender.tender_number || '---'}`;

  const orgEl = document.getElementById('tender-org');
  if (orgEl) orgEl.textContent = tender.organizations?.name || 'לא צוין';

  // Status badge
  const statusEl = document.getElementById('tender-status');
  if (statusEl) {
    statusEl.textContent = Utils.getStatusLabel(tender.status);
    statusEl.className = `status-badge ${tender.status}`;
  }

  // Score ring
  renderScoreRing(tender.ai_score);

  // Quick stats
  renderQuickStats(tender);

  // Deadline
  const deadlineEl = document.getElementById('tender-deadline');
  if (deadlineEl) {
    const days = Utils.getDaysRemaining(tender.deadline);
    deadlineEl.innerHTML = `
      <span class="deadline-value ${Utils.isUrgent(tender.deadline) ? 'urgent' : ''}">
        ${Utils.formatDaysRemaining(tender.deadline)}
      </span>
      <span class="deadline-date">${Utils.formatDate(tender.deadline)}</span>
    `;
  }

  // Value
  const valueEl = document.getElementById('tender-value');
  if (valueEl) {
    valueEl.textContent = Utils.formatCurrency(tender.estimated_value);
  }
}

function renderScoreRing(score) {
  const container = document.getElementById('score-ring');
  if (!container) return;

  const circumference = 2 * Math.PI * 54;
  const offset = circumference - ((score || 0) / 100) * circumference;
  const color = Utils.getScoreColor(score);

  container.innerHTML = `
    <svg class="score-ring-svg" width="120" height="120" viewBox="0 0 120 120">
      <defs>
        <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style="stop-color: ${color}"/>
          <stop offset="100%" style="stop-color: ${color}88"/>
        </linearGradient>
      </defs>
      <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="8"/>
      <circle cx="60" cy="60" r="54" fill="none"
              stroke="url(#scoreGradient)"
              stroke-width="8"
              stroke-linecap="round"
              stroke-dasharray="${circumference}"
              stroke-dashoffset="${offset}"
              transform="rotate(-90 60 60)"
              class="score-ring-progress"/>
    </svg>
    <div class="score-ring-value">
      <span class="score-number" style="color: ${color}">${score || '--'}</span>
      <span class="score-label">ציון AI</span>
    </div>
  `;
}

function renderQuickStats(tender) {
  const container = document.getElementById('quick-stats');
  if (!container) return;

  const gatesStats = tender.gate_conditions ? {
    total: tender.gate_conditions.length,
    passed: tender.gate_conditions.filter(g => g.status === 'passed').length,
    failed: tender.gate_conditions.filter(g => g.status === 'failed').length
  } : { total: 0, passed: 0, failed: 0 };

  const competitorsCount = tender.competitors?.length || 0;

  container.innerHTML = `
    <div class="quick-stat">
      <div class="quick-stat-value">${gatesStats.total}</div>
      <div class="quick-stat-label">תנאי סף</div>
    </div>
    <div class="quick-stat success">
      <div class="quick-stat-value">${gatesStats.passed}</div>
      <div class="quick-stat-label">עומדים</div>
    </div>
    <div class="quick-stat danger">
      <div class="quick-stat-value">${gatesStats.failed}</div>
      <div class="quick-stat-label">לא עומדים</div>
    </div>
    <div class="quick-stat">
      <div class="quick-stat-value">${competitorsCount}</div>
      <div class="quick-stat-label">מתחרים</div>
    </div>
  `;
}

// ============================================
// TAB NAVIGATION
// ============================================

function setupTabs() {
  const tabs = document.querySelectorAll('.tab-btn');

  tabs.forEach(tab => {
    tab.addEventListener('click', async () => {
      const tabId = tab.dataset.tab;
      await switchTab(tabId);
    });
  });

  // Check URL for initial tab
  const urlTab = Utils.getUrlParam('tab');
  if (urlTab && ['gates', 'specs', 'competitors', 'decision'].includes(urlTab)) {
    currentTab = urlTab;
  }

  // Highlight current tab
  updateTabHighlight(currentTab);
}

async function switchTab(tabId) {
  if (tabId === currentTab) return;

  // Update current tab
  currentTab = tabId;

  // Update URL
  Utils.updateUrlParams({ tab: tabId });

  // Update tab highlight
  updateTabHighlight(tabId);

  // Load tab content
  await loadTabContent(tabId);
}

function updateTabHighlight(tabId) {
  const tabs = document.querySelectorAll('.tab-btn');
  const panels = document.querySelectorAll('.tab-panel');

  tabs.forEach(tab => {
    if (tab.dataset.tab === tabId) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });

  panels.forEach(panel => {
    if (panel.id === `panel-${tabId}`) {
      panel.classList.add('active');
      panel.style.display = 'block';
    } else {
      panel.classList.remove('active');
      panel.style.display = 'none';
    }
  });
}

async function loadTabContent(tabId) {
  const panel = document.getElementById(`panel-${tabId}`);
  if (!panel) return;

  // Show loading
  Utils.showSkeleton(panel, 4);

  try {
    switch (tabId) {
      case 'gates':
        await loadGatesTab(panel);
        break;
      case 'specs':
        await loadSpecsTab(panel);
        break;
      case 'competitors':
        await loadCompetitorsTab(panel);
        break;
      case 'decision':
        await loadDecisionTab(panel);
        break;
    }
  } catch (error) {
    console.error(`Failed to load ${tabId} tab:`, error);
    panel.innerHTML = `
      <div class="error-state">
        <p>שגיאה בטעינת הנתונים</p>
        <button onclick="loadTabContent('${tabId}')" class="btn-secondary">נסה שנית</button>
      </div>
    `;
  }
}

// ============================================
// GATES TAB
// ============================================

async function loadGatesTab(panel) {
  const gates = currentTender.gate_conditions || await API.Gate.getByTender(currentTender.id);

  if (!gates || gates.length === 0) {
    panel.innerHTML = `
      <div class="empty-state">
        <h3>אין תנאי סף</h3>
        <p>לחץ לניתוח תנאי הסף במכרז</p>
        <button onclick="analyzeGates()" class="btn-primary">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
          </svg>
          נתח תנאי סף
        </button>
      </div>
    `;
    return;
  }

  // Group gates by status
  const passed = gates.filter(g => g.status === 'passed');
  const failed = gates.filter(g => g.status === 'failed');
  const pending = gates.filter(g => g.status === 'pending' || !g.status);

  panel.innerHTML = `
    <div class="gates-header">
      <div class="gates-summary">
        <div class="gate-count passed">${passed.length} עומדים</div>
        <div class="gate-count failed">${failed.length} לא עומדים</div>
        <div class="gate-count pending">${pending.length} לבדיקה</div>
      </div>
      <button onclick="analyzeGates()" class="btn-secondary">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
        </svg>
        נתח מחדש
      </button>
    </div>

    <div class="gates-list">
      ${gates.map((gate, i) => renderGateCard(gate, i)).join('')}
    </div>
  `;
}

function renderGateCard(gate, index) {
  const statusIcon = {
    passed: '✓',
    failed: '✕',
    pending: '?',
    partial: '~'
  };

  return `
    <div class="gate-card ${gate.status || 'pending'} animate-fade-in" style="animation-delay: ${index * 0.05}s">
      <div class="gate-status">
        <div class="gate-status-icon ${gate.status || 'pending'}">
          ${statusIcon[gate.status] || '?'}
        </div>
      </div>
      <div class="gate-content">
        <h4 class="gate-title">${gate.condition_name || `תנאי ${index + 1}`}</h4>
        <p class="gate-description">${gate.description || ''}</p>
        ${gate.notes ? `<p class="gate-notes">${gate.notes}</p>` : ''}
        ${gate.recommendation ? `
          <div class="gate-recommendation">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
            </svg>
            ${gate.recommendation}
          </div>
        ` : ''}
      </div>
      <div class="gate-actions">
        <select class="gate-status-select" onchange="updateGateStatus('${gate.id}', this.value)">
          <option value="pending" ${gate.status === 'pending' ? 'selected' : ''}>לבדיקה</option>
          <option value="passed" ${gate.status === 'passed' ? 'selected' : ''}>עומד</option>
          <option value="failed" ${gate.status === 'failed' ? 'selected' : ''}>לא עומד</option>
          <option value="partial" ${gate.status === 'partial' ? 'selected' : ''}>חלקי</option>
        </select>
      </div>
    </div>
  `;
}

async function analyzeGates() {
  try {
    Utils.showLoading(true, 'מנתח תנאי סף...');
    await N8N.analyzeGateConditions(currentTender.id);

    // Refresh tender data
    currentTender = await API.Tender.getById(currentTender.id);

    // Reload tab
    await loadGatesTab(document.getElementById('panel-gates'));

  } catch (error) {
    console.error('Gate analysis failed:', error);
  } finally {
    Utils.showLoading(false);
  }
}

async function updateGateStatus(gateId, status) {
  try {
    await API.Gate.updateStatus(gateId, status);
    Utils.showToast('success', 'הסטטוס עודכן', '');

    // Update the card visually
    const card = document.querySelector(`.gate-card [onchange*="${gateId}"]`)?.closest('.gate-card');
    if (card) {
      card.className = `gate-card ${status} animate-fade-in`;
      const icon = card.querySelector('.gate-status-icon');
      if (icon) {
        icon.className = `gate-status-icon ${status}`;
        icon.textContent = status === 'passed' ? '✓' : status === 'failed' ? '✕' : '?';
      }
    }

    // Recalculate stats
    renderQuickStats(await API.Tender.getById(currentTender.id));

  } catch (error) {
    console.error('Failed to update gate status:', error);
    Utils.showToast('error', 'שגיאה בעדכון', error.message);
  }
}

// ============================================
// SPECIFICATIONS TAB
// ============================================

async function loadSpecsTab(panel) {
  const specs = currentTender.specifications || await API.Spec.getByTender(currentTender.id);

  if (!specs || specs.length === 0) {
    panel.innerHTML = `
      <div class="empty-state">
        <h3>אין מפרט טכני</h3>
        <p>לחץ לניתוח המפרט הטכני במכרז</p>
        <button onclick="analyzeSpecs()" class="btn-primary">נתח מפרט</button>
      </div>
    `;
    return;
  }

  panel.innerHTML = `
    <div class="specs-header">
      <h3>${specs.length} סעיפים במפרט</h3>
      <button onclick="analyzeSpecs()" class="btn-secondary">נתח מחדש</button>
    </div>

    <div class="specs-list">
      ${specs.map((spec, i) => renderSpecCard(spec, i)).join('')}
    </div>
  `;
}

function renderSpecCard(spec, index) {
  return `
    <div class="spec-card animate-fade-in" style="animation-delay: ${index * 0.05}s">
      <div class="spec-header">
        <span class="spec-number">${spec.section_number || index + 1}</span>
        <h4 class="spec-title">${spec.title || `סעיף ${index + 1}`}</h4>
      </div>
      <div class="spec-content">
        <p>${spec.description || ''}</p>
        ${spec.requirements ? `
          <div class="spec-requirements">
            <strong>דרישות:</strong>
            <ul>
              ${spec.requirements.map(r => `<li>${r}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
        ${spec.ai_analysis ? `
          <div class="spec-analysis">
            <div class="analysis-header">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
              </svg>
              ניתוח AI
            </div>
            <p>${spec.ai_analysis}</p>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

async function analyzeSpecs() {
  try {
    Utils.showLoading(true, 'מנתח מפרט...');
    await N8N.analyzeSpecifications(currentTender.id);
    currentTender = await API.Tender.getById(currentTender.id);
    await loadSpecsTab(document.getElementById('panel-specs'));
  } catch (error) {
    console.error('Spec analysis failed:', error);
  } finally {
    Utils.showLoading(false);
  }
}

// ============================================
// COMPETITORS TAB
// ============================================

async function loadCompetitorsTab(panel) {
  const competitors = currentTender.competitors || await API.Competitor.getByTender(currentTender.id);

  if (!competitors || competitors.length === 0) {
    panel.innerHTML = `
      <div class="empty-state">
        <h3>אין מידע על מתחרים</h3>
        <p>לחץ לאיסוף מודיעין תחרותי</p>
        <button onclick="analyzeCompetitors()" class="btn-primary">אסוף מודיעין</button>
      </div>
    `;
    return;
  }

  panel.innerHTML = `
    <div class="competitors-header">
      <h3>${competitors.length} מתחרים זוהו</h3>
      <button onclick="analyzeCompetitors()" class="btn-secondary">עדכן מודיעין</button>
    </div>

    <div class="competitors-grid">
      ${competitors.map((comp, i) => renderCompetitorCard(comp, i)).join('')}
    </div>
  `;
}

function renderCompetitorCard(competitor, index) {
  const threatColors = {
    high: 'danger',
    medium: 'warning',
    low: 'success'
  };

  return `
    <div class="competitor-card animate-fade-in" style="animation-delay: ${index * 0.05}s">
      <div class="competitor-header">
        <div class="competitor-avatar">
          ${competitor.company_name?.charAt(0) || '?'}
        </div>
        <div class="competitor-info">
          <h4 class="competitor-name">${competitor.company_name || 'לא ידוע'}</h4>
          <span class="threat-badge ${threatColors[competitor.threat_level] || 'default'}">
            ${competitor.threat_level === 'high' ? 'איום גבוה' :
              competitor.threat_level === 'medium' ? 'איום בינוני' : 'איום נמוך'}
          </span>
        </div>
      </div>

      <div class="competitor-stats">
        <div class="comp-stat">
          <span class="comp-stat-value">${competitor.win_rate || '--'}%</span>
          <span class="comp-stat-label">אחוז זכייה</span>
        </div>
        <div class="comp-stat">
          <span class="comp-stat-value">${competitor.past_wins || 0}</span>
          <span class="comp-stat-label">זכיות</span>
        </div>
        <div class="comp-stat">
          <span class="comp-stat-value">${competitor.estimated_win_probability || '--'}%</span>
          <span class="comp-stat-label">סיכוי לזכות</span>
        </div>
      </div>

      ${competitor.strengths ? `
        <div class="competitor-section">
          <strong>חוזקות:</strong>
          <ul>${competitor.strengths.map(s => `<li>${s}</li>`).join('')}</ul>
        </div>
      ` : ''}

      ${competitor.weaknesses ? `
        <div class="competitor-section">
          <strong>חולשות:</strong>
          <ul>${competitor.weaknesses.map(w => `<li>${w}</li>`).join('')}</ul>
        </div>
      ` : ''}

      ${competitor.strategy_recommendation ? `
        <div class="competitor-strategy">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
          </svg>
          <span>${competitor.strategy_recommendation}</span>
        </div>
      ` : ''}
    </div>
  `;
}

async function analyzeCompetitors() {
  try {
    Utils.showLoading(true, 'אוסף מודיעין תחרותי...');
    await N8N.getCompetitorIntelligence(currentTender.id);
    currentTender = await API.Tender.getById(currentTender.id);
    await loadCompetitorsTab(document.getElementById('panel-competitors'));
  } catch (error) {
    console.error('Competitor analysis failed:', error);
  } finally {
    Utils.showLoading(false);
  }
}

// ============================================
// DECISION TAB
// ============================================

async function loadDecisionTab(panel) {
  // Check if we have a decision
  const hasDecision = currentTender.decision_recommendation;

  if (!hasDecision) {
    panel.innerHTML = `
      <div class="decision-generate">
        <div class="decision-icon">
          <svg class="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </div>
        <h3>מוכן לקבל החלטה?</h3>
        <p>ה-AI ינתח את כל הנתונים ויספק המלצת GO/NO-GO</p>
        <button onclick="generateDecision()" class="btn-primary btn-large">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
          </svg>
          חשב החלטה
        </button>
      </div>
    `;
    return;
  }

  const isGo = currentTender.decision_recommendation === 'GO';

  panel.innerHTML = `
    <div class="decision-result ${isGo ? 'go' : 'no-go'}">
      <div class="decision-badge ${isGo ? 'go' : 'no-go'}">
        ${isGo ? 'GO' : 'NO-GO'}
      </div>

      <div class="decision-score">
        <div class="decision-score-ring">
          ${renderDecisionRing(currentTender.ai_score)}
        </div>
        <div class="decision-score-label">
          ציון כולל: ${currentTender.ai_score}/100
        </div>
      </div>

      <div class="decision-summary">
        <h4>סיכום ההחלטה</h4>
        <p>${currentTender.decision_summary || ''}</p>
      </div>

      ${currentTender.decision_factors ? `
        <div class="decision-factors">
          <h4>גורמים מרכזיים</h4>
          <div class="factors-grid">
            ${renderDecisionFactors(currentTender.decision_factors)}
          </div>
        </div>
      ` : ''}

      ${currentTender.action_items ? `
        <div class="decision-actions">
          <h4>צעדים הבאים</h4>
          <ul class="action-list">
            ${currentTender.action_items.map(item => `
              <li class="action-item">
                <input type="checkbox" id="action-${item.id}" ${item.completed ? 'checked' : ''}>
                <label for="action-${item.id}">${item.text}</label>
              </li>
            `).join('')}
          </ul>
        </div>
      ` : ''}

      <div class="decision-buttons">
        <button onclick="generateDecision()" class="btn-secondary">חשב מחדש</button>
        <button onclick="exportDecision()" class="btn-primary">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
          </svg>
          ייצא דוח
        </button>
      </div>
    </div>
  `;
}

function renderDecisionRing(score) {
  const color = score >= 70 ? '#10B981' : score >= 50 ? '#F59E0B' : '#EF4444';
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (score / 100) * circumference;

  return `
    <svg width="100" height="100" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="6"/>
      <circle cx="50" cy="50" r="45" fill="none" stroke="${color}" stroke-width="6"
              stroke-linecap="round" stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"
              transform="rotate(-90 50 50)"/>
      <text x="50" y="55" text-anchor="middle" fill="${color}" font-size="24" font-weight="bold">${score}</text>
    </svg>
  `;
}

function renderDecisionFactors(factors) {
  return Object.entries(factors).map(([key, value]) => `
    <div class="factor-item">
      <div class="factor-label">${key}</div>
      <div class="factor-bar">
        <div class="factor-fill" style="width: ${value}%; background: ${value >= 70 ? '#10B981' : value >= 50 ? '#F59E0B' : '#EF4444'}"></div>
      </div>
      <div class="factor-value">${value}%</div>
    </div>
  `).join('');
}

async function generateDecision() {
  try {
    Utils.showLoading(true, 'מחשב החלטה...');
    await N8N.generateDecision(currentTender.id);
    currentTender = await API.Tender.getById(currentTender.id);
    await loadDecisionTab(document.getElementById('panel-decision'));
  } catch (error) {
    console.error('Decision generation failed:', error);
  } finally {
    Utils.showLoading(false);
  }
}

async function exportDecision() {
  await N8N.exportReport(currentTender.id, { format: 'pdf' });
}

// ============================================
// EVENT LISTENERS
// ============================================

function setupEventListeners() {
  // Back button
  const backBtn = document.getElementById('back-btn');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      Utils.navigate(CONFIG.ROUTES.DASHBOARD);
    });
  }

  // Full analysis button
  const analyzeBtn = document.getElementById('analyze-all-btn');
  if (analyzeBtn) {
    analyzeBtn.addEventListener('click', async () => {
      try {
        Utils.showLoading(true, 'מבצע ניתוח מלא...');
        await N8N.analyzeFullTender(currentTender.id);
        currentTender = await API.Tender.getById(currentTender.id);
        await loadTabContent(currentTab);
        renderTenderHeader(currentTender);
      } catch (error) {
        console.error('Full analysis failed:', error);
      } finally {
        Utils.showLoading(false);
      }
    });
  }

  // Export button
  const exportBtn = document.getElementById('export-btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      N8N.exportReport(currentTender.id);
    });
  }
}

// Export functions for inline handlers
window.analyzeGates = analyzeGates;
window.analyzeSpecs = analyzeSpecs;
window.analyzeCompetitors = analyzeCompetitors;
window.generateDecision = generateDecision;
window.exportDecision = exportDecision;
window.updateGateStatus = updateGateStatus;
window.loadTabContent = loadTabContent;

console.log('Tenderix Tender Page loaded');
