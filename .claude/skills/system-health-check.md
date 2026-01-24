# System Health Check Skill

Use this skill when the user asks to check if the Tenderix system components are working, or wants a status report on what's functional.

## What This Skill Does

Performs a comprehensive health check on all Tenderix system components:
1. Frontend pages (React)
2. MCP Server tools
3. n8n workflows
4. Database tables (Supabase)
5. API endpoints

## How to Run Health Check

### 1. Check MCP Server (gate-extractor)

```bash
# Check if MCP server can be imported
cd mcp-servers/gate-extractor && node -e "import('./index.js').then(() => console.log('MCP OK')).catch(e => console.error('MCP FAIL:', e.message))"
```

### 2. Check n8n Workflows via Webhook Test

For each critical workflow, send a test request:

```bash
# Gate extraction
curl -X POST "https://daviderez.app.n8n.cloud/webhook/gate-extraction" \
  -H "Content-Type: application/json" \
  -d '{"test": true}' \
  --max-time 10

# Gate matching
curl -X POST "https://daviderez.app.n8n.cloud/webhook/gate-matching" \
  -H "Content-Type: application/json" \
  -d '{"test": true}' \
  --max-time 10
```

### 3. Check Supabase Connection

```bash
# Using the frontend API
cd frontend && npm run test:api 2>/dev/null || echo "No API tests configured"
```

### 4. Check Frontend Build

```bash
cd frontend && npm run build
```

## Component Status Reference

| Component | Check Method | Expected Result |
|-----------|--------------|-----------------|
| MCP gate-extractor | Node import | No errors |
| n8n workflows | Webhook ping | 200 or timeout (OK) |
| Supabase | REST API call | 200 with data |
| Frontend | npm run build | Build success |

## MCP Tools Status

| Tool | Status | Test |
|------|--------|------|
| expert_gate_analysis | Working | Requires document text |
| compare_to_bidder_profile | Working | Requires tender + profile |
| generate_gap_solutions | Working | Requires gap + context |
| generate_strategic_questions | Working | Requires analysis |
| format_hebrew_report | Working | Pure function |
| save_analysis_to_db | Working | Requires Supabase |
| chunk_document | Working | Pure function |

## n8n Workflows Status

### Working (Tested)
- 01-document-intake-enhanced
- 02-gate-matching-enhanced
- 03-boq-analysis-enhanced
- 05-full-analysis-pipeline
- TDX-Professional-Gate-Extraction
- TDX-Gate-Analysis
- tdx-drive-* (Google Drive integration)
- tdx-scrape-documents
- TDX-Import
- final-decision-workflow-fixed
- TDX-ReAnalysis

### Partial/Needs Testing
- 04-competitor-intelligence
- TDX-Historical-Bids
- competitor-analysis-workflow-fixed
- pricing-recommendation-workflow-fixed

### Not Working
- TDX-PreviousTender-Analysis (logic not implemented)
- TDX-Version-Management (unclear purpose)

## Database Tables Status

All tables exist in Supabase:
- Core: tenders, organizations, users
- Gates: gate_conditions, gate_conditions_summary
- Company: company_projects, company_financials, company_personnel, company_certifications
- Analysis: boq_items, spec_items, sow_analysis, contract_clauses
- Competitors: competitors, tender_competitors
- Decision: final_decisions, decision_scenarios
- Support: tender_documents, clarification_questions, technical_dictionary, tender_definitions

## Quick Health Report Template

```
TENDERIX SYSTEM HEALTH CHECK
============================
Date: [DATE]

FRONTEND:      [OK/FAIL] - Build status
MCP SERVER:    [OK/FAIL] - Tools available
N8N WORKFLOWS: [X/25] - Active workflows
SUPABASE:      [OK/FAIL] - DB connection
AI (Claude):   [OK/FAIL] - API key valid

CRITICAL PATH:
PDF Upload    → [OK/FAIL]
Gate Extract  → [OK/FAIL]
Gate Match    → [OK/FAIL]
Decision Gen  → [OK/FAIL]
```

## Troubleshooting

### MCP Server Issues
- Check ANTHROPIC_API_KEY is set
- Check SUPABASE_KEY is set
- Run: `node --experimental-modules mcp-servers/gate-extractor/index.js`

### n8n Issues
- Check webhook URLs are accessible
- Verify n8n cloud subscription is active
- Check workflow activation status in n8n UI

### Supabase Issues
- Verify service role key has correct permissions
- Check RLS policies allow access
- Test with curl to Supabase REST API
