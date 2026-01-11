// js/dashboard.js
// Dashboard Page Logic for Tenderix

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
  // Check authentication - redirect to login if not authenticated
  try {
    await Auth.requireAuth('tenderix-login.html');
  } catch (error) {
    console.error('Auth check failed:', error);
    return;
  }

  // Initialize dashboard
  await initDashboard();
});

async function initDashboard() {
  try {
    Utils.showLoading(true, 'טוען דשבורד...');

    // Load user data
    await loadUserInfo();

    // Load all dashboard data in parallel
    await Promise.all([
      loadDashboardStats(),
      loadTenderList(),
      loadUpcomingDeadlines(),
      loadAIRecommendations(),
      loadRecentActivity()
    ]);

    // Setup event listeners
    setupEventListeners();

    // Setup real-time updates
    setupRealtimeUpdates();

    // Setup file upload
    setupFileUpload();

  } catch (error) {
    console.error('Dashboard init failed:', error);
    Utils.showToast('error', 'שגיאה בטעינת הדשבורד', error.message);
  } finally {
    Utils.showLoading(false);
  }
}

// ============================================
// USER INFO
// ============================================

async function loadUserInfo() {
  try {
    const user = await Auth.getCurrentUser();
    if (!user) {
      window.location.href = 'tenderix-login.html';
      return;
    }

    const metadata = user.user_metadata || {};
    const displayName = metadata.full_name || metadata.name || user.email?.split('@')[0] || 'משתמש';
    const firstName = displayName.split(' ')[0];
    const initial = displayName.charAt(0).toUpperCase();

    // Update sidebar avatar
    const sidebarAvatar = document.getElementById('sidebar-avatar');
    if (sidebarAvatar) {
      if (metadata.avatar_url) {
        sidebarAvatar.innerHTML = `<img src="${metadata.avatar_url}" alt="Avatar" class="w-full h-full rounded-full object-cover">`;
      } else {
        sidebarAvatar.textContent = initial;
      }
    }

    // Update sidebar name and email
    const sidebarName = document.getElementById('sidebar-name');
    const sidebarEmail = document.getElementById('sidebar-email');
    if (sidebarName) sidebarName.textContent = displayName;
    if (sidebarEmail) sidebarEmail.textContent = user.email || '';

    // Update header greeting
    const headerGreeting = document.getElementById('header-greeting');
    if (headerGreeting) {
      headerGreeting.textContent = `שלום, ${firstName} 👋`;
    }

    // Update header subtitle with pending tender count
    const headerSubtitle = document.getElementById('header-subtitle');
    if (headerSubtitle) {
      try {
        const stats = await API.Analytics.getDashboardStats();
        const pendingCount = stats?.pendingDecisions || 0;
        if (pendingCount > 0) {
          headerSubtitle.textContent = `יש לך ${pendingCount} מכרזים חדשים לבדיקה היום`;
        } else {
          headerSubtitle.textContent = 'אין מכרזים חדשים לבדיקה';
        }
      } catch (e) {
        headerSubtitle.textContent = 'ברוך הבא לדשבורד';
      }
    }

  } catch (error) {
    console.error('Failed to load user info:', error);
    // Redirect to login on auth error
    window.location.href = 'tenderix-login.html';
  }
}

// ============================================
// DASHBOARD STATS
// ============================================

async function loadDashboardStats() {
  try {
    const stats = await API.Analytics.getDashboardStats();
    renderStats(stats);
  } catch (error) {
    console.error('Failed to load stats:', error);
  }
}

function renderStats(stats) {
  // Active tenders
  const activeTendersEl = document.getElementById('stat-active-tenders');
  if (activeTendersEl) {
    animateNumber(activeTendersEl, stats.activeTenders);
  }

  // Pipeline value
  const pipelineValueEl = document.getElementById('stat-pipeline-value');
  if (pipelineValueEl) {
    pipelineValueEl.textContent = Utils.formatCurrency(stats.totalValue, { compact: true });
  }

  // Win rate
  const winRateEl = document.getElementById('stat-win-rate');
  if (winRateEl) {
    animateNumber(winRateEl, stats.winRate, '%');
  }

  // Pending decisions
  const pendingEl = document.getElementById('stat-pending-decisions');
  if (pendingEl) {
    animateNumber(pendingEl, stats.pendingDecisions);
  }

  // Urgent deadlines badge
  if (stats.urgentDeadlines > 0) {
    const badge = document.getElementById('urgent-badge');
    if (badge) {
      badge.textContent = stats.urgentDeadlines;
      badge.style.display = 'flex';
    }
  }
}

