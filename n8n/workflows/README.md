# Tenderix n8n Workflows

## TDX-P2-Gate-Matching (REST API Version)

Gate Condition Matching workflow using Supabase REST API.

### Setup Instructions

#### 1. Create Variables in n8n

Go to **Settings** → **Variables** and add:

| Variable | Value |
|----------|-------|
| `SUPABASE_URL` | `https://lhwkkpkxqfwcmgfyxaag.supabase.co` |
| `SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (your anon key) |

#### 2. Create HTTP Header Auth Credential

Go to **Credentials** → **Add Credential** → **Header Auth**

```
Name: Supabase Auth
Header Name: Authorization
Header Value: Bearer <your-anon-key-or-service-role-key>
```

#### 3. Import Workflow

1. Open n8n
2. Go to **Workflows** → **Import from File**
3. Select `TDX-P2-Gate-Matching-REST.json`
4. Click **Import**

#### 4. Update Credential References

After import, update each HTTP Request node (6 total) to use the "Supabase Auth" credential.

#### 5. Activate Workflow

Click **Active** toggle in the top-right corner.

---

### Usage

#### Webhook Endpoint (n8n Cloud)

```
POST https://<your-n8n-instance>.app.n8n.cloud/webhook/gate-matching
```

#### Request Body

```json
{
  "tender_id": "e1e1e1e1-0000-0000-0000-000000000001",
  "org_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

#### Test with curl

```bash
curl -X POST https://<your-n8n-instance>.app.n8n.cloud/webhook/gate-matching \
  -H "Content-Type: application/json" \
  -d '{
    "tender_id": "e1e1e1e1-0000-0000-0000-000000000001",
    "org_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
  }'
```

#### Response Example

```json
{
  "success": true,
  "tender_id": "e1e1e1e1-0000-0000-0000-000000000001",
  "summary": {
    "total": 15,
    "meets": 13,
    "partially_meets": 0,
    "does_not_meet": 0,
    "unknown": 2,
    "eligibility": "ELIGIBLE"
  },
  "blocking_conditions": [],
  "recommendations": [
    "עומד ב-13 מתוך 15 תנאים",
    "2 תנאים דורשים השלמת מידע או בדיקה ידנית"
  ],
  "timestamp": "2026-01-05T12:00:00.000Z"
}
```

---

### Workflow Structure

```
Webhook POST /gate-matching
         ↓
┌────────────────────────────────────┐
│ 5 Parallel HTTP GET Requests       │
│ - GET /gate_conditions             │
│ - GET /company_financials          │
│ - GET /company_projects            │
│ - GET /company_certifications      │
│ - GET /company_personnel           │
└────────────────────────────────────┘
         ↓
    Merge All Data
         ↓
    Evaluate Conditions (JavaScript)
         ↓
    Prepare Updates
         ↓
    ┌───────┴───────┐
    ↓               ↓
Split & Update   Get Summary
Each Condition   & Upsert
(PATCH loop)     (POST)
    ↓               ↓
    └───────┬───────┘
            ↓
    Prepare Response
            ↓
    Respond to Webhook
```

---

### Condition Types Evaluated

| Type | Evaluation Logic |
|------|-----------------|
| **FINANCIAL** | Average revenue over N years vs required amount |
| **PROJECT (Single)** | Max project value vs required amount |
| **PROJECT (Count)** | Count of government/municipal projects |
| **PROJECT (Cameras)** | Projects with camera count >= required |
| **PROJECT (VMS)** | Projects with Milestone/Genetec integration |
| **PROJECT (Maintenance)** | Maintenance projects camera count |
| **CERTIFICATION** | Match cert type/name against company certs |
| **PERSONNEL** | Find staff with required certifications |
| **DOCUMENT** | Insurance/Guarantee - marked as UNKNOWN (manual) |

---

### Status Values

| Status | Description |
|--------|-------------|
| `MEETS` | Company meets the requirement (confidence 100%) |
| `PARTIALLY_MEETS` | Partial compliance (needs verification) |
| `DOES_NOT_MEET` | Company does not meet requirement |
| `UNKNOWN` | Cannot determine - missing data or manual check needed |

---

### Eligibility Logic

| Condition | Result |
|-----------|--------|
| Any mandatory condition = DOES_NOT_MEET | `NOT_ELIGIBLE` |
| Any non-mandatory = DOES_NOT_MEET or >2 UNKNOWN | `CONDITIONAL` |
| All mandatory MEETS, <3 UNKNOWN | `ELIGIBLE` |

---

### Files

- `TDX-P2-Gate-Matching-REST.json` - Main workflow (Supabase REST API)
- `TDX-P2-Gate-Matching.json` - Legacy Postgres version (if needed)
