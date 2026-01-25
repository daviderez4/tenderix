import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, Sparkles, ArrowRight, Copy, Eye, EyeOff } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { api } from '../api/tenderix';
import { setCurrentTender, getCurrentOrgId, getDefaultOrgData } from '../api/config';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

// Direct Claude API call for gate extraction
async function extractGatesWithClaude(text: string): Promise<{
  success: boolean;
  conditions: Array<{
    number: string;
    text: string;
    type: string;
    isMandatory: boolean;
    sourcePage?: number;
    sourceSection?: string;
  }>;
  metadata: {
    tenderName: string;
    tenderNumber: string;
    issuingBody: string;
    submissionDeadline: string;
  };
  error?: string;
}> {
  const ANTHROPIC_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY;

  if (!ANTHROPIC_API_KEY) {
    // No API key configured - return clear error
    console.error('No Anthropic API key configured in VITE_ANTHROPIC_API_KEY');
    return {
      success: false,
      conditions: [],
      metadata: {
        tenderName: '',
        tenderNumber: '',
        issuingBody: '',
        submissionDeadline: '',
      },
      error: 'לא הוגדר מפתח API של Anthropic. יש להוסיף VITE_ANTHROPIC_API_KEY לקובץ .env',
    };
  }

  const prompt = `אתה מומחה לניתוח מכרזים ממשלתיים בישראל. נתח את המסמך הבא וחלץ את כל תנאי הסף (תנאים מוקדמים להשתתפות במכרז).

לכל תנאי סף, זהה:
1. מספר התנאי (לפי הסעיף במסמך)
2. תוכן התנאי המלא
3. סוג התנאי: EXPERIENCE (ניסיון), FINANCIAL (כספי), CERTIFICATION (הסמכה), PERSONNEL (כח אדם), EQUIPMENT (ציוד), LEGAL (משפטי), OTHER (אחר)
4. האם זה תנאי חובה (mandatory) או רשות
5. מספר העמוד והסעיף במסמך המקורי

כמו כן, חלץ את המטא-דאטה של המכרז:
- שם המכרז
- מספר המכרז
- הגוף המזמין
- מועד אחרון להגשה

החזר את התשובה בפורמט JSON בלבד, ללא טקסט נוסף:
{
  "conditions": [
    {
      "number": "1.2.3",
      "text": "תוכן התנאי",
      "type": "EXPERIENCE",
      "isMandatory": true,
      "sourcePage": 5,
      "sourceSection": "1.2"
    }
  ],
  "metadata": {
    "tenderName": "שם המכרז",
    "tenderNumber": "123/2024",
    "issuingBody": "משרד הביטחון",
    "submissionDeadline": "15/03/2024"
  }
}

המסמך לניתוח:
${text.substring(0, 100000)}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8000,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Claude API error:', error);
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.content[0].text;

    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not parse JSON from Claude response');
    }

    const result = JSON.parse(jsonMatch[0]);

    return {
      success: true,
      conditions: result.conditions || [],
      metadata: result.metadata || {
        tenderName: '',
        tenderNumber: '',
        issuingBody: '',
        submissionDeadline: '',
      },
    };
  } catch (error) {
    console.error('Claude extraction error:', error);
    return {
      success: false,
      conditions: [],
      metadata: {
        tenderName: '',
        tenderNumber: '',
        issuingBody: '',
        submissionDeadline: '',
      },
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export function SimpleIntakePage() {
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionStatus, setExtractionStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [results, setResults] = useState<{
    conditions: Array<{
      number: string;
      text: string;
      type: string;
      isMandatory: boolean;
      sourcePage?: number;
      sourceSection?: string;
    }>;
    metadata: {
      tenderName: string;
      tenderNumber: string;
      issuingBody: string;
      submissionDeadline: string;
    };
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedTenderId, setSavedTenderId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Extract text from PDF
  const extractPdfText = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let fullText = '';
    const maxPages = Math.min(pdf.numPages, 50);

    for (let i = 1; i <= maxPages; i++) {
      setExtractionStatus(`מחלץ עמוד ${i} מתוך ${maxPages}...`);
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pageText = (textContent.items as any[])
        .filter(item => 'str' in item)
        .map(item => item.str)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (pageText) {
        fullText += `\n--- עמוד ${i} ---\n${pageText}\n`;
      }
    }

    return fullText;
  };

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setFileName(file.name);
    setExtractionStatus('קורא קובץ...');

    try {
      let extractedText = '';

      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        extractedText = await extractPdfText(file);
      } else if (file.type === 'text/plain') {
        extractedText = await file.text();
      } else {
        throw new Error('סוג קובץ לא נתמך. נא להעלות PDF או TXT');
      }

      if (extractedText.length < 100) {
        throw new Error('לא הצלחתי לחלץ טקסט מהקובץ. נסה להדביק טקסט ידנית.');
      }

      setText(extractedText);
      setExtractionStatus(`נחלצו ${extractedText.length.toLocaleString()} תווים`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בקריאת הקובץ');
      setExtractionStatus('');
    }
  };

  // Run extraction
  const runExtraction = async () => {
    if (text.length < 100) {
      setError('נא להעלות קובץ או להדביק טקסט מהמכרז');
      return;
    }

    setIsExtracting(true);
    setError(null);
    setExtractionStatus('שולח לניתוח AI...');
    setResults(null);

    try {
      const result = await extractGatesWithClaude(text);

      if (!result.success) {
        throw new Error(result.error || 'שגיאה בחילוץ');
      }

      setResults({
        conditions: result.conditions,
        metadata: result.metadata,
      });
      setExtractionStatus(`נמצאו ${result.conditions.length} תנאי סף!`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בניתוח');
      setExtractionStatus('');
    } finally {
      setIsExtracting(false);
    }
  };

  // Save tender and gates to database
  const saveTender = async () => {
    if (!results) return;

    setIsSaving(true);
    setError(null);

    try {
      const orgId = getCurrentOrgId();
      const orgData = getDefaultOrgData();

      // Ensure organization exists
      await api.organizations.ensureExists(orgId, {
        name: orgData.name,
        company_number: orgData.company_number,
        settings: orgData.settings,
      });

      // Parse submission deadline to valid date format
      let parsedDeadline: string | undefined;
      if (results.metadata.submissionDeadline) {
        // Try to extract date from Hebrew format like "09/02/2023 עד לשעה: 16:00"
        const dateMatch = results.metadata.submissionDeadline.match(/(\d{1,2})[\/\.](\d{1,2})[\/\.](\d{4})/);
        if (dateMatch) {
          const [, day, month, year] = dateMatch;
          // Extract time if present
          const timeMatch = results.metadata.submissionDeadline.match(/(\d{1,2}):(\d{2})/);
          const hours = timeMatch ? timeMatch[1].padStart(2, '0') : '23';
          const minutes = timeMatch ? timeMatch[2] : '59';
          parsedDeadline = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hours}:${minutes}:00`;
        }
      }

      // Create tender
      const tender = await api.tenders.create({
        tender_name: results.metadata.tenderName || fileName || 'מכרז חדש',
        tender_number: results.metadata.tenderNumber || undefined,
        issuing_body: results.metadata.issuingBody || 'לא צוין',
        submission_deadline: parsedDeadline,
        org_id: orgId,
        status: 'ACTIVE',
        current_step: 'GATES_ANALYSIS',
      });

      if (!tender?.id) {
        throw new Error('Failed to create tender');
      }

      // Create gate conditions
      for (const condition of results.conditions) {
        await api.gates.create({
          tender_id: tender.id,
          condition_number: condition.number || '1',
          condition_text: condition.text || 'תנאי סף',
          condition_type: condition.type || 'OTHER', // Required field in DB
          requirement_type: condition.type || 'OTHER',
          is_mandatory: condition.isMandatory !== false,
          source_page: condition.sourcePage,
          source_section: condition.sourceSection,
          status: 'UNKNOWN',
        });
      }

      setCurrentTender(tender.id, results.metadata.tenderName || 'מכרז חדש');
      setSavedTenderId(tender.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בשמירה');
    } finally {
      setIsSaving(false);
    }
  };

  const typeLabels: Record<string, string> = {
    EXPERIENCE: 'ניסיון',
    FINANCIAL: 'כספי',
    CERTIFICATION: 'הסמכה',
    PERSONNEL: 'כח אדם',
    EQUIPMENT: 'ציוד',
    LEGAL: 'משפטי',
    OTHER: 'אחר',
  };

  const typeColors: Record<string, string> = {
    EXPERIENCE: '#7c3aed',
    FINANCIAL: '#059669',
    CERTIFICATION: '#d97706',
    PERSONNEL: '#0891b2',
    EQUIPMENT: '#6366f1',
    LEGAL: '#dc2626',
    OTHER: '#6b7280',
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      padding: '2rem',
    }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
          <h1 style={{
            fontSize: '2.5rem',
            fontWeight: 800,
            background: 'linear-gradient(135deg, #00d4ff, #7c3aed)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '0.5rem',
          }}>
            חילוץ תנאי סף
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '1.1rem' }}>
            העלה מסמך או הדבק טקסט - קבל תוצאות תוך שניות
          </p>
        </div>

        {/* Input Section */}
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '16px',
          padding: '2rem',
          marginBottom: '1.5rem',
          border: '1px solid rgba(255,255,255,0.1)',
        }}>
          {/* File Upload */}
          <div
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: '2px dashed rgba(0, 212, 255, 0.3)',
              borderRadius: '12px',
              padding: '2rem',
              textAlign: 'center',
              cursor: 'pointer',
              marginBottom: '1.5rem',
              transition: 'all 0.3s',
              background: 'rgba(0, 212, 255, 0.02)',
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
            <Upload size={40} style={{ color: '#00d4ff', marginBottom: '0.75rem' }} />
            <p style={{ color: '#fff', fontSize: '1rem', marginBottom: '0.25rem' }}>
              {fileName || 'לחץ להעלאת קובץ PDF'}
            </p>
            <p style={{ color: '#64748b', fontSize: '0.85rem' }}>
              או גרור קובץ לכאן
            </p>
          </div>

          {/* Text Input */}
          <div style={{ position: 'relative' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '0.5rem',
            }}>
              <label style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
                או הדבק טקסט ישירות:
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {text && (
                  <button
                    onClick={() => setShowPreview(!showPreview)}
                    style={{
                      background: 'transparent',
                      border: '1px solid #334155',
                      borderRadius: '6px',
                      padding: '0.4rem 0.75rem',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      fontSize: '0.8rem',
                    }}
                  >
                    {showPreview ? <EyeOff size={14} /> : <Eye size={14} />}
                    {showPreview ? 'הסתר' : 'תצוגה מקדימה'}
                  </button>
                )}
                <button
                  onClick={async () => {
                    const clipText = await navigator.clipboard.readText();
                    setText(prev => prev + clipText);
                  }}
                  style={{
                    background: 'transparent',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    padding: '0.4rem 0.75rem',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    fontSize: '0.8rem',
                  }}
                >
                  <Copy size={14} />
                  הדבק
                </button>
              </div>
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="הדבק כאן את תוכן המכרז..."
              style={{
                width: '100%',
                minHeight: showPreview ? '400px' : '120px',
                padding: '1rem',
                borderRadius: '8px',
                border: '1px solid #334155',
                background: 'rgba(15, 23, 42, 0.8)',
                color: '#fff',
                fontSize: '0.95rem',
                resize: 'vertical',
                direction: 'rtl',
              }}
            />
            {text && (
              <div style={{
                position: 'absolute',
                bottom: '0.75rem',
                left: '0.75rem',
                background: 'rgba(0,0,0,0.5)',
                padding: '0.25rem 0.5rem',
                borderRadius: '4px',
                fontSize: '0.75rem',
                color: '#64748b',
              }}>
                {text.length.toLocaleString()} תווים
              </div>
            )}
          </div>

          {/* Status */}
          {extractionStatus && (
            <div style={{
              marginTop: '1rem',
              padding: '0.75rem 1rem',
              background: 'rgba(0, 212, 255, 0.1)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
            }}>
              {isExtracting && <Loader2 size={18} className="spin" style={{ color: '#00d4ff' }} />}
              {!isExtracting && results && <CheckCircle size={18} style={{ color: '#22c55e' }} />}
              <span style={{ color: '#00d4ff' }}>{extractionStatus}</span>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{
              marginTop: '1rem',
              padding: '0.75rem 1rem',
              background: 'rgba(239, 68, 68, 0.1)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
            }}>
              <AlertCircle size={18} style={{ color: '#ef4444' }} />
              <span style={{ color: '#ef4444' }}>{error}</span>
            </div>
          )}

          {/* Extract Button */}
          <button
            onClick={runExtraction}
            disabled={isExtracting || text.length < 100}
            style={{
              width: '100%',
              marginTop: '1.5rem',
              padding: '1rem',
              borderRadius: '12px',
              border: 'none',
              background: isExtracting
                ? 'linear-gradient(135deg, #4b5563, #374151)'
                : 'linear-gradient(135deg, #7c3aed, #6d28d9)',
              color: 'white',
              fontSize: '1.1rem',
              fontWeight: 600,
              cursor: isExtracting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem',
              transition: 'transform 0.2s',
            }}
          >
            {isExtracting ? (
              <>
                <Loader2 size={22} className="spin" />
                מנתח עם Claude AI...
              </>
            ) : (
              <>
                <Sparkles size={22} />
                חלץ תנאי סף
              </>
            )}
          </button>
        </div>

        {/* Results Section */}
        {results && (
          <div style={{
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '16px',
            padding: '2rem',
            border: '1px solid rgba(34, 197, 94, 0.3)',
          }}>
            {/* Metadata */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
              marginBottom: '2rem',
              padding: '1.5rem',
              background: 'rgba(124, 58, 237, 0.1)',
              borderRadius: '12px',
            }}>
              <div>
                <div style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: '0.25rem' }}>שם המכרז</div>
                <div style={{ color: '#fff', fontWeight: 600 }}>{results.metadata.tenderName || 'לא זוהה'}</div>
              </div>
              <div>
                <div style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: '0.25rem' }}>מספר מכרז</div>
                <div style={{ color: '#fff', fontWeight: 600 }}>{results.metadata.tenderNumber || 'לא זוהה'}</div>
              </div>
              <div>
                <div style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: '0.25rem' }}>גוף מזמין</div>
                <div style={{ color: '#fff', fontWeight: 600 }}>{results.metadata.issuingBody || 'לא זוהה'}</div>
              </div>
              <div>
                <div style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: '0.25rem' }}>מועד הגשה</div>
                <div style={{ color: '#ef4444', fontWeight: 600 }}>{results.metadata.submissionDeadline || 'לא זוהה'}</div>
              </div>
            </div>

            {/* Conditions Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem',
            }}>
              <h2 style={{ color: '#fff', fontSize: '1.25rem', margin: 0 }}>
                תנאי סף ({results.conditions.length})
              </h2>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <span style={{
                  background: '#dc2626',
                  color: 'white',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '20px',
                  fontSize: '0.85rem',
                }}>
                  {results.conditions.filter(c => c.isMandatory).length} חובה
                </span>
              </div>
            </div>

            {/* Conditions List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {results.conditions.map((condition, index) => (
                <div
                  key={index}
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: '12px',
                    padding: '1rem 1.25rem',
                    borderRight: `4px solid ${typeColors[condition.type] || '#6b7280'}`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                    <div style={{
                      background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                      color: 'white',
                      borderRadius: '8px',
                      padding: '0.5rem 0.75rem',
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      minWidth: '50px',
                      textAlign: 'center',
                    }}>
                      #{condition.number}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: '#fff', marginBottom: '0.5rem', lineHeight: 1.6 }}>
                        {condition.text}
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{
                          background: typeColors[condition.type] || '#6b7280',
                          color: 'white',
                          padding: '0.2rem 0.6rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                        }}>
                          {typeLabels[condition.type] || condition.type}
                        </span>
                        {condition.isMandatory && (
                          <span style={{
                            background: '#dc2626',
                            color: 'white',
                            padding: '0.2rem 0.6rem',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                          }}>
                            חובה
                          </span>
                        )}
                        {condition.sourceSection && (
                          <span style={{
                            background: 'rgba(255,255,255,0.1)',
                            color: '#94a3b8',
                            padding: '0.2rem 0.6rem',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                          }}>
                            סעיף {condition.sourceSection}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Save Button */}
            {!savedTenderId ? (
              <button
                onClick={saveTender}
                disabled={isSaving}
                style={{
                  width: '100%',
                  marginTop: '2rem',
                  padding: '1rem',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                  color: 'white',
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.75rem',
                }}
              >
                {isSaving ? (
                  <>
                    <Loader2 size={22} className="spin" />
                    שומר...
                  </>
                ) : (
                  <>
                    <FileText size={22} />
                    שמור מכרז והמשך לניתוח
                  </>
                )}
              </button>
            ) : (
              <div style={{
                marginTop: '2rem',
                padding: '1.5rem',
                background: 'rgba(34, 197, 94, 0.1)',
                borderRadius: '12px',
                borderRight: '4px solid #22c55e',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                  <CheckCircle size={24} style={{ color: '#22c55e' }} />
                  <span style={{ color: '#22c55e', fontWeight: 600, fontSize: '1.1rem' }}>
                    המכרז נשמר בהצלחה!
                  </span>
                </div>
                <button
                  onClick={() => navigate('/gates')}
                  style={{
                    width: '100%',
                    padding: '1rem',
                    borderRadius: '12px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                    color: 'white',
                    fontSize: '1rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.75rem',
                  }}
                >
                  המשך לניתוח תנאי סף
                  <ArrowRight size={20} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
// Trigger rebuild 1769369918
