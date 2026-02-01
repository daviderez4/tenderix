import { Star, Trash2, Calendar, Building2, ExternalLink } from 'lucide-react';
import { WorkflowProgress, getDefaultStages } from './WorkflowProgress';

export interface TenderData {
  id: string;
  title: string;
  issuing_body?: string;
  deadline?: string;
  status?: string;
  current_step?: string;
  is_favorite?: boolean;
  created_at?: string;
  updated_at?: string;
}

interface TenderCardProps {
  tender: TenderData;
  onOpen: (tender: TenderData) => void;
  onFavorite: (tender: TenderData) => void;
  onDelete: (tender: TenderData) => void;
}

// Clean white theme colors
const THEME = {
  cardBg: '#ffffff',
  cardBorder: '#e2e8f0',
  cardBorderHover: '#2563eb',
  cardShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
  cardShadowHover: '0 4px 12px rgba(37, 99, 235, 0.15)',
  headerBorder: '#f1f5f9',
  progressBg: '#f8fafc',
  textPrimary: '#1e293b',
  textSecondary: '#64748b',
  textMuted: '#94a3b8',
  accentPrimary: '#2563eb',
  accentGradient: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
  accentGradientHover: 'linear-gradient(135deg, #3b82f6, #2563eb)',
  starActive: '#fbbf24',
  deleteHover: '#ef4444',
};

export function TenderCard({ tender, onOpen, onFavorite, onDelete }: TenderCardProps) {
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'לא צוין';
    try {
      return new Date(dateStr).toLocaleDateString('he-IL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const stages = getDefaultStages(tender.current_step);

  return (
    <div
      style={{
        background: THEME.cardBg,
        borderRadius: '12px',
        border: `2px solid ${THEME.cardBorder}`,
        overflow: 'hidden',
        transition: 'all 0.2s ease',
        cursor: 'pointer',
        boxShadow: THEME.cardShadow,
      }}
      onMouseOver={e => {
        e.currentTarget.style.borderColor = THEME.cardBorderHover;
        e.currentTarget.style.transform = 'translateY(-3px)';
        e.currentTarget.style.boxShadow = THEME.cardShadowHover;
      }}
      onMouseOut={e => {
        e.currentTarget.style.borderColor = THEME.cardBorder;
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = THEME.cardShadow;
      }}
      onClick={() => onOpen(tender)}
    >
      {/* Header */}
      <div style={{ padding: '1rem 1rem 0.75rem', borderBottom: `1px solid ${THEME.headerBorder}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
          <h3
            style={{
              margin: 0,
              fontSize: '1rem',
              fontWeight: 600,
              color: THEME.textPrimary,
              flex: 1,
              lineHeight: 1.4,
              direction: 'rtl',
            }}
          >
            {tender.title || 'מכרז ללא שם'}
          </h3>
          <button
            onClick={e => {
              e.stopPropagation();
              onFavorite(tender);
            }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              color: tender.is_favorite ? THEME.starActive : THEME.textMuted,
              transition: 'all 0.2s',
            }}
            onMouseOver={e => {
              e.currentTarget.style.transform = 'scale(1.2)';
            }}
            onMouseOut={e => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
            title={tender.is_favorite ? 'הסר מהמועדפים' : 'הוסף למועדפים'}
          >
            <Star size={20} fill={tender.is_favorite ? THEME.starActive : 'none'} />
          </button>
        </div>

        {/* Meta info */}
        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
          {tender.issuing_body && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: THEME.textSecondary, fontSize: '0.8rem' }}>
              <Building2 size={14} />
              <span>{tender.issuing_body}</span>
            </div>
          )}
          {tender.deadline && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: THEME.textSecondary, fontSize: '0.8rem' }}>
              <Calendar size={14} />
              <span>{formatDate(tender.deadline)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Workflow Progress */}
      <div style={{ padding: '1rem', background: THEME.progressBg }}>
        <WorkflowProgress stages={stages} size="small" lightTheme />
      </div>

      {/* Actions */}
      <div
        style={{
          padding: '0.75rem 1rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderTop: `1px solid ${THEME.headerBorder}`,
          background: THEME.cardBg,
        }}
      >
        <button
          onClick={e => {
            e.stopPropagation();
            onDelete(tender);
          }}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '6px 10px',
            color: THEME.textMuted,
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            fontSize: '0.8rem',
            borderRadius: '6px',
            transition: 'all 0.2s',
          }}
          onMouseOver={e => {
            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
            e.currentTarget.style.color = THEME.deleteHover;
          }}
          onMouseOut={e => {
            e.currentTarget.style.background = 'none';
            e.currentTarget.style.color = THEME.textMuted;
          }}
        >
          <Trash2 size={14} />
          מחק
        </button>

        <button
          onClick={e => {
            e.stopPropagation();
            onOpen(tender);
          }}
          style={{
            background: THEME.accentGradient,
            border: 'none',
            cursor: 'pointer',
            padding: '6px 14px',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            fontSize: '0.85rem',
            fontWeight: 500,
            borderRadius: '6px',
            transition: 'all 0.2s',
          }}
          onMouseOver={e => {
            e.currentTarget.style.background = THEME.accentGradientHover;
          }}
          onMouseOut={e => {
            e.currentTarget.style.background = THEME.accentGradient;
          }}
        >
          פתח
          <ExternalLink size={14} />
        </button>
      </div>
    </div>
  );
}
