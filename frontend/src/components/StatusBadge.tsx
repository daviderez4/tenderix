interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const statusConfig: Record<string, { class: string; label: string }> = {
    MEETS: { class: 'badge-success', label: 'עומד' },
    PARTIALLY_MEETS: { class: 'badge-warning', label: 'עומד חלקית' },
    DOES_NOT_MEET: { class: 'badge-danger', label: 'לא עומד' },
    UNKNOWN: { class: 'badge-gray', label: 'לא נבדק' },
    HIGH: { class: 'badge-danger', label: 'גבוה' },
    MEDIUM: { class: 'badge-warning', label: 'בינוני' },
    LOW: { class: 'badge-success', label: 'נמוך' },
    GO: { class: 'badge-success', label: 'GO' },
    'NO-GO': { class: 'badge-danger', label: 'NO-GO' },
    CONDITIONAL: { class: 'badge-warning', label: 'מותנה' },
    active: { class: 'badge-success', label: 'פעיל' },
    draft: { class: 'badge-gray', label: 'טיוטה' },
    closed: { class: 'badge-danger', label: 'סגור' },
  };

  const config = statusConfig[status] || { class: 'badge-gray', label: status };

  return <span className={`badge ${config.class}`}>{config.label}</span>;
}