function animateNumber(element, target, suffix = '') {
  const duration = 1000;
  const start = parseInt(element.textContent) || 0;
  const increment = (target - start) / (duration / 16);
  let current = start;

  const animate = () => {
    current += increment;
    if ((increment > 0 && current >= target) || (increment < 0 && current <= target)) {
      element.textContent = target + suffix;
    } else {
      element.textContent = Math.round(current) + suffix;
      requestAnimationFrame(animate);
    }
  };

  animate();
}

// ============================================
// TENDER LIST
// ============================================

async function loadTenderList(options = {}) {
  try {
    const container = document.getElementById('tender-list');
    if (!container) return;

    // Show loading skeleton
    Utils.showSkeleton(container, 5);

    // Fetch tenders
    const { data: tenders } = await API.Tender.getAll({
      status: options.status,
      search: options.search,
      ...options
    });

    renderTenderList(tenders, container);

  } catch (error) {
    console.error('Failed to load tenders:', error);
    const container = document.getElementById('tender-list');
    if (container) {
      container.innerHTML = `
        <div class="empty-state">
          <p>שגיאה בטעינת המכרזים</p>
          <button onclick="loadTenderList()" class="btn-secondary">נסה שנית</button>
        </div>
      `;
    }
  }
}

function renderTenderList(tenders, container) {
  if (!tenders || tenders.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">
          <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
        </div>
        <h3 class="empty-state-title">אין מכרזים פעילים</h3>
        <p class="empty-state-desc">העלה מכרז חדש כדי להתחיל</p>
        <button onclick="openUploadModal()" class="btn-primary">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
          </svg>
          העלה מכרז
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = tenders.map((tender, index) => `
    <div class="tender-card animate-fade-in"
         style="animation-delay: ${index * 0.05}s"
         data-id="${tender.id}"
         onclick="openTender('${tender.id}')">

      <!-- Score Ring -->
      <div class="tender-score">
        <svg class="score-ring" width="64" height="64" viewBox="0 0 64 64">
          <defs>
            <linearGradient id="scoreGradient-${tender.id}" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" style="stop-color: ${Utils.getScoreColor(tender.ai_score)}"/>
              <stop offset="100%" style="stop-color: ${Utils.getScoreColor(tender.ai_score)}88"/>
            </linearGradient>
          </defs>
          <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="4"/>
          <circle cx="32" cy="32" r="28" fill="none"
                  stroke="url(#scoreGradient-${tender.id})"
                  stroke-width="4"
                  stroke-linecap="round"
                  stroke-dasharray="${((tender.ai_score || 0) / 100) * 176} 176"
                  transform="rotate(-90 32 32)"/>
        </svg>
        <div class="score-value ${Utils.getScoreClass(tender.ai_score)}">
          ${tender.ai_score || '--'}
        </div>
      </div>

      <!-- Tender Info -->
      <div class="tender-info">
        <div class="tender-meta">
          <span class="status-badge ${tender.status}">${Utils.getStatusLabel(tender.status)}</span>
          <span class="tender-number">#${tender.tender_number || '---'}</span>
        </div>
        <h3 class="tender-name">${tender.name || 'ללא שם'}</h3>
        <p class="tender-org">${tender.organizations?.name || 'לא צוין'}</p>

        <div class="tender-progress">
          <div class="progress-header">
            <span>התקדמות</span>
            <span>${tender.progress || 0}%</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${tender.progress || 0}%"></div>
          </div>
        </div>
      </div>

      <!-- Tender Stats -->
      <div class="tender-stats">
        <div class="tender-value">${Utils.formatCurrency(tender.estimated_value, { compact: true })}</div>
        <div class="tender-deadline ${Utils.isUrgent(tender.deadline) ? 'urgent' : ''}">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          ${Utils.formatDaysRemaining(tender.deadline)}
        </div>
      </div>

      <!-- Hover Actions -->
      <div class="tender-actions">
        <button class="action-btn" onclick="event.stopPropagation(); analyzeTender('${tender.id}')" title="נתח">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
          </svg>
        </button>
        <button class="action-btn" onclick="event.stopPropagation(); exportTender('${tender.id}')" title="ייצא">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
          </svg>
        </button>
      </div>
    </div>
  `).join('');
}

// ============================================
// DEADLINES
// ============================================

async function loadUpcomingDeadlines() {
  try {
    const container = document.getElementById('deadlines-list');
    if (!container) return;

    const deadlines = await API.Tender.getUpcomingDeadlines(14);
    renderDeadlines(deadlines, container);

  } catch (error) {
    console.error('Failed to load deadlines:', error);
  }
}

function renderDeadlines(deadlines, container) {
  if (!deadlines || deadlines.length === 0) {
    container.innerHTML = `
      <div class="empty-mini">
        <p style="color: var(--text-muted);">אין מועדים קרובים</p>
      </div>
    `;
    return;
  }

  container.innerHTML = deadlines.map(d => {
    const days = Utils.getDaysRemaining(d.deadline);
    const isUrgent = days <= 3;

    return `
      <div class="deadline-item ${isUrgent ? 'urgent' : ''}" onclick="openTender('${d.id}')">
        <div class="deadline-days ${isUrgent ? 'urgent' : days <= 7 ? 'warning' : 'normal'}">
          ${days}
        </div>
        <div class="deadline-info">
          <div class="deadline-name">${Utils.truncate(d.name, 30)}</div>
          <div class="deadline-date">${Utils.formatDate(d.deadline)}</div>
        </div>
        ${d.ai_score ? `<div class="deadline-score ${Utils.getScoreClass(d.ai_score)}">${d.ai_score}</div>` : ''}
      </div>
    `;
  }).join('');
}

// ============================================
// AI RECOMMENDATIONS
// ============================================

async function loadAIRecommendations() {
  try {
    const container = document.getElementById('ai-recommendations');
    if (!container) return;

    // Generate recommendations based on real data
    const stats = await API.Analytics.getDashboardStats();
    const recommendations = [];

    // Add recommendations based on real stats
    if (stats.urgentDeadlines > 0) {
      recommendations.push({
        type: 'warning',
        priority: 'high',
        title: 'מועדים דחופים',
        description: stats.urgentDeadlines + ' מכרזים עם דדליין ב-3 הימים הקרובים',
        action: 'צפה ברשימה'
      });
    }

    if (stats.pendingDecisions > 0) {
      recommendations.push({
        type: 'opportunity',
        priority: 'medium',
        title: 'ממתינים להחלטה',
        description: stats.pendingDecisions + ' מכרזים דורשים את תשומת ליבך',
        action: 'צפה במכרזים'
      });
    }

    if (stats.total > 0 && stats.winRate > 0) {
      recommendations.push({
        type: 'insight',
        priority: 'low',
        title: 'אחוז זכייה',
        description: 'אחוז הזכייה שלך עומד על ' + stats.winRate + '%',
        action: 'צפה בנתונים'
      });
    }

    if (recommendations.length === 0) {
      container.innerHTML = '<div class="empty-mini"><p style="color: var(--text-muted);">אין המלצות חדשות</p></div>';
      return;
    }

    renderRecommendations(recommendations, container);

  } catch (error) {
    console.error('Failed to load recommendations:', error);
  }
}

function renderRecommendations(recommendations, container) {
  container.innerHTML = recommendations.map(rec => `
    <div class="ai-rec-item ${rec.type}">
      <div class="ai-rec-icon ${rec.priority}">
        ${getRecommendationIcon(rec.type)}
      </div>
      <div class="ai-rec-content">
        <div class="ai-rec-title">${rec.title}</div>
        <div class="ai-rec-desc">${rec.description}</div>
      </div>
      <button class="ai-rec-action">${rec.action} →</button>
    </div>
  `).join('');
}

function getRecommendationIcon(type) {
  const icons = {
    opportunity: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/></svg>',
    warning: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>',
    insight: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>'
  };
  return icons[type] || icons.insight;
}

// ============================================
// RECENT ACTIVITY
// ============================================

async function loadRecentActivity() {
  try {
    const container = document.getElementById('activity-feed');
    if (!container) return;

    // Fetch real activity from database
    const activities = await API.Activity.getRecent(10);

    if (!activities || activities.length === 0) {
      container.innerHTML = '<div class="empty-mini"><p style="color: var(--text-muted);">אין פעילות אחרונה</p></div>';
      return;
    }

    // Transform database records to display format
    const formattedActivities = activities.map(function(a) {
      return {
        type: a.action_type || 'info',
        text: a.description || a.action_type,
        tender: a.tender_name || '',
        time: Utils.formatRelativeTime ? Utils.formatRelativeTime(a.created_at) : ''
      };
    });

    renderActivity(formattedActivities, container);

  } catch (error) {
    console.error('Failed to load activity:', error);
    const container = document.getElementById('activity-feed');
    if (container) {
      container.innerHTML = '<div class="empty-mini"><p style="color: var(--text-muted);">אין פעילות אחרונה</p></div>';
    }
  }
}

function renderActivity(activities, container) {
  container.innerHTML = activities.map(activity => `
    <div class="activity-item">
      <div class="activity-icon ${activity.type}">
        ${getActivityIcon(activity.type)}
      </div>
      <div class="activity-content">
        <div class="activity-text">${activity.text}</div>
        <div class="activity-tender">${activity.tender}</div>
      </div>
      <div class="activity-time">${activity.time}</div>
    </div>
  `).join('');
}

function getActivityIcon(type) {
  const icons = {
    analysis: '🧠',
    upload: '📄',
    deadline: '⏰',
    win: '🏆',
    submit: '✓'
  };
  return icons[type] || '📌';
}

// ============================================
// FILE UPLOAD
// ============================================

function setupFileUpload() {
  const uploadZone = document.getElementById('upload-zone');
  const fileInput = document.getElementById('file-input');

  if (!uploadZone || !fileInput) return;

  // Drag & drop events
  ['dragenter', 'dragover'].forEach(event => {
    uploadZone.addEventListener(event, (e) => {
      e.preventDefault();
      e.stopPropagation();
      uploadZone.classList.add('drag-over');
    });
  });

  ['dragleave', 'drop'].forEach(event => {
    uploadZone.addEventListener(event, (e) => {
      e.preventDefault();
      e.stopPropagation();
      uploadZone.classList.remove('drag-over');
    });
  });

  // Handle drop
  uploadZone.addEventListener('drop', async (e) => {
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await handleFileUpload(files[0]);
    }
  });

  // Click to upload
  uploadZone.addEventListener('click', () => {
    fileInput.click();
  });

  // File input change
  fileInput.addEventListener('change', async (e) => {
    if (e.target.files.length > 0) {
      await handleFileUpload(e.target.files[0]);
    }
    e.target.value = ''; // Reset for same file selection
  });
}

