import { useState, useRef, useEffect } from 'react';
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
  Building2,
  XCircle,
  Users,
} from 'lucide-react';
import { supabase } from '../api/supabaseClient';
import { setCurrentTender, getEdgeFunctionUrl, API_CONFIG } from '../api/config';

interface GateConditionInput {
  id: number;
  condition_number: string;
  condition_text: string;
  condition_type: 'GATE' | 'ADVANTAGE';
  is_mandatory: boolean;
  requirement_type: 'CAPABILITY' | 'EXECUTION';
  source_section: string;
}

let nextConditionId = 1;

function createCondition(overrides?: Partial<Omit<GateConditionInput, 'id'>>): GateConditionInput {
  return {
    id: nextConditionId++,
    condition_number: '',
    condition_text: '',
    condition_type: 'GATE',
    is_mandatory: true,
    requirement_type: 'CAPABILITY',
    source_section: '',
    ...overrides,
  };
}

interface Org {
  id: string;
  name: string;
}

type Step = 'upload' | 'review' | 'choose-company' | 'saved';

async function extractPdfText(file: File): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString();

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const text = content.items
      .map((item: any) => item.str || '')
      .join(' ');
    if (text.trim()) {
      pages.push(text);
    }
  }

  return pages.join('\n\n');
}

export function TenderCreatePage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>('upload');
  const [saving, setSaving] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState('');
  const [pastedText, setPastedText] = useState('');
  const [fileLoading, setFileLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [savedTenderId, setSavedTenderId] = useState('');

  // Company selection state
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [generating, setGenerating] = useState('');
  const [genMessage, setGenMessage] = useState('');

  const [form, setForm] = useState({
    tender_name: '',
    tender_number: '',
    issuing_body: '',
    submission_deadline: '',
    estimated_value: '',
    category: 'COMBINED' as string,
    contract_duration_months: '',
    guarantee_amount: '',
  });

  const [conditions, setConditions] = useState<GateConditionInput[]>([]);

  // Load orgs when reaching choose-company step
  useEffect(() => {
    if (step === 'choose-company') {
      loadOrgs();
    }
  }, [step]);

  async function loadOrgs() {
    const { data } = await supabase
      .from('organizations')
      .select('id, name')
      .order('name');
    if (data) {
      setOrgs(data);
      if (data.length > 0 && !selectedOrgId) {
        setSelectedOrgId(data[0].id);
      }
    }
  }

  function updateForm(key: string, value: string) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  function addCondition() {
    setConditions(prev => {
      const newCond = createCondition({
        condition_number: String(prev.length + 1),
      });
      return [...prev, newCond];
    });
  }

  function removeCondition(index: number) {
    setConditions(prev => prev.filter((_, i) => i !== index).map((c, i) => ({
      ...c,
      condition_number: String(i + 1),
    })));
  }

  function updateCondition(index: number, key: keyof Omit<GateConditionInput, 'id'>, value: string | boolean) {
    setConditions(prev => prev.map((c, i) => i === index ? { ...c, [key]: value } : c));
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();

    setFileLoading(true);
    setError('');
    setLoadingMessage(`טוען "${file.name}"...`);

    try {
      let text = '';

      if (ext === 'pdf') {
        setLoadingMessage(`מחלץ טקסט מ-PDF: "${file.name}"...`);
        text = await extractPdfText(file);

        if (!text.trim()) {
          setError('לא נמצא טקסט ב-PDF. ייתכן שמדובר ב-PDF סרוק (תמונה). נא להעתיק את הטקסט ידנית ולהדביק.');
          setFileLoading(false);
          setLoadingMessage('');
          if (fileInputRef.current) fileInputRef.current.value = '';
          return;
        }
      } else if (ext === 'doc' || ext === 'docx') {
        setError('קובצי Word לא נתמכים כרגע. נא לשמור כ-PDF או להדביק את הטקסט ישירות.');
        setFileLoading(false);
        setLoadingMessage('');
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      } else {
        text = await file.text();
        const sample = text.slice(0, 500);
        const binaryCount = sample.split('').filter(c => {
          const code = c.charCodeAt(0);
          return code < 9 || (code > 13 && code < 32 && code !== 27);
        }).length;

        if (binaryCount > 10) {
          setError('הקובץ מכיל תוכן בינארי שלא ניתן לקרוא. נא להדביק את הטקסט ישירות.');
          setFileLoading(false);
          setLoadingMessage('');
          if (fileInputRef.current) fileInputRef.current.value = '';
          return;
        }
      }

      if (text.trim()) {
        setPastedText(text.trim());
        setLoadingMessage(`נטען בהצלחה! ${text.trim().length.toLocaleString()} תווים`);
        setTimeout(() => setLoadingMessage(''), 2000);
      }
    } catch (err) {
      console.error('File read error:', err);
      setError('שגיאה בקריאת הקובץ. נא לנסות שוב או להדביק את הטקסט ישירות.');
      setLoadingMessage('');
    }

    setFileLoading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleExtract() {
    if (!pastedText.trim()) {
      setError('נא להדביק טקסט של מכרז או להעלות קובץ');
      return;
    }

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

      if (extractedConditions?.length > 0) {
        const mapped = extractedConditions.map((c: Record<string, unknown>, i: number) =>
          createCondition({
            condition_number: String(c.condition_number || i + 1),
            condition_text: (c.condition_text as string) || '',
            condition_type: (c.condition_type as 'GATE' | 'ADVANTAGE') || 'GATE',
            is_mandatory: c.is_mandatory !== false,
            requirement_type: (c.requirement_type as 'CAPABILITY' | 'EXECUTION') || 'CAPABILITY',
            source_section: (c.source_section as string) || '',
          })
        );
        setConditions(mapped);
      }

      setStep('review');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'שגיאה בחילוץ');
    }

    setExtracting(false);
  }

  function handleManualEntry() {
    setConditions([createCondition({ condition_number: '1' })]);
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
      setSavedTenderId(tender.id);

      // Go to company selection step instead of directly to gates
      setStep('choose-company');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'שגיאה בשמירה');
    }

    setSaving(false);
  }

  async function generateCompany(profileType: 'passing' | 'failing') {
    if (!savedTenderId) return;

    const label = profileType === 'passing' ? 'עומדת בתנאים' : 'לא עומדת';
    setGenerating(profileType);
    setGenMessage('');
    setError('');

    try {
      const response = await fetch(getEdgeFunctionUrl('generate-company'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_CONFIG.SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ tender_id: savedTenderId, profile_type: profileType }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('שרת ה-AI עמוס כרגע. נא לנסות שוב בעוד דקה.');
        }
        throw new Error(`שגיאה בשרת (${response.status}). נא לנסות שוב.`);
      }

      const result = await response.json();

      if (result.success) {
        setGenMessage(`נוצרה חברה "${result.org_name}" (${label})`);
        await loadOrgs();
        setSelectedOrgId(result.org_id);
      } else {
        setError(result.error || 'שגיאה ביצירת חברה');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה ביצירת חברה');
    }

    setGenerating('');
  }

  function proceedToGates() {
    if (selectedOrgId) {
      localStorage.setItem('tenderix_selected_org_id', selectedOrgId);
    }
    navigate('/gates');
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
            <p className="page-subtitle">העלה קובץ PDF/טקסט או הדבק את תוכן המכרז</p>
          </div>
          <div className="page-header-actions">
            <button className="btn btn-secondary" onClick={() => navigate('/dashboard')}>
              <ArrowRight size={14} /> חזרה
            </button>
          </div>
        </div>

        {error && (
          <div className="card" style={{ background: 'var(--danger-bg)', borderColor: 'var(--danger-border)', marginBottom: '1rem' }}>
            <span style={{ color: 'var(--danger)', fontWeight: 600 }}>
              <AlertTriangle size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> {error}
            </span>
          </div>
        )}

        <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
          <div
            style={{
              border: '2px dashed var(--blue-300)',
              borderRadius: 'var(--radius-xl)',
              padding: '2.5rem',
              background: fileLoading ? 'var(--blue-100)' : 'var(--blue-50)',
              cursor: fileLoading ? 'wait' : 'pointer',
              transition: 'all 0.2s',
            }}
            onClick={() => !fileLoading && fileInputRef.current?.click()}
          >
            {fileLoading ? (
              <>
                <Loader size={48} style={{ color: 'var(--primary)', marginBottom: '0.75rem', animation: 'spin 1s linear infinite' }} />
                <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.25rem' }}>
                  {loadingMessage || 'טוען...'}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--dark-500)' }}>נא להמתין...</div>
              </>
            ) : (
              <>
                <Upload size={48} style={{ color: 'var(--primary)', marginBottom: '0.75rem' }} />
                <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--dark-800)', marginBottom: '0.25rem' }}>
                  העלה קובץ מכרז
                </div>
                <div style={{ fontSize: '0.9rem', color: 'var(--dark-500)' }}>PDF, TXT - לחץ לבחירת קובץ</div>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.pdf"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
          </div>

          {loadingMessage && !fileLoading && (
            <div style={{ marginTop: '0.75rem', color: 'var(--success)', fontWeight: 600, fontSize: '0.9rem' }}>
              <CheckCircle size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> {loadingMessage}
            </div>
          )}

          <div style={{ margin: '1.5rem 0', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
            <span style={{ color: 'var(--dark-400)', fontSize: '0.85rem', fontWeight: 600 }}>או הדבק טקסט</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
          </div>

          <div style={{ textAlign: 'right' }}>
            <textarea
              value={pastedText}
              onChange={e => setPastedText(e.target.value)}
              rows={12}
              dir="rtl"
              style={{ width: '100%', fontFamily: 'inherit', fontSize: '0.9rem', lineHeight: 1.8 }}
              placeholder={`הדבק כאן את טקסט המכרז...

לדוגמה:
מכרז 2025/001 - הקמת מערכת מצלמות אבטחה עירונית
גורם מזמין: עיריית חולון
מועד אחרון להגשה: 15.2.2025

תנאי סף:
1. מחזור הכנסות שנתי ממוצע של 50 מיליון ש"ח בשלוש השנים האחרונות
2. ביצוע לפחות 3 פרויקטים דומים בהיקף של 10 מיליון ש"ח כל אחד
3. תעודת ISO 9001 בתוקף`}
            />
          </div>

          {pastedText.trim() && (
            <div style={{ textAlign: 'left', marginTop: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--dark-400)' }}>
                {pastedText.length.toLocaleString()} תווים
                {pastedText.length > 50000 && ' (יחתך ל-50,000 לפני שליחה)'}
              </span>
            </div>
          )}
        </div>

        {extracting && (
          <div className="card" style={{ background: 'var(--blue-50)', borderColor: 'var(--blue-200)', marginTop: '1rem', textAlign: 'center', padding: '2rem' }}>
            <Loader size={36} style={{ color: 'var(--primary)', animation: 'spin 1s linear infinite', marginBottom: '0.75rem' }} />
            <div style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '1.1rem', marginBottom: '0.25rem' }}>
              AI מנתח את טקסט המכרז...
            </div>
            <div style={{ color: 'var(--dark-500)', fontSize: '0.9rem' }}>
              מחלץ שם מכרז, גורם מזמין, תאריכים, סכומים ותנאי סף
            </div>
            <div style={{ color: 'var(--dark-400)', fontSize: '0.8rem', marginTop: '0.5rem' }}>
              תהליך זה עשוי לקחת 15-30 שניות
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginTop: '1.25rem' }}>
          <button
            className="btn btn-primary btn-lg"
            onClick={handleExtract}
            disabled={extracting || !pastedText.trim()}
            style={{ minWidth: '220px', padding: '0.75rem 1.5rem', fontSize: '1rem' }}
          >
            {extracting ? (
              <><Loader size={18} style={{ animation: 'spin 1s linear infinite' }} /> מנתח...</>
            ) : (
              <><Sparkles size={18} /> חלץ פרטים ותנאי סף</>
            )}
          </button>
          <button
            className="btn btn-secondary btn-lg"
            onClick={handleManualEntry}
            disabled={extracting}
            style={{ padding: '0.75rem 1.5rem', fontSize: '1rem' }}
          >
            <FileText size={18} /> הזנה ידנית
          </button>
        </div>
      </div>
    );
  }

  // ─── STEP 3: Choose Company ───────────────────────
  if (step === 'choose-company') {
    return (
      <div className="animate-fadeIn">
        <div className="page-header">
          <div className="page-header-right">
            <h1 className="page-title">
              <Building2 size={24} style={{ color: 'var(--primary)' }} />
              בחירת חברה לניתוח
            </h1>
            <p className="page-subtitle">
              המכרז "{form.tender_name}" נשמר עם {conditions.length} תנאי סף. בחר חברה לבדיקת התאמה.
            </p>
          </div>
        </div>

        {error && (
          <div className="card" style={{ background: 'var(--danger-bg)', borderColor: 'var(--danger-border)', marginBottom: '1rem' }}>
            <span style={{ color: 'var(--danger)', fontWeight: 600 }}>
              <AlertTriangle size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> {error}
            </span>
          </div>
        )}

        {genMessage && (
          <div className="card" style={{ background: 'var(--success-bg)', borderColor: 'var(--success-border)', marginBottom: '1rem' }}>
            <span style={{ color: '#065f46', fontWeight: 600 }}>
              <CheckCircle size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> {genMessage}
            </span>
          </div>
        )}

        {/* Option 1: Existing company */}
        {orgs.length > 0 && (
          <div className="card" style={{ marginBottom: '1rem' }}>
            <div className="card-header">
              <div className="card-title"><Building2 size={16} /> בחר חברה קיימת מהמאגר</div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <select
                value={selectedOrgId}
                onChange={e => setSelectedOrgId(e.target.value)}
                style={{ minWidth: '250px', flex: 1 }}
              >
                {orgs.map(org => (
                  <option key={org.id} value={org.id}>{org.name}</option>
                ))}
              </select>
              <button
                className="btn btn-primary btn-lg"
                onClick={proceedToGates}
                disabled={!selectedOrgId}
                style={{ minWidth: '180px' }}
              >
                <Shield size={16} /> נתח תנאי סף
              </button>
            </div>
          </div>
        )}

        {/* Option 2: Generate fictitious companies */}
        <div className="card" style={{ marginBottom: '1rem' }}>
          <div className="card-header">
            <div className="card-title"><Sparkles size={16} /> צור חברה פיקטיבית עם AI</div>
          </div>
          <p style={{ fontSize: '0.9rem', color: 'var(--dark-600)', marginBottom: '1rem' }}>
            AI ייצור חברה מלאה עם כל הנתונים (פיננסים, הסמכות, כ"א, פרויקטים) על בסיס תנאי הסף של המכרז.
            זה מאפשר לבדוק מה החברה שלך צריכה כדי לעמוד בדרישות.
          </p>

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {/* Passing company */}
            <div
              style={{
                flex: 1,
                minWidth: '280px',
                border: '2px solid var(--success-border)',
                borderRadius: 'var(--radius-lg)',
                padding: '1.25rem',
                background: 'var(--success-bg)',
                textAlign: 'center',
              }}
            >
              <CheckCircle size={32} style={{ color: 'var(--success)', marginBottom: '0.5rem' }} />
              <div style={{ fontWeight: 700, fontSize: '1rem', color: '#065f46', marginBottom: '0.25rem' }}>
                חברה שעומדת בכל התנאים
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--dark-500)', marginBottom: '1rem' }}>
                דוגמה לחברה שעומדת ב-100% מתנאי הסף - בדוק מה נדרש
              </div>
              <button
                className="btn btn-success"
                onClick={() => generateCompany('passing')}
                disabled={!!generating}
                style={{ width: '100%' }}
              >
                {generating === 'passing' ? (
                  <><Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> יוצר חברה...</>
                ) : (
                  <><Sparkles size={14} /> צור חברה עומדת</>
                )}
              </button>
            </div>

            {/* Failing company */}
            <div
              style={{
                flex: 1,
                minWidth: '280px',
                border: '2px solid var(--danger-border)',
                borderRadius: 'var(--radius-lg)',
                padding: '1.25rem',
                background: 'var(--danger-bg)',
                textAlign: 'center',
              }}
            >
              <XCircle size={32} style={{ color: 'var(--danger)', marginBottom: '0.5rem' }} />
              <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--danger)', marginBottom: '0.25rem' }}>
                חברה שלא עומדת בתנאים
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--dark-500)', marginBottom: '1rem' }}>
                דוגמה לחברה עם פערים - בדוק מה חסר, מה אפשר להשלים ואיך לזכות
              </div>
              <button
                className="btn btn-danger"
                onClick={() => generateCompany('failing')}
                disabled={!!generating}
                style={{ width: '100%' }}
              >
                {generating === 'failing' ? (
                  <><Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> יוצר חברה...</>
                ) : (
                  <><Sparkles size={14} /> צור חברה לא עומדת</>
                )}
              </button>
            </div>
          </div>

          {generating && (
            <div style={{ textAlign: 'center', padding: '1rem', marginTop: '0.75rem' }}>
              <Loader size={24} style={{ color: 'var(--primary)', animation: 'spin 1s linear infinite', marginBottom: '0.5rem' }} />
              <div style={{ color: 'var(--primary)', fontWeight: 600, fontSize: '0.9rem' }}>
                AI יוצר פרופיל חברה מלא על בסיס {conditions.length} תנאי סף...
              </div>
              <div style={{ color: 'var(--dark-400)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                כולל נתונים פיננסיים, הסמכות, כ"א ופרויקטים - עשוי לקחת 20-40 שניות
              </div>
            </div>
          )}
        </div>

        {/* No company option - skip */}
        <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
          <button
            className="btn btn-ghost"
            onClick={() => navigate('/gates')}
            style={{ fontSize: '0.85rem' }}
          >
            <Users size={14} /> המשך ללא בחירת חברה - אבחר אח"כ
          </button>
        </div>
      </div>
    );
  }

  // ─── STEP 4: Saved ───────────────────────
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
            AI חילץ את הנתונים - בדוק ותקן לפי הצורך
            {conditions.length > 0 && ` | ${conditions.length} תנאי סף זוהו`}
          </p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-secondary" onClick={() => setStep('upload')}>
            <ArrowRight size={14} /> חזרה
          </button>
          <button className="btn btn-primary btn-lg" onClick={handleSave} disabled={saving}>
            {saving ? (
              <><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> שומר...</>
            ) : (
              <><Save size={16} /> שמור ובחר חברה</>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="card" style={{ background: 'var(--danger-bg)', borderColor: 'var(--danger-border)', marginBottom: '1rem' }}>
          <span style={{ color: 'var(--danger)', fontWeight: 600 }}>
            <AlertTriangle size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> {error}
          </span>
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
              placeholder="הקמת מערכת מצלמות אבטחה - עיריית חולון" dir="rtl" />
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
              placeholder="עיריית חולון" dir="rtl" />
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
            <div
              key={cond.id}
              className="gate-item"
              style={{
                cursor: 'default',
                borderRight: `3px solid ${cond.condition_type === 'ADVANTAGE' ? 'var(--warning)' : 'var(--primary)'}`,
              }}
            >
              <div className="gate-number">{index + 1}</div>
              <div className="gate-content" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <textarea
                  value={cond.condition_text}
                  onChange={e => updateCondition(index, 'condition_text', e.target.value)}
                  placeholder="תיאור תנאי הסף..."
                  rows={2}
                  dir="rtl"
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
                  <span style={{ fontSize: '0.65rem', color: 'var(--dark-400)' }}>#{cond.id}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
