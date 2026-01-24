import { X, AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

// Light theme colors
const THEME = {
  modalBg: '#ffffff',
  overlayBg: 'rgba(0, 50, 70, 0.5)',
  textPrimary: '#1e3a4c',
  textSecondary: '#5a7d8a',
  textMuted: '#8aa4ae',
  buttonBorder: '#c8e4eb',
  buttonHoverBg: '#f0f9fb',
  cardBorder: '#c8e4eb',
};

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = 'אישור',
  cancelText = 'ביטול',
  variant = 'danger',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const variantColors = {
    danger: {
      icon: '#ef4444',
      iconBg: 'rgba(239, 68, 68, 0.1)',
      button: 'linear-gradient(135deg, #dc2626, #b91c1c)',
      buttonHover: 'linear-gradient(135deg, #ef4444, #dc2626)',
    },
    warning: {
      icon: '#f59e0b',
      iconBg: 'rgba(245, 158, 11, 0.1)',
      button: 'linear-gradient(135deg, #f59e0b, #d97706)',
      buttonHover: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
    },
    info: {
      icon: '#00b4d8',
      iconBg: 'rgba(0, 180, 216, 0.1)',
      button: 'linear-gradient(135deg, #00b4d8, #0096c7)',
      buttonHover: 'linear-gradient(135deg, #48cae4, #00b4d8)',
    },
  };

  const colors = variantColors[variant];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: THEME.overlayBg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: THEME.modalBg,
          borderRadius: '12px',
          padding: '1.5rem',
          maxWidth: '400px',
          width: '90%',
          boxShadow: '0 20px 40px rgba(0, 100, 130, 0.15)',
          animation: 'slideUp 0.2s ease-out',
          border: `2px solid ${THEME.cardBorder}`,
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1rem' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: colors.iconBg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <AlertTriangle size={20} color={colors.icon} />
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: 0, color: THEME.textPrimary, fontSize: '1.1rem', fontWeight: 600 }}>
              {title}
            </h3>
            <p style={{ margin: '0.5rem 0 0', color: THEME.textSecondary, fontSize: '0.9rem', lineHeight: 1.5 }}>
              {message}
            </p>
          </div>
          <button
            onClick={onCancel}
            style={{
              background: 'none',
              border: 'none',
              color: THEME.textMuted,
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            style={{
              padding: '0.6rem 1.25rem',
              borderRadius: '8px',
              border: `1px solid ${THEME.buttonBorder}`,
              background: THEME.modalBg,
              color: THEME.textSecondary,
              fontSize: '0.9rem',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseOver={e => {
              e.currentTarget.style.background = THEME.buttonHoverBg;
            }}
            onMouseOut={e => {
              e.currentTarget.style.background = THEME.modalBg;
            }}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '0.6rem 1.25rem',
              borderRadius: '8px',
              border: 'none',
              background: colors.button,
              color: 'white',
              fontSize: '0.9rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseOver={e => {
              e.currentTarget.style.background = colors.buttonHover;
            }}
            onMouseOut={e => {
              e.currentTarget.style.background = colors.button;
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
