// js/n8n.js
// n8n Webhook Integration for Tenderix

const N8N = {
  // ============================================
  // BASE REQUEST HANDLER
  // ============================================

  /**
   * Make a request to n8n webhook
   */
  async call(endpoint, data = {}, options = {}) {
    const {
      method = 'POST',
      timeout = CONFIG.TIMEOUTS.DEFAULT,
      retries = 2
    } = options;

    const url = CONFIG.N8N_BASE_URL + endpoint;

    let lastError;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: method !== 'GET' ? JSON.stringify(data) : undefined,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(`n8n webhook failed: ${response.status} - ${errorBody}`);
        }

        const result = await response.json();
        return result;

      } catch (error) {
        lastError = error;
        console.warn(`n8n call attempt ${attempt + 1} failed:`, error.message);

        if (error.name === 'AbortError') {
          throw new Error('Request timeout - please try again');
        }

        // Wait before retry (exponential backoff)
        if (attempt < retries) {
          await this.delay(Math.pow(2, attempt) * 1000);
        }
      }
    }

    throw lastError;
  },

  /**
   * Delay helper
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  // ============================================
  // DOCUMENT UPLOAD & PROCESSING
  // ============================================

  /**
   * Upload tender document for processing
   */
  async uploadTender(file, metadata = {}) {
    // Validate file
    if (!this.validateFile(file)) {
      throw new Error('Invalid file type or size');
    }

    // Show progress notification
    Utils.showToast('info', 'מעלה קובץ...', file.name);

    try {
      // Convert file to base64
      const base64Content = await this.fileToBase64(file);

      const result = await this.call(
        CONFIG.WEBHOOKS.UPLOAD_TENDER,
        {
          file: {
            name: file.name,
            type: file.type,
            size: file.size,
            content: base64Content
          },
          metadata: {
            ...metadata,
            uploaded_at: new Date().toISOString(),
            user_agent: navigator.userAgent
          }
        },
        { timeout: CONFIG.TIMEOUTS.UPLOAD }
      );

      Utils.showToast('success', 'הקובץ הועלה בהצלחה', 'מתחיל בניתוח...');
      return result;

    } catch (error) {
      Utils.showToast('error', 'שגיאה בהעלאה', error.message);
      throw error;
    }
  },

  /**
   * Parse uploaded document
   */
  async parseDocument(documentId) {
    return this.call(
      CONFIG.WEBHOOKS.PARSE_DOCUMENT,
      { document_id: documentId },
      { timeout: CONFIG.TIMEOUTS.ANALYSIS }
    );
  },

  // ============================================
  // AI ANALYSIS
  // ============================================

  /**
   * Analyze gate conditions
   */
  async analyzeGateConditions(tenderId, options = {}) {
    Utils.showToast('info', 'מנתח תנאי סף...', 'זה עשוי לקחת מספר דקות');

    try {
      const result = await this.call(
        CONFIG.WEBHOOKS.ANALYZE_GATES,
        {
          tender_id: tenderId,
          include_recommendations: options.includeRecommendations ?? true,
          company_profile: options.companyProfile ?? null
        },
        { timeout: CONFIG.TIMEOUTS.ANALYSIS }
      );

      Utils.showToast('success', 'ניתוח תנאי סף הושלם', `${result.conditions?.length || 0} תנאים נותחו`);
      return result;

    } catch (error) {
      Utils.showToast('error', 'שגיאה בניתוח', error.message);
      throw error;
    }
  },

  /**
   * Analyze specifications
   */
  async analyzeSpecifications(tenderId, options = {}) {
    Utils.showToast('info', 'מנתח מפרט טכני...', 'זה עשוי לקחת מספר דקות');

    try {
      const result = await this.call(
        CONFIG.WEBHOOKS.ANALYZE_SPEC,
        {
          tender_id: tenderId,
          depth: options.depth ?? 'detailed',
          include_gaps: options.includeGaps ?? true
        },
        { timeout: CONFIG.TIMEOUTS.ANALYSIS }
      );

      Utils.showToast('success', 'ניתוח מפרט הושלם', `${result.sections?.length || 0} סעיפים נותחו`);
      return result;

    } catch (error) {
      Utils.showToast('error', 'שגיאה בניתוח', error.message);
      throw error;
    }
  },

  /**
   * Analyze pricing
   */
  async analyzePricing(tenderId, options = {}) {
    return this.call(
      CONFIG.WEBHOOKS.ANALYZE_PRICING,
      {
        tender_id: tenderId,
        market_data: options.marketData ?? true,
        competitor_pricing: options.competitorPricing ?? true
      },
      { timeout: CONFIG.TIMEOUTS.ANALYSIS }
    );
  },

  /**
   * Full tender analysis (all components)
   */
  async analyzeFullTender(tenderId, options = {}) {
    Utils.showToast('info', 'מבצע ניתוח מלא...', 'זה עשוי לקחת מספר דקות');

    try {
      // Run all analyses in parallel
      const [gates, specs, pricing, competitors] = await Promise.all([
        this.analyzeGateConditions(tenderId, options),
        this.analyzeSpecifications(tenderId, options),
        this.analyzePricing(tenderId, options),
        this.getCompetitorIntelligence(tenderId)
      ]);

      // Generate overall score
      const decision = await this.generateDecision(tenderId);

      Utils.showToast('success', 'ניתוח מלא הושלם', `ציון: ${decision.score}/100`);

      return {
        gates,
        specs,
        pricing,
        competitors,
        decision
      };

    } catch (error) {
      Utils.showToast('error', 'שגיאה בניתוח', error.message);
      throw error;
    }
  },

  // ============================================
  // COMPETITOR INTELLIGENCE
  // ============================================

  /**
   * Get competitor intelligence for tender
   */
  async getCompetitorIntelligence(tenderId) {
    return this.call(
      CONFIG.WEBHOOKS.GET_COMPETITORS,
      { tender_id: tenderId },
      { timeout: CONFIG.TIMEOUTS.ANALYSIS }
    );
  },

  /**
   * Get competitor history
   */
  async getCompetitorHistory(companyName, options = {}) {
    return this.call(
      CONFIG.WEBHOOKS.COMPETITOR_HISTORY,
      {
        company_name: companyName,
        years: options.years ?? 3,
        include_analysis: options.includeAnalysis ?? true
      }
    );
  },

  // ============================================
  // DECISION SUPPORT
  // ============================================

  /**
   * Generate GO/NO-GO decision
   */
  async generateDecision(tenderId) {
    Utils.showToast('info', 'מחשב החלטה...', 'מנתח את כל הנתונים');

    try {
      const result = await this.call(
        CONFIG.WEBHOOKS.GENERATE_DECISION,
        { tender_id: tenderId },
        { timeout: CONFIG.TIMEOUTS.ANALYSIS }
      );

      const recommendation = result.recommendation === 'GO'
        ? 'GO - מומלץ להגיש'
        : 'NO-GO - לא מומלץ';

      Utils.showToast(
        result.recommendation === 'GO' ? 'success' : 'warning',
        recommendation,
        `ציון: ${result.score}/100`
      );

      return result;

    } catch (error) {
      Utils.showToast('error', 'שגיאה בחישוב', error.message);
      throw error;
    }
  },

  /**
   * Calculate AI score
   */
  async calculateScore(tenderId, factors = {}) {
    return this.call(
      CONFIG.WEBHOOKS.CALCULATE_SCORE,
      {
        tender_id: tenderId,
        factors
      }
    );
  },

  // ============================================
  // REPORTS & EXPORT
  // ============================================

  /**
   * Export tender report
   */
  async exportReport(tenderId, options = {}) {
    const {
      format = 'pdf',
      sections = ['summary', 'gates', 'specs', 'competitors', 'decision'],
      language = 'he'
    } = options;

    Utils.showToast('info', 'מייצר דוח...', 'זה עשוי לקחת מספר שניות');

    try {
      const result = await this.call(
        CONFIG.WEBHOOKS.EXPORT_REPORT,
        {
          tender_id: tenderId,
          format,
          sections,
          language
        },
        { timeout: CONFIG.TIMEOUTS.EXPORT }
      );

      // If we got a download URL, trigger download
      if (result.download_url) {
        this.downloadFile(result.download_url, result.filename || 'report.pdf');
      }

      Utils.showToast('success', 'הדוח מוכן', 'ההורדה תתחיל מיד');
      return result;

    } catch (error) {
      Utils.showToast('error', 'שגיאה בייצוא', error.message);
      throw error;
    }
  },

  /**
   * Generate proposal document
   */
  async generateProposal(tenderId, options = {}) {
    Utils.showToast('info', 'מייצר הצעה...', 'זה עשוי לקחת מספר דקות');

    try {
      const result = await this.call(
        CONFIG.WEBHOOKS.GENERATE_PROPOSAL,
        {
          tender_id: tenderId,
          template: options.template ?? 'default',
          include_pricing: options.includePricing ?? true,
          company_profile: options.companyProfile ?? null
        },
        { timeout: CONFIG.TIMEOUTS.EXPORT }
      );

      Utils.showToast('success', 'ההצעה מוכנה', 'ניתן להוריד את המסמך');
      return result;

    } catch (error) {
      Utils.showToast('error', 'שגיאה ביצירת הצעה', error.message);
      throw error;
    }
  },

  // ============================================
  // AI CHAT
  // ============================================

  /**
   * Ask AI a question about a tender
   */
  async askAI(question, context = {}) {
    return this.call(
      CONFIG.WEBHOOKS.AI_CHAT,
      {
        question,
        context: {
          tender_id: context.tenderId,
          section: context.section,
          history: context.history ?? [],
          language: 'he'
        }
      }
    );
  },

  /**
   * Get AI summary of tender
   */
  async summarizeTender(tenderId, options = {}) {
    return this.call(
      CONFIG.WEBHOOKS.AI_SUMMARIZE,
      {
        tender_id: tenderId,
        length: options.length ?? 'medium',
        focus: options.focus ?? 'all'
      }
    );
  },

  // ============================================
  // HELPERS
  // ============================================

  /**
   * Convert file to base64
   */
  fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        // Remove data URL prefix to get pure base64
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
      reader.readAsDataURL(file);
    });
  },

  /**
   * Validate file before upload
   */
  validateFile(file) {
    // Check size
    if (file.size > CONFIG.UPLOAD.MAX_FILE_SIZE) {
      Utils.showToast('error', 'הקובץ גדול מדי', `מקסימום ${CONFIG.UPLOAD.MAX_FILE_SIZE / 1024 / 1024}MB`);
      return false;
    }

    // Check type
    if (!CONFIG.UPLOAD.ALLOWED_TYPES.includes(file.type)) {
      const ext = '.' + file.name.split('.').pop().toLowerCase();
      if (!CONFIG.UPLOAD.ALLOWED_EXTENSIONS.includes(ext)) {
        Utils.showToast('error', 'סוג קובץ לא נתמך', 'יש להעלות PDF, Word או Excel');
        return false;
      }
    }

    return true;
  },

  /**
   * Trigger file download
   */
  downloadFile(url, filename) {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  /**
   * Check n8n connectivity
   */
  async healthCheck() {
    try {
      const response = await fetch(CONFIG.N8N_BASE_URL + '/health', {
        method: 'GET',
        timeout: 5000
      });
      return response.ok;
    } catch {
      return false;
    }
  }
};

// Export globally
window.N8N = N8N;

console.log('Tenderix n8n integration loaded');
