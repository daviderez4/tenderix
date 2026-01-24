import { useState, useEffect } from 'react';
import { MessageSquare, Clock, CheckCircle, AlertCircle, Trash2, RefreshCw, Filter, ArrowUpCircle } from 'lucide-react';
import { API_CONFIG } from '../api/config';
import { Loading } from '../components/Loading';

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
      // Update local state
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
    } catch (error) {
      console.error('Error deleting message:', error);
    }
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

  if (loading) return <Loading />;

  const pendingCount = messages.filter(m => m.status === 'pending').length;
  const criticalCount = messages.filter(m => m.priority === 'critical' && m.status !== 'done').length;

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">
          <MessageSquare size={28} style={{ marginLeft: '0.5rem', verticalAlign: 'middle' }} />
          משוב מצוות הבדיקה
        </h1>
        <p className="page-subtitle">
          הודעות מעידו, אליצח וצוות הפיתוח
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-4" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--primary)' }}>{messages.length}</div>
          <div className="stat-label">סה"כ הודעות</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: '#eab308' }}>{pendingCount}</div>
          <div className="stat-label">ממתינות לטיפול</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: '#dc2626' }}>{criticalCount}</div>
          <div className="stat-label">קריטי פתוח</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: '#22c55e' }}>
            {messages.filter(m => m.status === 'done').length}
          </div>
          <div className="stat-label">טופלו</div>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <Filter size={18} style={{ color: 'var(--gray-500)' }} />
          <span style={{ color: 'var(--gray-500)', marginLeft: '0.5rem' }}>סינון:</span>

          {(['all', 'pending', 'reviewed', 'done'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '0.4rem 0.75rem',
                borderRadius: '6px',
                border: filter === f ? '2px solid var(--primary)' : '1px solid var(--gray-700)',
                background: filter === f ? 'rgba(124, 58, 237, 0.2)' : 'transparent',
                color: filter === f ? 'var(--primary)' : 'var(--gray-400)',
                cursor: 'pointer',
                fontSize: '0.85rem',
              }}
            >
              {f === 'all' ? 'הכל' : f === 'pending' ? 'ממתין' : f === 'reviewed' ? 'נצפה' : 'טופל'}
            </button>
          ))}

          <div style={{ flex: 1 }} />

          <button
            className="btn btn-secondary"
            onClick={refresh}
            disabled={refreshing}
          >
            {refreshing ? <div className="spinner" /> : <RefreshCw size={16} />}
            רענן
          </button>
        </div>
      </div>

      {/* Messages List */}
      {messages.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <MessageSquare size={48} style={{ color: 'var(--gray-600)', marginBottom: '1rem' }} />
          <h3>אין הודעות</h3>
          <p style={{ color: 'var(--gray-500)' }}>
            {filter === 'all' ? 'עדיין לא התקבלו הודעות' : `אין הודעות בסטטוס "${filter}"`}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {messages.map(msg => (
            <div
              key={msg.id}
              className="card"
              style={{
                padding: '1rem',
                borderRight: msg.priority === 'critical' ? '4px solid #dc2626' :
                             msg.priority === 'high' ? '4px solid #f59e0b' :
                             '4px solid var(--gray-700)',
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <span style={{
                  padding: '0.25rem 0.5rem',
                  background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
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
                <span style={{ color: 'var(--gray-500)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Clock size={14} />
                  {formatDate(msg.created_at)}
                </span>
              </div>

              {/* Message */}
              <div style={{
                background: 'var(--gray-800)',
                padding: '1rem',
                borderRadius: '8px',
                marginBottom: '0.75rem',
                whiteSpace: 'pre-wrap',
                lineHeight: 1.6,
              }}>
                {msg.message}
              </div>

              {/* Page URL */}
              <div style={{ marginBottom: '0.75rem', fontSize: '0.85rem', color: 'var(--gray-500)' }}>
                📍 עמוד: <code style={{ background: 'var(--gray-800)', padding: '2px 6px', borderRadius: '4px' }}>{msg.page_url}</code>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {msg.status === 'pending' && (
                  <button
                    className="btn btn-secondary"
                    onClick={() => updateStatus(msg.id, 'reviewed')}
                    style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                  >
                    👀 סמן כנצפה
                  </button>
                )}
                {msg.status !== 'done' && (
                  <button
                    className="btn btn-secondary"
                    onClick={() => updateStatus(msg.id, 'done')}
                    style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem', background: 'rgba(34, 197, 94, 0.2)', color: '#22c55e' }}
                  >
                    <CheckCircle size={14} />
                    טופל
                  </button>
                )}
                {msg.status === 'done' && (
                  <button
                    className="btn btn-secondary"
                    onClick={() => updateStatus(msg.id, 'pending')}
                    style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                  >
                    <ArrowUpCircle size={14} />
                    פתח מחדש
                  </button>
                )}
                <div style={{ flex: 1 }} />
                <button
                  className="btn btn-secondary"
                  onClick={() => deleteMessage(msg.id)}
                  style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem', color: 'var(--danger)' }}
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
