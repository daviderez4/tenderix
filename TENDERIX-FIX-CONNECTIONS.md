# 🔧 TENDERIX - FIX ALL CONNECTIONS PROMPT

## ❌ CURRENT PROBLEMS

The dashboard loads but NOTHING actually works:
1. Clicking on tender → 404 error (tender detail page broken)
2. Cannot edit anything
3. Cannot add anything  
4. Gate conditions page doesn't load
5. Company profile doesn't save
6. Nothing is actually connected to Supabase

## ✅ WHAT NEEDS TO WORK

### Priority 1: Basic Navigation Flow
```
Dashboard (works) → Click Tender → Tender Detail Page (BROKEN)
```

### Priority 2: Core Features
- View tender details
- View/edit gate conditions for a tender
- View/edit company profile
- Upload new tender document

---

## 🎯 TASK 1: FIX TENDER DETAIL PAGE

### Problem:
`localhost:3000/tenderix-tender-detail` returns 404

### Solution:
The page should be `tenderix-tender-detail.html?id={tender_id}`

### Check/Create File: `tenderix-tender-detail.html`

```html
<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tenderix - פרטי מכרז</title>
    <script src="https://unpkg.com/@supabase/supabase-js@2"></script>
    <style>
        /* Copy dark mode styles from dashboard */
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, sans-serif;
            background: linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 100%);
            min-height: 100vh;
            color: #e0e0e0;
            direction: rtl;
        }
        .container { max-width: 1400px; margin: 0 auto; padding: 20px; }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        .back-btn {
            background: rgba(255,255,255,0.1);
            border: none;
            color: #fff;
            padding: 10px 20px;
            border-radius: 8px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .back-btn:hover { background: rgba(255,255,255,0.2); }
        .tender-title { font-size: 1.8rem; color: #00d4ff; }
        .tender-meta { color: #888; margin-top: 5px; }
        
        /* Tabs */
        .tabs {
            display: flex;
            gap: 10px;
            margin-bottom: 30px;
            border-bottom: 1px solid rgba(255,255,255,0.1);
            padding-bottom: 10px;
        }
        .tab {
            padding: 12px 24px;
            background: transparent;
            border: none;
            color: #888;
            cursor: pointer;
            border-radius: 8px 8px 0 0;
            transition: all 0.3s;
        }
        .tab:hover { color: #fff; background: rgba(255,255,255,0.05); }
        .tab.active {
            color: #00d4ff;
            background: rgba(0, 212, 255, 0.1);
            border-bottom: 2px solid #00d4ff;
        }
        
        /* Tab Content */
        .tab-content { display: none; }
        .tab-content.active { display: block; }
        
        /* Cards */
        .card {
            background: rgba(255,255,255,0.03);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 20px;
        }
        .card-title {
            font-size: 1.2rem;
            margin-bottom: 15px;
            color: #00d4ff;
        }
        
        /* Gate Conditions */
        .gate-item {
            padding: 15px;
            background: rgba(255,255,255,0.02);
            border-radius: 8px;
            margin-bottom: 10px;
            border-right: 4px solid #666;
        }
        .gate-item.pass { border-right-color: #22c55e; }
        .gate-item.risk { border-right-color: #f59e0b; }
        .gate-item.fail { border-right-color: #ef4444; }
        .gate-item.pending { border-right-color: #3b82f6; }
        
        .gate-text { margin-bottom: 10px; }
        .gate-source {
            font-size: 0.85rem;
            color: #888;
            display: flex;
            align-items: center;
            gap: 5px;
        }
        .gate-status {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.8rem;
            font-weight: bold;
        }
        .gate-status.pass { background: rgba(34, 197, 94, 0.2); color: #22c55e; }
        .gate-status.risk { background: rgba(245, 158, 11, 0.2); color: #f59e0b; }
        .gate-status.fail { background: rgba(239, 68, 68, 0.2); color: #ef4444; }
        .gate-status.pending { background: rgba(59, 130, 246, 0.2); color: #3b82f6; }
        
        /* Loading */
        .loading {
            text-align: center;
            padding: 40px;
            color: #888;
        }
        
        /* Empty State */
        .empty-state {
            text-align: center;
            padding: 60px 20px;
            color: #666;
        }
        .empty-state-icon { font-size: 4rem; margin-bottom: 20px; }
        
        /* Action Buttons */
        .btn-primary {
            background: linear-gradient(135deg, #00d4ff, #0891b2);
            border: none;
            color: #fff;
            padding: 12px 24px;
            border-radius: 8px;
            cursor: pointer;
            font-weight: bold;
        }
        .btn-primary:hover { opacity: 0.9; }
        
        .btn-secondary {
            background: rgba(255,255,255,0.1);
            border: 1px solid rgba(255,255,255,0.2);
            color: #fff;
            padding: 12px 24px;
            border-radius: 8px;
            cursor: pointer;
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <div>
                <a href="tenderix-dashboard.html" class="back-btn">
                    → חזרה לדשבורד
                </a>
            </div>
            <div style="text-align: left;">
                <h1 class="tender-title" id="tenderName">טוען...</h1>
                <p class="tender-meta" id="tenderMeta"></p>
            </div>
        </div>
        
        <!-- Tabs -->
        <div class="tabs">
            <button class="tab active" data-tab="overview">סקירה כללית</button>
            <button class="tab" data-tab="gates">תנאי סף</button>
            <button class="tab" data-tab="specs">מפרט</button>
            <button class="tab" data-tab="boq">כתב כמויות</button>
            <button class="tab" data-tab="competitors">מתחרים</button>
            <button class="tab" data-tab="decision">החלטה</button>
        </div>
        
        <!-- Tab Contents -->
        
        <!-- Overview Tab -->
        <div class="tab-content active" id="tab-overview">
            <div class="card">
                <h3 class="card-title">פרטי המכרז</h3>
                <div id="tenderDetails">
                    <div class="loading">טוען פרטים...</div>
                </div>
            </div>
            
            <div class="card">
                <h3 class="card-title">מסמכים</h3>
                <div id="tenderDocuments">
                    <div class="loading">טוען מסמכים...</div>
                </div>
            </div>
        </div>
        
        <!-- Gate Conditions Tab -->
        <div class="tab-content" id="tab-gates">
            <div class="card">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h3 class="card-title" style="margin: 0;">תנאי סף</h3>
                    <button class="btn-primary" onclick="analyzeGates()">
                        🔍 נתח תנאי סף
                    </button>
                </div>
                <div id="gateConditions">
                    <div class="loading">טוען תנאי סף...</div>
                </div>
            </div>
        </div>
        
        <!-- Specs Tab -->
        <div class="tab-content" id="tab-specs">
            <div class="card">
                <h3 class="card-title">מפרט טכני</h3>
                <div id="specifications">
                    <div class="empty-state">
                        <div class="empty-state-icon">📋</div>
                        <p>טרם נותח מפרט טכני</p>
                        <button class="btn-primary" style="margin-top: 20px;">נתח מפרט</button>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- BOQ Tab -->
        <div class="tab-content" id="tab-boq">
            <div class="card">
                <h3 class="card-title">כתב כמויות</h3>
                <div id="boqItems">
                    <div class="empty-state">
                        <div class="empty-state-icon">📊</div>
                        <p>טרם נותח כתב כמויות</p>
                        <button class="btn-primary" style="margin-top: 20px;">נתח BOQ</button>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Competitors Tab -->
        <div class="tab-content" id="tab-competitors">
            <div class="card">
                <h3 class="card-title">ניתוח מתחרים</h3>
                <div id="competitors">
                    <div class="empty-state">
                        <div class="empty-state-icon">🎯</div>
                        <p>טרם בוצע ניתוח מתחרים</p>
                        <button class="btn-primary" style="margin-top: 20px;">נתח מתחרים</button>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Decision Tab -->
        <div class="tab-content" id="tab-decision">
            <div class="card">
                <h3 class="card-title">החלטה סופית</h3>
                <div id="decision">
                    <div class="empty-state">
                        <div class="empty-state-icon">✅</div>
                        <p>טרם נוצר דוח החלטה</p>
                        <button class="btn-primary" style="margin-top: 20px;">צור דוח GO/NO-GO</button>
                    </div>
                </div>
            </div>
        </div>
    </div>
    
    <script>
        // Supabase Config
        const SUPABASE_URL = 'https://rerfjgjwjqodevkvhkxu.supabase.co';
        const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlcmZqZ2p3anFvZGV2a3Zoa3h1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY1OTYxNzksImV4cCI6MjA1MjE3MjE3OX0.--tz3L5akKPzsfiP_mpuw-103LT1F3Dl5FUyffLrgxs';
        
        const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        
        // Get tender ID from URL
        const urlParams = new URLSearchParams(window.location.search);
        const tenderId = urlParams.get('id');
        
        if (!tenderId) {
            document.body.innerHTML = '<div style="text-align: center; padding: 100px; color: #ef4444;"><h1>שגיאה: לא סופק מזהה מכרז</h1><a href="tenderix-dashboard.html" style="color: #00d4ff;">חזור לדשבורד</a></div>';
        }
        
        // Tab Switching
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                
                tab.classList.add('active');
                document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
            });
        });
        
        // Load Tender Data
        async function loadTender() {
            try {
                // Load tender
                const { data: tender, error } = await supabase
                    .from('tenders')
                    .select('*')
                    .eq('id', tenderId)
                    .single();
                
                if (error) throw error;
                
                // Update header
                document.getElementById('tenderName').textContent = tender.name || tender.tender_number || 'מכרז ללא שם';
                document.getElementById('tenderMeta').textContent = `
                    ${tender.issuing_body || 'גורם לא ידוע'} | 
                    מועד הגשה: ${tender.submission_deadline ? new Date(tender.submission_deadline).toLocaleDateString('he-IL') : 'לא צוין'}
                `;
                
                // Update details
                document.getElementById('tenderDetails').innerHTML = `
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr><td style="padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.1); color: #888;">מספר מכרז:</td><td style="padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.1);">${tender.tender_number || '-'}</td></tr>
                        <tr><td style="padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.1); color: #888;">גורם מזמין:</td><td style="padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.1);">${tender.issuing_body || '-'}</td></tr>
                        <tr><td style="padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.1); color: #888;">סטטוס:</td><td style="padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.1);">${tender.status || '-'}</td></tr>
                        <tr><td style="padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.1); color: #888;">שווי משוער:</td><td style="padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.1);">₪${(tender.estimated_value || 0).toLocaleString()}</td></tr>
                        <tr><td style="padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.1); color: #888;">ציון תנאי סף:</td><td style="padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.1);">${tender.gate_score || '-'}/100</td></tr>
                    </table>
                `;
                
                // Load documents
                await loadDocuments();
                
                // Load gate conditions
                await loadGateConditions();
                
            } catch (err) {
                console.error('Error loading tender:', err);
                document.getElementById('tenderName').textContent = 'שגיאה בטעינת מכרז';
            }
        }
        
        async function loadDocuments() {
            try {
                const { data: docs, error } = await supabase
                    .from('tender_documents')
                    .select('*')
                    .eq('tender_id', tenderId);
                
                if (error) throw error;
                
                if (!docs || docs.length === 0) {
                    document.getElementById('tenderDocuments').innerHTML = `
                        <div class="empty-state">
                            <p>לא הועלו מסמכים</p>
                            <button class="btn-secondary" style="margin-top: 10px;">העלה מסמך</button>
                        </div>
                    `;
                    return;
                }
                
                document.getElementById('tenderDocuments').innerHTML = docs.map(doc => `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: rgba(255,255,255,0.02); border-radius: 8px; margin-bottom: 8px;">
                        <div>
                            <span style="margin-left: 10px;">📄</span>
                            <span>${doc.file_name}</span>
                            <span style="color: #888; font-size: 0.85rem; margin-right: 10px;">(${doc.file_type || 'לא מסווג'})</span>
                        </div>
                        <span style="color: #888; font-size: 0.85rem;">${new Date(doc.created_at).toLocaleDateString('he-IL')}</span>
                    </div>
                `).join('');
                
            } catch (err) {
                console.error('Error loading documents:', err);
            }
        }
        
        async function loadGateConditions() {
            try {
                const { data: gates, error } = await supabase
                    .from('gate_conditions')
                    .select('*')
                    .eq('tender_id', tenderId)
                    .order('created_at', { ascending: true });
                
                if (error) throw error;
                
                if (!gates || gates.length === 0) {
                    document.getElementById('gateConditions').innerHTML = `
                        <div class="empty-state">
                            <div class="empty-state-icon">🔍</div>
                            <p>טרם נותחו תנאי סף</p>
                            <p style="color: #666; margin-top: 10px;">לחץ על "נתח תנאי סף" כדי להתחיל</p>
                        </div>
                    `;
                    return;
                }
                
                document.getElementById('gateConditions').innerHTML = gates.map(gate => {
                    const statusClass = gate.status === 'pass' ? 'pass' : 
                                       gate.status === 'risk' ? 'risk' : 
                                       gate.status === 'fail' ? 'fail' : 'pending';
                    const statusText = gate.status === 'pass' ? 'עומד' : 
                                      gate.status === 'risk' ? 'סיכון' : 
                                      gate.status === 'fail' ? 'לא עומד' : 'ממתין';
                    
                    return `
                        <div class="gate-item ${statusClass}">
                            <div style="display: flex; justify-content: space-between; align-items: start;">
                                <div class="gate-text">${gate.condition_text || '-'}</div>
                                <span class="gate-status ${statusClass}">${statusText}</span>
                            </div>
                            ${gate.source_file ? `
                                <div class="gate-source">
                                    📄 ${gate.source_file} ${gate.source_page ? `| עמ' ${gate.source_page}` : ''} ${gate.source_section ? `| סעיף ${gate.source_section}` : ''}
                                </div>
                            ` : ''}
                        </div>
                    `;
                }).join('');
                
            } catch (err) {
                console.error('Error loading gate conditions:', err);
            }
        }
        
        // Analyze Gates - Call n8n webhook
        async function analyzeGates() {
            const btn = event.target;
            btn.disabled = true;
            btn.textContent = '⏳ מנתח...';
            
            try {
                const response = await fetch('https://daviderez.app.n8n.cloud/webhook/tdx-extract-gates', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ tender_id: tenderId })
                });
                
                if (response.ok) {
                    alert('ניתוח הושלם! טוען תוצאות...');
                    await loadGateConditions();
                } else {
                    throw new Error('Analysis failed');
                }
            } catch (err) {
                console.error('Error analyzing gates:', err);
                alert('שגיאה בניתוח תנאי סף');
            } finally {
                btn.disabled = false;
                btn.textContent = '🔍 נתח תנאי סף';
            }
        }
        
        // Initialize
        if (tenderId) {
            loadTender();
        }
    </script>
