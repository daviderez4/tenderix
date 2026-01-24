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
        background: 'var(--gray-850, rgba(0,0,0,0.2))',
        borderRadius: '12px',
        marginBottom: '1.5rem',
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
                border: isActive ? '2px solid #7c3aed' : '1px solid var(--gray-700)',
                background: isActive ? 'rgba(124, 58, 237, 0.15)' : 'var(--gray-800)',
                color: isActive ? '#c4b5fd' : 'var(--gray-400)',
                fontSize: '0.85rem',
                fontWeight: isActive ? 600 : 500,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseOver={e => {
                if (!isActive) {
                  e.currentTarget.style.borderColor = 'var(--gray-600)';
                  e.currentTarget.style.color = 'var(--gray-300)';
                }
              }}
              onMouseOut={e => {
                if (!isActive) {
                  e.currentTarget.style.borderColor = 'var(--gray-700)';
                  e.currentTarget.style.color = 'var(--gray-400)';
                }
              }}
            >
              {filter.icon}
              <span>{filter.label}</span>
              <span
                style={{
                  background: isActive ? 'rgba(124, 58, 237, 0.3)' : 'var(--gray-700)',
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
            color: 'var(--gray-500)',
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
            border: '1px solid var(--gray-700)',
            background: 'var(--gray-800)',
            color: 'white',
            fontSize: '0.9rem',
            outline: 'none',
            transition: 'border-color 0.2s',
            direction: 'rtl',
          }}
          onFocus={e => {
            e.currentTarget.style.borderColor = '#7c3aed';
          }}
          onBlur={e => {
            e.currentTarget.style.borderColor = 'var(--gray-700)';
          }}
        />
      </div>
    </div>
  );
}
