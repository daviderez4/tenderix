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

  const pillarColors: Record<string, string> = {
    P1: '#00d4ff',
    P2: '#7c3aed',
    P3: '#10b981',
    P4: '#f59e0b',
    GO: '#22c55e',
  };

  const completedSteps = steps.filter(s => s.isComplete).length;
  const progressPercent = Math.round((completedSteps / steps.length) * 100);

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      borderRadius: '12px',
      padding: '1.25rem 1.5rem',
      marginBottom: '1.5rem',
      border: '1px solid rgba(255,255,255,0.08)',
    }}>
      {/* Progress bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1rem',
      }}>
        <span style={{ color: '#888', fontSize: '0.875rem' }}>התקדמות במכרז</span>
        <span style={{ color: '#7c3aed', fontWeight: 600 }}>{progressPercent}%</span>
      </div>

      <div style={{
        height: '4px',
        background: 'rgba(255,255,255,0.1)',
        borderRadius: '2px',
        marginBottom: '1.25rem',
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${progressPercent}%`,
          background: 'linear-gradient(90deg, #7c3aed, #10b981)',
          borderRadius: '2px',
          transition: 'width 0.5s ease',
        }} />
      </div>

      {/* Steps */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        position: 'relative',
      }}>
        {/* Connection line */}
        <div style={{
          position: 'absolute',
          top: '16px',
          left: '40px',
          right: '40px',
          height: '2px',
          background: 'rgba(255,255,255,0.1)',
          zIndex: 0,
        }} />

        {steps.map((step, index) => (
          <Link
            key={step.id}
            to={step.path}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textDecoration: 'none',
              zIndex: 1,
              opacity: step.isComplete || step.isActive ? 1 : 0.5,
              transition: 'all 0.2s ease',
            }}
          >
            {/* Step circle */}
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: step.isComplete
                ? pillarColors[step.pillar]
                : step.isActive
                  ? `${pillarColors[step.pillar]}40`
                  : 'rgba(255,255,255,0.1)',
              border: step.isActive ? `2px solid ${pillarColors[step.pillar]}` : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '0.5rem',
              transition: 'all 0.2s ease',
            }}>
              {step.isComplete ? (
                <CheckCircle size={18} color="white" />
              ) : (
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: step.isActive ? pillarColors[step.pillar] : '#666'
                }}>
                  {index + 1}
                </span>
              )}
            </div>

            {/* Step label */}
            <span style={{
              fontSize: '0.75rem',
              color: step.isActive ? pillarColors[step.pillar] : step.isComplete ? '#ccc' : '#666',
              fontWeight: step.isActive ? 600 : 400,
              textAlign: 'center',
              maxWidth: '80px',
            }}>
              {step.label}
            </span>

            {/* Pillar badge */}
            <span style={{
              fontSize: '0.6rem',
              color: pillarColors[step.pillar],
              background: `${pillarColors[step.pillar]}20`,
              padding: '2px 6px',
              borderRadius: '4px',
              marginTop: '0.25rem',
            }}>
              {step.pillar}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