async function handleFileUpload(file) {
  try {
    // Show progress
    showUploadProgress(true, 'מעלה קובץ...');

    // Upload via n8n
    const result = await N8N.uploadTender(file);

    // Update progress
    showUploadProgress(true, 'מנתח מסמך...');

    // If we got a tender ID, navigate or refresh
    if (result.tender_id) {
      showUploadProgress(false);

      // Refresh tender list
      await loadTenderList();

      // Show success and offer to navigate
      Utils.showToast('success', 'המכרז הועלה בהצלחה', 'הניתוח החל');

      // Optional: navigate to tender detail after short delay
      setTimeout(() => {
        if (confirm('האם לעבור לדף המכרז?')) {
          openTender(result.tender_id);
        }
      }, 1500);
    }

  } catch (error) {
    console.error('Upload failed:', error);
    showUploadProgress(false);
  }
}

function showUploadProgress(show, message = '') {
  const uploadZone = document.getElementById('upload-zone');
  if (!uploadZone) return;

  if (show) {
    uploadZone.classList.add('uploading');
    uploadZone.innerHTML = `
      <div class="upload-progress">
        <div class="ai-loader-mini">
          <div class="spinner"></div>
        </div>
        <p>${message}</p>
      </div>
    `;
  } else {
    uploadZone.classList.remove('uploading');
    uploadZone.innerHTML = `
      <svg class="w-12 h-12 mb-4" style="color: var(--text-muted);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
      </svg>
      <p class="upload-text">גרור קובץ לכאן או לחץ לבחירה</p>
      <p class="upload-hint">PDF, Word, Excel עד 50MB</p>
    `;
  }
}

