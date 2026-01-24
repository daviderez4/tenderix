import { useState, useEffect } from 'react';
import { MessageSquarePlus, X, Send, CheckCircle } from 'lucide-react';
import { API_CONFIG } from '../api/config';

interface FeedbackMessage {
  id: string;
  created_at: string;
  author_name: string;
  page_url: string;
  message: string;
  status: 'pending' | 'reviewed' | 'done';
  priority: 'low' | 'medium' | 'high' | 'critical';
}

// Quick select authors - these are the team members
const TEAM_MEMBERS = ['עידו', 'אליצח', 'דוד'] as const;

export function FeedbackWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [authorName, setAuthorName] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [isSending, setIsSending] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Load saved author name
  useEffect(() => {
    const saved = localStorage.getItem('feedback_author_name');
    if (saved) setAuthorName(saved);
  }, []);

  // Check for unread feedback (for admin view)
  useEffect(() => {
    checkUnreadCount();
  }, []);

  async function checkUnreadCount() {
    try {
      const res = await fetch(
        `${API_CONFIG.SUPABASE_URL}/rest/v1/dev_feedback?status=eq.pending&select=id`,
        {
          headers: {
            'apikey': API_CONFIG.SUPABASE_KEY,
            'Authorization': `Bearer ${API_CONFIG.SUPABASE_KEY}`,
          },
        }
      );
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.length);
      }
    } catch (e) {
      console.log('Feedback table may not exist yet');
    }
  }

  function selectAuthor(name: string) {
    setAuthorName(name);
    localStorage.setItem('feedback_author_name', name);
  }

  async function submitFeedback() {
    if (!message.trim() || !authorName.trim()) return;

    setIsSending(true);
    try {
      // Save author name for next time
      localStorage.setItem('feedback_author_name', authorName);

      const feedback: Partial<FeedbackMessage> = {
        author_name: authorName,
        page_url: window.location.pathname,
        message: message.trim(),
        priority,
        status: 'pending',
      };

      const res = await fetch(
        `${API_CONFIG.SUPABASE_URL}/rest/v1/dev_feedback`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': API_CONFIG.SUPABASE_KEY,
            'Authorization': `Bearer ${API_CONFIG.SUPABASE_KEY}`,
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify(feedback),
        }
      );

      if (res.ok) {
        setShowSuccess(true);
        setMessage('');
        setTimeout(() => {
          setShowSuccess(false);
          setIsOpen(false);
        }, 2000);
      } else {
        console.error('Failed to submit feedback:', await res.text());
        alert('שגיאה בשליחת המשוב. נסה שוב.');
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      alert('שגיאה בשליחת המשוב');
    } finally {
      setIsSending(false);
    }
  }

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'fixed',
          bottom: '1rem',
          right: '1rem',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
          color: 'white',
          border: 'none',
          boxShadow: '0 4px 12px rgba(124, 58, 237, 0.4)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1001,
          transition: 'transform 0.2s, box-shadow 0.2s',
        }}
        onMouseOver={e => {
          e.currentTarget.style.transform = 'scale(1.1)';
          e.currentTarget.style.boxShadow = '0 6px 16px rgba(124, 58, 237, 0.5)';
        }}
        onMouseOut={e => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(124, 58, 237, 0.4)';
        }}
      >
        {isOpen ? <X size={24} /> : <MessageSquarePlus size={24} />}
        {unreadCount > 0 && !isOpen && (
          <span style={{
            position: 'absolute',
            top: '-4px',
            right: '-4px',
            background: '#dc2626',
            color: 'white',
            fontSize: '0.75rem',
            fontWeight: 'bold',
            padding: '2px 6px',
            borderRadius: '10px',
            minWidth: '18px',
            textAlign: 'center',
          }}>
            {unreadCount}
          </span>
        )}
      </button>

      {/* Feedback Panel */}
      {isOpen && (
        <div style={{
          position: 'fixed',
          bottom: '5rem',
          right: '1rem',
          width: '340px',
          background: 'var(--gray-900)',
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          zIndex: 1001,
          overflow: 'hidden',
          animation: 'fadeIn 0.2s ease-out',
        }}>
          {/* Header */}
          <div style={{
            padding: '1rem',
            background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
            color: 'white',
          }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>
              💬 משוב לצוות הפיתוח
            </h3>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', opacity: 0.9 }}>
              כתוב מה אתה רואה, מה עובד, מה צריך לתקן
            </p>
          </div>

          {/* Content */}
          {showSuccess ? (
            <div style={{
              padding: '2rem',
              textAlign: 'center',
              color: '#22c55e',
            }}>
              <CheckCircle size={48} style={{ marginBottom: '0.5rem' }} />
              <p style={{ margin: 0, fontWeight: 600 }}>ההודעה נשלחה בהצלחה!</p>
            </div>
          ) : (
            <div style={{ padding: '1rem' }}>
              {/* Author Name with Quick Select */}
              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--gray-400)' }}>
                  מי אתה? (לחץ לבחירה מהירה)
                </label>

                {/* Quick Select Buttons */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  {TEAM_MEMBERS.map(name => (
                    <button
                      key={name}
                      onClick={() => selectAuthor(name)}
                      style={{
                        flex: 1,
                        padding: '0.5rem 0.75rem',
                        borderRadius: '8px',
                        border: authorName === name ? '2px solid #7c3aed' : '1px solid var(--gray-600)',
                        background: authorName === name ? 'linear-gradient(135deg, #7c3aed, #6d28d9)' : 'var(--gray-800)',
                        color: authorName === name ? 'white' : 'var(--gray-300)',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        fontWeight: authorName === name ? 600 : 500,
                        transition: 'all 0.2s',
                      }}
                    >
                      {name}
                    </button>
                  ))}
                </div>

                {/* Custom Name Input (collapsed if team member selected) */}
                {!TEAM_MEMBERS.includes(authorName as typeof TEAM_MEMBERS[number]) && (
                  <input
                    type="text"
                    value={authorName}
                    onChange={e => setAuthorName(e.target.value)}
                    placeholder="או הקלד שם אחר..."
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '6px',
                      border: '1px solid var(--gray-700)',
                      background: 'var(--gray-800)',
                      color: 'white',
                      fontSize: '0.9rem',
                    }}
                  />
                )}

                {/* Show selected name or option to change */}
                {TEAM_MEMBERS.includes(authorName as typeof TEAM_MEMBERS[number]) && (
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: '0.25rem',
                  }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>
                      ✓ נבחר: {authorName}
                    </span>
                    <button
                      onClick={() => setAuthorName('')}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--gray-500)',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        textDecoration: 'underline',
                      }}
                    >
                      שם אחר
                    </button>
                  </div>
                )}
              </div>

              {/* Priority */}
              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem', color: 'var(--gray-400)' }}>
                  עדיפות
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {(['low', 'medium', 'high', 'critical'] as const).map(p => (
                    <button
                      key={p}
                      onClick={() => setPriority(p)}
                      style={{
                        flex: 1,
                        padding: '0.4rem',
                        borderRadius: '6px',
                        border: priority === p ? '2px solid' : '1px solid var(--gray-700)',
                        borderColor: priority === p ?
                          (p === 'critical' ? '#dc2626' : p === 'high' ? '#f59e0b' : p === 'medium' ? '#7c3aed' : '#6b7280') :
                          'var(--gray-700)',
                        background: priority === p ?
                          (p === 'critical' ? 'rgba(220, 38, 38, 0.2)' : p === 'high' ? 'rgba(245, 158, 11, 0.2)' : p === 'medium' ? 'rgba(124, 58, 237, 0.2)' : 'rgba(107, 114, 128, 0.2)') :
                          'transparent',
                        color: p === 'critical' ? '#fca5a5' : p === 'high' ? '#fcd34d' : p === 'medium' ? '#c4b5fd' : 'var(--gray-400)',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        fontWeight: 500,
                      }}
                    >
                      {p === 'critical' ? '🔥 קריטי' : p === 'high' ? '⚡ גבוה' : p === 'medium' ? '📝 בינוני' : '💤 נמוך'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Message */}
              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem', color: 'var(--gray-400)' }}>
                  ההודעה שלך
                </label>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="מה גילית? מה עובד? מה צריך לתקן?..."
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '6px',
                    border: '1px solid var(--gray-700)',
                    background: 'var(--gray-800)',
                    color: 'white',
                    fontSize: '0.95rem',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              {/* Current Page */}
              <div style={{ marginBottom: '1rem', fontSize: '0.8rem', color: 'var(--gray-500)' }}>
                📍 עמוד נוכחי: {window.location.pathname}
              </div>

              {/* Submit Button */}
              <button
                onClick={submitFeedback}
                disabled={isSending || !message.trim() || !authorName.trim()}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #059669, #047857)',
                  color: 'white',
                  fontSize: '1rem',
                  fontWeight: 600,
                  cursor: isSending || !message.trim() || !authorName.trim() ? 'not-allowed' : 'pointer',
                  opacity: isSending || !message.trim() || !authorName.trim() ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                }}
              >
                {isSending ? (
                  <div className="spinner" style={{ width: '18px', height: '18px' }} />
                ) : (
                  <Send size={18} />
                )}
                שלח הודעה
              </button>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
