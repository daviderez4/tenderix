# Tenderix Skills - Claude Code Integration

## Overview
This directory contains Claude Code skills for the Tenderix tender analysis system.

## Available Skills

### Main Orchestrator
- **`/tenderix`** - Master orchestrator that coordinates all 4 pillars

### 4 Pillars Analysis

| Pillar | Skill | Description |
|--------|-------|-------------|
| P1 | `/p1-intake` | Document intake, metadata extraction, definitions |
| P2 | `/p2-gates` | Gate conditions analysis (basic) |
| P2 | `/p2-gates-professional` | **Professional** gate analysis with regulatory interpretation |
| P3 | `/p3-specs` | Technical specifications & BOQ analysis |
| P4 | `/p4-competitors` | Competitor intelligence & market analysis |

### Core Principles
- **`/core-principles`** - Foundational rules (C1-C4) that apply to all modules

## Quick Start

```bash
# Full tender analysis
/tenderix

# Professional gate conditions analysis (recommended)
/p2-gates-professional

# Analyze specific pillar
/p1-intake
/p3-specs
/p4-competitors
```

## MCP Tools

The skills integrate with MCP servers providing these tools:

### gate-extractor (v3.0)
- `expert_gate_analysis` - Full expert analysis with Hebrew tables
- `compare_to_bidder_profile` - Compare requirements to bidder capabilities
- `generate_gap_solutions` - Creative gap closure suggestions
- `generate_strategic_questions` - Strategic clarification questions
- `format_hebrew_report` - Format analysis as readable Hebrew report
- `save_analysis_to_db` - Save results to Supabase

### tenderix
- `list_tenders` - List all tenders
- `get_tender` - Get tender details
- `get_gate_conditions` - Get gate conditions for tender
- `get_boq_items` - Get BOQ items

## Output Quality

The professional skills (especially P2) produce:
- Formatted Hebrew tables
- Regulatory/legal interpretation
- Gap identification with practical solutions
- Strategic notes for bidders
- Plain language summaries for executives

## Architecture

```
User Request
    |
    v
/tenderix (orchestrator)
    |
    +---> P1: Intake --> Extract definitions, metadata
    |
    +---> P2: Gates --> Analyze gate conditions (professional)
    |         |
    |         +--> Gap analysis --> Closure options
    |
    +---> P3: Specs --> BOQ, technical requirements
    |
    +---> P4: Competitors --> Market intelligence
    |
    v
GO/NO-GO Decision
```

## Core Principles (C1-C4)

All skills adhere to:
1. **C1: Full Traceability** - Every claim has source reference
2. **C2: Technical Dictionary** - Domain-specific terminology
3. **C3: Accumulation Logic** - No double-counting projects
4. **C4: Gap Closure** - Practical solutions for gaps