// ============================================
// REAL-TIME UPDATES
// ============================================

let tenderSubscription = null;

function setupRealtimeUpdates() {
  // Subscribe to tender changes
  tenderSubscription = API.Tender.subscribeToChanges((payload) => {
    console.log('Tender update:', payload);

    switch (payload.eventType) {
      case 'INSERT':
        // Refresh the list
        loadTenderList();
        Utils.showToast('info', 'מכרז חדש נוסף', '');
        break;

      case 'UPDATE':
        // Update specific tender card
        updateTenderCard(payload.new);
        break;

      case 'DELETE':
        // Remove tender card
        removeTenderCard(payload.old.id);
        break;
    }
  });
}

function updateTenderCard(tender) {
  const card = document.querySelector(`.tender-card[data-id="${tender.id}"]`);
  if (!card) {
    // Card doesn't exist, refresh list
    loadTenderList();
    return;
  }

  // Update score
  const scoreValue = card.querySelector('.score-value');
  if (scoreValue && tender.ai_score) {
    scoreValue.textContent = tender.ai_score;
    scoreValue.className = `score-value ${Utils.getScoreClass(tender.ai_score)}`;
  }

  // Update status
  const statusBadge = card.querySelector('.status-badge');
  if (statusBadge) {
    statusBadge.textContent = Utils.getStatusLabel(tender.status);
    statusBadge.className = `status-badge ${tender.status}`;
  }

  // Update progress
  const progressFill = card.querySelector('.progress-fill');
  const progressText = card.querySelector('.progress-header span:last-child');
  if (progressFill && tender.progress !== undefined) {
    progressFill.style.width = tender.progress + '%';
    if (progressText) progressText.textContent = tender.progress + '%';
  }
}

