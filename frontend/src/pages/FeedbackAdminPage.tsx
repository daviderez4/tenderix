import { useState, useEffect } from 'react';
import { MessageSquare, Clock, CheckCircle, Trash2, RefreshCw, Filter, ArrowUpCircle, Download, CheckSquare, Square, ClipboardList, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { API_CONFIG } from '../api/config';
import { Loading } from '../components/Loading';

// Development Status Data - Updated based on actual implementation review
// Total modules from spec v3: 31 (4 core + 7 P1 + 11 P2 + 6 P3 + 4 P4)
const DEV_STATUS = {
  summary: {
    total: 31,
    complete: 16,  // Actually working with workflows
    partial: 7,    // Has basic implementation
    missing: 8,    // Not implemented
  },
  // עקרונות ליבה - Core Principles
  corePrinciples: [
    { id: 'C1', name: 'עקיבות מלאה (Traceability)', status: 'partial', note: 'יש שדות source_page, source_quote - אבל לא תמיד מלא' },
    { id: 'C2', name: 'מילון טכני לפי קטגוריה', status: 'missing', note: 'עידו - פרשנות לפי יכולות' },
    { id: 'C3', name: 'לוגיקת הצטברות נכונה', status: 'partial', note: 'בסיסי - צריך בדיקות כפילויות' },
    { id: 'C4', name: 'מסלולי סגירת פערים', status: 'complete', note: 'closure_options בתנאי סף' },
  ],
  // P1 - קליטת מכרז
  p1Modules: [
    { id: '1.1', name: 'העלאה וזיהוי מסמכים', status: 'partial', done: 'העלאה ידנית, Google Drive', missing: 'זיהוי אוטומטי סוג מסמך' },
    { id: '1.1.5', name: 'ניהול גרסאות מסמכים', status: 'complete', note: 'עידו - tdx-versions workflow', badge: 'new' },
    { id: '1.2', name: 'חילוץ מטא-דאטה', status: 'partial', done: 'שדות ידניים בטופס', missing: 'חילוץ אוטומטי מ-PDF' },
    { id: '1.3', name: 'נרמול טקסט עברי', status: 'missing', note: 'חשוב לדיוק - לא קיים' },
    { id: '1.4', name: 'חילוץ סעיף הגדרות', status: 'missing', note: '"מילון המכרז" - לא קיים' },
    { id: '1.5', name: 'זיהוי קטגוריית מכרז', status: 'partial', done: 'בחירה ידנית', missing: 'זיהוי אוטומטי' },
    { id: '1.6', name: 'ניתוח מכרז קודם', status: 'complete', note: 'אליצח - tdx-previous-tender', badge: 'new' },
  ],
  // P2 - ניתוח תנאי סף
  p2Modules: [
    { id: '2.0', name: 'פרופיל חברה', status: 'partial', done: 'כל השדות הבסיסיים', missing: 'פרויקטים משיקים (אליצח)' },
    { id: '2.1', name: 'חילוץ וסיווג תנאי סף', status: 'complete', note: 'tdx-extract-gates-v2, professional-gates' },
    { id: '2.2', name: 'פירוק כימותי', status: 'partial', done: 'שדות בסיסיים', missing: 'הגדרת "בוצע" (עידו)' },
    { id: '2.3', name: 'ישות נושאת דרישה', status: 'partial', done: 'שדות bearer_entity', missing: 'ניתוח מלא' },
    { id: '2.4', name: 'פרשנות "דומה"', status: 'missing', note: 'מילון טכני לא קיים' },
    { id: '2.5', name: 'פרשנות כפולה (משפטי+טכני)', status: 'missing', note: 'HEAD כפול לא קיים' },
    { id: '2.6', name: 'השוואה לפרופיל חברה', status: 'complete', note: 'tdx-gate-work workflow' },
    { id: '2.6.5', name: 'אופטימיזציה תנאי סף vs ניקוד', status: 'missing', note: 'עידו - מינימום לסף, מקסימום לניקוד', badge: 'new' },
    { id: '2.7', name: 'בקשות הבהרה', status: 'complete', note: 'tdx-clarify-simple workflow' },
    { id: '2.7.5', name: 'שאלות אסטרטגיות', status: 'complete', note: 'אליצח - tdx-strategic-v3', badge: 'new' },
    { id: '2.7.6', name: 'ניתוח שאלות אחרים', status: 'missing', note: 'אליצח - מי שאל ולמה', badge: 'new' },
    { id: '2.8', name: 'רשימת מסמכים נדרשים', status: 'complete', note: 'tdx-required-docs workflow' },
    { id: '2.9', name: 'הערכה והמלצה', status: 'partial', done: 'סיכום AI', missing: 'ציטוטים מדויקים' },
    { id: '2.10', name: 'ניתוח מחדש אחרי הבהרות', status: 'complete', note: 'עידו - tdx-reanalysis', badge: 'new' },
  ],
  // P3 - מפרט ו-BOQ
  p3Modules: [
    { id: '3.1', name: 'ניתוח מפרט טכני', status: 'complete', note: 'tdx-sow-analysis workflow' },
    { id: '3.2', name: 'ניתוח BOQ', status: 'complete', note: 'tdx-boq-analysis workflow' },
    { id: '3.3', name: 'היקף העבודה', status: 'partial', done: 'בסיסי', missing: 'WBS מפורט' },
    { id: '3.4', name: 'חריגים ואי-התאמות', status: 'partial', done: 'זיהוי בסיסי', missing: '"חריגים = הזדמנות" (עידו)' },
    { id: '3.4.5', name: 'השוואה למכרזים דומים', status: 'missing', note: 'אליצח - סעיף סעיף', badge: 'new' },
    { id: '3.5', name: 'סיכוני תמחור והמלצות', status: 'partial', done: 'בסיסי', missing: 'אינטגרציה ERP' },
  ],
  // P4 - ניתוח מתחרים
  p4Modules: [
    { id: '4.1', name: 'היסטוריית הצעות', status: 'complete', note: 'tdx-historical-bids', badge: 'new' },
    { id: '4.2', name: 'מיפוי מתחרים', status: 'complete', note: 'tdx-competitor-mapping workflow' },
    { id: '4.3', name: 'ניתוח תמחור מתחרים', status: 'complete', note: 'tdx-pricing-intel workflow' },
    { id: '4.4', name: 'מודיעין תחרותי', status: 'complete', note: 'tdx-competitive-intel workflow' },
  ],
  // Output
  outputModules: [
    { id: '5.0', name: 'דוח GO/NO-GO', status: 'complete', note: 'tdx-final-decision workflow' },
  ],
  // Missing DB Tables
  missingTables: [
    { name: 'key_personnel', desc: 'אנשי מפתח' },
    { name: 'tender_versions', desc: 'גרסאות מסמכים' },
    { name: 'strategic_questions', desc: 'שאלות אסטרטגיות' },
    { name: 'tender_analysis', desc: 'תוצאות ניתוח' },
    { name: 'technical_dictionary', desc: 'מילון טכני לפי קטגוריה' },
  ],
};

interface FeedbackMessage {
  id: string;
  created_at: string;
  author_name: string;
  page_url: string;
  message: string;
  status: 'pending' | 'reviewed' | 'done';
  priority: 'low' | 'medium' | 'high' | 'critical';
  notes?: string;
}

export function FeedbackAdminPage() {
  const [messages, setMessages] = useState<FeedbackMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'reviewed' | 'done'>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDevStatus, setShowDevStatus] = useState(true);

  useEffect(() => {
    loadMessages();
  }, [filter]);

  async function loadMessages() {
    try {
      let url = `${API_CONFIG.SUPABASE_URL}/rest/v1/dev_feedback?order=created_at.desc`;
      if (filter !== 'all') {
        url += `&status=eq.${filter}`;
      }

      const res = await fetch(url, {
        headers: {
          'apikey': API_CONFIG.SUPABASE_KEY,
          'Authorization': `Bearer ${API_CONFIG.SUPABASE_KEY}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      } else {
        console.error('Failed to load messages:', await res.text());
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  }

  async function refresh() {
    setRefreshing(true);
    await loadMessages();
    setRefreshing(false);
  }

  async function updateStatus(id: string, status: 'pending' | 'reviewed' | 'done') {
    try {
      await fetch(
        `${API_CONFIG.SUPABASE_URL}/rest/v1/dev_feedback?id=eq.${id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': API_CONFIG.SUPABASE_KEY,
            'Authorization': `Bearer ${API_CONFIG.SUPABASE_KEY}`,
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({ status }),
        }
      );
      setMessages(prev => prev.map(m => m.id === id ? { ...m, status } : m));
    } catch (error) {
      console.error('Error updating status:', error);
    }
  }

  async function deleteMessage(id: string) {
    if (!confirm('למחוק את ההודעה?')) return;

    try {
      await fetch(
        `${API_CONFIG.SUPABASE_URL}/rest/v1/dev_feedback?id=eq.${id}`,
        {
          method: 'DELETE',
          headers: {
            'apikey': API_CONFIG.SUPABASE_KEY,
            'Authorization': `Bearer ${API_CONFIG.SUPABASE_KEY}`,
          },
        }
      );
      setMessages(prev => prev.filter(m => m.id !== id));
      setSelectedIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }

  function selectAll() {
    if (selectedIds.size === messages.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(messages.map(m => m.id)));
    }
  }

  function exportSelected() {
    const selectedMessages = messages.filter(m => selectedIds.has(m.id));
    if (selectedMessages.length === 0) {
      alert('בחר לפחות פידבק אחד לייצוא');
      return;
    }

    const exportText = selectedMessages.map(m => {
      return `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 פידבק מ: ${m.author_name}
📅 תאריך: ${formatDate(m.created_at)}
📍 עמוד: ${m.page_url}
🔥 עדיפות: ${m.priority}
📋 סטטוס: ${m.status}

${m.message}
`;
    }).join('\n');

    // Copy to clipboard
    navigator.clipboard.writeText(exportText).then(() => {
      alert(`✅ ${selectedMessages.length} פידבקים הועתקו ללוח!`);
    }).catch(() => {
      // Fallback: download as file
      const blob = new Blob([exportText], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `feedback-export-${new Date().toISOString().split('T')[0]}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  async function markSelectedAsDone() {
    if (selectedIds.size === 0) return;

    for (const id of selectedIds) {
      await updateStatus(id, 'done');
    }
    setSelectedIds(new Set());
  }

  function formatDate(dateStr: string) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('he-IL', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function getPriorityBadge(priority: string) {
    const styles: Record<string, { bg: string; text: string; label: string }> = {
      critical: { bg: '#dc2626', text: 'white', label: '🔥 קריטי' },
      high: { bg: '#f59e0b', text: 'black', label: '⚡ גבוה' },
      medium: { bg: '#7c3aed', text: 'white', label: '📝 בינוני' },
      low: { bg: '#6b7280', text: 'white', label: '💤 נמוך' },
    };
    const style = styles[priority] || styles.medium;
    return (
      <span style={{
        padding: '2px 8px',
        borderRadius: '12px',
        fontSize: '0.75rem',
        fontWeight: 600,
        background: style.bg,
        color: style.text,
      }}>
        {style.label}
      </span>
    );
  }

  function getStatusBadge(status: string) {
    const styles: Record<string, { bg: string; text: string; label: string }> = {
      pending: { bg: 'rgba(234, 179, 8, 0.2)', text: '#eab308', label: '⏳ ממתין' },
      reviewed: { bg: 'rgba(59, 130, 246, 0.2)', text: '#3b82f6', label: '👀 נצפה' },
      done: { bg: 'rgba(34, 197, 94, 0.2)', text: '#22c55e', label: '✅ טופל' },
    };
    const style = styles[status] || styles.pending;
    return (
      <span style={{
        padding: '2px 8px',
        borderRadius: '12px',
        fontSize: '0.75rem',
        fontWeight: 500,
        background: style.bg,
        color: style.text,
      }}>
        {style.label}
      </span>
    );
  }

  // Light theme colors
  const THEME = {
    pageBg: '#f0f9fb',
    cardBg: '#ffffff',
    cardBorder: '#c8e4eb',
    headerText: '#1e3a4c',
    subtitleText: '#5a7d8a',
    accentPrimary: '#00b4d8',
    accentDark: '#0077b6',
    inputBg: '#f8fafc',
    inputBorder: '#e2e8f0',
  };

  if (loading) return <Loading />;

  const pendingCount = messages.filter(m => m.status === 'pending').length;
  const criticalCount = messages.filter(m => m.priority === 'critical' && m.status !== 'done').length;

  return (
    <div style={{
      minHeight: '100vh',
      background: THEME.pageBg,
      padding: '2rem',
    }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          margin: 0,
          color: THEME.headerText,
          fontSize: '1.75rem',
          fontWeight: 700,
        }}>
          <MessageSquare size={28} style={{ color: THEME.accentPrimary }} />
          משוב מצוות הבדיקה
        </h1>
        <p style={{ margin: '0.5rem 0 0', color: THEME.subtitleText, fontSize: '0.95rem' }}>
          הודעות מעידו, אליצח וצוות הפיתוח
        </p>
      </div>

      {/* Development Status Section - Light Theme */}
      <div style={{
        marginBottom: '1.5rem',
        background: '#ffffff',
        borderRadius: '12px',
        border: '2px solid #00b4d8',
        boxShadow: '0 2px 8px rgba(0, 180, 216, 0.1)',
        padding: '1.25rem',
      }}>
        <div
          onClick={() => setShowDevStatus(!showDevStatus)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            cursor: 'pointer',
          }}
        >
          <ClipboardList size={24} style={{ color: '#0077b6' }} />
          <h2 style={{ margin: 0, color: '#1e3a4c', flex: 1, fontSize: '1.1rem', fontWeight: 600 }}>
            מצב פיתוח - אפיון v3.0 (אליצח ועידו)
          </h2>
          <div style={{
            display: 'flex',
            gap: '1rem',
            alignItems: 'center',
            fontSize: '0.85rem',
          }}>
            <span style={{ color: '#059669', fontWeight: 600 }}>✓ {DEV_STATUS.summary.complete} מלאים</span>
            <span style={{ color: '#d97706', fontWeight: 600 }}>◐ {DEV_STATUS.summary.partial} חלקיים</span>
            <span style={{ color: '#dc2626', fontWeight: 600 }}>✗ {DEV_STATUS.summary.missing} חסרים</span>
            {showDevStatus ? <ChevronUp size={20} color="#5a7d8a" /> : <ChevronDown size={20} color="#5a7d8a" />}
          </div>
        </div>

        {showDevStatus && (
          <div style={{ marginTop: '1.25rem' }}>
            {/* Progress Bar */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', height: '12px', borderRadius: '6px', overflow: 'hidden', background: '#f1f5f9' }}>
                <div style={{ width: `${(DEV_STATUS.summary.complete / DEV_STATUS.summary.total) * 100}%`, background: 'linear-gradient(90deg, #10b981, #059669)' }} />
                <div style={{ width: `${(DEV_STATUS.summary.partial / DEV_STATUS.summary.total) * 100}%`, background: 'linear-gradient(90deg, #fbbf24, #f59e0b)' }} />
                <div style={{ width: `${(DEV_STATUS.summary.missing / DEV_STATUS.summary.total) * 100}%`, background: 'linear-gradient(90deg, #f87171, #ef4444)' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.75rem', color: '#64748b' }}>
                <span>{Math.round((DEV_STATUS.summary.complete / DEV_STATUS.summary.total) * 100)}% הושלם</span>
                <span>{DEV_STATUS.summary.total} מודולים באפיון</span>
              </div>
            </div>

            {/* Core Principles */}
            <div style={{ marginBottom: '1.25rem' }}>
              <h3 style={{ color: '#7c3aed', margin: '0 0 0.75rem', fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                ⚙️ עקרונות ליבה רוחביים
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.5rem' }}>
                {DEV_STATUS.corePrinciples.map(item => (
                  <div key={item.id} style={{
                    background: item.status === 'complete' ? '#f0fdf4' : item.status === 'partial' ? '#fefce8' : '#fef2f2',
                    border: `1px solid ${item.status === 'complete' ? '#86efac' : item.status === 'partial' ? '#fde047' : '#fecaca'}`,
                    borderRadius: '8px',
                    padding: '0.75rem',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', padding: '2px 6px', borderRadius: '4px', background: item.status === 'complete' ? '#dcfce7' : item.status === 'partial' ? '#fef9c3' : '#fee2e2', color: item.status === 'complete' ? '#166534' : item.status === 'partial' ? '#a16207' : '#991b1b' }}>
                        {item.status === 'complete' ? '✓' : item.status === 'partial' ? '◐' : '✗'}
                      </span>
                      <span style={{ fontWeight: 600, color: '#1e3a4c', fontSize: '0.9rem' }}>{item.id}: {item.name}</span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.35rem' }}>{item.note}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* P1 - Intake */}
            <div style={{ marginBottom: '1.25rem' }}>
              <h3 style={{ color: '#0891b2', margin: '0 0 0.75rem', fontSize: '0.9rem', fontWeight: 600 }}>
                📥 P1: קליטת מכרז ({DEV_STATUS.p1Modules.filter(m => m.status === 'complete').length}/{DEV_STATUS.p1Modules.length})
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '0.5rem' }}>
                {DEV_STATUS.p1Modules.map(item => (
                  <div key={item.id} style={{
                    background: item.status === 'complete' ? '#f0fdf4' : item.status === 'partial' ? '#fefce8' : '#fef2f2',
                    border: `1px solid ${item.status === 'complete' ? '#86efac' : item.status === 'partial' ? '#fde047' : '#fecaca'}`,
                    borderRadius: '8px',
                    padding: '0.6rem 0.75rem',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.5rem',
                  }}>
                    <span style={{ fontSize: '0.7rem', padding: '2px 5px', borderRadius: '4px', background: item.status === 'complete' ? '#dcfce7' : item.status === 'partial' ? '#fef9c3' : '#fee2e2', color: item.status === 'complete' ? '#166534' : item.status === 'partial' ? '#a16207' : '#991b1b', flexShrink: 0 }}>
                      {item.status === 'complete' ? '✓' : item.status === 'partial' ? '◐' : '✗'}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 600, color: '#1e3a4c', fontSize: '0.85rem' }}>{item.id}: {item.name}</span>
                        {'badge' in item && item.badge === 'new' && <span style={{ fontSize: '0.65rem', padding: '1px 4px', borderRadius: '3px', background: '#ec4899', color: 'white' }}>חדש</span>}
                      </div>
                      {'done' in item && item.done && <div style={{ fontSize: '0.75rem', color: '#059669', marginTop: '0.25rem' }}>✓ {item.done}</div>}
                      {'missing' in item && item.missing && <div style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: '0.15rem' }}>✗ {item.missing}</div>}
                      {'note' in item && !('done' in item) && <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>{item.note}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* P2 - Gates */}
            <div style={{ marginBottom: '1.25rem' }}>
              <h3 style={{ color: '#7c3aed', margin: '0 0 0.75rem', fontSize: '0.9rem', fontWeight: 600 }}>
                🔍 P2: ניתוח תנאי סף ({DEV_STATUS.p2Modules.filter(m => m.status === 'complete').length}/{DEV_STATUS.p2Modules.length})
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '0.5rem' }}>
                {DEV_STATUS.p2Modules.map(item => (
                  <div key={item.id} style={{
                    background: item.status === 'complete' ? '#f0fdf4' : item.status === 'partial' ? '#fefce8' : '#fef2f2',
                    border: `1px solid ${item.status === 'complete' ? '#86efac' : item.status === 'partial' ? '#fde047' : '#fecaca'}`,
                    borderRadius: '8px',
                    padding: '0.6rem 0.75rem',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.5rem',
                  }}>
                    <span style={{ fontSize: '0.7rem', padding: '2px 5px', borderRadius: '4px', background: item.status === 'complete' ? '#dcfce7' : item.status === 'partial' ? '#fef9c3' : '#fee2e2', color: item.status === 'complete' ? '#166534' : item.status === 'partial' ? '#a16207' : '#991b1b', flexShrink: 0 }}>
                      {item.status === 'complete' ? '✓' : item.status === 'partial' ? '◐' : '✗'}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 600, color: '#1e3a4c', fontSize: '0.85rem' }}>{item.id}: {item.name}</span>
                        {'badge' in item && item.badge === 'new' && <span style={{ fontSize: '0.65rem', padding: '1px 4px', borderRadius: '3px', background: '#ec4899', color: 'white' }}>חדש</span>}
                      </div>
                      {'done' in item && item.done && <div style={{ fontSize: '0.75rem', color: '#059669', marginTop: '0.25rem' }}>✓ {item.done}</div>}
                      {'missing' in item && item.missing && <div style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: '0.15rem' }}>✗ {item.missing}</div>}
                      {'note' in item && !('done' in item) && <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>{item.note}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* P3 - Specs */}
            <div style={{ marginBottom: '1.25rem' }}>
              <h3 style={{ color: '#059669', margin: '0 0 0.75rem', fontSize: '0.9rem', fontWeight: 600 }}>
                📋 P3: מפרט ו-BOQ ({DEV_STATUS.p3Modules.filter(m => m.status === 'complete').length}/{DEV_STATUS.p3Modules.length})
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '0.5rem' }}>
                {DEV_STATUS.p3Modules.map(item => (
                  <div key={item.id} style={{
                    background: item.status === 'complete' ? '#f0fdf4' : item.status === 'partial' ? '#fefce8' : '#fef2f2',
                    border: `1px solid ${item.status === 'complete' ? '#86efac' : item.status === 'partial' ? '#fde047' : '#fecaca'}`,
                    borderRadius: '8px',
                    padding: '0.6rem 0.75rem',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.5rem',
                  }}>
                    <span style={{ fontSize: '0.7rem', padding: '2px 5px', borderRadius: '4px', background: item.status === 'complete' ? '#dcfce7' : item.status === 'partial' ? '#fef9c3' : '#fee2e2', color: item.status === 'complete' ? '#166534' : item.status === 'partial' ? '#a16207' : '#991b1b', flexShrink: 0 }}>
                      {item.status === 'complete' ? '✓' : item.status === 'partial' ? '◐' : '✗'}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 600, color: '#1e3a4c', fontSize: '0.85rem' }}>{item.id}: {item.name}</span>
                        {'badge' in item && item.badge === 'new' && <span style={{ fontSize: '0.65rem', padding: '1px 4px', borderRadius: '3px', background: '#ec4899', color: 'white' }}>חדש</span>}
                      </div>
                      {'done' in item && item.done && <div style={{ fontSize: '0.75rem', color: '#059669', marginTop: '0.25rem' }}>✓ {item.done}</div>}
                      {'missing' in item && item.missing && <div style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: '0.15rem' }}>✗ {item.missing}</div>}
                      {'note' in item && !('done' in item) && <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>{item.note}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* P4 - Competitors */}
            <div style={{ marginBottom: '1.25rem' }}>
              <h3 style={{ color: '#d97706', margin: '0 0 0.75rem', fontSize: '0.9rem', fontWeight: 600 }}>
                🎯 P4: ניתוח מתחרים ({DEV_STATUS.p4Modules.filter(m => m.status === 'complete').length}/{DEV_STATUS.p4Modules.length}) ✓
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '0.5rem' }}>
                {DEV_STATUS.p4Modules.map(item => (
                  <div key={item.id} style={{
                    background: '#f0fdf4',
                    border: '1px solid #86efac',
                    borderRadius: '8px',
                    padding: '0.6rem 0.75rem',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.5rem',
                  }}>
                    <span style={{ fontSize: '0.7rem', padding: '2px 5px', borderRadius: '4px', background: '#dcfce7', color: '#166534', flexShrink: 0 }}>✓</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 600, color: '#1e3a4c', fontSize: '0.85rem' }}>{item.id}: {item.name}</span>
                        {'badge' in item && item.badge === 'new' && <span style={{ fontSize: '0.65rem', padding: '1px 4px', borderRadius: '3px', background: '#ec4899', color: 'white' }}>חדש</span>}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>{item.note}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Output */}
            <div style={{ marginBottom: '1.25rem' }}>
              <h3 style={{ color: '#16a34a', margin: '0 0 0.75rem', fontSize: '0.9rem', fontWeight: 600 }}>
                ✅ פלט: דוח החלטה ✓
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '0.5rem' }}>
                {DEV_STATUS.outputModules.map(item => (
                  <div key={item.id} style={{
                    background: '#f0fdf4',
                    border: '1px solid #86efac',
                    borderRadius: '8px',
                    padding: '0.6rem 0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}>
                    <span style={{ fontSize: '0.7rem', padding: '2px 5px', borderRadius: '4px', background: '#dcfce7', color: '#166534' }}>✓</span>
                    <span style={{ fontWeight: 600, color: '#1e3a4c', fontSize: '0.85rem' }}>{item.id}: {item.name}</span>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>- {item.note}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Missing DB Tables */}
            <div>
              <h3 style={{ color: '#7c3aed', margin: '0 0 0.75rem', fontSize: '0.9rem', fontWeight: 600 }}>
                🗄️ טבלאות DB חסרות ({DEV_STATUS.missingTables.length})
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {DEV_STATUS.missingTables.map((table, i) => (
                  <span key={i} style={{
                    background: '#faf5ff',
                    border: '1px solid #d8b4fe',
                    borderRadius: '6px',
                    padding: '0.4rem 0.75rem',
                    fontSize: '0.8rem',
                    color: '#6b21a8',
                  }}>
                    {table.name} - {table.desc}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Feedback Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem',
      }}>
        <div style={{
          background: THEME.cardBg,
          border: `2px solid ${THEME.cardBorder}`,
          borderRadius: '12px',
          padding: '1.25rem',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: THEME.accentPrimary }}>{messages.length}</div>
          <div style={{ fontSize: '0.85rem', color: THEME.subtitleText, marginTop: '0.25rem' }}>סה"כ הודעות</div>
        </div>
        <div style={{
          background: THEME.cardBg,
          border: `2px solid ${THEME.cardBorder}`,
          borderRadius: '12px',
          padding: '1.25rem',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#d97706' }}>{pendingCount}</div>
          <div style={{ fontSize: '0.85rem', color: THEME.subtitleText, marginTop: '0.25rem' }}>ממתינות לטיפול</div>
        </div>
        <div style={{
          background: THEME.cardBg,
          border: `2px solid ${THEME.cardBorder}`,
          borderRadius: '12px',
          padding: '1.25rem',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#dc2626' }}>{criticalCount}</div>
          <div style={{ fontSize: '0.85rem', color: THEME.subtitleText, marginTop: '0.25rem' }}>קריטי פתוח</div>
        </div>
        <div style={{
          background: THEME.cardBg,
          border: `2px solid ${THEME.cardBorder}`,
          borderRadius: '12px',
          padding: '1.25rem',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#059669' }}>
            {messages.filter(m => m.status === 'done').length}
          </div>
          <div style={{ fontSize: '0.85rem', color: THEME.subtitleText, marginTop: '0.25rem' }}>טופלו</div>
        </div>
      </div>

      {/* Filters and Actions */}
      <div style={{
        background: THEME.cardBg,
        border: `2px solid ${THEME.cardBorder}`,
        borderRadius: '12px',
        padding: '1rem 1.25rem',
        marginBottom: '1rem',
      }}>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <Filter size={18} style={{ color: THEME.subtitleText }} />
          <span style={{ color: THEME.subtitleText, marginLeft: '0.5rem' }}>סינון:</span>

          {(['all', 'pending', 'reviewed', 'done'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '0.4rem 0.75rem',
                borderRadius: '6px',
                border: filter === f ? `2px solid ${THEME.accentPrimary}` : `1px solid ${THEME.cardBorder}`,
                background: filter === f ? 'rgba(0, 180, 216, 0.1)' : THEME.cardBg,
                color: filter === f ? THEME.accentDark : THEME.headerText,
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: filter === f ? 600 : 400,
                transition: 'all 0.2s',
              }}
            >
              {f === 'all' ? 'הכל' : f === 'pending' ? 'ממתין' : f === 'reviewed' ? 'נצפה' : 'טופל'}
            </button>
          ))}

          <div style={{ flex: 1 }} />

          <button
            onClick={refresh}
            disabled={refreshing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              border: `2px solid ${THEME.cardBorder}`,
              background: THEME.cardBg,
              color: THEME.headerText,
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: 500,
            }}
          >
            <RefreshCw size={16} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
            רענן
          </button>
        </div>
      </div>

      {/* Bulk Actions */}
      {messages.length > 0 && (
        <div style={{
          background: THEME.cardBg,
          border: `2px solid ${THEME.cardBorder}`,
          borderRadius: '12px',
          padding: '1rem 1.25rem',
          marginBottom: '1rem',
        }}>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={selectAll}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.4rem 0.75rem',
                borderRadius: '6px',
                border: `1px solid ${THEME.cardBorder}`,
                background: selectedIds.size === messages.length ? 'rgba(0, 180, 216, 0.1)' : THEME.cardBg,
                color: THEME.headerText,
                cursor: 'pointer',
                fontSize: '0.85rem',
              }}
            >
              {selectedIds.size === messages.length ? <CheckSquare size={16} color={THEME.accentPrimary} /> : <Square size={16} />}
              {selectedIds.size === messages.length ? 'בטל בחירה' : 'בחר הכל'}
            </button>

            {selectedIds.size > 0 && (
              <>
                <span style={{ color: THEME.subtitleText, fontSize: '0.85rem', fontWeight: 500 }}>
                  נבחרו: {selectedIds.size}
                </span>

                <button
                  onClick={exportSelected}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.4rem 0.75rem',
                    borderRadius: '6px',
                    border: '2px solid #3b82f6',
                    background: '#eff6ff',
                    color: '#1d4ed8',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: 500,
                  }}
                >
                  <Download size={16} />
                  העתק/ייצא
                </button>

                <button
                  onClick={markSelectedAsDone}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.4rem 0.75rem',
                    borderRadius: '6px',
                    border: '2px solid #059669',
                    background: '#ecfdf5',
                    color: '#047857',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: 500,
                  }}
                >
                  <CheckCircle size={16} />
                  סמן כטופלו
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Messages List */}
      {messages.length === 0 ? (
        <div style={{
          background: THEME.cardBg,
          border: `2px solid ${THEME.cardBorder}`,
          borderRadius: '12px',
          textAlign: 'center',
          padding: '3rem',
        }}>
          <MessageSquare size={48} style={{ color: THEME.cardBorder, marginBottom: '1rem' }} />
          <h3 style={{ color: THEME.headerText, margin: '0 0 0.5rem' }}>אין הודעות</h3>
          <p style={{ color: THEME.subtitleText, margin: 0 }}>
            {filter === 'all' ? 'עדיין לא התקבלו הודעות' : `אין הודעות בסטטוס "${filter}"`}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {messages.map(msg => (
            <div
              key={msg.id}
              style={{
                background: selectedIds.has(msg.id) ? 'rgba(0, 180, 216, 0.08)' : THEME.cardBg,
                border: `2px solid ${selectedIds.has(msg.id) ? THEME.accentPrimary : THEME.cardBorder}`,
                borderRadius: '12px',
                padding: '1rem 1.25rem',
                borderRight: msg.priority === 'critical' ? '5px solid #dc2626' :
                             msg.priority === 'high' ? '5px solid #f59e0b' :
                             `5px solid ${THEME.cardBorder}`,
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <button
                  onClick={() => toggleSelect(msg.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: selectedIds.has(msg.id) ? THEME.accentPrimary : THEME.subtitleText,
                    padding: '0.25rem',
                  }}
                >
                  {selectedIds.has(msg.id) ? <CheckSquare size={20} /> : <Square size={20} />}
                </button>
                <span style={{
                  padding: '0.25rem 0.6rem',
                  background: 'linear-gradient(135deg, #0077b6, #00b4d8)',
                  color: 'white',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                }}>
                  {msg.author_name}
                </span>
                {getPriorityBadge(msg.priority)}
                {getStatusBadge(msg.status)}
                <span style={{ flex: 1 }} />
                <span style={{ color: THEME.subtitleText, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Clock size={14} />
                  {formatDate(msg.created_at)}
                </span>
              </div>

              {/* Message */}
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                padding: '1rem',
                borderRadius: '8px',
                marginBottom: '0.75rem',
                whiteSpace: 'pre-wrap',
                lineHeight: 1.6,
                color: THEME.headerText,
              }}>
                {msg.message}
              </div>

              {/* Page URL */}
              <div style={{ marginBottom: '0.75rem', fontSize: '0.85rem', color: THEME.subtitleText }}>
                📍 עמוד: <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', color: THEME.headerText, border: '1px solid #e2e8f0' }}>{msg.page_url}</code>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {msg.status === 'pending' && (
                  <button
                    onClick={() => updateStatus(msg.id, 'reviewed')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.4rem 0.75rem',
                      fontSize: '0.85rem',
                      borderRadius: '6px',
                      border: `1px solid ${THEME.cardBorder}`,
                      background: THEME.cardBg,
                      color: THEME.headerText,
                      cursor: 'pointer',
                    }}
                  >
                    👀 סמן כנצפה
                  </button>
                )}
                {msg.status !== 'done' && (
                  <button
                    onClick={() => updateStatus(msg.id, 'done')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.4rem 0.75rem',
                      fontSize: '0.85rem',
                      borderRadius: '6px',
                      border: '2px solid #059669',
                      background: '#ecfdf5',
                      color: '#047857',
                      cursor: 'pointer',
                      fontWeight: 500,
                    }}
                  >
                    <CheckCircle size={14} />
                    טופל
                  </button>
                )}
                {msg.status === 'done' && (
                  <button
                    onClick={() => updateStatus(msg.id, 'pending')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.4rem 0.75rem',
                      fontSize: '0.85rem',
                      borderRadius: '6px',
                      border: `1px solid ${THEME.cardBorder}`,
                      background: THEME.cardBg,
                      color: THEME.headerText,
                      cursor: 'pointer',
                    }}
                  >
                    <ArrowUpCircle size={14} />
                    פתח מחדש
                  </button>
                )}
                <div style={{ flex: 1 }} />
                <button
                  onClick={() => deleteMessage(msg.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.4rem 0.75rem',
                    fontSize: '0.85rem',
                    borderRadius: '6px',
                    border: '1px solid #fecaca',
                    background: '#fef2f2',
                    color: '#dc2626',
                    cursor: 'pointer',
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
// Trigger rebuild 1769263302
