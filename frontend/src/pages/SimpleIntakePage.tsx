import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Upload, FileText, CheckCircle, AlertCircle, Loader2, Sparkles,
  ArrowRight, Copy, Eye, EyeOff, FileCheck, Database, BarChart3,
  RotateCcw, Home, CheckSquare, Target, Building2, Search, Wand2,
  Users, Award, TrendingUp, Briefcase, ChevronDown, ChevronUp,
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { api } from '../api/tenderix';
import type { Organization } from '../api/tenderix';
import { setCurrentTender, getCurrentOrgId, getDefaultOrgData, setTenderExtractedText } from '../api/config';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

// ==================== TYPES ====================

interface GeneratedProject {
  project_name: string;
  client_name: string;
  client_type: string;
  start_date: string;
  end_date: string;
  total_value: number;
  project_type: string;
  category: string;
  role_type: string;
  description: string;
}

interface GeneratedFinancial {
  fiscal_year: number;
  annual_revenue: number;
  net_profit: number;
  employee_count: number;
  audited: boolean;
}

interface GeneratedCertification {
  cert_type: string;
  cert_name: string;
  cert_number: string;
  issuing_body: string;
  valid_from: string;
  valid_until: string;
}

interface GeneratedCompanyBase {
  name: string;
  description: string;
  domain: string;
  founding_year: number;
  specializations: string;
  employee_count: number;
  annual_revenue: number;
  background: string;
}

interface FullGeneratedCompany extends GeneratedCompanyBase {
  company_number: string;
  projects: GeneratedProject[];
  financials: GeneratedFinancial[];
  certifications: GeneratedCertification[];
}

type CompanyMode = null | 'search' | 'generate';
type GenPhase = 0 | 1 | 2 | 3 | 4; // 0=idle, 1=profile, 2=projects, 3=financials+certs, 4=done

// ==================== CLAUDE API HELPER ====================

