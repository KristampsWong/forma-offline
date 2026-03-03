# Statement Import PDF Viewer Design

## Overview

Add a PDF viewer to the statement import detail page (`/expenses/import/[id]`) so users can preview uploaded bank statements stored in private S3.

## Architecture

### Data Flow

1. Server component fetches the statement import record by `id` from MongoDB
2. Server action generates a presigned S3 URL (15-min expiry) using the record's `s3Key`
3. Presigned URL is passed to a client component (`PdfViewer`)
4. `react-pdf` renders the PDF with custom shadcn/ui controls

### Layout

- Left side: PDF viewer with zoom/page navigation controls
- Right side: empty for now (reserved for future transaction extraction UI)

## Components

### Server Action (`actions/statementimports.ts`)

New `getStatementImportById(id)` action:
- Fetches the StatementImport record by `_id` and `companyId`
- Generates a presigned S3 URL using `@aws-sdk/s3-request-presigner` + `GetObjectCommand`
- Returns `{ fileName, presignedUrl, status }` or error

### Detail Page (`app/(dashboard)/expenses/import/[id]/page.tsx`)

- Server component calling `getStatementImportById(id)`
- Two-column layout: PDF viewer (left), placeholder (right)
- Breadcrumb shows the file name instead of raw ID

### PDF Viewer Component (`components/expenses/pdf-viewer.tsx`)

- Client component using `react-pdf`
- Controls: prev/next page, current/total page display, zoom in/out
- Styled with shadcn/ui `Button` components
- Fills available viewport height

## New Dependencies

- `react-pdf` — PDF viewing (wraps Mozilla PDF.js)
- `@aws-sdk/s3-request-presigner` — presigned URL generation
