# Tenderix Project Session State

**Last Updated:** 2026-01-05

---

## Completed Work

### Database (V3 Architecture)
- 27 tables created with full schema
- 4 Pillars: P1 (Document Ingestion), P2 (Gate Conditions), P3 (Pricing), P4 (Submission)
- RLS policies enabled
- All migrations applied to Supabase

### Seed Data
- Test organization: "דקל מערכות אבטחה בע"מ"
- Company financials (3 years)
- Company projects (5 projects)
- Company certifications (ISO 9001, ISO 27001, etc.)
- Company personnel (4 employees with certifications)

### Test Tender
- Tender: "מכרז למערכות אבטחה - עיריית חולון"
- 15 gate conditions (FINANCIAL, PROJECT, CERTIFICATION, PERSONNEL types)
- Mixed mandatory/optional conditions

### n8n Workflow
- TDX-P2-Gate-Matching-v3.json (latest)
- Webhook-triggered REST API workflow
- Evaluates company profile against tender gate conditions
- Updates gate_conditions table with status and evidence
- Upserts summary to gate_conditions_summary table

---

## Test IDs

| Entity | UUID |
|--------|------|
| **Tender** | `e1e1e1e1-0000-0000-0000-000000000001` |
| **Organization** | `a1b2c3d4-e5f6-7890-abcd-ef1234567890` |

---

## Test Webhook

```powershell
$body = @{
    tender_id = "e1e1e1e1-0000-0000-0000-000000000001"
    org_id = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://daviderez.app.n8n.cloud/webhook/gate-matching" -Method POST -ContentType "application/json" -Body $body
```

---

## Next Steps

1. **Test Gate Matching workflow in n8n**
   - Import TDX-P2-Gate-Matching-v3.json
   - Activate workflow
   - Test with webhook call

2. **Verify results**
   - Check gate_conditions table for updated status
   - Check gate_conditions_summary table for summary record

3. **Build remaining workflows**
   - P1: Document Ingestion
   - P3: Pricing Calculator
   - P4: Submission Builder

---

## Links

| Service | URL |
|---------|-----|
| **GitHub** | https://github.com/davidpacold/tenderix-dev |
| **Supabase** | https://supabase.com/dashboard/project/rerfjgjwjqodevkvhkxu |
| **n8n Cloud** | https://daviderez.app.n8n.cloud |

---

## Key Files

```
C:\dev\tenderix-dev\
├── database\
│   ├── schema\
│   │   └── v3_complete_schema.sql
│   └── seeds\
│       ├── test_organization.sql
│       └── test_tender.sql
├── n8n\
│   └── workflows\
│       └── TDX-P2-Gate-Matching-v3.json
├── config\
│   └── .env
└── TENDERIX_SESSION_STATE.md
```

---

## Supabase Credentials

- **URL:** `https://rerfjgjwjqodevkvhkxu.supabase.co`
- **Anon Key:** See `config/.env`
- **n8n Credential:** "Supabase account 3" (Header Auth)
