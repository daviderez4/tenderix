import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Plus,
  Trash2,
  Save,
  ArrowRight,
  Shield,
  AlertTriangle,
  Star,
} from 'lucide-react';
import { supabase } from '../api/supabaseClient';
import { setCurrentTender, getCurrentOrgId } from '../api/config';

interface GateConditionInput {
  condition_number: string;
  condition_text: string;
  condition_type: 'GATE' | 'ADVANTAGE';
  is_mandatory: boolean;
  requirement_type: 'CAPABILITY' | 'EXECUTION';
  source_section: string;
}

const emptyCondition = (): GateConditionInput => ({
  condition_number: '',
  condition_text: '',
  condition_type: 'GATE',
  is_mandatory: true,
  requirement_type: 'CAPABILITY',
  source_section: '',
});

export function TenderCreatePage() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    tender_name: '',
    tender_number: '',
    issuing_body: '',
    submission_deadline: '',
    estimated_value: '',
    category: 'VIDEO' as string,
    contract_duration_months: '',
    guarantee_amount: '',
  });

  const [conditions, setConditions] = useState<GateConditionInput[]>([emptyCondition()]);

  const [bulkText, setBulkText] = useState('');
  const [showBulk, setShowBulk] = useState(false);

  function updateForm(key: string, value: string) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  function addCondition() {
    setConditions(prev => [...prev, {
      ...emptyCondition(),
      condition_number: String(prev.length + 1),
    }]);
  }

  function removeCondition(index: number) {
    setConditions(prev => prev.filter((_, i) => i !== index).map((c, i) => ({
      ...c,
      condition_number: String(i + 1),
    })));
  }

  function updateCondition(index: number, key: keyof GateConditionInput, value: string | boolean) {
    setConditions(prev => prev.map((c, i) => i === index ? { ...c, [key]: value } : c));
  }

  function parseBulkConditions() {
    const lines = bulkText.split('\n').filter(l => l.trim());
    const parsed: GateConditionInput[] = lines.map((line, i) => {
      const cleaned = line.replace(/^\d+[\.\)\-\s]+/, '').trim();
      const isAdvantage = cleaned.includes('יתרון') || cleaned.includes('עדיפות');
      return {
        condition_number: String(i + 1),
        condition_text: cleaned,
        condition_type: isAdvantage ? 'ADVANTAGE' : 'GATE',
        is_mandatory: !isAdvantage,
        requirement_type: 'CAPABILITY',
        source_section: '',
      };
    });
    if (parsed.length > 0) {
      setConditions(parsed);
      setShowBulk(false);
      setBulkText('');
    }
  }

  async function handleSave() {
    if (!form.tender_name.trim()) {
      setError('נא להזין שם מכרז');
      return;
    }
    if (conditions.length === 0 || !conditions[0].condition_text.trim()) {
      setError('נא להזין לפחות תנאי סף אחד');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const orgId = getCurrentOrgId();

      // Create tender
      const { data: tender, error: tenderErr } = await supabase
        .from('tenders')
        .insert({
          tender_name: form.tender_name,
          tender_number: form.tender_number || null,
          issuing_body: form.issuing_body || null,
          submission_deadline: form.submission_deadline || null,
          estimated_value: form.estimated_value ? Number(form.estimated_value) : null,
          category: form.category,
          contract_duration_months: form.contract_duration_months ? Number(form.contract_duration_months) : null,
          guarantee_amount: form.guarantee_amount ? Number(form.guarantee_amount) : null,
          org_id: orgId || null,
          status: 'ACTIVE',
          current_step: 'GATES',
          go_nogo_decision: 'PENDING',
        })
        .select('id')
        .single();

      if (tenderErr) throw tenderErr;

      // Create gate conditions
      const conditionsToInsert = conditions
        .filter(c => c.condition_text.trim())
        .map((c, i) => ({
          tender_id: tender.id,
          condition_number: c.condition_number || String(i + 1),
          condition_text: c.condition_text,
          condition_type: c.condition_type,
          is_mandatory: c.is_mandatory,
          requirement_type: c.requirement_type,
          source_section: c.source_section || null,
          status: 'UNKNOWN',
        }));

      if (conditionsToInsert.length > 0) {
        const { error: condErr } = await supabase
          .from('gate_conditions')
          .insert(conditionsToInsert);
        if (condErr) throw condErr;
      }

      // Create empty summary
      await supabase.from('gate_conditions_summary').insert({
        tender_id: tender.id,
        total_conditions: conditionsToInsert.length,
        mandatory_count: conditionsToInsert.filter(c => c.is_mandatory).length,
        meets_count: 0,
        partially_meets_count: 0,
        does_not_meet_count: 0,
        unknown_count: conditionsToInsert.length,
        overall_eligibility: 'UNKNOWN',
      });

      // Navigate to gates page
      setCurrentTender(tender.id, form.tender_name);
      navigate('/gates');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'שגיאה בשמירה';
      setError(msg);
    }

    setSaving(false);
  }

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div className="page-header-right">
          <h1 className="page-title">
            <FileText size={24} style={{ color: 'var(--primary)' }} />
            הטענת מכרז חדש
          </h1>
          <p className="page-subtitle">הזן פרטי מכרז ותנאי סף לניתוח</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-secondary" onClick={() => navigate('/dashboard')}>
            <ArrowRight size={14} /> חזרה
          </button>
          <button className="btn btn-primary btn-lg" onClick={handleSave} disabled={saving}>
            {saving ? (
              <><span className="spinner" style={{ width: 16, height: 16 }} /> שומר...</>
            ) : (
              <><Save size={16} /> שמור והמשך לניתוח</>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="card" style={{ background: 'var(--danger-bg)', borderColor: 'var(--danger-border)', marginBottom: '1rem' }}>
          <span style={{ color: 'var(--danger)', fontWeight: 600 }}><AlertTriangle size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> {error}</span>
        </div>
      )}

      {/* Tender Details */}
      <div className="card">
        <div className="card-header">
          <div className="card-title"><FileText size={16} /> פרטי המכרז</div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">שם המכרז *</label>
            <input type="text" value={form.tender_name} onChange={e => updateForm('tender_name', e.target.value)}
              placeholder="לדוגמה: הקמת מערכת מצלמות אבטחה - עיריית חולון" />
          </div>
          <div className="form-group">
            <label className="form-label">מספר מכרז</label>
            <input type="text" value={form.tender_number} onChange={e => updateForm('tender_number', e.target.value)}
              placeholder="לדוגמה: 2025/001" />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">גורם מזמין</label>
            <input type="text" value={form.issuing_body} onChange={e => updateForm('issuing_body', e.target.value)}
              placeholder="לדוגמה: עיריית חולון" />
          </div>
          <div className="form-group">
            <label className="form-label">מועד הגשה</label>
            <input type="date" value={form.submission_deadline} onChange={e => updateForm('submission_deadline', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">אומדן (ש"ח)</label>
            <input type="number" value={form.estimated_value} onChange={e => updateForm('estimated_value', e.target.value)}
              placeholder="25000000" />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">קטגוריה</label>
            <select value={form.category} onChange={e => updateForm('category', e.target.value)}>
              <option value="VIDEO">מצלמות / וידאו</option>
              <option value="COMMUNICATION">תקשורת</option>
              <option value="SOFTWARE">תוכנה</option>
              <option value="ACCESS_CONTROL">בקרת גישה</option>
              <option value="COMBINED">משולב</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">משך חוזה (חודשים)</label>
            <input type="number" value={form.contract_duration_months} onChange={e => updateForm('contract_duration_months', e.target.value)}
              placeholder="36" />
          </div>
          <div className="form-group">
            <label className="form-label">ערבות (ש"ח)</label>
            <input type="number" value={form.guarantee_amount} onChange={e => updateForm('guarantee_amount', e.target.value)}
              placeholder="500000" />
          </div>
        </div>
      </div>

      {/* Gate Conditions */}
      <div className="card">
        <div className="card-header">
          <div className="card-title"><Shield size={16} /> תנאי סף ({conditions.length})</div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowBulk(!showBulk)}>
              {showBulk ? 'הזנה ידנית' : 'הדבקה מרובה'}
            </button>
            {!showBulk && (
              <button className="btn btn-primary btn-sm" onClick={addCondition}>
                <Plus size={14} /> הוסף תנאי
              </button>
            )}
          </div>
        </div>

        {showBulk ? (
          <div>
            <p style={{ fontSize: '0.85rem', color: 'var(--dark-500)', marginBottom: '0.5rem' }}>
              הדבק רשימת תנאי סף - כל תנאי בשורה חדשה. המערכת תזהה אוטומטית תנאי יתרון.
            </p>
            <textarea
              value={bulkText}
              onChange={e => setBulkText(e.target.value)}
              rows={12}
              style={{ width: '100%', fontFamily: 'inherit', fontSize: '0.87rem', lineHeight: 1.7 }}
              placeholder={`1. מחזור הכנסות שנתי ממוצע של 50 מיליון ש"ח לפחות
2. ביצוע פרויקט בודד בהיקף של 20 מיליון ש"ח
3. תעודת ISO 9001 בתוקף
4. יתרון למציע בעל סיווג ביטחוני`}
            />
            <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-primary" onClick={parseBulkConditions}>
                <Shield size={14} /> פענח {bulkText.split('\n').filter(l => l.trim()).length} תנאים
              </button>
              <button className="btn btn-secondary" onClick={() => { setShowBulk(false); setBulkText(''); }}>
                ביטול
              </button>
            </div>
          </div>
        ) : (
          <div className="gate-list">
            {conditions.map((cond, index) => (
              <div key={index} className="gate-item" style={{ cursor: 'default', borderRight: `3px solid ${cond.condition_type === 'ADVANTAGE' ? 'var(--warning)' : 'var(--primary)'}` }}>
                <div className="gate-number">{index + 1}</div>
                <div className="gate-content" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <textarea
                    value={cond.condition_text}
                    onChange={e => updateCondition(index, 'condition_text', e.target.value)}
                    placeholder="תיאור תנאי הסף..."
                    rows={2}
                    style={{ width: '100%', fontFamily: 'inherit', fontSize: '0.87rem', resize: 'vertical' }}
                  />
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <select
                      value={cond.condition_type}
                      onChange={e => {
                        const val = e.target.value as 'GATE' | 'ADVANTAGE';
                        updateCondition(index, 'condition_type', val);
                        updateCondition(index, 'is_mandatory', val === 'GATE');
                      }}
                      style={{ width: 'auto', minWidth: '120px' }}
                    >
                      <option value="GATE">תנאי סף (חובה)</option>
                      <option value="ADVANTAGE">יתרון (רשות)</option>
                    </select>
                    <select
                      value={cond.requirement_type}
                      onChange={e => updateCondition(index, 'requirement_type', e.target.value)}
                      style={{ width: 'auto', minWidth: '120px' }}
                    >
                      <option value="CAPABILITY">יכולת</option>
                      <option value="EXECUTION">ביצוע / ניסיון</option>
                    </select>
                    <input
                      type="text"
                      value={cond.source_section}
                      onChange={e => updateCondition(index, 'source_section', e.target.value)}
                      placeholder="סעיף (2.1)"
                      style={{ width: '100px' }}
                    />
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => removeCondition(index)}
                      style={{ color: 'var(--danger)' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="gate-meta">
                    {cond.is_mandatory ? (
                      <span className="badge badge-danger" style={{ fontSize: '0.65rem' }}>
                        <Shield size={10} /> חובה
                      </span>
                    ) : (
                      <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>
                        <Star size={10} /> יתרון
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
