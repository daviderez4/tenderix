import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, Sparkles, ArrowRight, Copy, Eye, EyeOff, FileCheck, Database, BarChart3, RotateCcw, Home, CheckSquare, Target, Building2, Search, Star, Wand2 } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { api } from '../api/tenderix';
import type { Organization } from '../api/tenderix';
import { setCurrentTender, getCurrentOrgId, getDefaultOrgData, setTenderExtractedText } from '../api/config';
import { FICTIONAL_COMPANIES, type FictionalCompany } from './HomePage';

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

// Generate a fictional company matching the tender domain using Claude
async function generateMatchingCompanyWithAI(
  tenderName: string,
  tenderDomain: string,
  conditions: Array<{ text: string; type: string }>
): Promise<FictionalCompany | null> {
  const ANTHROPIC_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY;

  if (!ANTHROPIC_API_KEY) {
    console.error('No Anthropic API key for company generation');
    return null;
  }

  const conditionsSummary = conditions
    .slice(0, 10)
    .map(c => `- [${c.type}] ${c.text}`)
    .join('\n');

  const prompt = `אתה מומחה למכרזים ממשלתיים בישראל. צור פרופיל חברה פיקטיבית ישראלית שמתאימה לתחום של המכרז הבא.

שם המכרז: ${tenderName}
תחום: ${tenderDomain}

תנאי הסף העיקריים:
${conditionsSummary}

צור חברה פיקטיבית ריאליסטית שתתאים לעולם הזה. לדוגמה:
- אם המכרז בתחום מצלמות אופטיות, צור חברה כמו אלביט או אל-אופ
- אם בתחום IT, צור חברה כמו מטריקס או סאפ
- אם בתחום בנייה, צור חברה כמו שיכון ובינוי

החברה צריכה להיות ריאליסטית עם:
- שם עברי מתאים לתחום
- פרויקטים שרלוונטיים לתנאי הסף (3-5 פרויקטים)
- נתונים כספיים הגיוניים (3 שנים)
- הסמכות רלוונטיות (2-4 הסמכות)

החזר JSON בלבד:
{
  "name": "שם החברה בע\"מ",
  "description": "תיאור קצר",
  "domain": "תחום ההתמחות",
  "founding_year": 2005,
  "specializations": "התמחויות מופרדות בפסיקים",
  "employee_count": 150,
  "annual_revenue": 80,
  "seedProjects": [
    {
      "project_name": "שם הפרויקט",
      "client_name": "שם הלקוח",
      "client_type": "ממשלתי",
      "start_date": "2021-01-01",
      "end_date": "2023-12-31",
      "total_value": 15000000,
      "project_type": "סוג",
      "category": "קטגוריה",
      "role_type": "prime"
    }
  ],
  "seedFinancials": [
    {
      "fiscal_year": 2023,
      "annual_revenue": 80000000,
      "net_profit": 8000000,
      "employee_count": 150,
      "audited": true
    }
  ],
  "seedCertifications": [
    {
      "cert_type": "ISO",
      "cert_name": "ISO 9001 - ניהול איכות",
      "cert_number": "IL-9001-2022-XXX",
      "issuing_body": "מכון התקנים",
      "valid_from": "2022-01-01",
      "valid_until": "2026-12-31"
    }
  ]
}`;

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
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.content[0].text;

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Could not parse JSON');

    const parsed = JSON.parse(jsonMatch[0]);
    const uniqueId = `ai-generated-${Date.now()}`;

    return {
      id: uniqueId,
      name: parsed.name || 'חברה מחוללת',
      company_number: `52${Math.floor(1000000 + Math.random() * 9000000)}`,
      description: parsed.description || '',
      domain: parsed.domain || tenderDomain,
      founding_year: parsed.founding_year || 2010,
      specializations: parsed.specializations || '',
      employee_count: parsed.employee_count || 100,
      annual_revenue: parsed.annual_revenue || 50,
      seedProjects: parsed.seedProjects || [],
      seedFinancials: parsed.seedFinancials || [],
      seedCertifications: parsed.seedCertifications || [],
    };
  } catch (error) {
    console.error('Company generation error:', error);
    return null;
  }
}

