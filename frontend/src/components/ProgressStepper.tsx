import { CheckCircle } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

interface Step {
  id: string;
  label: string;
  path: string;
  pillar: string;
  isComplete: boolean;
  isActive: boolean;
}

interface ProgressStepperProps {
  tenderProgress: {
    hasBasicInfo: boolean;
    hasDocument: boolean;
    hasGates: boolean;
    gatesAnalyzed: boolean;
    hasCompetitors: boolean;
    hasBOQ: boolean;
    hasDecision: boolean;
  };
}

const pillarColors: Record<string, string> = {
  P1: '#06b6d4',
  P2: '#7c3aed',
  P3: '#10b981',
  P4: '#f59e0b',
  GO: '#22c55e',
};

export function ProgressStepper({ tenderProgress }: ProgressStepperProps) {
  const location = useLocation();

  const steps: Step[] = [
    {
      id: 'intake',
      label: 'קליטת מכרז',
      path: '/intake',
      pillar: 'P1',
      isComplete: tenderProgress.hasBasicInfo && tenderProgress.hasDocument,
      isActive: location.pathname === '/intake' || location.pathname === '/new',
    },
    {
      id: 'gates',
      label: 'תנאי סף',
      path: '/gates',
      pillar: 'P2',
      isComplete: tenderProgress.hasGates && tenderProgress.gatesAnalyzed,
      isActive: location.pathname === '/gates',
    },
    {
      id: 'analysis',
      label: 'מפרט וכמויות',
      path: '/analysis',
      pillar: 'P3',
      isComplete: tenderProgress.hasBOQ,
      isActive: location.pathname === '/analysis',
    },
    {
      id: 'competitors',
      label: 'מתחרים',
      path: '/competitors',
      pillar: 'P4',
      isComplete: tenderProgress.hasCompetitors,
      isActive: location.pathname === '/competitors',
    },
    {
      id: 'decision',
      label: 'החלטה',
      path: '/decision',
      pillar: 'GO',
      isComplete: tenderProgress.hasDecision,
      isActive: location.pathname === '/decision',
    },
  ];

  const completedSteps = steps.filter(s => s.isComplete).length;
  const progressPercent = Math.round((completedSteps / steps.length) * 100);

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      borderRadius: 14,
      padding: '1.25rem 1.5rem',
      marginBottom: '1.5rem',
      border: '1px solid rgba(255,255,255,0.06)',
    }}>
      {/* Progress header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '0.75rem',
      }}>
        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', fontWeight: 500 }}>התקדמות במכרז</span>
        <span style={{
          color: '#7c3aed',
          fontWeight: 700,
          fontSize: '0.85rem',
          background: 'rgba(124,58,237,0.15)',
          padding: '2px 8px',
          borderRadius: 6,
        }}>{progressPercent}%</span>
      </div>

      {/* Progress bar */}
      <div style={{
        height: 5,
        background: 'rgba(255,255,255,0.08)',
        borderRadius: 3,
        marginBottom: '1.25rem',
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${progressPercent}%`,
          background: 'linear-gradient(90deg, #06b6d4, #7c3aed, #10b981)',
          borderRadius: 3,
          transition: 'width 0.5s cubic-bezier(0.4,0,0.2,1)',
        }} />
      </div>

      {/* Steps row */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        position: 'relative',
      }}>
        {/* Connection line */}
        <div style={{
          position: 'absolute',
          top: 17,
          left: 40,
          right: 40,
          height: 2,
          background: 'rgba(255,255,255,0.06)',
          zIndex: 0,
        }} />

        {steps.map((step) => {
          const color = pillarColors[step.pillar];

          return (
            <Link
              key={step.id}
              to={step.path}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textDecoration: 'none',
                zIndex: 1,
                opacity: step.isComplete || step.isActive ? 1 : 0.45,
                transition: 'all 0.2s ease',
              }}
            >
              {/* Step circle */}
              <div style={{
                width: 34,
                height: 34,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 6,
                transition: 'all 0.2s ease',
                ...(step.isComplete ? {
                  background: color,
                  boxShadow: `0 0 12px ${color}40`,
                } : step.isActive ? {
                  background: `${color}25`,
                  border: `2px solid ${color}`,
                  boxShadow: `0 0 16px ${color}30`,
                } : {
                  background: 'rgba(255,255,255,0.06)',
                  border: '1.5px solid rgba(255,255,255,0.1)',
                }),
              }}>
                {step.isComplete ? (
                  <CheckCircle size={18} color="white" />
                ) : (
                  <span style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    color: step.isActive ? color : 'rgba(255,255,255,0.35)',
                  }}>
                    {steps.indexOf(step) + 1}
                  </span>
                )}
              </div>

              {/* Step label */}
              <span style={{
                fontSize: '0.7rem',
                color: step.isActive ? color : step.isComplete ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.35)',
                fontWeight: step.isActive ? 600 : 400,
                textAlign: 'center',
                maxWidth: 80,
              }}>
                {step.label}
              </span>

              {/* Pillar badge */}
              <span style={{
                fontSize: '0.55rem',
                fontWeight: 600,
                color: color,
                background: `${color}20`,
                padding: '1px 5px',
                borderRadius: 3,
                marginTop: 3,
              }}>
                {step.pillar}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