function removeTenderCard(tenderId) {
  const card = document.querySelector(`.tender-card[data-id="${tenderId}"]`);
  if (card) {
    card.style.animation = 'fadeOut 0.3s ease forwards';
    setTimeout(() => card.remove(), 300);
  }
}

// ============================================
// EVENT LISTENERS
// ============================================

function setupEventListeners() {
  // Search
  const searchInput = document.getElementById('tender-search');
  if (searchInput) {
    searchInput.addEventListener('input', Utils.debounce((e) => {
      loadTenderList({ search: e.target.value });
    }, 300));
  }

  // Status filter
  const statusFilter = document.getElementById('status-filter');
  if (statusFilter) {
    statusFilter.addEventListener('change', (e) => {
      loadTenderList({ status: e.target.value || null });
    });
  }

  // Logout
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => Auth.signOut());
  }
}

// ============================================
// ACTIONS
// ============================================

function openTender(tenderId) {
  Utils.navigate(CONFIG.ROUTES.TENDER_DETAIL, { id: tenderId });
}

async function analyzeTender(tenderId) {
  try {
    Utils.showLoading(true, 'מבצע ניתוח AI...');
    await N8N.analyzeFullTender(tenderId);
    await loadTenderList();
  } catch (error) {
    console.error('Analysis failed:', error);
  } finally {
    Utils.showLoading(false);
  }
}

async function exportTender(tenderId) {
  try {
    await N8N.exportReport(tenderId);
  } catch (error) {
    console.error('Export failed:', error);
  }
}

function openUploadModal() {
  // Trigger file input click
  const fileInput = document.getElementById('file-input');
  if (fileInput) fileInput.click();
}

// ============================================
// CLEANUP
// ============================================

window.addEventListener('beforeunload', () => {
  // Cleanup subscriptions
  if (tenderSubscription) {
    API.Tender.unsubscribe(tenderSubscription);
  }
});

// Export functions for inline handlers
window.openTender = openTender;
window.analyzeTender = analyzeTender;
window.exportTender = exportTender;
window.openUploadModal = openUploadModal;
window.loadTenderList = loadTenderList;

console.log('Tenderix Dashboard loaded');
