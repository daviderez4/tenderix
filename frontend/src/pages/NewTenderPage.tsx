import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileText, CheckCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { api } from '../api/tenderix';
import { API_CONFIG } from '../api/config';

interface NewTender {
  tender_name: string;
  tender_number: string;
  issuing_body: string;
  submission_deadline: string;
  estimated_value: string;
  tender_type: string;
  gates_text: string;
}

export function NewTenderPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [createdTenderId, setCreatedTenderId] = useState<string | null>(null);
  const [extractedGates, setExtractedGates] = useState<number>(0);

  const [tender, setTender] = useState<NewTender>({
    tender_name: '',
    tender_number: '',
    issuing_body: '',
    submission_deadline: '',
    estimated_value: '',
    tender_type: 'VIDEO',
    gates_text: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setTender({ ...tender, [e.target.name]: e.target.value });
  };

  async function createTender() {
    setLoading(true);
    try {
      // Step 1: Create tender in Supabase
      const tenderData = {
        tender_name: tender.tender_name,
        tender_number: tender.tender_number,
        issuing_body: tender.issuing_body,
        submission_deadline: tender.submission_deadline || null,
        estimated_value: tender.estimated_value ? parseFloat(tender.estimated_value) : null,
        tender_type: tender.tender_type,
        status: 'active',
      };

      const createRes = await fetch(`${API_CONFIG.SUPABASE_URL}/rest/v1/tenders`, {
        method: 'POST',
        headers: {
          'apikey': API_CONFIG.SUPABASE_KEY,
          'Authorization': `Bearer ${API_CONFIG.SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
        },
        body: JSON.stringify(tenderData),
      });

      if (!createRes.ok) {
        throw new Error('Failed to create tender');
      }

      const [created] = await createRes.json();
      setCreatedTenderId(created.id);
      setStep(2);
    } catch (error) {
      console.error('Error creating tender:', error);
      alert('שגיאה ביצירת המכרז');
    } finally {
      setLoading(false);
    }
  }

  async function extractGates() {
    if (!createdTenderId || !tender.gates_text.trim()) return;

    setLoading(true);
    try {
      // שימוש ב-API המרכזי שמנסה קודם את ה-4-agent workflow
      const result = await api.workflows.extractGates(createdTenderId, tender.gates_text);

      if (result.success && result.conditions.length > 0) {
        setExtractedGates(result.conditions.length);
        setStep(3);
      } else {
        alert('שגיאה בחילוץ תנאי סף');
      }
    } catch (error) {
      console.error('Error extracting gates:', error);
      alert('שגיאה בחילוץ תנאי סף');
    } finally {
      setLoading(false);
    }
  }

  function goToTender() {
    if (createdTenderId) {
      // Store the tender ID for other pages to use
      localStorage.setItem('currentTenderId', createdTenderId);
      navigate('/gates');
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">
          <Upload size={28} style={{ marginLeft: '0.5rem', verticalAlign: 'middle' }} />
          מכרז חדש
        </h1>
        <p className="page-subtitle">הוספת מכרז חדש למערכת</p>
      </div>

      {/* Progress Steps */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <StepIndicator num={1} label="פרטי מכרז" active={step === 1} done={step > 1} />
          <div style={{ flex: 1, height: 2, background: step > 1 ? 'var(--success)' : 'var(--gray-200)', margin: '0 1rem' }} />
          <StepIndicator num={2} label="תנאי סף" active={step === 2} done={step > 2} />
          <div style={{ flex: 1, height: 2, background: step > 2 ? 'var(--success)' : 'var(--gray-200)', margin: '0 1rem' }} />
          <StepIndicator num={3} label="סיום" active={step === 3} done={false} />
        </div>
      </div>

      {/* Step 1: Tender Details */}
      {step === 1 && (
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: '1.5rem' }}>פרטי המכרז</h3>

          <div className="grid grid-2" style={{ gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                שם המכרז *
              </label>
              <input
                type="text"
                name="tender_name"
                value={tender.tender_name}
                onChange={handleChange}
                placeholder="לדוגמה: מכרז להתקנת מערכת מצלמות"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid var(--gray-300)',
                  borderRadius: '8px',
                  fontSize: '1rem',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                מספר מכרז
              </label>
              <input
                type="text"
                name="tender_number"
                value={tender.tender_number}
                onChange={handleChange}
                placeholder="לדוגמה: 2024/123"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid var(--gray-300)',
                  borderRadius: '8px',
                  fontSize: '1rem',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                גוף מזמין *
              </label>
              <input
                type="text"
                name="issuing_body"
                value={tender.issuing_body}
                onChange={handleChange}
                placeholder="לדוגמה: עיריית תל אביב"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid var(--gray-300)',
                  borderRadius: '8px',
                  fontSize: '1rem',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                מועד הגשה
              </label>
              <input
                type="date"
                name="submission_deadline"
                value={tender.submission_deadline}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid var(--gray-300)',
                  borderRadius: '8px',
                  fontSize: '1rem',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                שווי משוער (ש"ח)
              </label>
              <input
                type="number"
                name="estimated_value"
                value={tender.estimated_value}
                onChange={handleChange}
                placeholder="לדוגמה: 5000000"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid var(--gray-300)',
                  borderRadius: '8px',
                  fontSize: '1rem',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                סוג מכרז
              </label>
              <select
                name="tender_type"
                value={tender.tender_type}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid var(--gray-300)',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  background: 'white',
                }}
              >
                <option value="VIDEO">מצלמות ווידאו</option>
                <option value="COMMUNICATION">תקשורת</option>
                <option value="ACCESS_CONTROL">בקרת כניסה</option>
                <option value="INFRASTRUCTURE">תשתיות</option>
                <option value="SOFTWARE">תוכנה</option>
                <option value="OTHER">אחר</option>
              </select>
            </div>
          </div>

          <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              className="btn btn-primary"
              onClick={createTender}
              disabled={!tender.tender_name || !tender.issuing_body || loading}
            >
              {loading ? <Loader2 className="spinner" size={18} /> : null}
              המשך לתנאי סף
              <ArrowLeft size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Gate Conditions */}
      {step === 2 && (
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: '1rem' }}>תנאי סף</h3>
          <p style={{ color: 'var(--gray-600)', marginBottom: '1.5rem' }}>
            העתק והדבק את תנאי הסף מתוך מסמך המכרז. המערכת תחלץ ותנתח אותם אוטומטית.
          </p>

          <textarea
            name="gates_text"
            value={tender.gates_text}
            onChange={handleChange}
            placeholder={`הדבק כאן את תנאי הסף מהמכרז, לדוגמה:

תנאי סף להשתתפות במכרז:
1. על המציע להיות בעל ניסיון של 5 שנים לפחות בתחום התקנת מערכות מצלמות.
2. על המציע להציג 3 פרויקטים דומים בהיקף של לפחות 100 מצלמות כל אחד.
3. על המציע להיות בעל מחזור שנתי של לפחות 10 מיליון ש"ח.
4. על המציע להחזיק באישור ISO 9001.
5. על המציע להעסיק לפחות 2 מהנדסים בעלי רישיון.`}
            style={{
              width: '100%',
              minHeight: '300px',
              padding: '1rem',
              border: '1px solid var(--gray-300)',
              borderRadius: '8px',
              fontSize: '1rem',
              lineHeight: 1.6,
              resize: 'vertical',
            }}
          />

          <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between' }}>
            <button className="btn btn-secondary" onClick={() => setStep(1)}>
              חזרה
            </button>
            <button
              className="btn btn-primary"
              onClick={extractGates}
              disabled={!tender.gates_text.trim() || loading}
            >
              {loading ? (
                <>
                  <Loader2 className="spinner" size={18} />
                  מחלץ תנאי סף...
                </>
              ) : (
                <>
                  <FileText size={18} />
                  חלץ תנאי סף
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Complete */}
      {step === 3 && (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <CheckCircle size={64} style={{ color: 'var(--success)', marginBottom: '1rem' }} />
          <h2 style={{ marginBottom: '0.5rem' }}>המכרז נוצר בהצלחה!</h2>
          <p style={{ color: 'var(--gray-600)', marginBottom: '2rem' }}>
            חולצו {extractedGates} תנאי סף מהטקסט
          </p>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button className="btn btn-secondary" onClick={() => {
              setStep(1);
              setTender({
                tender_name: '',
                tender_number: '',
                issuing_body: '',
                submission_deadline: '',
                estimated_value: '',
                tender_type: 'VIDEO',
                gates_text: '',
              });
              setCreatedTenderId(null);
              setExtractedGates(0);
            }}>
              <Upload size={18} />
              מכרז נוסף
            </button>
            <button className="btn btn-primary" onClick={goToTender}>
              המשך לניתוח
              <ArrowLeft size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StepIndicator({ num, label, active, done }: { num: number; label: string; active: boolean; done: boolean }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{
        width: 40,
        height: 40,
        borderRadius: '50%',
        background: done ? 'var(--success)' : active ? 'var(--primary)' : 'var(--gray-200)',
        color: done || active ? 'white' : 'var(--gray-500)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 600,
        margin: '0 auto 0.5rem',
      }}>
        {done ? <CheckCircle size={20} /> : num}
      </div>
      <div style={{ fontSize: '0.875rem', color: active ? 'var(--primary)' : 'var(--gray-500)' }}>
        {label}
      </div>
    </div>
  );
}
