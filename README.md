# Metis

Metis is a desktop application for managing and extracting structured data from Component Maintenance Manuals (CMMs) used in aircraft maintenance. It combines a searchable CMM library with LLM-assisted extraction of key sections — turning long, unstructured PDF manuals into navigable, task-level data.

<img width="2560" height="1488" alt="Main Menu" src="https://github.com/user-attachments/assets/dd4f34f8-b592-40ef-a650-b3db78ed746c" />

## Overview

Aircraft maintenance manuals are long, densely formatted PDFs that engineers need to search manually for specific tasks, tools, and procedures. Metis addresses this by:

- Cataloguing CMMs in a local library with metadata (title, CMM number, manufacturer, revision, revision date)
- Parsing each manual's List of Effective Pages (LOEP) to map physical PDF pages to manual sections accurately
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

Card-based library view with dynamic column layout. Each card displays the manual's cover page and key metadata (CMM number, manufacturer, revision). Custom app menu and sidebar navigation (Library, CMMs, Search, Settings).

Upload a new manual via drag-and-drop:

<img width="2560" height="1486" alt="Upload Cmm" src="https://github.com/user-attachments/assets/950680e4-790c-4de9-be7b-fc1ee6f9984b" />

Metis then parses the manual and extracts its structure automatically:

<img width="2560" height="1489" alt="Extracting" src="https://github.com/user-attachments/assets/914d36e9-4c6f-4dde-aabc-77c44d8f39c6" />

Once processed, each CMM gets a detail view with an auto-generated summary and a breakdown of every parsed section:

<img width="2560" height="1485" alt="CMM" src="https://github.com/user-attachments/assets/df8ce671-01da-4bc3-8dae-99d4d30097c1" />

### Section Extraction

The following CMM sections are supported for structured extraction:

- CMM Revisions
- Description & Operation
- Testing & Fault Isolation
- Cleaning
- Inspection / Check
- Repairs

Extraction identifies section boundaries using the manual's own LOEP rather than relying on generic ATA pageblock assumptions, improving accuracy across manuals with non-standard layouts.

### Task-Level Data

For sections like Repairs and Testing & Fault Isolation, extraction produces a searchable task breakdown:

<img width="2560" height="1600" alt="Tasks" src="https://github.com/user-attachments/assets/f6a7ea73-eefd-4832-83e9-945d4752df26" />

Clicking into a task shows its sub-tasks alongside per-task tool and consumable tables:

<img width="2560" height="1491" alt="Task Info" src="https://github.com/user-attachments/assets/3637a3e9-574a-436d-a450-03ea7e540069" />

- Task cards (task number, page reference, sub-tasks)
- Per-task tool and consumable tables, editable inline
- Sub-task breakdowns without redundant page references

### Cross-Document References

Metis detects when a CMM references another document (SRM sections, other CFMI standard practices manuals, AMM tasks, MIL/ASTM specs, etc.), flags each missing reference against the task that needs it, and lets the user upload the source so it can be merged into the combined output:

<img width="2560" height="1486" alt="References" src="https://github.com/user-attachments/assets/b602e0e4-83bc-4608-a748-62ca2614b463" />

## Data & Trust Model

- Every extracted data point retains a reference back to its source location in the original CMM
- Extracted content is fully editable so users can correct extraction errors
- Users provide a verification signature confirming the accuracy of extracted data

## Status

Metis is under active development. Current focus areas include:

- Expanding section coverage beyond the currently supported set
- The data & trust model is still under development

## Getting Started

### 1. Environment Setup

Create a `.env` file in the project root:

```dotenv
DATABASE_URL=postgresql://postgres:<password>@localhost:5432/demo_dev
DEEPSEEK_API_KEY=<API Key>
```

- `DATABASE_URL` — connection string for your local PostgreSQL instance (database: `demo_dev`)
- `DEEPSEEK_API_KEY` — API key used for CMM extraction

### 2. Install & Run

```bash
npm install
npm run start
```

## License

TBD
