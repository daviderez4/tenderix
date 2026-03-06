import { useState, useRef } from 'react';
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
  Upload,
  Loader,
  Sparkles,
  CheckCircle,
} from 'lucide-react';
import { supabase } from '../api/supabaseClient';
import { setCurrentTender, getCurrentOrgId, getEdgeFunctionUrl, API_CONFIG } from '../api/config';

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

type Step = 'upload' | 'review' | 'saved';

export function TenderCreatePage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>('upload');
  const [saving, setSaving] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState('');
  const [pastedText, setPastedText] = useState('');

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

  const [conditions, setConditions] = useState<GateConditionInput[]>([]);

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

  const [fileLoading, setFileLoading] = useState(false);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();

    // Reject non-text files
    if (ext === 'pdf' || ext === 'doc' || ext === 'docx') {
      setError('קובצי PDF/Word לא נתמכים כרגע. נא להעתיק את הטקסט מהמסמך ולהדביק אותו בשדה למטה.');
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setFileLoading(true);
    setError('');

    try {
      const text = await file.text();
      // Check for binary/garbled content
      const binaryChars = text.slice(0, 500).split('').filter(c => {
        const code = c.charCodeAt(0);
        return code < 9 || (code > 13 && code < 32 && code !== 27);
      }).length;

      if (binaryChars > 10) {
        setError('הקובץ מכיל תוכן בינארי שלא ניתן לקרוא. נא להדביק את הטקסט ישירות.');
        if (fileInputRef.current) fileInputRef.current.value = '';
        setFileLoading(false);
        return;
      }

      if (text.trim()) {
        setPastedText(text.trim());
      }
    } catch {
      setError('שגיאה בקריאת הקובץ. נא לנסות שוב או להדביק את הטקסט ישירות.');
    }

    setFileLoading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleExtract() {
    if (!pastedText.trim()) {
      setError('נא להדביק טקסט של מכרז או להעלות קובץ');
      return;
    }

    // Limit text size to avoid rate limits
    const MAX_CHARS = 50000;
    let textToSend = pastedText.trim();
    if (textToSend.length > MAX_CHARS) {
      textToSend = textToSend.slice(0, MAX_CHARS);
    }

    setExtracting(true);
    setError('');

    try {
      const response = await fetch(getEdgeFunctionUrl('tender-extract'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_CONFIG.SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ text: textToSend }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('שרת ה-AI עמוס כרגע. נא לנסות שוב בעוד דקה.');
        }
        throw new Error(`שגיאה בשרת (${response.status}). נא לנסות שוב.`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'שגיאה בחילוץ הנתונים');
      }

      const { tender, conditions: extractedConditions } = result.extracted;

      // Fill form with extracted data
      setForm({
        tender_name: tender.tender_name || '',
        tender_number: tender.tender_number || '',
        issuing_body: tender.issuing_body || '',
        submission_deadline: tender.submission_deadline || '',
        estimated_value: tender.estimated_value ? String(tender.estimated_value) : '',
        category: tender.category || 'COMBINED',
        contract_duration_months: tender.contract_duration_months ? String(tender.contract_duration_months) : '',
        guarantee_amount: tender.guarantee_amount ? String(tender.guarantee_amount) : '',
      });

      // Fill conditions
      if (extractedConditions?.length > 0) {
        setConditions(extractedConditions.map((c: Record<string, unknown>, i: number) => ({
          condition_number: String(c.condition_number || i + 1),
          condition_text: (c.condition_text as string) || '',
          condition_type: (c.condition_type as 'GATE' | 'ADVANTAGE') || 'GATE',
          is_mandatory: c.is_mandatory !== false,
          requirement_type: (c.requirement_type as 'CAPABILITY' | 'EXECUTION') || 'CAPABILITY',
          source_section: (c.source_section as string) || '',
        })));
      }

      setStep('review');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'שגיאה בחילוץ');
    }

    setExtracting(false);
  }

  function handleManualEntry() {
    setConditions([emptyCondition()]);
    setStep('review');
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

      setCurrentTender(tender.id, form.tender_name);
      setStep('saved');

      // Navigate after short delay
      setTimeout(() => navigate('/gates'), 1500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'שגיאה בשמירה');
    }

    setSaving(false);
  }

  // ─── STEP 1: Upload / Paste ───────────────────────
  if (step === 'upload') {
    return (
      <div className="animate-fadeIn">
        <div className="page-header">
          <div className="page-header-right">
            <h1 className="page-title">
              <FileText size={24} style={{ color: 'var(--primary)' }} />
              הטענת מכרז חדש
            </h1>
            <p className="page-subtitle">העלה קובץ מכרז או הדבק את הטקסט - AI יחלץ את הפרטים ותנאי הסף</p>
          </div>
          <div className="page-header-actions">
            <button className="btn btn-secondary" onClick={() => navigate('/dashboard')}>
              <ArrowRight size={14} /> חזרה
            </button>
          </div>
        </div>

        {error && (
          <div className="card" style={{ background: 'var(--danger-bg)', borderColor: 'var(--danger-border)', marginBottom: '1rem' }}>
            <span style={{ color: 'var(--danger)', fontWeight: 600 }}><AlertTriangle size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> {error}</span>
          </div>
        )}

        {/* Upload Area */}
        <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
          <div
            style={{
              border: '2px dashed var(--blue-300)',
              borderRadius: 'var(--radius-xl)',
              padding: '2.5rem',
              background: 'var(--blue-50)',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            {fileLoading ? (
              <>
                <Loader size={40} style={{ color: 'var(--primary)', marginBottom: '0.75rem', animation: 'spin 1s linear infinite' }} />
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--dark-800)', marginBottom: '0.25rem' }}>
                  קורא את הקובץ...
                </div>
              </>
            ) : (
              <>
                <Upload size={40} style={{ color: 'var(--primary)', marginBottom: '0.75rem' }} />
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--dark-800)', marginBottom: '0.25rem' }}>
                  העלה קובץ טקסט (.txt)
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--dark-500)' }}>
                  לקובצי PDF/Word - העתק את הטקסט והדבק בשדה למטה
                </div>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
          </div>

          <div style={{ margin: '1.5rem 0', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
            <span style={{ color: 'var(--dark-400)', fontSize: '0.85rem', fontWeight: 600 }}>או</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
          </div>

          <div style={{ textAlign: 'right' }}>
            <label className="form-label" style={{ marginBottom: '0.5rem' }}>הדבק טקסט מכרז</label>
            <textarea
              value={pastedText}
              onChange={e => setPastedText(e.target.value)}
              rows={15}
              style={{ width: '100%', fontFamily: 'inherit', fontSize: '0.87rem', lineHeight: 1.7 }}
              placeholder={`הדבק כאן את הטקסט של מסמך המכרז...

לדוגמה:
מכרז 2025/001 - הקמת מערכת מצלמות אבטחה עירונית
עיריית חולון
מועד הגשה: 15.2.2025

תנאי סף:
1. מחזור הכנסות שנתי ממוצע של 50 מיליון ש"ח לפחות בשלוש השנים האחרונות
2. ביצוע פרויקט בודד בהיקף של 20 מיליון ש"ח לפחות
3. תעודת ISO 9001 בתוקף
...`}
            />
          </div>
        </div>

        {/* Action buttons */}
        {extracting && (
          <div className="card" style={{ background: 'var(--blue-50)', borderColor: 'var(--blue-200)', marginTop: '1rem', textAlign: 'center', padding: '1.5rem' }}>
            <Loader size={28} style={{ color: 'var(--primary)', animation: 'spin 1s linear infinite', marginBottom: '0.5rem' }} />
            <div style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '1rem', marginBottom: '0.25rem' }}>
              AI מנתח את המכרז...
            </div>
            <div style={{ color: 'var(--dark-500)', fontSize: '0.85rem' }}>
              מחלץ פרטי מכרז ותנאי סף - עשוי לקחת עד 30 שניות
            </div>
          </div>
        )}

        {pastedText.trim() && (
          <div style={{ textAlign: 'left', marginTop: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--dark-400)' }}>
              {pastedText.length.toLocaleString()} תווים
              {pastedText.length > 50000 && ' (יחתך ל-50,000)'}
            </span>
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginTop: '1rem' }}>
          <button className="btn btn-primary btn-lg" onClick={handleExtract} disabled={extracting || !pastedText.trim()}>
            {extracting ? (
              <><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> מנתח...</>
            ) : (
              <><Sparkles size={16} /> חלץ פרטים ותנאי סף עם AI</>
            )}
          </button>
          <button className="btn btn-secondary btn-lg" onClick={handleManualEntry} disabled={extracting}>
            <FileText size={16} /> הזנה ידנית
          </button>
        </div>
      </div>
    );
  }

  // ─── STEP 3: Saved ───────────────────────
  if (step === 'saved') {
    return (
      <div className="animate-fadeIn" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
        <CheckCircle size={64} style={{ color: 'var(--success)', marginBottom: '1rem' }} />
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--dark-900)', marginBottom: '0.5rem' }}>
          המכרז נשמר בהצלחה!
        </h2>
        <p style={{ color: 'var(--dark-500)', fontSize: '0.95rem' }}>
          {form.tender_name} - {conditions.length} תנאי סף
        </p>
        <p style={{ color: 'var(--dark-400)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
          מעביר לניתוח תנאי סף...
        </p>
      </div>
    );
  }

  // ─── STEP 2: Review & Edit ───────────────────────
  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div className="page-header-right">
          <h1 className="page-title">
            <FileText size={24} style={{ color: 'var(--primary)' }} />
            סקירה ועריכה
          </h1>
          <p className="page-subtitle">
            בדוק את הפרטים שחולצו ותקן במידת הצורך
            {conditions.length > 0 && ` - ${conditions.length} תנאי סף`}
          </p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-secondary" onClick={() => setStep('upload')}>
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
              placeholder="הקמת מערכת מצלמות אבטחה - עיריית חולון" />
          </div>
          <div className="form-group">
            <label className="form-label">מספר מכרז</label>
            <input type="text" value={form.tender_number} onChange={e => updateForm('tender_number', e.target.value)}
              placeholder="2025/001" />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">גורם מזמין</label>
            <input type="text" value={form.issuing_body} onChange={e => updateForm('issuing_body', e.target.value)}
              placeholder="עיריית חולון" />
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
          <button className="btn btn-primary btn-sm" onClick={addCondition}>
            <Plus size={14} /> הוסף תנאי
          </button>
        </div>

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
                    placeholder="סעיף"
                    style={{ width: '80px' }}
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
      </div>
    </div>
  );
}
