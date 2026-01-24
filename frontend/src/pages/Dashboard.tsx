import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FileText, Zap } from 'lucide-react';
import { api, toggleTenderFavorite, deleteTender } from '../api/tenderix';
import type { Tender } from '../api/tenderix';
import { Loading } from '../components/Loading';
import { TenderCard } from '../components/TenderCard';
import type { TenderData } from '../components/TenderCard';
import { TenderDetailModal } from '../components/TenderDetailModal';
import { TenderFilters } from '../components/TenderFilters';
import type { FilterType } from '../components/TenderFilters';
import { ConfirmDialog } from '../components/ConfirmDialog';

export function Dashboard() {
  const navigate = useNavigate();
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTender, setSelectedTender] = useState<TenderData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TenderData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filters
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const tendersData = await api.tenders.list();
      setTenders(tendersData || []);
    } catch (error) {
      console.error('Error loading tenders:', error);
    } finally {
      setLoading(false);
    }
  }

  // Convert Tender to TenderData format
  const convertToTenderData = (tender: Tender): TenderData => ({
    id: tender.id,
    title: tender.tender_name,
    issuing_body: tender.issuing_body,
    deadline: tender.submission_deadline,
    status: tender.status,
    current_step: tender.current_step || 'p1',
    is_favorite: tender.is_favorite,
    created_at: tender.created_at,
    updated_at: tender.updated_at,
  });

  // Filter counts
  const filterCounts = useMemo(() => {
    return {
      all: tenders.length,
      favorites: tenders.filter(t => t.is_favorite).length,
      active: tenders.filter(t => t.status !== 'COMPLETED' && t.status !== 'CANCELLED').length,
      completed: tenders.filter(t => t.status === 'COMPLETED' || t.go_nogo_decision).length,
    };
  }, [tenders]);

  // Filtered tenders
  const filteredTenders = useMemo(() => {
    let result = tenders;

    // Apply filter
    switch (activeFilter) {
      case 'favorites':
        result = result.filter(t => t.is_favorite);
        break;
      case 'active':
        result = result.filter(t => t.status !== 'COMPLETED' && t.status !== 'CANCELLED');
        break;
      case 'completed':
        result = result.filter(t => t.status === 'COMPLETED' || t.go_nogo_decision);
        break;
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(t =>
        t.tender_name?.toLowerCase().includes(query) ||
        t.issuing_body?.toLowerCase().includes(query) ||
        t.tender_number?.toLowerCase().includes(query)
      );
    }

    return result;
  }, [tenders, activeFilter, searchQuery]);

  const handleOpenTender = (tenderData: TenderData) => {
    setSelectedTender(tenderData);
    setIsModalOpen(true);
  };

  const handleFavorite = async (tenderData: TenderData) => {
    try {
      // Optimistic update
      setTenders(prev => prev.map(t =>
        t.id === tenderData.id
          ? { ...t, is_favorite: !t.is_favorite }
          : t
      ));

      // Update selected tender if it's the same
      if (selectedTender?.id === tenderData.id) {
        setSelectedTender({ ...selectedTender, is_favorite: !selectedTender.is_favorite });
      }

      // API call
      await toggleTenderFavorite(tenderData.id, tenderData.is_favorite || false);
    } catch (error) {
      console.error('Error toggling favorite:', error);
      // Revert on error
      loadData();
    }
  };

  const handleDeleteClick = (tenderData: TenderData) => {
    setDeleteTarget(tenderData);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      await deleteTender(deleteTarget.id);

      // Remove from local state
      setTenders(prev => prev.filter(t => t.id !== deleteTarget.id));

      // Close modal if deleting selected tender
      if (selectedTender?.id === deleteTarget.id) {
        setIsModalOpen(false);
        setSelectedTender(null);
      }

      // Clear from localStorage if it was the current tender
      const currentId = localStorage.getItem('currentTenderId');
      if (currentId === deleteTarget.id) {
        localStorage.removeItem('currentTenderId');
        localStorage.removeItem('currentTenderTitle');
      }
    } catch (error) {
      console.error('Error deleting tender:', error);
      alert('שגיאה במחיקת המכרז');
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  if (loading) return <Loading />;

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Zap size={28} color="#7c3aed" />
            מרכז הפיקוד
          </h1>
          <p className="page-subtitle">ניהול מכרזים ומעקב התקדמות</p>
        </div>
        <button onClick={() => navigate('/new')} className="btn btn-primary">
          <Plus size={18} />
          מכרז חדש
        </button>
      </div>

      {/* Filters */}
      <TenderFilters
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        counts={filterCounts}
      />

      {/* Tender Grid */}
      {filteredTenders.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <FileText size={64} style={{ opacity: 0.2, marginBottom: '1.5rem', color: '#7c3aed' }} />
          {tenders.length === 0 ? (
            <>
              <h3 style={{ margin: '0 0 0.5rem', color: 'var(--gray-300)' }}>אין מכרזים במערכת</h3>
              <p style={{ color: 'var(--gray-500)', marginBottom: '1.5rem' }}>
                התחל על ידי הוספת המכרז הראשון שלך
              </p>
              <button onClick={() => navigate('/new')} className="btn btn-primary">
                <Plus size={18} />
                הוסף מכרז ראשון
              </button>
            </>
          ) : (
            <>
              <h3 style={{ margin: '0 0 0.5rem', color: 'var(--gray-300)' }}>לא נמצאו מכרזים</h3>
              <p style={{ color: 'var(--gray-500)' }}>
                נסה לשנות את הפילטרים או לחפש משהו אחר
              </p>
            </>
          )}
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: '1.25rem',
          }}
        >
          {filteredTenders.map(tender => (
            <TenderCard
              key={tender.id}
              tender={convertToTenderData(tender)}
              onOpen={handleOpenTender}
              onFavorite={handleFavorite}
              onDelete={handleDeleteClick}
            />
          ))}
        </div>
      )}

      {/* Tender Detail Modal */}
      <TenderDetailModal
        tender={selectedTender}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onFavorite={handleFavorite}
        onDelete={handleDeleteClick}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="מחיקת מכרז"
        message={`האם אתה בטוח שברצונך למחוק את המכרז "${deleteTarget?.title}"? פעולה זו אינה ניתנת לביטול.`}
        confirmText={isDeleting ? 'מוחק...' : 'מחק'}
        cancelText="ביטול"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