</body>
</html>
```

---

## 🎯 TASK 2: FIX DASHBOARD TENDER CLICK

In `tenderix-dashboard.html`, find where tenders are rendered and make sure clicking goes to the right URL:

### Find and Fix:
```javascript
// WRONG - might be using wrong URL format
window.location.href = '/tenderix-tender-detail';

// CORRECT - use query parameter
window.location.href = `tenderix-tender-detail.html?id=${tender.id}`;
```

### The tender card click handler should be:
```javascript
function viewTender(tenderId) {
    window.location.href = `tenderix-tender-detail.html?id=${tenderId}`;
}

// Or if using onclick in HTML:
// <div onclick="viewTender('${tender.id}')" class="tender-item">
```

---

## 🎯 TASK 3: FIX COMPANY PROFILE PAGE

### File: `tenderix-company-profile.html`

Must have:
1. Connection to Supabase
2. Load existing profile on page load
3. Save profile on form submit
4. Show success/error messages

### Key Functions:
```javascript
// Load profile
async function loadCompanyProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        window.location.href = 'tenderix-login.html';
        return;
    }
    
    const { data: profile, error } = await supabase
        .from('company_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
    
    if (profile) {
        // Fill form with existing data
        document.getElementById('companyName').value = profile.company_name || '';
        document.getElementById('bnNumber').value = profile.bn_number || '';
        // ... fill other fields
    }
}

