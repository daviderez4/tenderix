/**
 * DefinitionBadge Component
 *
 * Shows a tender definition inline with hover tooltip
 * Used in gate conditions to show which definition applies
 */

import { useState } from 'react';
import { BookOpen, ArrowUp, ArrowDown, Minus } from 'lucide-react';

interface TenderDefinition {
  id?: string;
  term: string;
  definition?: string;
  definition_text?: string;
  interpretation_type?: 'RESTRICTIVE' | 'EXPANSIVE' | 'NEUTRAL';
  includes_examples?: string[];
  excludes_examples?: string[];
  source_page?: number;
  source_section?: string;
  source_quote?: string;
}

interface DefinitionBadgeProps {
  definition: TenderDefinition;
  compact?: boolean;
}

const interpretationColors: Record<string, { bg: string; text: string; label: string }> = {
  RESTRICTIVE: { bg: '#fef2f2', text: '#991b1b', label: 'מצמצמת' },
  EXPANSIVE: { bg: '#f0fdf4', text: '#166534', label: 'מרחיבה' },
  NEUTRAL: { bg: '#f9fafb', text: '#374151', label: 'ניטרלית' }
};

export function DefinitionBadge({ definition, compact = false }: DefinitionBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const interpType = definition.interpretation_type || 'NEUTRAL';
  const interpConfig = interpretationColors[interpType] || interpretationColors.NEUTRAL;
  const defText = definition.definition || definition.definition_text || '';

  if (compact) {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          background: '#eff6ff',
          color: '#1e40af',
          padding: '1px 8px',
          borderRadius: '10px',
          fontSize: '11px',
          cursor: 'help',
          position: 'relative'
        }}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        title={`"${definition.term}" = ${defText}`}
      >
        <BookOpen size={10} />
        {definition.term}

        {showTooltip && (
          <div style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            zIndex: 999,
            background: '#1f2937',
            color: '#fff',
            padding: '8px 12px',
            borderRadius: '8px',
            fontSize: '12px',
            minWidth: '250px',
            maxWidth: '400px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            marginTop: '4px'
          }}>
            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>"{definition.term}"</div>
            <div>{defText}</div>
            {definition.includes_examples?.length ? (
              <div style={{ marginTop: '4px', color: '#86efac' }}>
                ✓ כולל: {definition.includes_examples.join(', ')}
              </div>
            ) : null}
            {definition.excludes_examples?.length ? (
              <div style={{ marginTop: '2px', color: '#fca5a5' }}>
                ✗ לא כולל: {definition.excludes_examples.join(', ')}
              </div>
            ) : null}
          </div>
        )}
      </span>
    );
  }

  return (
    <div style={{
      border: '1px solid #bfdbfe',
      borderRadius: '8px',
      padding: '10px 14px',
      background: '#f8fafc',
      direction: 'rtl'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
        <BookOpen size={14} color="#2563eb" />
        <span style={{ fontWeight: 'bold', fontSize: '13px', color: '#1e40af' }}>
          "{definition.term}"
        </span>
        <span style={{
          background: interpConfig.bg,
          color: interpConfig.text,
          padding: '1px 8px',
          borderRadius: '8px',
          fontSize: '10px',
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          gap: '3px'
        }}>
          {interpType === 'RESTRICTIVE' && <ArrowDown size={10} />}
          {interpType === 'EXPANSIVE' && <ArrowUp size={10} />}
          {interpType === 'NEUTRAL' && <Minus size={10} />}
          {interpConfig.label}
        </span>
      </div>

      <div style={{ fontSize: '13px', color: '#374151', lineHeight: '1.5' }}>
        {defText}
      </div>

      {(definition.includes_examples?.length || definition.excludes_examples?.length) ? (
        <div style={{ marginTop: '8px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {definition.includes_examples?.length ? (
            <div style={{ fontSize: '12px' }}>
              <span style={{ color: '#16a34a', fontWeight: 'bold' }}>✓ כולל: </span>
              {definition.includes_examples.map((ex, i) => (
                <span key={i} style={{
                  background: '#dcfce7',
                  color: '#166534',
                  padding: '1px 6px',
                  borderRadius: '4px',
                  marginLeft: '4px',
                  fontSize: '11px'
                }}>{ex}</span>
              ))}
            </div>
          ) : null}
          {definition.excludes_examples?.length ? (
            <div style={{ fontSize: '12px' }}>
              <span style={{ color: '#dc2626', fontWeight: 'bold' }}>✗ לא כולל: </span>
              {definition.excludes_examples.map((ex, i) => (
                <span key={i} style={{
                  background: '#fee2e2',
                  color: '#991b1b',
                  padding: '1px 6px',
                  borderRadius: '4px',
                  marginLeft: '4px',
                  fontSize: '11px'
                }}>{ex}</span>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {definition.source_page && (
        <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '6px' }}>
          מקור: עמוד {definition.source_page}{definition.source_section ? `, סעיף ${definition.source_section}` : ''}
        </div>
      )}
    </div>
  );
}
