import { Check, FileText, Shield, Calculator, Users, FileOutput } from 'lucide-react';

export interface WorkflowStage {
  id: 'p1' | 'p2' | 'p3' | 'p4' | 'output';
  label: string;
  labelHe: string;
  icon: React.ReactNode;
  status: 'completed' | 'current' | 'pending';
  route: string;
}

interface WorkflowProgressProps {
  stages: WorkflowStage[];
  onStageClick?: (stage: WorkflowStage) => void;
  size?: 'small' | 'medium' | 'large';
}

export function getDefaultStages(currentStep?: string): WorkflowStage[] {
  const stepOrder = ['p1', 'p2', 'p3', 'p4', 'output'];
  const currentIndex = currentStep ? stepOrder.indexOf(currentStep.toLowerCase()) : -1;

  return [
    {
      id: 'p1',
      label: 'Intake',
      labelHe: 'קליטה',
      icon: <FileText size={16} />,
      status: currentIndex > 0 ? 'completed' : currentIndex === 0 ? 'current' : 'pending',
      route: '/tender',
    },
    {
      id: 'p2',
      label: 'Gates',
      labelHe: 'תנאי סף',
      icon: <Shield size={16} />,
      status: currentIndex > 1 ? 'completed' : currentIndex === 1 ? 'current' : 'pending',
      route: '/gates',
    },
    {
      id: 'p3',
      label: 'BOQ',
      labelHe: 'כתב כמויות',
      icon: <Calculator size={16} />,
      status: currentIndex > 2 ? 'completed' : currentIndex === 2 ? 'current' : 'pending',
      route: '/boq',
    },
    {
      id: 'p4',
      label: 'Competitors',
      labelHe: 'מתחרים',
      icon: <Users size={16} />,
      status: currentIndex > 3 ? 'completed' : currentIndex === 3 ? 'current' : 'pending',
      route: '/competitors',
    },
    {
      id: 'output',
      label: 'Output',
      labelHe: 'פלט',
      icon: <FileOutput size={16} />,
      status: currentIndex === 4 ? 'current' : 'pending',
      route: '/output',
    },
  ];
}

export function WorkflowProgress({ stages, onStageClick, size = 'medium' }: WorkflowProgressProps) {
  const sizes = {
    small: {
      circle: 28,
      icon: 14,
      font: '0.65rem',
      gap: '0.25rem',
      line: 2,
    },
    medium: {
      circle: 36,
      icon: 16,
      font: '0.75rem',
      gap: '0.5rem',
      line: 3,
    },
    large: {
      circle: 48,
      icon: 20,
      font: '0.85rem',
      gap: '0.75rem',
      line: 4,
    },
  };

  const s = sizes[size];

  const getStatusColors = (status: WorkflowStage['status']) => {
    switch (status) {
      case 'completed':
        return {
          bg: 'linear-gradient(135deg, #059669, #047857)',
          border: '#10b981',
          text: '#a7f3d0',
          icon: 'white',
        };
      case 'current':
        return {
          bg: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
          border: '#8b5cf6',
          text: '#c4b5fd',
          icon: 'white',
        };
      case 'pending':
        return {
          bg: 'var(--gray-800)',
          border: 'var(--gray-600)',
          text: 'var(--gray-500)',
          icon: 'var(--gray-500)',
        };
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
      {stages.map((stage, index) => {
        const colors = getStatusColors(stage.status);
        const isLast = index === stages.length - 1;

        return (
          <div key={stage.id} style={{ display: 'flex', alignItems: 'center' }}>
            {/* Stage Circle */}
            <div
              onClick={() => onStageClick?.(stage)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: s.gap,
                cursor: onStageClick ? 'pointer' : 'default',
                transition: 'transform 0.2s',
              }}
              onMouseOver={e => {
                if (onStageClick) {
                  e.currentTarget.style.transform = 'scale(1.1)';
                }
              }}
              onMouseOut={e => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              <div
                style={{
                  width: `${s.circle}px`,
                  height: `${s.circle}px`,
                  borderRadius: '50%',
                  background: colors.bg,
                  border: `2px solid ${colors.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: colors.icon,
                  boxShadow: stage.status === 'current' ? '0 0 12px rgba(124, 58, 237, 0.5)' : 'none',
                }}
              >
                {stage.status === 'completed' ? (
                  <Check size={s.icon} strokeWidth={3} />
                ) : (
                  stage.icon
                )}
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: s.font, fontWeight: 600, color: colors.text }}>
                  {stage.id.toUpperCase()}
                </div>
                <div style={{ fontSize: `calc(${s.font} - 0.1rem)`, color: 'var(--gray-500)' }}>
                  {stage.labelHe}
                </div>
              </div>
            </div>

            {/* Connector Line */}
            {!isLast && (
              <div
                style={{
                  width: size === 'small' ? '20px' : size === 'medium' ? '40px' : '60px',
                  height: `${s.line}px`,
                  background: index < stages.findIndex(st => st.status === 'current')
                    ? 'linear-gradient(90deg, #059669, #10b981)'
                    : 'var(--gray-700)',
                  margin: `0 ${size === 'small' ? '4px' : '8px'}`,
                  marginBottom: size === 'small' ? '24px' : size === 'medium' ? '32px' : '40px',
                  borderRadius: `${s.line}px`,
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
