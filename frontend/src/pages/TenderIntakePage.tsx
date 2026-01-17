import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  Clock,
  FileSearch,
  Book,
  Calendar,
  Building,
  Hash,
  DollarSign,
  Loader2,
  Trash2,
  Eye,
  Save,
  ArrowRight,
  Link as LinkIcon,
  Download,
  FolderOpen
} from 'lucide-react';
import { api } from '../api/tenderix';
import { setCurrentTender, setTenderExtractedText, getDefaultOrgData, getCurrentOrgId } from '../api/config';
import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore - Vite handles this URL import specially
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Set PDF.js worker using Vite's URL import
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

interface UploadedDocument {
  id: string;
  name: string;
  type: string;
  size: number;
  status: 'uploading' | 'processing' | 'done' | 'error';
  detectedType?: string;
  pages?: number;
  file?: File;
  extractedText?: string;
}

interface TenderMetadata {
  tenderNumber: string;
  tenderName: string;
  issuingBody: string;
  publishDate: string;
  submissionDeadline: string;
  clarificationDeadline: string;
  guaranteeAmount: string;
  contractPeriod: string;
  category: string;
  priceWeight: string;
  qualityWeight: string;
}

export function TenderIntakePage() {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [processingStep, setProcessingStep] = useState<number>(0);
  const [metadata, setMetadata] = useState<TenderMetadata | null>(null);
  const [definitions, setDefinitions] = useState<{term: string, definition: string}[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedTenderId, setSavedTenderId] = useState<string | null>(null);
  const [savedTenderName, setSavedTenderName] = useState<string | null>(null);
  const [manualText, setManualText] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const filesRef = useRef<Map<string, File>>(new Map());
  const [extractionProgress, setExtractionProgress] = useState<string>('');

  // URL Scraping states
  const [tenderUrl, setTenderUrl] = useState('');
  const [isScrapingUrl, setIsScrapingUrl] = useState(false);
  const [scrapedDocuments, setScrapedDocuments] = useState<Array<{
    file_name: string;
    file_url: string;
    file_type: string;
    doc_type: string;
    category: string;
    publish_date?: string;
    is_clarification: boolean;
    selected: boolean;
  }>>([]);
  const [scrapeError, setScrapeError] = useState<string | null>(null);
  const [scrapedMetadata, setScrapedMetadata] = useState<{
    tender_number?: string;
    tender_name?: string;
    issuing_body?: string;
    submission_deadline?: string;
    category?: string;
  } | null>(null);

  // Extract text from PDF using PDF.js (works with digital PDFs with embedded text)
  const extractTextFromPDF = async (file: File): Promise<string> => {
    try {
      console.log(`Starting PDF extraction for ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
      setExtractionProgress(`מחלץ טקסט מ-${file.name}...`);

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

      console.log(`PDF loaded: ${pdf.numPages} pages`);
      let fullText = '';

      // Extract text from each page (limit to first 30 pages for performance)
      const maxPages = Math.min(pdf.numPages, 30);
      for (let i = 1; i <= maxPages; i++) {
        setExtractionProgress(`מחלץ עמוד ${i} מתוך ${maxPages}...`);
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();

        // Combine text items, preserving some structure
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pageText = (textContent.items as any[])
          .filter((item) => 'str' in item && typeof item.str === 'string')
          .map((item) => item.str as string)
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();

        if (pageText) {
          fullText += `--- עמוד ${i} ---\n${pageText}\n\n`;
        }
      }

      setExtractionProgress('');

      if (!fullText || fullText.length < 100) {
        console.warn('PDF extraction returned little text - might be a scanned/image PDF');
        return `[לא נמצא טקסט ב-PDF. ייתכן שזה PDF סרוק. נסה להדביק טקסט ידנית מהמסמך.]`;
      }

      console.log(`PDF.js extracted ${fullText.length} characters from ${file.name}`);
      return fullText.trim();

    } catch (err) {
      console.error('PDF extraction error:', err);
      setExtractionProgress('');
      return `[שגיאת חילוץ: ${err instanceof Error ? err.message : 'שגיאה לא ידועה'}. נסה להדביק טקסט ידנית.]`;
    }
  };

  const documentTypes = [
    { id: 'invitation', label: 'הזמנה להציע הצעות', icon: FileText, color: '#00d4ff' },
    { id: 'spec', label: 'מפרט טכני', icon: FileSearch, color: '#7c3aed' },
    { id: 'boq', label: 'כתב כמויות', icon: DollarSign, color: '#10b981' },
    { id: 'contract', label: 'חוזה התקשרות', icon: Book, color: '#f59e0b' },
    { id: 'clarifications', label: 'מסמכי הבהרות', icon: AlertCircle, color: '#ec4899' },
    { id: 'forms', label: 'טפסים למילוי', icon: FileText, color: '#6366f1' },
  ];

  const processingSteps = [
    { label: 'זיהוי מסמכים', description: 'זיהוי אוטומטי של סוג כל מסמך' },
    { label: 'חילוץ מטא-דאטה', description: 'חילוץ פרטי המכרז הבסיסיים' },
    { label: 'נרמול טקסט', description: 'תיקון שגיאות ואיחוד מונחים' },
    { label: 'חילוץ הגדרות', description: 'זיהוי המילון הפנימי של המכרז' },
    { label: 'זיהוי קטגוריה', description: 'סיווג המכרז וטעינת מילון טכני' },
  ];

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      handleFiles(files);
    }
  };

  const handleFiles = async (files: File[]) => {
    const newDocs: UploadedDocument[] = files.map((file) => {
      const id = Math.random().toString(36).substr(2, 9);
      filesRef.current.set(id, file);
      return {
        id,
        name: file.name,
        type: file.type,
        size: file.size,
        status: 'uploading' as const,
      };
    });
    setDocuments([...documents, ...newDocs]);

    // Process each file - extract text
    for (const doc of newDocs) {
      const file = filesRef.current.get(doc.id);
      if (!file) continue;

      // Update to processing state
      setDocuments((prev) =>
        prev.map((d) =>
          d.id === doc.id ? { ...d, status: 'processing' } : d
        )
      );

      try {
        let extractedText = '';
        let pageCount = 1;

        // Extract text based on file type
        if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
          extractedText = await file.text();
        } else if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
          // Use OCR.space API to extract text (supports Hebrew)
          extractedText = await extractTextFromPDF(file);
          // Estimate pages based on text length
          pageCount = Math.max(1, Math.ceil(extractedText.length / 3000));
        } else if (file.name.endsWith('.docx') || file.name.endsWith('.doc')) {
          extractedText = `[מסמך Word: ${file.name}]\n\nלחילוץ טקסט מ-Word יש להמיר ל-PDF או להעתיק טקסט ידנית.`;
        } else {
          extractedText = `[מסמך: ${file.name}]`;
        }

        console.log(`Extracted ${extractedText.length} chars from ${file.name}`);

        setDocuments((prev) =>
          prev.map((d) =>
            d.id === doc.id
              ? {
                  ...d,
                  status: 'done',
                  detectedType: detectDocumentType(doc.name),
                  pages: pageCount,
                  extractedText,
                }
              : d
          )
        );
      } catch (err) {
        console.error('File processing error:', err);
        setDocuments((prev) =>
          prev.map((d) =>
            d.id === doc.id
              ? { ...d, status: 'error' }
              : d
          )
        );
      }
    }
  };

  const detectDocumentType = (filename: string): string => {
    const lower = filename.toLowerCase();
    if (lower.includes('הזמנה') || lower.includes('מכרז')) return 'invitation';
    if (lower.includes('מפרט') || lower.includes('טכני')) return 'spec';
    if (lower.includes('כמויות') || lower.includes('boq')) return 'boq';
    if (lower.includes('חוזה') || lower.includes('הסכם')) return 'contract';
    if (lower.includes('הבהר')) return 'clarifications';
    if (lower.includes('טופס') || lower.includes('נספח')) return 'forms';
    return 'invitation';
  };

  const removeDocument = (id: string) => {
    setDocuments(documents.filter((d) => d.id !== id));
  };

  // Scrape documents from URL (Dekel/Merkavi)
  const scrapeFromUrl = async () => {
    if (!tenderUrl.trim()) {
      setScrapeError('יש להזין כתובת URL');
      return;
    }

    setIsScrapingUrl(true);
    setScrapeError(null);
    setScrapedDocuments([]);
    setScrapedMetadata(null);

    try {
      // Use the API scraper - for now use a mock until webhook is ready
      // const result = await api.scraper.scrapeFromUrl(tenderUrl, '');

      // Parse URL to detect source
      const url = new URL(tenderUrl);
      const hostname = url.hostname.toLowerCase();

      let source: 'dekel' | 'merkavi' | 'mr_gov' | 'unknown' = 'unknown';
      if (hostname.includes('dekel') || hostname.includes('dkalnet')) {
        source = 'dekel';
      } else if (hostname.includes('merkavi') || hostname.includes('mr.gov')) {
        source = 'mr_gov';
      }

      // Call the scraping webhook
      const response = await fetch(`${import.meta.env.VITE_N8N_WEBHOOK_BASE || 'https://n8n.srv888666.hstgr.cloud/webhook'}/tdx-scrape-documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tender_url: tenderUrl,
          source,
        }),
      });

      if (!response.ok) {
        throw new Error(`שגיאה בסריקה: ${response.status}`);
      }

      const result = await response.json();

      if (result.success && result.documents) {
        setScrapedDocuments(result.documents.map((doc: { file_name: string; file_url: string; file_type: string; doc_type: string; category: string; publish_date?: string; is_clarification: boolean }) => ({
          ...doc,
          selected: true, // Select all by default
        })));

        if (result.metadata) {
          setScrapedMetadata(result.metadata);
        }
      } else {
        throw new Error(result.error || 'לא נמצאו מסמכים');
      }
    } catch (error) {
      console.error('Scrape error:', error);
      setScrapeError(error instanceof Error ? error.message : 'שגיאה בסריקת הקישור');
    } finally {
      setIsScrapingUrl(false);
    }
  };

  // Toggle document selection
  const toggleDocumentSelection = (index: number) => {
    setScrapedDocuments(prev => prev.map((doc, i) =>
      i === index ? { ...doc, selected: !doc.selected } : doc
    ));
  };

  // Select/deselect all documents
  const toggleAllDocuments = (selected: boolean) => {
    setScrapedDocuments(prev => prev.map(doc => ({ ...doc, selected })));
  };

  // Download and process selected scraped documents
  const processSelectedDocuments = async () => {
    const selected = scrapedDocuments.filter(d => d.selected);
    if (selected.length === 0) {
      setScrapeError('יש לבחור לפחות מסמך אחד');
      return;
    }

    setIsScrapingUrl(true);
    setScrapeError(null);

    try {
      // Add scraped docs to the documents list with "processing" status
      const newDocs: UploadedDocument[] = selected.map((doc, index) => ({
        id: `scraped-${Date.now()}-${index}`,
        name: doc.file_name,
        type: doc.file_type,
        size: 0,
        status: 'processing' as const,
        detectedType: doc.doc_type.toLowerCase(),
      }));

      setDocuments(prev => [...prev, ...newDocs]);

      // Process each document via webhook
      for (let i = 0; i < selected.length; i++) {
        const doc = selected[i];
        const docId = newDocs[i].id;

        try {
          setExtractionProgress(`מעבד ${i + 1}/${selected.length}: ${doc.file_name}...`);

          // Call webhook to download and extract text
          const response = await fetch(`${import.meta.env.VITE_N8N_WEBHOOK_BASE || 'https://n8n.srv888666.hstgr.cloud/webhook'}/tdx-process-document`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              document_url: doc.file_url,
              file_name: doc.file_name,
              doc_type: doc.doc_type,
            }),
          });

          if (response.ok) {
            const result = await response.json();
            setDocuments(prev => prev.map(d =>
              d.id === docId
                ? {
                    ...d,
                    status: 'done',
                    extractedText: result.extracted_text || '',
                    pages: result.page_count || 1,
                  }
                : d
            ));
          } else {
            throw new Error(`Failed to process ${doc.file_name}`);
          }
        } catch (err) {
          console.error(`Error processing ${doc.file_name}:`, err);
          setDocuments(prev => prev.map(d =>
            d.id === docId ? { ...d, status: 'error' } : d
          ));
        }
      }

      // Apply scraped metadata if available
      if (scrapedMetadata) {
        setMetadata(prev => ({
          tenderNumber: scrapedMetadata.tender_number || prev?.tenderNumber || '',
          tenderName: scrapedMetadata.tender_name || prev?.tenderName || '',
          issuingBody: scrapedMetadata.issuing_body || prev?.issuingBody || '',
          publishDate: prev?.publishDate || '',
          submissionDeadline: scrapedMetadata.submission_deadline || prev?.submissionDeadline || '',
          clarificationDeadline: prev?.clarificationDeadline || '',
          guaranteeAmount: prev?.guaranteeAmount || '',
          contractPeriod: prev?.contractPeriod || '',
          category: scrapedMetadata.category || prev?.category || '',
          priceWeight: prev?.priceWeight || '',
          qualityWeight: prev?.qualityWeight || '',
        }));
      }

      // Clear scraped list
      setScrapedDocuments([]);
      setTenderUrl('');
      setExtractionProgress('');

    } catch (error) {
      console.error('Error processing documents:', error);
      setScrapeError('שגיאה בעיבוד המסמכים');
    } finally {
      setIsScrapingUrl(false);
      setExtractionProgress('');
    }
  };

  const startProcessing = async () => {
    setError(null);
    setAiSummary(null);

    // Step 1: Document identification
    setProcessingStep(1);
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Step 2: Metadata extraction - call real AI
    setProcessingStep(2);

    try {
      // Combine all document text for analysis (including manual text if provided)
      const docTexts = documents
        .filter((d) => d.extractedText && d.extractedText.length > 50)
        .map((d) => `=== ${d.name} ===\n${d.extractedText}`);

      // Add manual text if provided
      if (manualText && manualText.trim().length > 10) {
        docTexts.push(`=== הדבקה ידנית ===\n${manualText.trim()}`);
      }

      const allText = docTexts.join('\n\n');

      const firstDocName = documents[0]?.name || 'document';

      // Check if we have enough text to analyze
      if (allText.length < 100) {
        setError('לא נמצא מספיק טקסט לניתוח. נסה להדביק טקסט ידנית מהמכרז.');
        setProcessingStep(5);
        setMetadata({
          tenderNumber: 'לא זוהה',
          tenderName: documents[0]?.name || 'מכרז חדש',
          issuingBody: 'לא זוהה',
          publishDate: 'לא זוהה',
          submissionDeadline: 'לא זוהה',
          clarificationDeadline: 'לא זוהה',
          guaranteeAmount: 'לא זוהה',
          contractPeriod: 'לא זוהה',
          category: 'לא זוהה',
          priceWeight: 'לא זוהה',
          qualityWeight: 'לא זוהה',
        });
        return;
      }

      console.log(`Sending ${allText.length} chars for analysis`);

      // Call the AI workflow
      const result = await api.workflows.analyzeDocument(allText, firstDocName);
      console.log('Analysis result received:', result);

      // Step 3: Text normalization
      setProcessingStep(3);
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Step 4: Definition extraction
      setProcessingStep(4);
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Step 5: Category identification
      setProcessingStep(5);
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Extract metadata from result
      const meta = result?.metadata || {};
      console.log('Parsed metadata:', meta);

      setMetadata({
        tenderNumber: meta.tender_number || 'לא זוהה',
        tenderName: meta.tender_name || documents[0]?.name?.replace('.pdf', '') || 'מכרז חדש',
        issuingBody: meta.issuing_body || 'לא זוהה',
        publishDate: meta.publish_date || 'לא זוהה',
        submissionDeadline: meta.submission_deadline || 'לא זוהה',
        clarificationDeadline: meta.clarification_deadline || 'לא זוהה',
        guaranteeAmount: meta.guarantee_amount || 'לא זוהה',
        contractPeriod: meta.contract_period || 'לא זוהה',
        category: meta.category || 'לא זוהה',
        priceWeight: meta.price_weight || 'לא זוהה',
        qualityWeight: meta.quality_weight || 'לא זוהה',
      });

      if (result?.definitions && result.definitions.length > 0) {
        setDefinitions(result.definitions);
      }

      if (result?.summary) {
        setAiSummary(result.summary);
      } else if (result?.success) {
        setAiSummary('המסמך נותח בהצלחה');
      }

      // Mark all steps as complete (step 6 means all 5 steps are done)
      setProcessingStep(6);
    } catch (err) {
      console.error('AI analysis error:', err);
      setError(`שגיאה בניתוח: ${err instanceof Error ? err.message : 'שגיאה לא ידועה'}`);

      // Set fallback metadata
      setMetadata({
        tenderNumber: 'שגיאה',
        tenderName: documents[0]?.name || 'מכרז חדש',
        issuingBody: 'לא זוהה',
        publishDate: 'לא זוהה',
        submissionDeadline: 'לא זוהה',
        clarificationDeadline: 'לא זוהה',
        guaranteeAmount: 'לא זוהה',
        contractPeriod: 'לא זוהה',
        category: 'לא זוהה',
        priceWeight: 'לא זוהה',
        qualityWeight: 'לא זוהה',
      });

      // Continue to show processing complete (6 = all done)
      setProcessingStep(6);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Save tender to database
  const saveTender = async () => {
    if (!metadata) return;

    setIsSaving(true);
    setError(null);

    try {
      // Get session-specific org data
      const orgData = getDefaultOrgData();
      const orgId = getCurrentOrgId();

      // CRITICAL: Ensure organization exists before creating tender
      console.log('Ensuring organization exists for session:', orgId);
      await api.organizations.ensureExists(orgId, {
        name: orgData.name,
        company_number: orgData.company_number,
        settings: orgData.settings,
      });
      console.log('Organization check complete');

      // Create tender in database
      // Note: issuing_body is required (NOT NULL) in the DB, so we use a default value
      console.log('Creating tender for org:', orgId);
      const tender = await api.tenders.create({
        tender_name: metadata.tenderName !== 'לא זוהה' ? metadata.tenderName : documents[0]?.name || 'מכרז חדש',
        tender_number: metadata.tenderNumber !== 'לא זוהה' ? metadata.tenderNumber : undefined,
        issuing_body: metadata.issuingBody !== 'לא זוהה' ? metadata.issuingBody : 'לא צוין',
        publish_date: metadata.publishDate !== 'לא זוהה' ? metadata.publishDate : undefined,
        submission_deadline: metadata.submissionDeadline !== 'לא זוהה' ? metadata.submissionDeadline : undefined,
        clarification_deadline: metadata.clarificationDeadline !== 'לא זוהה' ? metadata.clarificationDeadline : undefined,
        guarantee_amount: metadata.guaranteeAmount !== 'לא זוהה' ? parseFloat(metadata.guaranteeAmount.replace(/[^\d.]/g, '')) || undefined : undefined,
        category: metadata.category !== 'לא זוהה' ? metadata.category : undefined,
        quality_weight: metadata.qualityWeight !== 'לא זוהה' ? parseFloat(metadata.qualityWeight) || undefined : undefined,
        price_weight: metadata.priceWeight !== 'לא זוהה' ? parseFloat(metadata.priceWeight) || undefined : undefined,
        org_id: orgId,
        status: 'ACTIVE',
        current_step: 'INTAKE',
      });
      console.log('Tender created:', tender);

      // Verify tender was actually created
      if (!tender || !tender.id) {
        throw new Error('Tender creation failed - no ID returned from database');
      }

      console.log('Tender created successfully with ID:', tender.id);

      const tenderName = metadata.tenderName !== 'לא זוהה' ? metadata.tenderName : documents[0]?.name || 'מכרז חדש';

      // Set as current tender for other pages to use
      setCurrentTender(tender.id, tenderName);

      // Store extracted text for Gates analysis
      const docTexts = documents
        .filter((d) => d.extractedText && d.extractedText.length > 50)
        .map((d) => d.extractedText || '');
      if (manualText && manualText.trim().length > 10) {
        docTexts.push(manualText.trim());
      }
      const allExtractedText = docTexts.join('\n\n');
      if (allExtractedText.length > 100) {
        setTenderExtractedText(tender.id, allExtractedText);
        console.log(`Stored ${allExtractedText.length} chars of extracted text for tender ${tender.id}`);
      }

      setSavedTenderId(tender.id);
      setSavedTenderName(tenderName);
      setAiSummary(`המכרז נשמר בהצלחה! מזהה: ${tender.id}`);
    } catch (err) {
      console.error('Save error:', err);
      setError(`שגיאה בשמירה: ${err instanceof Error ? err.message : 'שגיאה לא ידועה'}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>קליטת מכרז</h1>
          <p className="page-subtitle">Pillar 1: Tender Intake & Document Processing</p>
        </div>
      </div>

      {/* URL Scraping Section */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <LinkIcon size={20} style={{ color: '#7c3aed' }} />
          ייבוא מכרז מקישור (דקל / מרכבי)
        </h3>

        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
          <input
            type="url"
            value={tenderUrl}
            onChange={(e) => setTenderUrl(e.target.value)}
            placeholder="הדבק קישור לעמוד המכרז (למשל: https://www.dekel.co.il/...)"
            style={{
              flex: 1,
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              border: '1px solid #333',
              background: 'rgba(255,255,255,0.05)',
              color: '#fff',
              fontSize: '0.95rem',
            }}
            dir="ltr"
          />
          <button
            onClick={scrapeFromUrl}
            disabled={isScrapingUrl || !tenderUrl.trim()}
            className="btn btn-primary"
            style={{ whiteSpace: 'nowrap' }}
          >
            {isScrapingUrl ? (
              <>
                <Loader2 size={18} className="spin" />
                סורק...
              </>
            ) : (
              <>
                <Download size={18} />
                סרוק מסמכים
              </>
            )}
          </button>
        </div>

        {scrapeError && (
          <div style={{
            padding: '0.75rem 1rem',
            background: 'rgba(239, 68, 68, 0.1)',
            borderRadius: '8px',
            color: '#ef4444',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}>
            <AlertCircle size={16} />
            {scrapeError}
          </div>
        )}

        {/* Scraped Documents List */}
        {scrapedDocuments.length > 0 && (
          <div style={{ marginTop: '1rem' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '0.75rem',
            }}>
              <span style={{ fontWeight: 500 }}>
                נמצאו {scrapedDocuments.length} מסמכים
              </span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => toggleAllDocuments(true)}
                  style={{
                    padding: '0.25rem 0.75rem',
                    background: 'transparent',
                    border: '1px solid #333',
                    borderRadius: '6px',
                    color: '#888',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                  }}
                >
                  בחר הכל
                </button>
                <button
                  onClick={() => toggleAllDocuments(false)}
                  style={{
                    padding: '0.25rem 0.75rem',
                    background: 'transparent',
                    border: '1px solid #333',
                    borderRadius: '6px',
                    color: '#888',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                  }}
                >
                  נקה בחירה
                </button>
              </div>
            </div>

            <div style={{
              maxHeight: '300px',
              overflowY: 'auto',
              border: '1px solid #333',
              borderRadius: '8px',
            }}>
              {scrapedDocuments.map((doc, index) => (
                <div
                  key={index}
                  onClick={() => toggleDocumentSelection(index)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem 1rem',
                    borderBottom: index < scrapedDocuments.length - 1 ? '1px solid #333' : 'none',
                    cursor: 'pointer',
                    background: doc.selected ? 'rgba(124, 58, 237, 0.1)' : 'transparent',
                    transition: 'background 0.2s',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={doc.selected}
                    onChange={() => {}}
                    style={{ cursor: 'pointer' }}
                  />
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    background: doc.is_clarification
                      ? 'rgba(245, 158, 11, 0.2)'
                      : doc.file_type.includes('xlsx') || doc.file_type.includes('excel')
                        ? 'rgba(16, 185, 129, 0.2)'
                        : doc.file_type.includes('zip')
                          ? 'rgba(124, 58, 237, 0.2)'
                          : 'rgba(0, 212, 255, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    {doc.is_clarification ? (
                      <AlertCircle size={18} style={{ color: '#f59e0b' }} />
                    ) : doc.file_type.includes('xlsx') ? (
                      <FileText size={18} style={{ color: '#10b981' }} />
                    ) : doc.file_type.includes('zip') ? (
                      <FolderOpen size={18} style={{ color: '#7c3aed' }} />
                    ) : (
                      <FileText size={18} style={{ color: '#00d4ff' }} />
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontWeight: 500,
                      fontSize: '0.9rem',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {doc.file_name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#888', display: 'flex', gap: '0.5rem' }}>
                      <span style={{
                        padding: '1px 6px',
                        background: 'rgba(255,255,255,0.1)',
                        borderRadius: '4px',
                      }}>
                        {doc.doc_type}
                      </span>
                      {doc.publish_date && <span>{doc.publish_date}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={processSelectedDocuments}
              disabled={isScrapingUrl || scrapedDocuments.filter(d => d.selected).length === 0}
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '1rem' }}
            >
              {isScrapingUrl ? (
                <>
                  <Loader2 size={18} className="spin" />
                  מעבד מסמכים...
                </>
              ) : (
                <>
                  <Download size={18} />
                  הורד ועבד {scrapedDocuments.filter(d => d.selected).length} מסמכים
                </>
              )}
            </button>
          </div>
        )}

        {/* Scraped Metadata Preview */}
        {scrapedMetadata && (
          <div style={{
            marginTop: '1rem',
            padding: '1rem',
            background: 'rgba(124, 58, 237, 0.1)',
            borderRadius: '8px',
            borderRight: '4px solid #7c3aed',
          }}>
            <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>פרטי מכרז שזוהו:</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.25rem 1rem', fontSize: '0.9rem' }}>
              {scrapedMetadata.tender_name && (
                <>
                  <span style={{ color: '#888' }}>שם:</span>
                  <span>{scrapedMetadata.tender_name}</span>
                </>
              )}
              {scrapedMetadata.tender_number && (
                <>
                  <span style={{ color: '#888' }}>מספר:</span>
                  <span>{scrapedMetadata.tender_number}</span>
                </>
              )}
              {scrapedMetadata.issuing_body && (
                <>
                  <span style={{ color: '#888' }}>גוף מפרסם:</span>
                  <span>{scrapedMetadata.issuing_body}</span>
                </>
              )}
              {scrapedMetadata.submission_deadline && (
                <>
                  <span style={{ color: '#888' }}>מועד הגשה:</span>
                  <span>{scrapedMetadata.submission_deadline}</span>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Upload Section */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Upload size={20} style={{ color: '#00d4ff' }} />
          העלאת מסמכים ידנית
        </h3>

        <div
          className={`upload-zone ${isDragging ? 'dragging' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          style={{
            border: `2px dashed ${isDragging ? '#00d4ff' : '#333'}`,
            borderRadius: '12px',
            padding: '2rem',
            textAlign: 'center',
            background: isDragging ? 'rgba(0, 212, 255, 0.05)' : 'rgba(255,255,255,0.02)',
            transition: 'all 0.3s ease',
            cursor: 'pointer',
          }}
          onClick={() => document.getElementById('fileInput')?.click()}
        >
          <input
            id="fileInput"
            type="file"
            multiple
            accept=".pdf,.docx,.xlsx,.doc,.xls,.zip"
            style={{ display: 'none' }}
            onChange={handleFileInput}
          />
          <Upload size={36} style={{ color: isDragging ? '#00d4ff' : '#666', marginBottom: '0.75rem' }} />
          <p style={{ fontSize: '1rem', marginBottom: '0.25rem' }}>
            גרור קבצים לכאן או לחץ לבחירה
          </p>
          <p style={{ color: '#666', fontSize: '0.8rem' }}>
            PDF, DOCX, XLSX, ZIP
          </p>
        </div>

        {/* PDF Extraction Progress indicator */}
        {extractionProgress && (
          <div style={{
            marginTop: '1rem',
            padding: '0.75rem 1rem',
            background: 'rgba(0, 212, 255, 0.1)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}>
            <Loader2 size={18} className="spin" style={{ color: '#00d4ff' }} />
            <span style={{ color: '#00d4ff', fontSize: '0.9rem' }}>{extractionProgress}</span>
          </div>
        )}

        {/* Manual text input toggle */}
        <button
          onClick={() => setShowManualInput(!showManualInput)}
          style={{
            marginTop: '1rem',
            padding: '0.5rem 1rem',
            background: 'transparent',
            border: '1px solid #333',
            borderRadius: '8px',
            color: '#888',
            cursor: 'pointer',
            fontSize: '0.875rem',
          }}
        >
          {showManualInput ? 'הסתר הדבקה ידנית' : '📋 הדבקת טקסט ידנית (אם PDF לא עובד)'}
        </button>

        {showManualInput && (
          <div style={{ marginTop: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888', fontSize: '0.875rem' }}>
              הדבק כאן טקסט מהמכרז (העתק מה-PDF):
            </label>
            <textarea
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              placeholder="הדבק את תוכן המכרז כאן..."
              style={{
                width: '100%',
                minHeight: '200px',
                padding: '1rem',
                borderRadius: '8px',
                border: '1px solid #333',
                background: 'rgba(255,255,255,0.05)',
                color: '#fff',
                fontSize: '0.9rem',
                resize: 'vertical',
              }}
            />
            {manualText.length > 0 && (
              <p style={{ color: '#22c55e', fontSize: '0.8rem', marginTop: '0.5rem' }}>
                ✓ {manualText.length} תווים הוזנו
              </p>
            )}
          </div>
        )}

        {/* Document Type Legend */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.75rem',
          marginTop: '1.5rem',
          padding: '1rem',
          background: 'rgba(255,255,255,0.02)',
          borderRadius: '8px',
        }}>
          <span style={{ color: '#888', fontSize: '0.875rem', marginLeft: '0.5rem' }}>סוגי מסמכים:</span>
          {documentTypes.map((type) => (
            <div
              key={type.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.25rem 0.75rem',
                background: type.color + '15',
                borderRadius: '6px',
                fontSize: '0.8rem',
              }}
            >
              <type.icon size={14} style={{ color: type.color }} />
              <span style={{ color: type.color }}>{type.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Uploaded Documents */}
      {documents.length > 0 && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>מסמכים שהועלו ({documents.length})</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {documents.map((doc) => {
              const docType = documentTypes.find((t) => t.id === doc.detectedType);
              return (
                <div
                  key={doc.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    padding: '1rem',
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: '8px',
                    borderRight: doc.detectedType && docType ? `3px solid ${docType.color}` : '3px solid #333',
                  }}
                >
                  <FileText size={24} style={{ color: docType?.color || '#666' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500 }}>{doc.name}</div>
                    <div style={{ fontSize: '0.8rem', color: '#888', display: 'flex', gap: '1rem' }}>
                      <span>{formatFileSize(doc.size)}</span>
                      {doc.pages && <span>{doc.pages} עמודים</span>}
                      {doc.detectedType && docType && (
                        <span style={{ color: docType.color }}>{docType.label}</span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {doc.status === 'uploading' && <Loader2 size={20} className="spin" style={{ color: '#00d4ff' }} />}
                    {doc.status === 'processing' && <Clock size={20} style={{ color: '#f59e0b' }} />}
                    {doc.status === 'done' && <CheckCircle size={20} style={{ color: '#22c55e' }} />}
                    {doc.status === 'error' && <AlertCircle size={20} style={{ color: '#ef4444' }} />}
                    <button
                      onClick={() => removeDocument(doc.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '0.25rem',
                        color: '#666',
                      }}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {documents.every((d) => d.status === 'done') && (
            <button
              onClick={startProcessing}
              disabled={processingStep > 0}
              className="btn-primary"
              style={{ marginTop: '1.5rem', width: '100%' }}
            >
              {processingStep > 0 ? (
                <>
                  <Loader2 size={18} className="spin" />
                  מעבד מסמכים...
                </>
              ) : (
                <>
                  <FileSearch size={18} />
                  התחל עיבוד מסמכים
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* Processing Progress */}
      {processingStep > 0 && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>תהליך עיבוד</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {processingSteps.map((step, index) => {
              const stepNum = index + 1;
              const isActive = processingStep === stepNum;
              const isDone = processingStep > stepNum;
              return (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    padding: '1rem',
                    background: isActive ? 'rgba(0, 212, 255, 0.1)' : 'rgba(255,255,255,0.02)',
                    borderRadius: '8px',
                    opacity: processingStep < stepNum ? 0.5 : 1,
                  }}
                >
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: isDone ? '#22c55e' : isActive ? '#00d4ff' : '#333',
                      color: 'white',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                    }}
                  >
                    {isDone ? <CheckCircle size={18} /> : isActive ? <Loader2 size={18} className="spin" /> : stepNum}
                  </div>
                  <div>
                    <div style={{ fontWeight: 500, color: isDone ? '#22c55e' : isActive ? '#00d4ff' : '#ccc' }}>
                      {step.label}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#888' }}>{step.description}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="card" style={{ marginBottom: '1.5rem', borderRight: '4px solid #ef4444' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#ef4444' }}>
            <AlertCircle size={24} />
            <div>
              <div style={{ fontWeight: 600 }}>שגיאה</div>
              <div style={{ fontSize: '0.9rem', color: '#f87171' }}>{error}</div>
            </div>
          </div>
        </div>
      )}

      {/* AI Summary */}
      {aiSummary && (
        <div className="card" style={{ marginBottom: '1.5rem', borderRight: '4px solid #22c55e' }}>
          <h3 style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle size={20} style={{ color: '#22c55e' }} />
            סיכום AI
          </h3>
          <p style={{ color: '#ccc', lineHeight: 1.6 }}>{aiSummary}</p>
        </div>
      )}

      {/* Extracted Metadata */}
      {metadata && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Hash size={20} style={{ color: '#7c3aed' }} />
            פרטי מכרז שחולצו
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1rem',
          }}>
            <MetadataItem icon={Hash} label="מספר מכרז" value={metadata.tenderNumber} />
            <MetadataItem icon={FileText} label="שם המכרז" value={metadata.tenderName} />
            <MetadataItem icon={Building} label="גוף מזמין" value={metadata.issuingBody} />
            <MetadataItem icon={Calendar} label="תאריך פרסום" value={metadata.publishDate} />
            <MetadataItem icon={Clock} label="מועד הגשה" value={metadata.submissionDeadline} color="#ef4444" />
            <MetadataItem icon={AlertCircle} label="מועד הבהרות" value={metadata.clarificationDeadline} color="#f59e0b" />
            <MetadataItem icon={DollarSign} label="ערבות הצעה" value={metadata.guaranteeAmount} />
            <MetadataItem icon={Calendar} label="תקופת התקשרות" value={metadata.contractPeriod} />
            <MetadataItem icon={FileSearch} label="קטגוריה" value={metadata.category} color="#00d4ff" />
            <MetadataItem icon={Eye} label="משקל מחיר" value={metadata.priceWeight} />
            <MetadataItem icon={Eye} label="משקל איכות" value={metadata.qualityWeight} />
          </div>

          {/* Save Button */}
          {!savedTenderId && (
            <button
              onClick={saveTender}
              disabled={isSaving}
              className="btn-primary"
              style={{ marginTop: '1.5rem', width: '100%', background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}
            >
              {isSaving ? (
                <>
                  <Loader2 size={18} className="spin" />
                  שומר מכרז...
                </>
              ) : (
                <>
                  <Save size={18} />
                  שמור מכרז במערכת
                </>
              )}
            </button>
          )}

          {savedTenderId && (
            <div style={{
              marginTop: '1.5rem',
              padding: '1.5rem',
              background: 'rgba(34, 197, 94, 0.1)',
              borderRadius: '8px',
              borderRight: '4px solid #22c55e',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <CheckCircle size={24} style={{ color: '#22c55e' }} />
                <div>
                  <div style={{ fontWeight: 600, color: '#22c55e' }}>המכרז נשמר בהצלחה!</div>
                  <div style={{ fontSize: '0.9rem', color: '#86efac' }}>
                    {savedTenderName} - מזהה: {savedTenderId.substring(0, 8)}...
                  </div>
                </div>
              </div>

              {/* Navigation buttons */}
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <button
                  onClick={() => navigate('/')}
                  className="btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  עבור לדשבורד
                  <ArrowRight size={18} />
                </button>
                <button
                  onClick={() => navigate('/gates')}
                  className="btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}
                >
                  המשך לניתוח תנאי סף
                  <ArrowRight size={18} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Extracted Definitions */}
      {definitions.length > 0 && (
        <div className="card">
          <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Book size={20} style={{ color: '#f59e0b' }} />
            הגדרות שחולצו מהמכרז
          </h3>
          <p style={{ color: '#888', fontSize: '0.875rem', marginBottom: '1rem' }}>
            "המילון הפנימי" של המכרז - הגדרות שמשנות משמעויות
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {definitions.map((def, index) => (
              <div
                key={index}
                style={{
                  padding: '1rem',
                  background: 'rgba(245, 158, 11, 0.05)',
                  borderRadius: '8px',
                  borderRight: '3px solid #f59e0b',
                }}
              >
                <div style={{ fontWeight: 600, color: '#f59e0b', marginBottom: '0.5rem' }}>
                  "{def.term}"
                </div>
                <div style={{ color: '#ccc', fontSize: '0.9rem' }}>{def.definition}</div>
              </div>
            ))}
          </div>
        </div>
      )}

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

function MetadataItem({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ size: number; style?: React.CSSProperties }>;
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div style={{
      padding: '1rem',
      background: 'rgba(255,255,255,0.03)',
      borderRadius: '8px',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '0.75rem',
    }}>
      <Icon size={20} style={{ color: color || '#888', marginTop: '2px' }} />
      <div>
        <div style={{ fontSize: '0.8rem', color: '#888', marginBottom: '0.25rem' }}>{label}</div>
        <div style={{ fontWeight: 500, color: color || '#fff' }}>{value}</div>
      </div>
    </div>
  );
}