// Score how relevant a fictional company is to the tender
function scoreFictionalRelevance(
  fc: FictionalCompany,
  tenderName: string,
  conditions: Array<{ text: string; type: string }>
): number {
  let score = 0;
  const searchText = `${tenderName} ${conditions.map(c => c.text).join(' ')}`.toLowerCase();
  const companyText = `${fc.domain} ${fc.specializations} ${fc.description}`.toLowerCase();

  // Check domain keywords overlap
  const domainWords = companyText.split(/[\s,]+/).filter(w => w.length > 2);
  for (const word of domainWords) {
    if (searchText.includes(word)) score += 3;
  }

  // Check project categories match condition types
  const conditionTypes = new Set(conditions.map(c => c.type));
  if (conditionTypes.has('CERTIFICATION') && fc.seedCertifications.length > 2) score += 5;
  if (conditionTypes.has('FINANCIAL') && fc.annual_revenue > 50) score += 3;
  if (conditionTypes.has('EXPERIENCE') && fc.seedProjects.length > 3) score += 3;

  return score;
}

export function SimpleIntakePage() {
  const navigate = useNavigate();

  // Check if company is already selected (optional now)
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(
    localStorage.getItem('tenderix_selected_org_id')
  );
  const [selectedOrgName, setSelectedOrgName] = useState<string | null>(
    localStorage.getItem('tenderix_selected_org_name')
  );

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
  const [currentFile, setCurrentFile] = useState<{ name: string; size: number; type: string } | null>(null);
  const [currentStep, setCurrentStep] = useState<'upload' | 'extract' | 'company' | 'save' | 'done'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Company matching state
  const [dbCompanies, setDbCompanies] = useState<Organization[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [companySearchQuery, setCompanySearchQuery] = useState('');
  const [isGeneratingCompany, setIsGeneratingCompany] = useState(false);
  const [generatedCompany, setGeneratedCompany] = useState<FictionalCompany | null>(null);
  const [rankedFictional, setRankedFictional] = useState<FictionalCompany[]>([]);

  // Load DB companies when entering company step
  useEffect(() => {
    if (currentStep === 'company') {
      loadCompaniesForMatching();
    }
  }, [currentStep]);

  async function loadCompaniesForMatching() {
    setLoadingCompanies(true);
    try {
      const orgs = await api.organizations.list();
      setDbCompanies(orgs || []);

      // Rank fictional companies by relevance to tender
      if (results) {
        const ranked = [...FICTIONAL_COMPANIES]
          .map(fc => ({
            company: fc,
            score: scoreFictionalRelevance(fc, results.metadata.tenderName, results.conditions),
          }))
          .sort((a, b) => b.score - a.score)
          .map(r => r.company);
        setRankedFictional(ranked);
      }
    } catch (error) {
      console.error('Error loading companies:', error);
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

      if (!result.success) {
        throw new Error(result.error || 'שגיאה בחילוץ');
      }

      setResults({
        conditions: result.conditions,
        metadata: result.metadata,
      });
      // If company already selected, skip company step
      if (selectedOrgId) {
        setCurrentStep('save');
      } else {
        setCurrentStep('company');
      }
      setExtractionStatus(`נמצאו ${result.conditions.length} תנאי סף!`);
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

  // Select a fictional company (create in DB + seed data)
  async function selectFictionalCompanyAndSeed(fc: FictionalCompany) {
    setLoadingCompanies(true);
    try {
      const org = await api.organizations.ensureExists(fc.id, {
        name: fc.name,
        company_number: fc.company_number,
        founding_year: fc.founding_year,
        specializations: fc.specializations,
      });
      const orgId = org?.id || fc.id;

      // Seed profile data if not already seeded
      const seedKey = `tenderix_seeded_${orgId}`;
      if (!localStorage.getItem(seedKey)) {
        for (const proj of fc.seedProjects) {
          await api.company.createProject({ org_id: orgId, ...proj }).catch(e => console.warn('Seed project:', e));
        }
        for (const fin of fc.seedFinancials) {
          await api.company.createFinancial({ org_id: orgId, ...fin }).catch(e => console.warn('Seed financial:', e));
        }
        for (const cert of fc.seedCertifications) {
          await api.company.createCertification({ org_id: orgId, ...cert }).catch(e => console.warn('Seed cert:', e));
        }
        localStorage.setItem(seedKey, 'true');
      }

      setSelectedOrgId(orgId);
      setSelectedOrgName(fc.name);
      localStorage.setItem('tenderix_selected_org_id', orgId);
      localStorage.setItem('tenderix_selected_org_name', fc.name);
      localStorage.setItem('tenderix_session_org_id', orgId);
      setCurrentStep('save');
    } catch (error) {
      console.error('Error creating fictional company:', error);
      setSelectedOrgId(fc.id);
      setSelectedOrgName(fc.name);
      localStorage.setItem('tenderix_selected_org_id', fc.id);
      localStorage.setItem('tenderix_selected_org_name', fc.name);
      localStorage.setItem('tenderix_session_org_id', fc.id);
      setCurrentStep('save');
    } finally {
      setLoadingCompanies(false);
    }
  }

  // Generate a matching company with AI
  async function generateCompany() {
    if (!results) return;

    setIsGeneratingCompany(true);
    setError(null);
    try {
      // Detect domain from tender name + conditions
      const tenderDomain = results.metadata.tenderName || 'כללי';
      const fc = await generateMatchingCompanyWithAI(
        tenderDomain,
        results.metadata.issuingBody || '',
        results.conditions.map(c => ({ text: c.text, type: c.type }))
      );

      if (fc) {
        setGeneratedCompany(fc);
      } else {
        setError('לא הצלחתי לחולל חברה. נסה שוב.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בחילול חברה');
    } finally {
      setIsGeneratingCompany(false);
    }
  }

  // Save tender and gates to database
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

      if (!tender?.id) {
        throw new Error('Failed to create tender');
      }

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

  // Reset function to start over
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
    setGeneratedCompany(null);
    setCompanySearchQuery('');
  };

  // Filter DB companies by search
  const filteredDbCompanies = dbCompanies.filter(c => {
    if (!companySearchQuery.trim()) return true;
    const q = companySearchQuery.toLowerCase();
    return (
      c.name?.toLowerCase().includes(q) ||
      c.company_number?.toLowerCase().includes(q) ||
      c.specializations?.toLowerCase().includes(q)
    );
  });

  // Filter fictional companies by search
  const filteredFictional = rankedFictional.filter(fc => {
    if (!companySearchQuery.trim()) return true;
    const q = companySearchQuery.toLowerCase();
    return (
      fc.name.toLowerCase().includes(q) ||
      fc.domain.toLowerCase().includes(q) ||
      fc.specializations.toLowerCase().includes(q)
    );
  });

  // Don't show fictional companies already in DB
  const dbIds = new Set(dbCompanies.map(c => c.id));
  const availableFictional = filteredFictional.filter(fc => !dbIds.has(fc.id));

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      padding: '2rem',
    }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        {/* Breadcrumb Navigation */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.5rem',
          padding: '0.75rem 1rem',
          background: 'rgba(255,255,255,0.03)',
          borderRadius: '8px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Link
              to="/"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: '#94a3b8',
                textDecoration: 'none',
                fontSize: '0.9rem',
              }}
            >
              <Home size={16} />
              {selectedOrgName || 'בית'}
            </Link>
            <span style={{ color: '#475569' }}>/</span>
            <span style={{ color: '#00d4ff', fontSize: '0.9rem', fontWeight: 500 }}>
              P1: טעינת מכרז
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {(text || results) && (
              <button
                onClick={resetAll}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.4rem 0.75rem',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '6px',
                  color: '#f87171',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                <RotateCcw size={14} />
                מכרז חדש
              </button>
            )}
            <Link
              to="/gates"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.4rem 0.75rem',
                background: 'rgba(124, 58, 237, 0.1)',
                border: '1px solid rgba(124, 58, 237, 0.3)',
                borderRadius: '6px',
                color: '#a78bfa',
                fontSize: '0.85rem',
                textDecoration: 'none',
              }}
            >
              <CheckSquare size={14} />
              P2: תנאי סף
            </Link>
            <Link
              to="/decision"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.4rem 0.75rem',
                background: 'rgba(34, 197, 94, 0.1)',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                borderRadius: '6px',
                color: '#86efac',
                fontSize: '0.85rem',
                textDecoration: 'none',
              }}
            >
              <Target size={14} />
              החלטה
            </Link>
          </div>
        </div>

        {/* Company Context Banner - show only if company already selected */}
        {selectedOrgName && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            marginBottom: '1rem',
            padding: '0.6rem 1rem',
            background: 'rgba(0, 180, 216, 0.1)',
            borderRadius: '8px',
            border: '1px solid rgba(0, 180, 216, 0.2)',
          }}>
            <Building2 size={16} style={{ color: '#00d4ff' }} />
            <span style={{ color: '#00d4ff', fontSize: '0.85rem' }}>
              מנתח עבור:
            </span>
            <span style={{ color: '#fff', fontWeight: 600, fontSize: '0.9rem' }}>
              {selectedOrgName}
            </span>
            <span style={{ flex: 1 }} />
            <button
              onClick={() => {
                setSelectedOrgId(null);
                setSelectedOrgName(null);
                localStorage.removeItem('tenderix_selected_org_id');
                localStorage.removeItem('tenderix_selected_org_name');
              }}
              style={{
                color: '#94a3b8',
                fontSize: '0.8rem',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              החלף חברה
            </button>
          </div>
        )}

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
            טעינת מכרז
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '1.1rem' }}>
            העלה מסמך או הדבק טקסט - חלץ תנאי סף תוך שניות
          </p>
        </div>

        {/* Progress Steps */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '0.5rem',
          marginBottom: '2rem',
          direction: 'ltr',
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
            // Skip company step indicator if company was already selected
            if (step.key === 'company' && selectedOrgId && currentStep !== 'company') {
              // Still show it but as complete
            }

            return (
              <div key={step.key} style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.25rem',
                }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: isComplete ? 'linear-gradient(135deg, #22c55e, #16a34a)'
                      : isActive ? 'linear-gradient(135deg, #7c3aed, #6d28d9)'
                        : 'rgba(255,255,255,0.1)',
                    border: isActive ? '2px solid #7c3aed' : 'none',
                    transition: 'all 0.3s',
                  }}>
                    {isComplete ? (
                      <CheckCircle size={20} style={{ color: 'white' }} />
                    ) : (
                      <step.icon size={20} style={{ color: isActive ? 'white' : '#64748b' }} />
                    )}
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
                    width: '40px',
                    height: '2px',
                    background: isComplete || (isActive && index < currentIndex) ? '#22c55e' : 'rgba(255,255,255,0.1)',
                    margin: '0 0.5rem',
                    marginBottom: '1.5rem',
                  }} />
                )}
              </div>
            );
          })}
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

        {/* ==================== COMPANY MATCHING STEP ==================== */}
        {currentStep === 'company' && results && (
          <div style={{
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '16px',
            padding: '2rem',
            marginBottom: '1.5rem',
            border: '1px solid rgba(0, 180, 216, 0.3)',
          }}>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <Building2 size={36} style={{ color: '#00d4ff', marginBottom: '0.5rem' }} />
              <h2 style={{ color: '#fff', fontSize: '1.4rem', margin: '0 0 0.5rem' }}>
                בחר חברה למכרז
              </h2>
              <p style={{ color: '#94a3b8', fontSize: '0.95rem', margin: 0 }}>
                בחר חברה מהמאגר או חולל פרופיל חברה פיקטיבית שמתאימה לתחום המכרז
              </p>
              <div style={{
                marginTop: '0.75rem',
                padding: '0.5rem 1rem',
                background: 'rgba(124, 58, 237, 0.15)',
                borderRadius: '8px',
                display: 'inline-block',
              }}>
                <span style={{ color: '#a78bfa', fontSize: '0.85rem' }}>
                  תחום המכרז: <strong style={{ color: '#fff' }}>{results.metadata.tenderName}</strong>
                </span>
              </div>
            </div>

            {/* Search */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              marginBottom: '1.5rem',
              padding: '0.75rem 1rem',
              background: 'rgba(255,255,255,0.05)',
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.1)',
            }}>
              <Search size={18} color="#94a3b8" />
              <input
                type="text"
                value={companySearchQuery}
                onChange={e => setCompanySearchQuery(e.target.value)}
                placeholder="חפש חברה לפי שם, תחום או מספר..."
                style={{
                  flex: 1,
                  border: 'none',
                  outline: 'none',
                  fontSize: '0.95rem',
                  fontFamily: 'inherit',
                  background: 'transparent',
                  color: '#fff',
                }}
              />
            </div>

            {loadingCompanies && (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <Loader2 size={24} className="spin" style={{ color: '#00d4ff' }} />
                <p style={{ color: '#94a3b8', marginTop: '0.5rem' }}>טוען חברות...</p>
              </div>
            )}

            {!loadingCompanies && (
              <>
                {/* AI Generate Company Button */}
                <div style={{
                  marginBottom: '1.5rem',
                  padding: '1.25rem',
                  background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.15), rgba(0, 180, 216, 0.1))',
                  borderRadius: '12px',
                  border: '1px solid rgba(124, 58, 237, 0.3)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <Wand2 size={28} style={{ color: '#a78bfa', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <h4 style={{ margin: '0 0 0.25rem', color: '#a78bfa' }}>חולל חברה מתאימה למכרז</h4>
                      <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.85rem' }}>
                        AI יחולל פרופיל חברה פיקטיבית עם פרויקטים, הסמכות ונתונים כספיים שמתאימים לתחום המכרז
                      </p>
                    </div>
                    <button
                      onClick={generateCompany}
                      disabled={isGeneratingCompany}
                      style={{
                        padding: '0.75rem 1.5rem',
                        borderRadius: '10px',
                        border: 'none',
                        background: isGeneratingCompany
                          ? 'rgba(124, 58, 237, 0.3)'
                          : 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                        color: 'white',
                        fontSize: '0.95rem',
                        fontWeight: 600,
                        cursor: isGeneratingCompany ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {isGeneratingCompany ? (
                        <>
                          <Loader2 size={18} className="spin" />
                          מחולל...
                        </>
                      ) : (
                        <>
                          <Wand2 size={18} />
                          חולל חברה
                        </>
                      )}
                    </button>
                  </div>

                  {/* Show generated company */}
                  {generatedCompany && (
                    <div style={{
                      marginTop: '1rem',
                      padding: '1rem',
                      background: 'rgba(34, 197, 94, 0.1)',
                      borderRadius: '10px',
                      border: '1px solid rgba(34, 197, 94, 0.3)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                        <Sparkles size={18} style={{ color: '#22c55e' }} />
                        <span style={{ color: '#22c55e', fontWeight: 600 }}>חברה חוללה בהצלחה!</span>
                      </div>
                      <div style={{ marginBottom: '0.75rem' }}>
                        <div style={{ color: '#fff', fontWeight: 600, fontSize: '1.1rem' }}>{generatedCompany.name}</div>
                        <div style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                          {generatedCompany.domain} | {generatedCompany.employee_count} עובדים | מחזור {generatedCompany.annual_revenue}M
                        </div>
                        <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                          {generatedCompany.description}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                        <span style={{
                          background: 'rgba(124, 58, 237, 0.2)',
                          color: '#a78bfa',
                          padding: '0.2rem 0.6rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                        }}>
                          {generatedCompany.seedProjects.length} פרויקטים
                        </span>
                        <span style={{
                          background: 'rgba(217, 119, 6, 0.2)',
                          color: '#fbbf24',
                          padding: '0.2rem 0.6rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                        }}>
                          {generatedCompany.seedCertifications.length} הסמכות
                        </span>
                        <span style={{
                          background: 'rgba(5, 150, 105, 0.2)',
                          color: '#34d399',
                          padding: '0.2rem 0.6rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                        }}>
                          {generatedCompany.seedFinancials.length} שנות כספים
                        </span>
                      </div>
                      <button
                        onClick={() => selectFictionalCompanyAndSeed(generatedCompany)}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          borderRadius: '8px',
                          border: 'none',
                          background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                          color: 'white',
                          fontSize: '1rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.5rem',
                        }}
                      >
                        <CheckCircle size={18} />
                        בחר חברה זו והמשך
                      </button>
                    </div>
                  )}
                </div>

                {/* DB Companies */}
                {filteredDbCompanies.length > 0 && (
                  <div style={{ marginBottom: '1.5rem' }}>
                    <h4 style={{
                      color: '#00d4ff',
                      fontSize: '0.95rem',
                      marginBottom: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}>
                      <Database size={16} />
                      חברות מהמאגר ({filteredDbCompanies.length})
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {filteredDbCompanies.map(company => (
                        <button
                          key={company.id}
                          onClick={() => selectDbCompany(company)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1rem',
                            padding: '0.75rem 1rem',
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            textAlign: 'right',
                            width: '100%',
                            fontFamily: 'inherit',
                            transition: 'all 0.2s',
                          }}
                          onMouseOver={e => {
                            e.currentTarget.style.borderColor = '#00d4ff';
                            e.currentTarget.style.background = 'rgba(0, 180, 216, 0.08)';
                          }}
                          onMouseOut={e => {
                            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                            e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                          }}
                        >
                          <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '10px',
                            background: 'linear-gradient(135deg, #00b4d8, #0096c7)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
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
                  </div>
                )}

                {/* Fictional Companies (ranked by relevance) */}
                {availableFictional.length > 0 && (
                  <div>
                    <h4 style={{
                      color: '#f59e0b',
                      fontSize: '0.95rem',
                      marginBottom: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}>
                      <Star size={16} />
                      חברות לדוגמה - ממוינות לפי רלוונטיות ({availableFictional.length})
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {availableFictional.map((fc, idx) => (
                        <button
                          key={fc.id}
                          onClick={() => selectFictionalCompanyAndSeed(fc)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1rem',
                            padding: '0.75rem 1rem',
                            background: idx === 0 ? 'rgba(245, 158, 11, 0.08)' : 'rgba(255,255,255,0.03)',
                            border: idx === 0 ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            textAlign: 'right',
                            width: '100%',
                            fontFamily: 'inherit',
                            transition: 'all 0.2s',
                          }}
                          onMouseOver={e => {
                            e.currentTarget.style.borderColor = '#f59e0b';
                            e.currentTarget.style.background = 'rgba(245, 158, 11, 0.1)';
                          }}
                          onMouseOut={e => {
                            e.currentTarget.style.borderColor = idx === 0 ? 'rgba(245, 158, 11, 0.3)' : 'rgba(255,255,255,0.1)';
                            e.currentTarget.style.background = idx === 0 ? 'rgba(245, 158, 11, 0.08)' : 'rgba(255,255,255,0.03)';
                          }}
                        >
                          <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '10px',
                            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}>
                            <Star size={20} color="white" />
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, color: '#fff' }}>
                              {fc.name}
                              {idx === 0 && (
                                <span style={{
                                  marginRight: '0.5rem',
                                  background: 'rgba(245, 158, 11, 0.2)',
                                  color: '#fbbf24',
                                  padding: '0.15rem 0.5rem',
                                  borderRadius: '4px',
                                  fontSize: '0.7rem',
                                }}>
                                  הכי רלוונטית
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                              {fc.domain} | {fc.employee_count} עובדים | מחזור {fc.annual_revenue}M
                            </div>
                          </div>
                          <ArrowRight size={16} color="#94a3b8" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Results Section */}
        {results && currentStep !== 'company' && (
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

            {/* Selected company indicator */}
            {selectedOrgName && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                marginBottom: '1.5rem',
                padding: '0.75rem 1rem',
                background: 'rgba(0, 180, 216, 0.1)',
                borderRadius: '8px',
                border: '1px solid rgba(0, 180, 216, 0.2)',
              }}>
                <Building2 size={18} style={{ color: '#00d4ff' }} />
                <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>חברה נבחרת:</span>
                <span style={{ color: '#fff', fontWeight: 600 }}>{selectedOrgName}</span>
              </div>
            )}

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
                    שומר מכרז ותנאי סף...
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                  <CheckCircle size={24} style={{ color: '#22c55e' }} />
                  <span style={{ color: '#22c55e', fontWeight: 600, fontSize: '1.1rem' }}>
                    המכרז נשמר בהצלחה!
                  </span>
                </div>

                {/* Saved info summary */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '1rem',
                  marginBottom: '1.5rem',
                  padding: '1rem',
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: '8px',
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <FileCheck size={20} style={{ color: '#22c55e', marginBottom: '0.25rem' }} />
                    <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>מסמך</div>
                    <div style={{ color: '#fff', fontSize: '0.85rem' }}>{currentFile?.name?.substring(0, 15)}...</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <Database size={20} style={{ color: '#7c3aed', marginBottom: '0.25rem' }} />
                    <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>תנאי סף</div>
                    <div style={{ color: '#fff', fontSize: '0.85rem' }}>{results?.conditions.length} נשמרו</div>
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
                      flex: 2,
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
                      gap: '0.5rem',
                    }}
                  >
                    <BarChart3 size={20} />
                    ניתוח תנאי סף
                    <ArrowRight size={18} />
                  </button>
                  <button
                    onClick={() => navigate('/')}
                    style={{
                      flex: 1,
                      padding: '1rem',
                      borderRadius: '12px',
                      border: '1px solid rgba(255,255,255,0.2)',
                      background: 'transparent',
                      color: '#94a3b8',
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                    }}
                  >
                    לדשבורד
                  </button>
                </div>
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
