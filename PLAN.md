# Dashboard Redesign Plan - Command Center

## Overview
Transform the Dashboard from a simple tender list to a professional "Command Center" with:
- Clickable tender cards with meaningful actions
- Favorites and delete functionality
- Visual workflow progress (P1 → P2 → P3 → P4 → Output)
- Easy navigation to any stage

## Data Model Changes

### Supabase: Add columns to `tenders` table
```sql
ALTER TABLE tenders ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT false;
ALTER TABLE tenders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
```

## New Components

### 1. TenderCard.tsx
- Visual card for each tender showing:
  - Title, issuing body, deadline
  - Workflow progress indicator (which stages completed)
  - Favorite star button (toggle)
  - Delete button (with confirmation)
  - Click to open TenderDetailModal

### 2. TenderDetailModal.tsx
- Modal showing tender details and workflow navigation
- Large workflow stepper (P1 → P2 → P3 → P4 → Output)
- Each stage clickable to navigate there
- Shows stage completion status
- Quick actions: Edit, Delete, Favorite

### 3. WorkflowProgress.tsx
- Horizontal stepper component
- Stages: P1 (Intake) → P2 (Gates) → P3 (BOQ) → P4 (Competitors) → Output
- Visual indicators: completed, current, pending
- Clickable for navigation

### 4. TenderFilters.tsx
- Filter bar at top of dashboard
- Filters: All, Favorites, Active, Completed
- Search by title

### 5. ConfirmDialog.tsx
- Reusable confirmation dialog
- For delete operations

## UI/UX Flow

```
┌─────────────────────────────────────────────────────────────┐
│  DASHBOARD - Command Center                                  │
├─────────────────────────────────────────────────────────────┤
│  [All] [★ Favorites] [Active] [Completed]     🔍 Search...  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ ★ מכרז לאספקת ציוד משרדי                            │    │
│  │ משרד הביטחון | Deadline: 15/02/2026                 │    │
│  │ ──○──●──○──○──○── (P2 in progress)                  │    │
│  │ [Open] [Delete]                                      │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ ☆ מכרז שירותי ניקיון                                │    │
│  │ עיריית תל אביב | Deadline: 20/02/2026               │    │
│  │ ●──●──●──○──○── (P3 in progress)                    │    │
│  │ [Open] [Delete]                                      │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘

When clicking "Open" or the card:

┌─────────────────────────────────────────────────────────────┐
│  מכרז לאספקת ציוד משרדי                           [X] Close │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────┐   ┌──────┐   ┌──────┐   ┌──────┐   ┌──────┐      │
│  │  P1  │──▶│  P2  │──▶│  P3  │──▶│  P4  │──▶│Output│      │
│  │Intake│   │Gates │   │ BOQ  │   │Comp. │   │      │      │
│  │  ✓   │   │ ●●○  │   │  -   │   │  -   │   │  -   │      │
│  └──────┘   └──────┘   └──────┘   └──────┘   └──────┘      │
│   Click to    Current                                        │
│   review      stage                                          │
│                                                              │
│  Details:                                                    │
│  • Issuing Body: משרד הביטחון                               │
│  • Deadline: 15/02/2026                                      │
│  • Status: P2 - Analyzing Gate Conditions                    │
│                                                              │
│  [★ Favorite] [🗑 Delete] [Continue to P2 →]                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Implementation Sequence

### Phase 1: Data Model
1. Add SQL columns to Supabase (is_favorite, updated_at)
2. Update TypeScript interfaces in tenderix.ts

### Phase 2: Reusable Components
3. Create ConfirmDialog.tsx
4. Create WorkflowProgress.tsx

### Phase 3: Tender Components
5. Create TenderCard.tsx
6. Create TenderDetailModal.tsx

### Phase 4: Dashboard Integration
7. Create TenderFilters.tsx
8. Refactor Dashboard.tsx to use new components

### Phase 5: API Layer
9. Add favorite/unfavorite API functions
10. Add delete tender API function

### Phase 6: Polish
11. Add animations and transitions
12. Test all interactions

## CSS Additions (in Dashboard.tsx or separate file)
- Card hover effects
- Modal animations
- Workflow stepper styles
- Filter button states

## Permissions Needed
- Run Supabase SQL for schema changes (user will do manually)
- No additional bash commands needed
