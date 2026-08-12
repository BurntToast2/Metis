# Metis

Metis is a desktop application for managing and extracting structured data from Component Maintenance Manuals (CMMs) used in aircraft maintenance. It combines a searchable CMM library with LLM-assisted extraction of key sections — turning long, unstructured PDF manuals into navigable, task-level data.

## Overview

Aircraft maintenance manuals are long, densely formatted PDFs that engineers need to search manually for specific tasks, tools, and procedures. Metis addresses this by:

- Cataloguing CMMs in a local library with metadata (title, CMM number, manufacturer, revision, revision date)
- Parsing each manual's List of Effective Pages (LOEP) to accurately map physical PDF pages to manual sections
- Using an LLM to extract structured task data (tasks, sub-tasks, tools, consumables) from key sections
- Detecting references to other documents within a CMM and prompting the user to upload and extract from them
- Keeping every extracted item traceable back to its source location in the original PDF, with user-editable corrections and a verification signature step

## Tech Stack

- **Electron** + **Electron Forge** — desktop app shell and packaging
- **React** — UI, with **Vite** for bundling
- **PostgreSQL** via **Drizzle ORM** — local database (`demo_dev`)
- **pdfjs** — PDF parsing and text extraction
- **framer-motion** — UI animation

## Features

### CMM Library
- Card-based library view with dynamic column layout
- Each card displays the manual's cover page and key metadata
- Custom app menu and sidebar navigation (Library, Settings)

### Section Extraction
The following CMM sections are supported for structured extraction:

- CMM Revisions
- Description & Operation
- Testing & Fault Isolation
- Cleaning
- Inspection / Check
- Repairs

Extraction identifies section boundaries via the manual's own LOEP rather than relying on generic ATA pageblock assumptions, which improves accuracy across manuals with non-standard layouts.

### Task-Level Data
For sections like Testing & Fault Isolation, extraction produces:
- Task cards (task number, page reference, sub-tasks)
- Per-task tool and consumable tables, editable inline
- Sub-task breakdowns without redundant page references

### Cross-Document References
Metis detects when a CMM references another document, prompts the user to supply it, and merges the relevant extracted content into the combined output.

## Data & Trust Model

- Every extracted data point retains a reference back to its source location in the original CMM
- Extracted content is fully editable so users can correct extraction errors
- Users provide a verification signature confirming the accuracy of extracted data

## Status

Metis is under active development. Current focus areas include:
- Expanding section coverage beyond the currently supported set
- Building the verification for extracted data and traceability, for accountability

## Getting Started

```bash
npm install
npm run start
```

Requires a local PostgreSQL instance (database: `demo_dev`) configured per `drizzle.config.ts`.

## License
MIT
