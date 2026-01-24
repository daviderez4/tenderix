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
        background: 'var(--gray-800)',
        borderRadius: '12px',
        border: '1px solid var(--gray-700)',
        overflow: 'hidden',
        transition: 'all 0.2s ease',
        cursor: 'pointer',
      }}
      onMouseOver={e => {
        e.currentTarget.style.borderColor = 'var(--gray-600)';
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.3)';
      }}
      onMouseOut={e => {
        e.currentTarget.style.borderColor = 'var(--gray-700)';
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
      onClick={() => onOpen(tender)}
    >
      {/* Header */}
      <div style={{ padding: '1rem 1rem 0.75rem', borderBottom: '1px solid var(--gray-700)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
          <h3
            style={{
              margin: 0,
              fontSize: '1rem',
              fontWeight: 600,
              color: 'white',
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
              color: tender.is_favorite ? '#fbbf24' : 'var(--gray-500)',
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
            <Star size={20} fill={tender.is_favorite ? '#fbbf24' : 'none'} />
          </button>
        </div>

        {/* Meta info */}
        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
          {tender.issuing_body && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--gray-400)', fontSize: '0.8rem' }}>
              <Building2 size={14} />
              <span>{tender.issuing_body}</span>
            </div>
          )}
          {tender.deadline && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--gray-400)', fontSize: '0.8rem' }}>
              <Calendar size={14} />
              <span>{formatDate(tender.deadline)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Workflow Progress */}
      <div style={{ padding: '1rem', background: 'var(--gray-850, rgba(0,0,0,0.2))' }}>
        <WorkflowProgress stages={stages} size="small" />
      </div>

      {/* Actions */}
      <div
        style={{
          padding: '0.75rem 1rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderTop: '1px solid var(--gray-700)',
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
            color: 'var(--gray-500)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            fontSize: '0.8rem',
            borderRadius: '6px',
            transition: 'all 0.2s',
          }}
          onMouseOver={e => {
            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
            e.currentTarget.style.color = '#ef4444';
          }}
          onMouseOut={e => {
            e.currentTarget.style.background = 'none';
            e.currentTarget.style.color = 'var(--gray-500)';
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
            background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
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
            e.currentTarget.style.background = 'linear-gradient(135deg, #8b5cf6, #7c3aed)';
          }}
          onMouseOut={e => {
            e.currentTarget.style.background = 'linear-gradient(135deg, #7c3aed, #6d28d9)';
          }}
        >
          פתח
          <ExternalLink size={14} />
        </button>
      </div>
    </div>
  );
}
