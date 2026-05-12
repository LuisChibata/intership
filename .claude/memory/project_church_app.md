---
name: project-church-app
description: "Church Management Service internship project — Flutter app for Luis's church, first feature is Stats/Insights page"
metadata: 
  node_type: memory
  type: project
  originSessionId: 4ab73896-e009-4bea-8b4e-76e0214e4f57
---

# Church Management Service — Project Overview

## Context
Luis's internship at his church. Building a church management platform for his Pastor. Goal is an **expandable platform** — Stats page is the first feature.

## Work Philosophy (Non-negotiable)
- Well-coded, not vibe-coded. Honest, ask for help when needed, ultra careful.
- One thing at a time. Test as we work.

## Tech Stack
- **Frontend**: Flutter (multi-platform — Android, iOS, Web, Linux, macOS, Windows)
- **Backend**: TBD — knowledge materials suggest GCP IAM + MariaDB, but not confirmed
- **Current Flutter app**: `flutter/flutter_application_1/` — boilerplate counter app, nothing built yet

## First Feature: Stats / Insights Page

### What it is
A weekly "Insights Sheet" the Pastor uses to track church group (Bible Talk) performance.

### Data Model (from prototype)
Organized into **Sectors** → **Bible Talks (BTs)**:

**Sectors:** Students | Singles/Marrieds no kids | Marrieds with kids

**Per Bible Talk:**
- leaders (couple name, e.g. "Luis & Min")
- assistants
- disciplesJan1 (disciples count at start of year)
- disciplesNow (current count)
- growth (% YTD)
- btVisitors (visitors at BT this week)
- sundayVisitors (visitors at Sunday service this week)
- missing (names of missing members)
- studies (ongoing Bible study names)
- targets (people targeted for becoming Christians)
- target (financial contribution goal, $)
- ytd (financial contribution year-to-date, $)
- contactGoal (contact goal per couple, integer)
- history (6-week sparkline data array)

**Totals:** total disciples, BT visitors, Sunday visitors, contribution progress

**Weekly section:** Victories & Breakthroughs + Improvements & Innovations (freeform text entries with leader name)

### UI Prototype (Claude Design)
Two variants designed in React/JSX:
- **Variant A**: Sidebar nav + dense table, inline editing, sparkline trends, expandable rows, KPI strip
- **Variant B**: Notion-database style, top tabs, grouped collapsible rows, right-side detail pane

Both have: search/filter, sector filtering, "has missing" filter, "add BT" modal, role-based edit access

### Roles in prototype
- `leader` — can edit data
- `admin` — can edit data
- viewer (implied) — read only

**Why:** Core project context. Reference for all feature development decisions.
**How to apply:** Use when designing data models, UI components, backend schema, or feature scope.
