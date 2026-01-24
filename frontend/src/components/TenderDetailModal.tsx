import { X, Star, Trash2, Calendar, Building2, Clock, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { WorkflowProgress, getDefaultStages } from './WorkflowProgress';
import type { WorkflowStage } from './WorkflowProgress';
import type { TenderData } from './TenderCard';

interface TenderDetailModalProps {
  tender: TenderData | null;
  isOpen: boolean;
  onClose: () => void;
  onFavorite: (tender: TenderData) => void;
  onDelete: (tender: TenderData) => void;
}

// Light teal/cyan metallic theme colors
const THEME = {
  modalBg: '#ffffff',
  overlayBg: 'rgba(0, 50, 70, 0.5)',
  headerGradient: 'linear-gradient(135deg, #00b4d8, #0096c7)',
  headerText: '#ffffff',
  sectionBg: '#f8fcfd',
  sectionBorder: '#e0f4f7',
  cardBg: '#ffffff',
  cardBorder: '#c8e4eb',
  textPrimary: '#1e3a4c',
  textSecondary: '#5a7d8a',
  textMuted: '#8aa4ae',
  accentPrimary: '#00b4d8',
  accentSuccess: 'linear-gradient(135deg, #10b981, #059669)',
  starActive: '#fbbf24',
  deleteHover: '#ef4444',
  buttonBorder: '#c8e4eb',
};

export function TenderDetailModal({
  tender,
  isOpen,
  onClose,
  onFavorite,
  onDelete,
}: TenderDetailModalProps) {
  const navigate = useNavigate();

  if (!isOpen || !tender) return null;

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'לא צוין';
    try {
      return new Date(dateStr).toLocaleDateString('he-IL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const stages = getDefaultStages(tender.current_step);
  const currentStage = stages.find(s => s.status === 'current') || stages[0];

  const handleStageClick = (stage: WorkflowStage) => {
    localStorage.setItem('currentTenderId', tender.id);
    localStorage.setItem('currentTenderTitle', tender.title || '');
    navigate(stage.route);
    onClose();
  };

  const handleContinue = () => {
    handleStageClick(currentStage);
  };

  const getStageDescription = (step?: string): string => {
    switch (step?.toLowerCase()) {
      case 'p1':
        return 'קליטת מסמכי המכרז וחילוץ מידע בסיסי';
      case 'p2':
        return 'ניתוח תנאי סף והתאמה לפרופיל החברה';
      case 'p3':
        return 'ניתוח כתב כמויות ותמחור';
      case 'p4':
        return 'ניתוח מתחרים והערכת סיכויים';
      case 'output':
        return 'הפקת המלצות והחלטה';
      default:
        return 'טרם החלה עבודה על מכרז זה';
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: THEME.overlayBg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1500,
        animation: 'fadeIn 0.2s ease-out',
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: THEME.modalBg,
          borderRadius: '16px',
          width: '100%',
          maxWidth: '700px',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 25px 50px rgba(0, 100, 130, 0.2)',
          animation: 'slideUp 0.3s ease-out',
          border: `2px solid ${THEME.cardBorder}`,
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.5rem',
            background: THEME.headerGradient,
            position: 'relative',
          }}
        >
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '1rem',
              left: '1rem',
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'white',
              transition: 'background 0.2s',
            }}
            onMouseOver={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.3)';
            }}
            onMouseOut={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
            }}
          >
            <X size={20} />
          </button>

          <h2
            style={{
              margin: 0,
              color: THEME.headerText,
              fontSize: '1.25rem',
              fontWeight: 600,
              paddingLeft: '3rem',
              direction: 'rtl',
              lineHeight: 1.4,
            }}
          >
            {tender.title || 'מכרז ללא שם'}
          </h2>

          <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
            {tender.issuing_body && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(255,255,255,0.95)', fontSize: '0.9rem' }}>
                <Building2 size={16} />
                <span>{tender.issuing_body}</span>
              </div>
            )}
            {tender.deadline && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(255,255,255,0.95)', fontSize: '0.9rem' }}>
                <Calendar size={16} />
                <span>{formatDate(tender.deadline)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Workflow Progress */}
        <div style={{ padding: '2rem', background: THEME.sectionBg }}>
          <h3 style={{ margin: '0 0 1.5rem', color: THEME.textSecondary, fontSize: '0.9rem', fontWeight: 500, textAlign: 'center' }}>
            מסלול עבודה - לחץ על שלב כדי לנווט אליו
          </h3>
          <WorkflowProgress
            stages={stages}
            size="large"
            onStageClick={handleStageClick}
            lightTheme
          />
        </div>

        {/* Current Status */}
        <div style={{ padding: '1.5rem', borderTop: `1px solid ${THEME.sectionBorder}` }}>
          <div
            style={{
              background: THEME.cardBg,
              borderRadius: '12px',
              padding: '1rem 1.25rem',
              border: `1px solid ${THEME.cardBorder}`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <Clock size={16} color={THEME.accentPrimary} />
              <span style={{ color: THEME.textSecondary, fontSize: '0.85rem', fontWeight: 500 }}>
                סטטוס נוכחי
              </span>
            </div>
            <p style={{ margin: 0, color: THEME.textPrimary, fontSize: '1rem', fontWeight: 600 }}>
              {currentStage.id.toUpperCase()} - {currentStage.labelHe}
            </p>
            <p style={{ margin: '0.5rem 0 0', color: THEME.textSecondary, fontSize: '0.85rem' }}>
              {getStageDescription(tender.current_step)}
            </p>
          </div>
        </div>

        {/* Details */}
        <div style={{ padding: '0 1.5rem 1.5rem' }}>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {tender.created_at && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: THEME.textMuted }}>נוצר:</span>
                <span style={{ color: THEME.textSecondary }}>{formatDate(tender.created_at)}</span>
              </div>
            )}
            {tender.updated_at && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: THEME.textMuted }}>עודכן לאחרונה:</span>
                <span style={{ color: THEME.textSecondary }}>{formatDate(tender.updated_at)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
              <span style={{ color: THEME.textMuted }}>מזהה:</span>
              <span style={{ color: THEME.textMuted, fontFamily: 'monospace', fontSize: '0.75rem' }}>
                {tender.id.slice(0, 8)}...
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div
          style={{
            padding: '1rem 1.5rem 1.5rem',
            display: 'flex',
            gap: '0.75rem',
            flexWrap: 'wrap',
            borderTop: `1px solid ${THEME.sectionBorder}`,
          }}
        >
          <button
            onClick={() => onFavorite(tender)}
            style={{
              flex: 1,
              minWidth: '120px',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              border: tender.is_favorite ? `2px solid ${THEME.starActive}` : `1px solid ${THEME.buttonBorder}`,
              background: tender.is_favorite ? 'rgba(251, 191, 36, 0.1)' : THEME.cardBg,
              color: tender.is_favorite ? THEME.starActive : THEME.textSecondary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              fontSize: '0.9rem',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <Star size={18} fill={tender.is_favorite ? THEME.starActive : 'none'} />
            {tender.is_favorite ? 'במועדפים' : 'הוסף למועדפים'}
          </button>

          <button
            onClick={() => onDelete(tender)}
            style={{
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              border: `1px solid ${THEME.buttonBorder}`,
              background: THEME.cardBg,
              color: THEME.textMuted,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              fontSize: '0.9rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseOver={e => {
              e.currentTarget.style.borderColor = THEME.deleteHover;
              e.currentTarget.style.color = THEME.deleteHover;
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.05)';
            }}
            onMouseOut={e => {
              e.currentTarget.style.borderColor = THEME.buttonBorder;
              e.currentTarget.style.color = THEME.textMuted;
              e.currentTarget.style.background = THEME.cardBg;
            }}
          >
            <Trash2 size={18} />
            מחק
          </button>

          <button
            onClick={handleContinue}
            style={{
              flex: 2,
              minWidth: '160px',
              padding: '0.75rem 1.5rem',
              borderRadius: '8px',
              border: 'none',
              background: THEME.accentSuccess,
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              fontSize: '0.95rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseOver={e => {
              e.currentTarget.style.background = 'linear-gradient(135deg, #34d399, #10b981)';
            }}
            onMouseOut={e => {
              e.currentTarget.style.background = THEME.accentSuccess;
            }}
          >
            המשך ל{currentStage.labelHe}
            <ArrowLeft size={18} />
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
