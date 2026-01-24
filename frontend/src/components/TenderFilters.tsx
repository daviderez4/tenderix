import { Search, Star, CheckCircle, Clock, List } from 'lucide-react';

export type FilterType = 'all' | 'favorites' | 'active' | 'completed';

interface TenderFiltersProps {
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  counts: {
    all: number;
    favorites: number;
    active: number;
    completed: number;
  };
}

// Light teal/cyan metallic theme colors
const THEME = {
  containerBg: '#f8fcfd',
  containerBorder: '#d4eef3',
  buttonBg: '#ffffff',
  buttonBorder: '#c8e4eb',
  buttonBorderHover: '#90d4e4',
  buttonActiveBg: '#e6f7fa',
  buttonActiveBorder: '#00b4d8',
  textPrimary: '#1e3a4c',
  textSecondary: '#5a7d8a',
  textMuted: '#8aa4ae',
  accentPrimary: '#00b4d8',
  countBg: '#e0f4f7',
  countActiveBg: '#cceef5',
  inputBg: '#ffffff',
  inputBorder: '#c8e4eb',
  inputFocusBorder: '#00b4d8',
};

export function TenderFilters({
  activeFilter,
  onFilterChange,
  searchQuery,
  onSearchChange,
  counts,
}: TenderFiltersProps) {
  const filters: { id: FilterType; label: string; icon: React.ReactNode }[] = [
    { id: 'all', label: 'הכל', icon: <List size={16} /> },
    { id: 'favorites', label: 'מועדפים', icon: <Star size={16} /> },
    { id: 'active', label: 'פעילים', icon: <Clock size={16} /> },
    { id: 'completed', label: 'הושלמו', icon: <CheckCircle size={16} /> },
  ];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        padding: '1rem',
        background: THEME.containerBg,
        borderRadius: '12px',
        marginBottom: '1.5rem',
        border: `1px solid ${THEME.containerBorder}`,
      }}
    >
      {/* Filter Buttons */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {filters.map(filter => {
          const isActive = activeFilter === filter.id;
          const count = counts[filter.id];

          return (
            <button
              key={filter.id}
              onClick={() => onFilterChange(filter.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.6rem 1rem',
                borderRadius: '8px',
                border: isActive ? `2px solid ${THEME.buttonActiveBorder}` : `1px solid ${THEME.buttonBorder}`,
                background: isActive ? THEME.buttonActiveBg : THEME.buttonBg,
                color: isActive ? THEME.accentPrimary : THEME.textSecondary,
                fontSize: '0.85rem',
                fontWeight: isActive ? 600 : 500,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseOver={e => {
                if (!isActive) {
                  e.currentTarget.style.borderColor = THEME.buttonBorderHover;
                  e.currentTarget.style.color = THEME.textPrimary;
                }
              }}
              onMouseOut={e => {
                if (!isActive) {
                  e.currentTarget.style.borderColor = THEME.buttonBorder;
                  e.currentTarget.style.color = THEME.textSecondary;
                }
              }}
            >
              {filter.icon}
              <span>{filter.label}</span>
              <span
                style={{
                  background: isActive ? THEME.countActiveBg : THEME.countBg,
                  color: isActive ? THEME.accentPrimary : THEME.textSecondary,
                  padding: '2px 8px',
                  borderRadius: '10px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div style={{ position: 'relative' }}>
        <Search
          size={18}
          style={{
            position: 'absolute',
            right: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: THEME.textMuted,
          }}
        />
        <input
          type="text"
          placeholder="חיפוש לפי שם מכרז..."
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
          style={{
            width: '100%',
            padding: '0.75rem 2.5rem 0.75rem 1rem',
            borderRadius: '8px',
            border: `1px solid ${THEME.inputBorder}`,
            background: THEME.inputBg,
            color: THEME.textPrimary,
            fontSize: '0.9rem',
            outline: 'none',
            transition: 'border-color 0.2s',
            direction: 'rtl',
          }}
          onFocus={e => {
            e.currentTarget.style.borderColor = THEME.inputFocusBorder;
          }}
          onBlur={e => {
            e.currentTarget.style.borderColor = THEME.inputBorder;
          }}
        />
      </div>
    </div>
  );
}