async function callClaude(prompt: string, maxTokens = 4000): Promise<string> {
  const ANTHROPIC_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) {
    throw new Error('לא הוגדר מפתח API של Anthropic. יש להוסיף VITE_ANTHROPIC_API_KEY לקובץ .env');
  }

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
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('Claude API error:', errText);
    throw new Error(`שגיאת API: ${response.status}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

function parseJSON<T>(text: string): T {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Could not parse JSON from response');
  return JSON.parse(match[0]);
}

// ==================== AI: EXTRACT GATES ====================

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
  try {
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

    const responseText = await callClaude(prompt, 8000);
    const result = parseJSON<{
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
    }>(responseText);

    return {
      success: true,
      conditions: result.conditions || [],
      metadata: result.metadata || { tenderName: '', tenderNumber: '', issuingBody: '', submissionDeadline: '' },
    };
  } catch (error) {
    console.error('Claude extraction error:', error);
    return {
      success: false,
      conditions: [],
      metadata: { tenderName: '', tenderNumber: '', issuingBody: '', submissionDeadline: '' },
      error: error instanceof Error ? error.message : 'שגיאה לא ידועה',
    };
  }
}

// ==================== AI: GENERATE COMPANY (MULTI-STEP) ====================

// Step 1: Base profile
async function generateCompanyProfile(
  tenderName: string,
  issuingBody: string,
  conditions: Array<{ text: string; type: string }>
): Promise<GeneratedCompanyBase> {
  const conditionsSummary = conditions
    .slice(0, 15)
    .map(c => `- [${c.type}] ${c.text}`)
    .join('\n');

  const prompt = `אתה מומחה למכרזים ממשלתיים בישראל ולעולם העסקי הישראלי.

צור פרופיל בסיסי של חברה ישראלית פיקטיבית שתהיה מועמדת חזקה למכרז הבא.

פרטי המכרז:
- שם: ${tenderName}
- גוף מזמין: ${issuingBody}

תנאי סף עיקריים:
${conditionsSummary}

הנחיות חשובות:
1. שם החברה צריך להיות ריאליסטי ומתאים לתחום (לדוגמה: "אלביט מערכות" לביטחון, "מטריקס" ל-IT, "שיכון ובינוי" לבנייה)
2. התיאור צריך להיות מקצועי ומשכנע
3. שנת ייסוד צריכה להיות הגיונית - חברה מספיק ותיקה לניסיון הנדרש
4. מספר עובדים ומחזור צריכים להתאים לגודל המכרז
5. ההתמחויות צריכות לכסות את דרישות המכרז
6. הרקע צריך לתאר הישגים ומוניטין בתחום

החזר JSON בלבד:
{
  "name": "שם החברה בע\\"מ",
  "description": "תיאור מקצועי של החברה ב-2-3 משפטים",
  "domain": "תחום ההתמחות העיקרי",
  "founding_year": 2005,
  "specializations": "התמחות1, התמחות2, התמחות3",
  "employee_count": 200,
  "annual_revenue": 150,
  "background": "רקע מפורט על החברה - 3-4 משפטים על ההיסטוריה, ההישגים, הלקוחות המרכזיים והמוניטין"
}`;

  const text = await callClaude(prompt, 2000);
  return parseJSON<GeneratedCompanyBase>(text);
}

// Step 2: Projects
async function generateCompanyProjectsData(
  company: GeneratedCompanyBase,
  tenderName: string,
  conditions: Array<{ text: string; type: string }>
): Promise<GeneratedProject[]> {
  const experienceConditions = conditions
    .filter(c => c.type === 'EXPERIENCE' || c.type === 'EQUIPMENT' || c.type === 'PERSONNEL')
    .map(c => `- ${c.text}`)
    .join('\n');

  const allConditions = conditions
    .slice(0, 10)
    .map(c => `- [${c.type}] ${c.text}`)
    .join('\n');

  const prompt = `אתה מומחה ליצירת נתוני פרופיל חברה למכרזים ישראליים.

פרטי החברה:
- שם: ${company.name}
- תחום: ${company.domain}
- התמחויות: ${company.specializations}
- עובדים: ${company.employee_count}
- מחזור שנתי: ${company.annual_revenue} מיליון ש"ח
- שנת ייסוד: ${company.founding_year}

שם המכרז: ${tenderName}

תנאי ניסיון רלוונטיים:
${experienceConditions || 'לא צוינו תנאי ניסיון ספציפיים'}

כל תנאי הסף:
${allConditions}

צור 5-6 פרויקטים מציאותיים שהחברה ביצעה בעבר, שמדגימים שהחברה עומדת בתנאי הסף.

הנחיות:
1. לקוחות מגופים ממשלתיים ישראליים אמיתיים (משרדי ממשלה, רשויות, חברות ממשלתיות, צה"ל)
2. היקפים כספיים ריאליסטיים לתחום
3. תאריכים ב-5 השנים האחרונות
4. תיאור מפורט שמראה ניסיון רלוונטי
5. מגוון סוגי פרויקטים שמכסים את תנאי הסף
6. לפחות 3 פרויקטים ממשלתיים

החזר JSON בלבד:
{
  "projects": [
    {
      "project_name": "שם הפרויקט בעברית",
      "client_name": "שם הלקוח",
      "client_type": "ממשלתי",
      "start_date": "2021-03-01",
      "end_date": "2023-12-31",
      "total_value": 15000000,
      "project_type": "סוג הפרויקט",
      "category": "קטגוריה",
      "role_type": "prime",
      "description": "תיאור מפורט של הפרויקט, היקפו ותוצאותיו"
    }
  ]
}`;

  const text = await callClaude(prompt, 4000);
  const result = parseJSON<{ projects: GeneratedProject[] }>(text);
  return result.projects || [];
}

// Step 3: Financials + Certifications
async function generateFinancialsAndCerts(
  company: GeneratedCompanyBase,
  conditions: Array<{ text: string; type: string }>
): Promise<{ financials: GeneratedFinancial[]; certifications: GeneratedCertification[] }> {
  const financialConditions = conditions
    .filter(c => c.type === 'FINANCIAL')
    .map(c => `- ${c.text}`)
    .join('\n');

  const certConditions = conditions
    .filter(c => c.type === 'CERTIFICATION' || c.type === 'LEGAL')
    .map(c => `- ${c.text}`)
    .join('\n');

  const prompt = `אתה מומחה ליצירת נתוני חברה למכרזים ישראליים.

פרטי החברה:
- שם: ${company.name}
- תחום: ${company.domain}
- עובדים: ${company.employee_count}
- מחזור שנתי: ${company.annual_revenue} מיליון ש"ח
- שנת ייסוד: ${company.founding_year}

צור שני סוגי נתונים:

1. נתונים כספיים ל-3 השנים האחרונות (2023, 2022, 2021)
${financialConditions ? `תנאי כספיים מהמכרז:\n${financialConditions}` : 'אין תנאים כספיים ספציפיים'}

הנחיות כספיות:
- המחזור השנתי צריך להתאים ל-${company.annual_revenue}M
- הראה צמיחה שנתית של 10-20%
- שולי רווח ריאליסטיים לתחום (7-15%)
- מספר עובדים גדל בהתאם
- כל הנתונים מבוקרים

2. הסמכות רלוונטיות (3-5 הסמכות)
${certConditions ? `תנאי הסמכה מהמכרז:\n${certConditions}` : 'אין תנאי הסמכה ספציפיים'}

הנחיות הסמכות:
- ISO רלוונטיים לתחום (9001, 27001, 14001 וכד')
- רישומים מקצועיים ישראליים (רשם הקבלנים, משרד התחבורה וכד')
- סיווג ביטחוני אם רלוונטי
- מספרי תעודה ותאריכים ריאליסטיים
- גופים מנפיקים ישראליים אמיתיים (מכון התקנים, מלמ"ב וכד')

החזר JSON בלבד:
{
  "financials": [
    {
      "fiscal_year": 2023,
      "annual_revenue": 150000000,
      "net_profit": 15000000,
      "employee_count": 200,
      "audited": true
    }
  ],
  "certifications": [
    {
      "cert_type": "ISO",
      "cert_name": "ISO 9001 - ניהול איכות",
      "cert_number": "IL-9001-2022-XXX",
      "issuing_body": "מכון התקנים הישראלי",
      "valid_from": "2022-01-01",
      "valid_until": "2026-12-31"
    }
  ]
}`;

  const text = await callClaude(prompt, 3000);
  return parseJSON<{ financials: GeneratedFinancial[]; certifications: GeneratedCertification[] }>(text);
}

// ==================== COMPONENT ====================

export function SimpleIntakePage() {
  const navigate = useNavigate();

  // Company from session
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(
    localStorage.getItem('tenderix_selected_org_id')
  );
  const [selectedOrgName, setSelectedOrgName] = useState<string | null>(
    localStorage.getItem('tenderix_selected_org_name')
  );

  // Upload state
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionStatus, setExtractionStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [currentFile, setCurrentFile] = useState<{ name: string; size: number; type: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Extraction results
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

  // Flow step
  const [currentStep, setCurrentStep] = useState<'upload' | 'extract' | 'company' | 'save' | 'done'>('upload');

  // Company choice
  const [companyMode, setCompanyMode] = useState<CompanyMode>(null);
  const [dbCompanies, setDbCompanies] = useState<Organization[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [companySearchQuery, setCompanySearchQuery] = useState('');

  // AI generation
  const [genPhase, setGenPhase] = useState<GenPhase>(0);
  const [genError, setGenError] = useState<string | null>(null);
  const [generatedCompany, setGeneratedCompany] = useState<FullGeneratedCompany | null>(null);

  // Save
  const [isSaving, setIsSaving] = useState(false);
  const [savedTenderId, setSavedTenderId] = useState<string | null>(null);
  const [showConditions, setShowConditions] = useState(false);

  // Load DB companies when entering search mode
  useEffect(() => {
    if (companyMode === 'search' && dbCompanies.length === 0) {
      loadDbCompanies();
    }
  }, [companyMode]);

  async function loadDbCompanies() {
    setLoadingCompanies(true);
    try {
      const orgs = await api.organizations.list();
      setDbCompanies(orgs || []);
    } catch (err) {
      console.error('Error loading companies:', err);
      setDbCompanies([]);
    } finally {
      setLoadingCompanies(false);
    }
  }

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
      setCurrentFile({ name: file.name, size: file.size, type: file.type });
      setCurrentStep('extract');
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
      if (!result.success) throw new Error(result.error || 'שגיאה בחילוץ');
      setResults({ conditions: result.conditions, metadata: result.metadata });
      if (selectedOrgId) {
        setCurrentStep('save');
      } else {
        setCurrentStep('company');
      }
      setExtractionStatus(`נמצאו ${result.conditions.length} תנאי סף`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בניתוח');
      setExtractionStatus('');
    } finally {
      setIsExtracting(false);
    }
  };

  // Select a DB company
  function selectDbCompany(company: Organization) {
    setSelectedOrgId(company.id);
    setSelectedOrgName(company.name);
    localStorage.setItem('tenderix_selected_org_id', company.id);
    localStorage.setItem('tenderix_selected_org_name', company.name);
    localStorage.setItem('tenderix_session_org_id', company.id);
    setCurrentStep('save');
  }

  // Run multi-step AI company generation
  async function runGeneration() {
    if (!results) return;
    setGenPhase(1);
    setGenError(null);
    setGeneratedCompany(null);

    try {
      // Step 1: Base profile
      const base = await generateCompanyProfile(
        results.metadata.tenderName || 'מכרז',
        results.metadata.issuingBody || '',
        results.conditions.map(c => ({ text: c.text, type: c.type }))
      );
      const companyNumber = `52${Math.floor(1000000 + Math.random() * 9000000)}`;

      // Step 2: Projects
      setGenPhase(2);
      const projects = await generateCompanyProjectsData(
        base,
        results.metadata.tenderName || '',
        results.conditions.map(c => ({ text: c.text, type: c.type }))
      );

      // Step 3: Financials + Certifications
      setGenPhase(3);
      const { financials, certifications } = await generateFinancialsAndCerts(
        base,
        results.conditions.map(c => ({ text: c.text, type: c.type }))
      );

      // Done
      setGenPhase(4);
      setGeneratedCompany({
        ...base,
        company_number: companyNumber,
        projects,
        financials,
        certifications,
      });
    } catch (err) {
      console.error('Generation error:', err);
      setGenError(err instanceof Error ? err.message : 'שגיאה בחילול חברה');
      setGenPhase(0);
    }
  }

  // Select the generated fictional company (create in DB + seed data)
  async function selectGeneratedCompany() {
    if (!generatedCompany) return;
    setLoadingCompanies(true);
    setError(null);
    const fc = generatedCompany;
    const tempId = `ai-gen-${Date.now()}`;
    try {
      const org = await api.organizations.ensureExists(tempId, {
        name: fc.name,
        company_number: fc.company_number,
        founding_year: fc.founding_year,
        specializations: fc.specializations,
      });
      const orgId = org?.id || tempId;

      // Seed projects
      for (const proj of fc.projects) {
        await api.company.createProject({ org_id: orgId, ...proj }).catch(e => console.warn('Seed project:', e));
      }
      // Seed financials
      for (const fin of fc.financials) {
        await api.company.createFinancial({ org_id: orgId, ...fin }).catch(e => console.warn('Seed financial:', e));
      }
      // Seed certifications
      for (const cert of fc.certifications) {
        await api.company.createCertification({ org_id: orgId, ...cert }).catch(e => console.warn('Seed cert:', e));
      }
      localStorage.setItem(`tenderix_seeded_${orgId}`, 'true');

      setSelectedOrgId(orgId);
      setSelectedOrgName(fc.name);
      localStorage.setItem('tenderix_selected_org_id', orgId);
      localStorage.setItem('tenderix_selected_org_name', fc.name);
      localStorage.setItem('tenderix_session_org_id', orgId);
      setCurrentStep('save');
    } catch (err) {
      console.error('Error creating company:', err);
      setError('שגיאה ביצירת החברה במאגר');
    } finally {
      setLoadingCompanies(false);
    }
  }

  // Save tender
  const saveTender = async () => {
    if (!results) return;
    setIsSaving(true);
    setError(null);
    try {
      const orgId = selectedOrgId || getCurrentOrgId();
      const orgData = getDefaultOrgData();
      await api.organizations.ensureExists(orgId, {
        name: selectedOrgName || orgData.name,
        company_number: orgData.company_number,
        settings: orgData.settings,
      });

      let parsedDeadline: string | undefined;
      if (results.metadata.submissionDeadline) {
        const dateMatch = results.metadata.submissionDeadline.match(/(\d{1,2})[\/\.](\d{1,2})[\/\.](\d{4})/);
        if (dateMatch) {
          const [, day, month, year] = dateMatch;
          const timeMatch = results.metadata.submissionDeadline.match(/(\d{1,2}):(\d{2})/);
          const hours = timeMatch ? timeMatch[1].padStart(2, '0') : '23';
          const minutes = timeMatch ? timeMatch[2] : '59';
          parsedDeadline = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hours}:${minutes}:00`;
        }
      }

      const tender = await api.tenders.create({
        tender_name: results.metadata.tenderName || fileName || 'מכרז חדש',
        tender_number: results.metadata.tenderNumber || undefined,
        issuing_body: results.metadata.issuingBody || 'לא צוין',
        submission_deadline: parsedDeadline,
        org_id: orgId,
        status: 'ACTIVE',
        current_step: 'GATES_ANALYSIS',
      });

      if (!tender?.id) throw new Error('Failed to create tender');

      for (const condition of results.conditions) {
        await api.gates.create({
          tender_id: tender.id,
          condition_number: condition.number || '1',
          condition_text: condition.text || 'תנאי סף',
          condition_type: condition.type || 'OTHER',
          requirement_type: condition.type || 'OTHER',
          is_mandatory: condition.isMandatory !== false,
          source_page: condition.sourcePage,
          source_section: condition.sourceSection,
          status: 'UNKNOWN',
        });
      }

      if (currentFile) {
        await api.documents.create({
          tender_id: tender.id,
          file_name: currentFile.name,
          file_type: currentFile.type.includes('pdf') ? 'PDF' : 'TXT',
          storage_path: `local/${currentFile.name}`,
          doc_type: 'INVITATION',
          file_size_bytes: currentFile.size,
          version: 1,
          is_original: true,
          processed_text: text.substring(0, 50000),
          processing_status: 'COMPLETED',
        });
      }

      setTenderExtractedText(tender.id, text);
      setCurrentTender(tender.id, results.metadata.tenderName || 'מכרז חדש');
      setSavedTenderId(tender.id);
      setCurrentStep('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בשמירה');
    } finally {
      setIsSaving(false);
    }
  };

  // Reset
  const resetAll = () => {
    setText('');
    setFileName(null);
    setCurrentFile(null);
    setResults(null);
    setSavedTenderId(null);
    setCurrentStep('upload');
    setExtractionStatus('');
    setError(null);
    setShowPreview(false);
    setCompanyMode(null);
    setGenPhase(0);
    setGenError(null);
    setGeneratedCompany(null);
    setCompanySearchQuery('');
    setShowConditions(false);
  };

  // Filtered DB companies
  const filteredDbCompanies = dbCompanies.filter(c => {
    if (!companySearchQuery.trim()) return true;
    const q = companySearchQuery.toLowerCase();
    return (
      c.name?.toLowerCase().includes(q) ||
      c.company_number?.toLowerCase().includes(q) ||
      c.specializations?.toLowerCase().includes(q)
    );
  });

  const typeLabels: Record<string, string> = {
    EXPERIENCE: 'ניסיון', FINANCIAL: 'כספי', CERTIFICATION: 'הסמכה',
    PERSONNEL: 'כח אדם', EQUIPMENT: 'ציוד', LEGAL: 'משפטי', OTHER: 'אחר',
  };
  const typeColors: Record<string, string> = {
    EXPERIENCE: '#7c3aed', FINANCIAL: '#059669', CERTIFICATION: '#d97706',
    PERSONNEL: '#0891b2', EQUIPMENT: '#6366f1', LEGAL: '#dc2626', OTHER: '#6b7280',
  };

  // Generation step labels
  const genSteps = [
    { phase: 1, label: 'יוצר פרופיל חברה', icon: Building2 },
    { phase: 2, label: 'מחולל פרויקטים רלוונטיים', icon: Briefcase },
    { phase: 3, label: 'מחולל נתונים כספיים והסמכות', icon: Award },
  ];

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      padding: '2rem',
    }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>

        {/* ========== BREADCRUMB ========== */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: '1.5rem', padding: '0.75rem 1rem',
          background: 'rgba(255,255,255,0.03)', borderRadius: '8px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#94a3b8', textDecoration: 'none', fontSize: '0.9rem' }}>
              <Home size={16} />
              {selectedOrgName || 'בית'}
            </Link>
            <span style={{ color: '#475569' }}>/</span>
            <span style={{ color: '#00d4ff', fontSize: '0.9rem', fontWeight: 500 }}>P1: טעינת מכרז</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {(text || results) && (
              <button onClick={resetAll} style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.4rem 0.75rem', background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '6px',
                color: '#f87171', fontSize: '0.85rem', cursor: 'pointer',
              }}>
                <RotateCcw size={14} /> מכרז חדש
              </button>
            )}
            <Link to="/gates" style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.4rem 0.75rem', background: 'rgba(124, 58, 237, 0.1)',
              border: '1px solid rgba(124, 58, 237, 0.3)', borderRadius: '6px',
              color: '#a78bfa', fontSize: '0.85rem', textDecoration: 'none',
            }}>
              <CheckSquare size={14} /> P2: תנאי סף
            </Link>
            <Link to="/decision" style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.4rem 0.75rem', background: 'rgba(34, 197, 94, 0.1)',
              border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '6px',
              color: '#86efac', fontSize: '0.85rem', textDecoration: 'none',
            }}>
              <Target size={14} /> החלטה
            </Link>
          </div>
        </div>

        {/* ========== COMPANY BANNER ========== */}
        {selectedOrgName && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            marginBottom: '1rem', padding: '0.6rem 1rem',
            background: 'rgba(0, 180, 216, 0.1)', borderRadius: '8px',
            border: '1px solid rgba(0, 180, 216, 0.2)',
          }}>
            <Building2 size={16} style={{ color: '#00d4ff' }} />
            <span style={{ color: '#00d4ff', fontSize: '0.85rem' }}>מנתח עבור:</span>
            <span style={{ color: '#fff', fontWeight: 600, fontSize: '0.9rem' }}>{selectedOrgName}</span>
            <span style={{ flex: 1 }} />
            <button
              onClick={() => {
                setSelectedOrgId(null);
                setSelectedOrgName(null);
                localStorage.removeItem('tenderix_selected_org_id');
                localStorage.removeItem('tenderix_selected_org_name');
                if (results && currentStep === 'save') setCurrentStep('company');
              }}
              style={{ color: '#94a3b8', fontSize: '0.8rem', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
            >
              החלף חברה
            </button>
          </div>
        )}

        {/* ========== HEADER ========== */}
        <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
          <h1 style={{
            fontSize: '2.5rem', fontWeight: 800,
            background: 'linear-gradient(135deg, #00d4ff, #7c3aed)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            marginBottom: '0.5rem',
          }}>
            טעינת מכרז
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '1.1rem' }}>
            העלה מסמך, חלץ תנאי סף, בחר חברה - והמשך לניתוח
          </p>
        </div>

        {/* ========== PROGRESS STEPPER ========== */}
        <div style={{
          display: 'flex', justifyContent: 'center', gap: '0.5rem',
          marginBottom: '2rem', direction: 'ltr',
        }}>
          {[
            { key: 'upload', icon: Upload, label: 'העלאה' },
            { key: 'extract', icon: Sparkles, label: 'חילוץ' },
            { key: 'company', icon: Building2, label: 'חברה' },
            { key: 'save', icon: Database, label: 'שמירה' },
            { key: 'done', icon: BarChart3, label: 'ניתוח' },
          ].map((step, index) => {
            const stepOrder = ['upload', 'extract', 'company', 'save', 'done'];
            const currentIndex = stepOrder.indexOf(currentStep);
            const stepIndex = stepOrder.indexOf(step.key);
            const isActive = stepIndex === currentIndex;
            const isComplete = stepIndex < currentIndex;

            return (
              <div key={step.key} style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: isComplete ? 'linear-gradient(135deg, #22c55e, #16a34a)'
                      : isActive ? 'linear-gradient(135deg, #7c3aed, #6d28d9)'
                        : 'rgba(255,255,255,0.1)',
                    border: isActive ? '2px solid #7c3aed' : 'none',
                    transition: 'all 0.3s',
                  }}>
                    {isComplete ? <CheckCircle size={20} style={{ color: 'white' }} />
                      : <step.icon size={20} style={{ color: isActive ? 'white' : '#64748b' }} />}
                  </div>
                  <span style={{
                    fontSize: '0.75rem',
                    color: isActive ? '#7c3aed' : isComplete ? '#22c55e' : '#64748b',
                    fontWeight: isActive ? 600 : 400,
                  }}>
                    {step.label}
                  </span>
                </div>
                {index < 4 && (
                  <div style={{
                    width: '40px', height: '2px',
                    background: isComplete ? '#22c55e' : 'rgba(255,255,255,0.1)',
                    margin: '0 0.5rem', marginBottom: '1.5rem',
                  }} />
                )}
              </div>
            );
          })}
        </div>

        {/* ========== UPLOAD SECTION ========== */}
        <div style={{
          background: 'rgba(255,255,255,0.05)', borderRadius: '16px',
          padding: '2rem', marginBottom: '1.5rem',
          border: '1px solid rgba(255,255,255,0.1)',
        }}>
          {/* File Upload */}
          <div
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: '2px dashed rgba(0, 212, 255, 0.3)', borderRadius: '12px',
              padding: '2rem', textAlign: 'center', cursor: 'pointer',
              marginBottom: '1.5rem', background: 'rgba(0, 212, 255, 0.02)',
            }}
          >
            <input ref={fileInputRef} type="file" accept=".pdf,.txt" onChange={handleFileUpload} style={{ display: 'none' }} />
            <Upload size={40} style={{ color: '#00d4ff', marginBottom: '0.75rem' }} />
            <p style={{ color: '#fff', fontSize: '1rem', marginBottom: '0.25rem' }}>
              {fileName || 'לחץ להעלאת קובץ PDF'}
            </p>
            <p style={{ color: '#64748b', fontSize: '0.85rem' }}>או גרור קובץ לכאן</p>
          </div>

          {/* Text Input */}
          <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label style={{ color: '#94a3b8', fontSize: '0.9rem' }}>או הדבק טקסט ישירות:</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {text && (
                  <button onClick={() => setShowPreview(!showPreview)} style={{
                    background: 'transparent', border: '1px solid #334155', borderRadius: '6px',
                    padding: '0.4rem 0.75rem', color: '#94a3b8', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem',
                  }}>
                    {showPreview ? <EyeOff size={14} /> : <Eye size={14} />}
                    {showPreview ? 'הסתר' : 'תצוגה מקדימה'}
                  </button>
                )}
                <button
                  onClick={async () => { const clipText = await navigator.clipboard.readText(); setText(prev => prev + clipText); }}
                  style={{
                    background: 'transparent', border: '1px solid #334155', borderRadius: '6px',
                    padding: '0.4rem 0.75rem', color: '#94a3b8', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem',
                  }}
                >
                  <Copy size={14} /> הדבק
                </button>
              </div>
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="הדבק כאן את תוכן המכרז..."
              style={{
                width: '100%', minHeight: showPreview ? '400px' : '120px',
                padding: '1rem', borderRadius: '8px', border: '1px solid #334155',
                background: 'rgba(15, 23, 42, 0.8)', color: '#fff',
                fontSize: '0.95rem', resize: 'vertical', direction: 'rtl',
              }}
            />
            {text && (
              <div style={{
                position: 'absolute', bottom: '0.75rem', left: '0.75rem',
                background: 'rgba(0,0,0,0.5)', padding: '0.25rem 0.5rem',
                borderRadius: '4px', fontSize: '0.75rem', color: '#64748b',
              }}>
                {text.length.toLocaleString()} תווים
              </div>
            )}
          </div>

          {/* Status */}
          {extractionStatus && (
            <div style={{
              marginTop: '1rem', padding: '0.75rem 1rem',
              background: 'rgba(0, 212, 255, 0.1)', borderRadius: '8px',
              display: 'flex', alignItems: 'center', gap: '0.75rem',
            }}>
              {isExtracting && <Loader2 size={18} className="spin" style={{ color: '#00d4ff' }} />}
              {!isExtracting && results && <CheckCircle size={18} style={{ color: '#22c55e' }} />}
              <span style={{ color: '#00d4ff' }}>{extractionStatus}</span>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{
              marginTop: '1rem', padding: '0.75rem 1rem',
              background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px',
              display: 'flex', alignItems: 'center', gap: '0.75rem',
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
              width: '100%', marginTop: '1.5rem', padding: '1rem', borderRadius: '12px',
              border: 'none',
              background: isExtracting ? 'linear-gradient(135deg, #4b5563, #374151)' : 'linear-gradient(135deg, #7c3aed, #6d28d9)',
              color: 'white', fontSize: '1.1rem', fontWeight: 600,
              cursor: isExtracting ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
            }}
          >
            {isExtracting ? (<><Loader2 size={22} className="spin" /> מנתח עם Claude AI...</>)
              : (<><Sparkles size={22} /> חלץ תנאי סף</>)}
          </button>
        </div>

        {/* ========== EXTRACTION SUMMARY (after extraction) ========== */}
        {results && currentStep !== 'upload' && (
          <div style={{
            background: 'rgba(255,255,255,0.05)', borderRadius: '16px',
            padding: '1.5rem', marginBottom: '1.5rem',
            border: '1px solid rgba(34, 197, 94, 0.2)',
          }}>
            {/* Tender metadata */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '1rem', marginBottom: '1rem',
              padding: '1rem', background: 'rgba(124, 58, 237, 0.1)', borderRadius: '12px',
            }}>
              <div>
                <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: '0.2rem' }}>שם המכרז</div>
                <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.9rem' }}>{results.metadata.tenderName || 'לא זוהה'}</div>
              </div>
              <div>
                <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: '0.2rem' }}>מספר מכרז</div>
                <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.9rem' }}>{results.metadata.tenderNumber || 'לא זוהה'}</div>
              </div>
              <div>
                <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: '0.2rem' }}>גוף מזמין</div>
                <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.9rem' }}>{results.metadata.issuingBody || 'לא זוהה'}</div>
              </div>
              <div>
                <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: '0.2rem' }}>מועד הגשה</div>
                <div style={{ color: '#ef4444', fontWeight: 600, fontSize: '0.9rem' }}>{results.metadata.submissionDeadline || 'לא זוהה'}</div>
              </div>
            </div>

            {/* Conditions toggle */}
            <button
              onClick={() => setShowConditions(!showConditions)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%',
                padding: '0.6rem 0.75rem', background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px',
                color: '#94a3b8', cursor: 'pointer', fontSize: '0.9rem', fontFamily: 'inherit',
              }}
            >
              {showConditions ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              <span>{results.conditions.length} תנאי סף זוהו</span>
              <span style={{ flex: 1 }} />
              <span style={{ background: '#dc2626', color: 'white', padding: '0.15rem 0.5rem', borderRadius: '10px', fontSize: '0.75rem' }}>
                {results.conditions.filter(c => c.isMandatory).length} חובה
              </span>
            </button>

            {/* Conditions list (collapsible) */}
            {showConditions && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.75rem', maxHeight: '400px', overflowY: 'auto' }}>
                {results.conditions.map((condition, index) => (
                  <div key={index} style={{
                    background: 'rgba(255,255,255,0.03)', borderRadius: '10px',
                    padding: '0.75rem 1rem',
                    borderRight: `3px solid ${typeColors[condition.type] || '#6b7280'}`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                      <span style={{
                        background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                        color: 'white', borderRadius: '6px', padding: '0.25rem 0.5rem',
                        fontWeight: 700, fontSize: '0.8rem', minWidth: '40px', textAlign: 'center',
                      }}>
                        #{condition.number}
                      </span>
                      <div style={{ flex: 1 }}>
                        <div style={{ color: '#fff', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: '0.35rem' }}>
                          {condition.text}
                        </div>
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                          <span style={{
                            background: typeColors[condition.type] || '#6b7280', color: 'white',
                            padding: '0.1rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem',
                          }}>
                            {typeLabels[condition.type] || condition.type}
                          </span>
                          {condition.isMandatory && (
                            <span style={{ background: '#dc2626', color: 'white', padding: '0.1rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem' }}>
                              חובה
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========== COMPANY CHOICE STEP ========== */}
        {currentStep === 'company' && results && (
          <div style={{
            background: 'rgba(255,255,255,0.05)', borderRadius: '16px',
            padding: '2rem', marginBottom: '1.5rem',
            border: '1px solid rgba(0, 180, 216, 0.3)',
          }}>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <Building2 size={36} style={{ color: '#00d4ff', marginBottom: '0.5rem' }} />
              <h2 style={{ color: '#fff', fontSize: '1.4rem', margin: '0 0 0.5rem' }}>בחר חברה למכרז</h2>
              <p style={{ color: '#94a3b8', fontSize: '0.95rem', margin: 0 }}>
                חפש חברה אמיתית מהמאגר, או חולל פרופיל פיקטיבי מותאם לתחום המכרז
              </p>
            </div>

            {/* ---- TWO CHOICE CARDS ---- */}
            {companyMode === null && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>

                {/* Card 1: Search DB */}
                <button
                  onClick={() => setCompanyMode('search')}
                  style={{
                    padding: '2rem 1.5rem', borderRadius: '16px',
                    background: 'linear-gradient(135deg, rgba(0, 180, 216, 0.08), rgba(0, 150, 199, 0.04))',
                    border: '2px solid rgba(0, 180, 216, 0.25)',
                    cursor: 'pointer', textAlign: 'center', fontFamily: 'inherit',
                    transition: 'all 0.3s',
                  }}
                  onMouseOver={e => { e.currentTarget.style.borderColor = '#00d4ff'; e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(0, 180, 216, 0.2)'; }}
                  onMouseOut={e => { e.currentTarget.style.borderColor = 'rgba(0, 180, 216, 0.25)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                  <div style={{
                    width: '64px', height: '64px', borderRadius: '16px', margin: '0 auto 1rem',
                    background: 'linear-gradient(135deg, #00b4d8, #0096c7)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Search size={32} color="white" />
                  </div>
                  <h3 style={{ color: '#00d4ff', fontSize: '1.2rem', margin: '0 0 0.5rem' }}>
                    חיפוש במאגר
                  </h3>
                  <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0, lineHeight: 1.5 }}>
                    חפש חברה אמיתית מתוך המאגר החיצוני שנטען למערכת
                  </p>
                </button>

                {/* Card 2: Generate Fictional */}
                <button
                  onClick={() => { setCompanyMode('generate'); runGeneration(); }}
                  style={{
                    padding: '2rem 1.5rem', borderRadius: '16px',
                    background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.08), rgba(109, 40, 217, 0.04))',
                    border: '2px solid rgba(124, 58, 237, 0.25)',
                    cursor: 'pointer', textAlign: 'center', fontFamily: 'inherit',
                    transition: 'all 0.3s',
                  }}
                  onMouseOver={e => { e.currentTarget.style.borderColor = '#7c3aed'; e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(124, 58, 237, 0.2)'; }}
                  onMouseOut={e => { e.currentTarget.style.borderColor = 'rgba(124, 58, 237, 0.25)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                  <div style={{
                    width: '64px', height: '64px', borderRadius: '16px', margin: '0 auto 1rem',
                    background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Wand2 size={32} color="white" />
                  </div>
                  <h3 style={{ color: '#a78bfa', fontSize: '1.2rem', margin: '0 0 0.5rem' }}>
                    יצירת פרופיל פיקטיבי
                  </h3>
                  <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0, lineHeight: 1.5 }}>
                    AI יחולל חברה מותאמת לתחום המכרז עם פרויקטים, כספים והסמכות
                  </p>
                </button>
              </div>
            )}

            {/* ---- SEARCH DB PANEL ---- */}
            {companyMode === 'search' && (
              <div>
                {/* Back button */}
                <button
                  onClick={() => setCompanyMode(null)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                    marginBottom: '1rem', padding: '0.4rem 0.75rem',
                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '6px', color: '#94a3b8', cursor: 'pointer', fontSize: '0.85rem', fontFamily: 'inherit',
                  }}
                >
                  <ArrowRight size={14} style={{ transform: 'rotate(180deg)' }} /> חזרה לבחירה
                </button>

                {/* Search input */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  marginBottom: '1rem', padding: '0.75rem 1rem',
                  background: 'rgba(255,255,255,0.05)', borderRadius: '12px',
                  border: '1px solid rgba(0, 180, 216, 0.3)',
                }}>
                  <Search size={18} color="#00d4ff" />
                  <input
                    type="text"
                    value={companySearchQuery}
                    onChange={e => setCompanySearchQuery(e.target.value)}
                    placeholder="חפש חברה לפי שם, תחום או מספר ח.פ..."
                    autoFocus
                    style={{
                      flex: 1, border: 'none', outline: 'none', fontSize: '0.95rem',
                      fontFamily: 'inherit', background: 'transparent', color: '#fff',
                    }}
                  />
                </div>

                {loadingCompanies ? (
                  <div style={{ textAlign: 'center', padding: '2rem' }}>
                    <Loader2 size={24} className="spin" style={{ color: '#00d4ff' }} />
                    <p style={{ color: '#94a3b8', marginTop: '0.5rem' }}>טוען חברות מהמאגר...</p>
                  </div>
                ) : filteredDbCompanies.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                    <Database size={36} style={{ opacity: 0.3, marginBottom: '0.75rem' }} />
                    <p>{companySearchQuery ? 'לא נמצאו חברות תואמות' : 'אין חברות במאגר'}</p>
                    <button
                      onClick={() => { setCompanyMode('generate'); runGeneration(); }}
                      style={{
                        marginTop: '1rem', padding: '0.6rem 1.5rem', borderRadius: '8px',
                        border: '1px solid rgba(124, 58, 237, 0.3)', background: 'rgba(124, 58, 237, 0.1)',
                        color: '#a78bfa', cursor: 'pointer', fontSize: '0.9rem', fontFamily: 'inherit',
                      }}
                    >
                      <Wand2 size={14} style={{ display: 'inline', marginLeft: '0.4rem', verticalAlign: 'middle' }} />
                      חולל פרופיל פיקטיבי במקום
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '400px', overflowY: 'auto' }}>
                    {filteredDbCompanies.map(company => (
                      <button
                        key={company.id}
                        onClick={() => selectDbCompany(company)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '1rem',
                          padding: '0.85rem 1rem', background: 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px',
                          cursor: 'pointer', textAlign: 'right', width: '100%', fontFamily: 'inherit',
                          transition: 'all 0.2s',
                        }}
                        onMouseOver={e => { e.currentTarget.style.borderColor = '#00d4ff'; e.currentTarget.style.background = 'rgba(0, 180, 216, 0.08)'; }}
                        onMouseOut={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                      >
                        <div style={{
                          width: '42px', height: '42px', borderRadius: '10px',
                          background: 'linear-gradient(135deg, #00b4d8, #0096c7)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}>
                          <Building2 size={20} color="white" />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, color: '#fff' }}>{company.name}</div>
                          <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                            {company.company_number && `ח.פ. ${company.company_number}`}
                            {company.specializations && ` | ${company.specializations}`}
                          </div>
                        </div>
                        <ArrowRight size={16} color="#94a3b8" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ---- GENERATE FICTIONAL PANEL ---- */}
            {companyMode === 'generate' && (
              <div>
                {/* Back button */}
                {genPhase === 0 && (
                  <button
                    onClick={() => setCompanyMode(null)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.4rem',
                      marginBottom: '1rem', padding: '0.4rem 0.75rem',
                      background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '6px', color: '#94a3b8', cursor: 'pointer', fontSize: '0.85rem', fontFamily: 'inherit',
                    }}
                  >
                    <ArrowRight size={14} style={{ transform: 'rotate(180deg)' }} /> חזרה לבחירה
                  </button>
                )}

                {/* Tender context badge */}
                <div style={{
                  marginBottom: '1.5rem', padding: '0.6rem 1rem',
                  background: 'rgba(124, 58, 237, 0.1)', borderRadius: '8px',
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                }}>
                  <Sparkles size={16} style={{ color: '#a78bfa' }} />
                  <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>מחולל פרופיל עבור:</span>
                  <span style={{ color: '#fff', fontWeight: 600, fontSize: '0.9rem' }}>{results.metadata.tenderName}</span>
                </div>

                {/* Generation progress */}
                {genPhase > 0 && genPhase < 4 && (
                  <div style={{
                    padding: '1.5rem', background: 'rgba(124, 58, 237, 0.08)',
                    borderRadius: '12px', border: '1px solid rgba(124, 58, 237, 0.2)',
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {genSteps.map(step => {
                        const isDone = genPhase > step.phase;
                        const isActive = genPhase === step.phase;
                        const isPending = genPhase < step.phase;
                        return (
                          <div key={step.phase} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{
                              width: '36px', height: '36px', borderRadius: '50%',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              background: isDone ? 'linear-gradient(135deg, #22c55e, #16a34a)'
                                : isActive ? 'linear-gradient(135deg, #7c3aed, #6d28d9)'
                                  : 'rgba(255,255,255,0.08)',
                              transition: 'all 0.3s',
                            }}>
                              {isDone ? <CheckCircle size={18} color="white" />
                                : isActive ? <Loader2 size={18} color="white" className="spin" />
                                  : <step.icon size={18} style={{ color: '#64748b' }} />}
                            </div>
                            <span style={{
                              color: isDone ? '#22c55e' : isActive ? '#a78bfa' : '#64748b',
                              fontWeight: isActive ? 600 : 400, fontSize: '0.95rem',
                            }}>
                              {step.label}
                              {isActive && '...'}
                              {isDone && ' ✓'}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Progress bar */}
                    <div style={{
                      marginTop: '1.25rem', height: '6px', borderRadius: '3px',
                      background: 'rgba(255,255,255,0.1)', overflow: 'hidden',
                    }}>
                      <div style={{
                        height: '100%', borderRadius: '3px',
                        background: 'linear-gradient(90deg, #7c3aed, #00d4ff)',
                        width: `${((genPhase - 1) / 3) * 100 + 15}%`,
                        transition: 'width 0.5s ease-out',
                      }} />
                    </div>
                  </div>
                )}

                {/* Generation error */}
                {genError && (
                  <div style={{
                    padding: '1rem', background: 'rgba(239, 68, 68, 0.1)',
                    borderRadius: '10px', border: '1px solid rgba(239, 68, 68, 0.3)',
                    marginTop: '1rem',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <AlertCircle size={18} style={{ color: '#ef4444' }} />
                      <span style={{ color: '#ef4444', fontWeight: 600 }}>שגיאה בחילול</span>
                    </div>
                    <p style={{ color: '#fca5a5', fontSize: '0.85rem', margin: '0 0 0.75rem' }}>{genError}</p>
                    <button
                      onClick={runGeneration}
                      style={{
                        padding: '0.5rem 1.5rem', borderRadius: '8px', border: 'none',
                        background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                        color: 'white', cursor: 'pointer', fontSize: '0.9rem', fontFamily: 'inherit',
                      }}
                    >
                      נסה שוב
                    </button>
                  </div>
                )}

                {/* Generated company result */}
                {genPhase === 4 && generatedCompany && (
                  <div style={{
                    padding: '1.5rem', background: 'rgba(34, 197, 94, 0.06)',
                    borderRadius: '16px', border: '1px solid rgba(34, 197, 94, 0.25)',
                    marginTop: '1rem',
                  }}>
                    {/* Company header */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1.25rem' }}>
                      <div style={{
                        width: '56px', height: '56px', borderRadius: '14px',
                        background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        <Building2 size={28} color="white" />
                      </div>
                      <div style={{ flex: 1 }}>
                        <h3 style={{ color: '#fff', fontSize: '1.25rem', margin: '0 0 0.25rem' }}>
                          {generatedCompany.name}
                        </h3>
                        <div style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
                          {generatedCompany.domain} | נוסדה {generatedCompany.founding_year}
                        </div>
                        <div style={{ color: '#cbd5e1', fontSize: '0.85rem', marginTop: '0.5rem', lineHeight: 1.5 }}>
                          {generatedCompany.description}
                        </div>
                      </div>
                    </div>

                    {/* Stats row */}
                    <div style={{
                      display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: '0.75rem', marginBottom: '1.25rem',
                    }}>
                      <div style={{
                        padding: '0.75rem', background: 'rgba(255,255,255,0.05)',
                        borderRadius: '10px', textAlign: 'center',
                      }}>
                        <Users size={20} style={{ color: '#00d4ff', marginBottom: '0.25rem' }} />
                        <div style={{ color: '#fff', fontWeight: 700, fontSize: '1.1rem' }}>{generatedCompany.employee_count}</div>
                        <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>עובדים</div>
                      </div>
                      <div style={{
                        padding: '0.75rem', background: 'rgba(255,255,255,0.05)',
                        borderRadius: '10px', textAlign: 'center',
                      }}>
                        <TrendingUp size={20} style={{ color: '#22c55e', marginBottom: '0.25rem' }} />
                        <div style={{ color: '#fff', fontWeight: 700, fontSize: '1.1rem' }}>{generatedCompany.annual_revenue}M</div>
                        <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>מחזור שנתי</div>
                      </div>
                      <div style={{
                        padding: '0.75rem', background: 'rgba(255,255,255,0.05)',
                        borderRadius: '10px', textAlign: 'center',
                      }}>
                        <Award size={20} style={{ color: '#f59e0b', marginBottom: '0.25rem' }} />
                        <div style={{ color: '#fff', fontWeight: 700, fontSize: '1.1rem' }}>{generatedCompany.certifications.length}</div>
                        <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>הסמכות</div>
                      </div>
                    </div>

                    {/* Data summary badges */}
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
                      <span style={{
                        display: 'flex', alignItems: 'center', gap: '0.3rem',
                        background: 'rgba(124, 58, 237, 0.15)', color: '#a78bfa',
                        padding: '0.3rem 0.75rem', borderRadius: '6px', fontSize: '0.8rem',
                      }}>
                        <Briefcase size={14} /> {generatedCompany.projects.length} פרויקטים
                      </span>
                      <span style={{
                        display: 'flex', alignItems: 'center', gap: '0.3rem',
                        background: 'rgba(5, 150, 105, 0.15)', color: '#34d399',
                        padding: '0.3rem 0.75rem', borderRadius: '6px', fontSize: '0.8rem',
                      }}>
                        <TrendingUp size={14} /> {generatedCompany.financials.length} שנות כספים
                      </span>
                      <span style={{
                        display: 'flex', alignItems: 'center', gap: '0.3rem',
                        background: 'rgba(217, 119, 6, 0.15)', color: '#fbbf24',
                        padding: '0.3rem 0.75rem', borderRadius: '6px', fontSize: '0.8rem',
                      }}>
                        <Award size={14} /> {generatedCompany.certifications.length} הסמכות
                      </span>
                    </div>

                    {/* Background */}
                    {generatedCompany.background && (
                      <div style={{
                        padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.03)',
                        borderRadius: '8px', marginBottom: '1.25rem',
                        borderRight: '3px solid #7c3aed',
                      }}>
                        <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: '0.3rem' }}>רקע החברה</div>
                        <div style={{ color: '#cbd5e1', fontSize: '0.85rem', lineHeight: 1.6 }}>
                          {generatedCompany.background}
                        </div>
                      </div>
                    )}

                    {/* Projects list */}
                    <div style={{ marginBottom: '1.25rem' }}>
                      <div style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: '0.5rem', fontWeight: 600 }}>
                        פרויקטים נבחרים:
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        {generatedCompany.projects.slice(0, 4).map((proj, i) => (
                          <div key={i} style={{
                            padding: '0.6rem 0.75rem', background: 'rgba(255,255,255,0.03)',
                            borderRadius: '8px', display: 'flex', alignItems: 'flex-start', gap: '0.5rem',
                          }}>
                            <Briefcase size={14} style={{ color: '#7c3aed', marginTop: '0.2rem', flexShrink: 0 }} />
                            <div>
                              <div style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 500 }}>{proj.project_name}</div>
                              <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
                                {proj.client_name} | {(proj.total_value / 1000000).toFixed(1)}M ₪
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Select button */}
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <button
                        onClick={selectGeneratedCompany}
                        disabled={loadingCompanies}
                        style={{
                          flex: 2, padding: '0.85rem', borderRadius: '12px', border: 'none',
                          background: loadingCompanies
                            ? 'linear-gradient(135deg, #4b5563, #374151)'
                            : 'linear-gradient(135deg, #22c55e, #16a34a)',
                          color: 'white', fontSize: '1rem', fontWeight: 600,
                          cursor: loadingCompanies ? 'not-allowed' : 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                          fontFamily: 'inherit',
                        }}
                      >
                        {loadingCompanies ? (<><Loader2 size={18} className="spin" /> שומר חברה...</>)
                          : (<><CheckCircle size={18} /> בחר חברה זו והמשך</>)}
                      </button>
                      <button
                        onClick={() => { setGenPhase(0); setGeneratedCompany(null); runGeneration(); }}
                        disabled={loadingCompanies}
                        style={{
                          flex: 1, padding: '0.85rem', borderRadius: '12px',
                          border: '1px solid rgba(124, 58, 237, 0.3)',
                          background: 'rgba(124, 58, 237, 0.1)', color: '#a78bfa',
                          fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'inherit',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                        }}
                      >
                        <RotateCcw size={16} /> חולל מחדש
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ========== SAVE & RESULTS (after company selected) ========== */}
        {currentStep === 'save' && results && (
          <div style={{
            background: 'rgba(255,255,255,0.05)', borderRadius: '16px',
            padding: '2rem', border: '1px solid rgba(34, 197, 94, 0.3)',
          }}>
            {/* Selected company indicator */}
            {selectedOrgName && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                marginBottom: '1.5rem', padding: '0.75rem 1rem',
                background: 'rgba(0, 180, 216, 0.1)', borderRadius: '8px',
                border: '1px solid rgba(0, 180, 216, 0.2)',
              }}>
                <Building2 size={18} style={{ color: '#00d4ff' }} />
                <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>חברה נבחרת:</span>
                <span style={{ color: '#fff', fontWeight: 600 }}>{selectedOrgName}</span>
              </div>
            )}

            {/* Save Button */}
            <button
              onClick={saveTender}
              disabled={isSaving}
              style={{
                width: '100%', padding: '1rem', borderRadius: '12px', border: 'none',
                background: isSaving
                  ? 'linear-gradient(135deg, #4b5563, #374151)'
                  : 'linear-gradient(135deg, #22c55e, #16a34a)',
                color: 'white', fontSize: '1.1rem', fontWeight: 600,
                cursor: isSaving ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
              }}
            >
              {isSaving ? (<><Loader2 size={22} className="spin" /> שומר מכרז ותנאי סף...</>)
                : (<><FileText size={22} /> שמור מכרז והמשך לניתוח</>)}
            </button>
          </div>
        )}

        {/* ========== DONE STEP ========== */}
        {currentStep === 'done' && savedTenderId && results && (
          <div style={{
            background: 'rgba(255,255,255,0.05)', borderRadius: '16px',
            padding: '2rem', border: '1px solid rgba(34, 197, 94, 0.3)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <CheckCircle size={24} style={{ color: '#22c55e' }} />
              <span style={{ color: '#22c55e', fontWeight: 600, fontSize: '1.1rem' }}>המכרז נשמר בהצלחה!</span>
            </div>

            {/* Saved info summary */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '1rem', marginBottom: '1.5rem',
              padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px',
            }}>
              <div style={{ textAlign: 'center' }}>
                <FileCheck size={20} style={{ color: '#22c55e', marginBottom: '0.25rem' }} />
                <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>מסמך</div>
                <div style={{ color: '#fff', fontSize: '0.85rem' }}>{currentFile?.name?.substring(0, 15) || 'טקסט'}...</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <Database size={20} style={{ color: '#7c3aed', marginBottom: '0.25rem' }} />
                <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>תנאי סף</div>
                <div style={{ color: '#fff', fontSize: '0.85rem' }}>{results.conditions.length} נשמרו</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <Building2 size={20} style={{ color: '#00d4ff', marginBottom: '0.25rem' }} />
                <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>חברה</div>
                <div style={{ color: '#fff', fontSize: '0.85rem' }}>{selectedOrgName || 'ברירת מחדל'}</div>
              </div>
            </div>

            {/* Navigation options */}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => navigate('/gates')}
                style={{
                  flex: 2, padding: '1rem', borderRadius: '12px', border: 'none',
                  background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                  color: 'white', fontSize: '1rem', fontWeight: 600,
                  cursor: 'pointer', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', gap: '0.5rem', fontFamily: 'inherit',
                }}
              >
                <BarChart3 size={20} /> ניתוח תנאי סף <ArrowRight size={18} />
              </button>
              <button
                onClick={() => navigate('/')}
                style={{
                  flex: 1, padding: '1rem', borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.2)', background: 'transparent',
                  color: '#94a3b8', fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                לדשבורד
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