// Save profile
async function saveCompanyProfile(event) {
    event.preventDefault();
    
    const { data: { user } } = await supabase.auth.getUser();
    
    const profileData = {
        user_id: user.id,
        company_name: document.getElementById('companyName').value,
        bn_number: document.getElementById('bnNumber').value,
        // ... other fields
        updated_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase
        .from('company_profiles')
        .upsert(profileData, { onConflict: 'user_id' });
    
    if (error) {
        alert('שגיאה בשמירה: ' + error.message);
    } else {
        alert('הפרופיל נשמר בהצלחה!');
    }
}
```

---

## 🎯 TASK 4: VERIFY N8N WEBHOOKS

Test each webhook manually:

### Test 1: tdx-upload-v2
```bash
curl -X POST https://daviderez.app.n8n.cloud/webhook/tdx-upload-v2 \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

### Test 2: tdx-extract-gates
```bash
curl -X POST https://daviderez.app.n8n.cloud/webhook/tdx-extract-gates \
  -H "Content-Type: application/json" \
  -d '{"tender_id": "PASTE_A_REAL_TENDER_ID_HERE"}'
```

If webhooks don't respond, check n8n:
1. Go to https://daviderez.app.n8n.cloud
2. Check workflows are ACTIVE (green toggle)
3. Check webhook URLs are correct

---

## 🎯 TASK 5: FIX NAVIGATION LINKS

### In `tenderix-dashboard.html`:

Find the sidebar/menu and ensure all links are correct:

```html
<!-- Correct links -->
<a href="tenderix-dashboard.html">לוח בקרה</a>
<a href="tenderix-company-profile.html">פרופיל חברה</a>
<!-- Note: tender-detail needs ID, so usually not in menu -->
```

### In tender list, each item should have:
```html
<div class="tender-item" onclick="window.location.href='tenderix-tender-detail.html?id=${tender.id}'">
    <!-- tender content -->
</div>
```

---

## 📋 EXECUTION CHECKLIST

1. ⬜ Create/Fix `tenderix-tender-detail.html` with full code above
2. ⬜ Fix tender click handler in dashboard to use correct URL
3. ⬜ Test: Click tender → Should open detail page
4. ⬜ Fix company profile load/save functions
5. ⬜ Test: Company profile saves to Supabase
6. ⬜ Verify n8n webhooks are active
7. ⬜ Test: "נתח תנאי סף" button calls webhook

---

## 🚀 START NOW

1. First, check if `tenderix-tender-detail.html` exists
2. If not, create it with the code above
3. If yes, compare and fix the issues
4. Then fix the dashboard click handler
5. Test the full flow

Report back what you found and fixed.
