# Statement Import PDF Viewer Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Display uploaded bank statement PDFs on the import detail page with zoom/page controls, served via presigned S3 URLs.

**Architecture:** Server action generates a presigned S3 URL for the statement's `s3Key`, passes it to a `react-pdf`-based client component. The detail page uses a two-column layout (PDF left, empty right for future use).

**Tech Stack:** react-pdf, @aws-sdk/s3-request-presigner, @aws-sdk/client-s3 (already installed), shadcn/ui Button

---

### Task 1: Install dependencies

**Step 1: Install react-pdf and presigner**

Run:
```bash
pnpm add react-pdf @aws-sdk/s3-request-presigner
```

**Step 2: Verify installation**

Run:
```bash
pnpm ls react-pdf @aws-sdk/s3-request-presigner
```
Expected: Both packages listed with versions.

**Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add react-pdf and s3-request-presigner dependencies"
```

---

### Task 2: Add `getStatementImportById` server action

**Files:**
- Modify: `actions/statementimports.ts`

**Step 1: Add the action**

Add to `actions/statementimports.ts` after the existing `getStatementImports` function:

```ts
import { GetObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { getS3Client, getS3Bucket } from "@/lib/s3/client"
import { STATEMENT_IMPORT_ERRORS } from "@/lib/constants/errors"

export interface StatementImportDetail {
  _id: string
  fileName: string
  status: string
  presignedUrl: string
}

export async function getStatementImportById(id: string) {
  return withAuth(async (userId) => {
    await dbConnect()

    const company = await Company.findOne({ userId }).select("_id").lean()
    if (!company) throw new Error(COMPANY_ERRORS.NOT_FOUND)

    const doc = await StatementImport.findOne({
      _id: id,
      companyId: company._id,
    }).lean()
    if (!doc) throw new Error(STATEMENT_IMPORT_ERRORS.NOT_FOUND)

    const command = new GetObjectCommand({
      Bucket: getS3Bucket(),
      Key: doc.s3Key,
    })
    const presignedUrl = await getSignedUrl(getS3Client(), command, {
      expiresIn: 900, // 15 minutes
    })

    return {
      _id: doc._id.toString(),
      fileName: doc.fileName,
      status: doc.status,
      presignedUrl,
    } satisfies StatementImportDetail
  })
}
```

Note: The existing imports for `withAuth`, `COMPANY_ERRORS`, `dbConnect`, `Company`, and `StatementImport` are already at the top of the file. Add the new imports (`GetObjectCommand`, `getSignedUrl`, `getS3Client`, `getS3Bucket`, `STATEMENT_IMPORT_ERRORS`) alongside them.

**Step 2: Verify build**

Run:
```bash
pnpm run build
```
Expected: Build succeeds with no errors.

**Step 3: Commit**

```bash
git add actions/statementimports.ts
git commit -m "feat: add getStatementImportById action with presigned S3 URL"
```

---

### Task 3: Create PdfViewer client component

**Files:**
- Create: `components/expenses/pdf-viewer.tsx`

**Step 1: Create the component**

Create `components/expenses/pdf-viewer.tsx`:

```tsx
"use client"

import { useState } from "react"
import { Document, Page, pdfjs } from "react-pdf"
import "react-pdf/dist/Page/AnnotationLayer.css"
import "react-pdf/dist/Page/TextLayer.css"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react"

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString()

interface PdfViewerProps {
  url: string
}

export default function PdfViewer({ url }: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number>(0)
  const [pageNumber, setPageNumber] = useState(1)
  const [scale, setScale] = useState(1.0)

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Controls */}
      <div className="flex items-center justify-between border-b px-4 py-2 bg-muted/50">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
            disabled={pageNumber <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm tabular-nums px-2">
            {pageNumber} / {numPages}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setPageNumber((p) => Math.min(numPages, p + 1))}
            disabled={pageNumber >= numPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setScale((s) => Math.max(0.5, s - 0.25))}
            disabled={scale <= 0.5}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm tabular-nums px-2">
            {Math.round(scale * 100)}%
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setScale((s) => Math.min(3, s + 0.25))}
            disabled={scale >= 3}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* PDF Document */}
      <div className="flex-1 overflow-auto flex justify-center p-4 bg-muted/30">
        <Document file={url} onLoadSuccess={onDocumentLoadSuccess} loading={
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground text-sm">Loading PDF...</p>
          </div>
        }>
          <Page pageNumber={pageNumber} scale={scale} />
        </Document>
      </div>
    </div>
  )
}
```

**Step 2: Verify no lint errors**

Run:
```bash
pnpm run lint
```
Expected: No errors.

**Step 3: Commit**

```bash
git add components/expenses/pdf-viewer.tsx
git commit -m "feat: add PdfViewer component with page/zoom controls"
```

---

### Task 4: Configure webpack for react-pdf canvas

**Files:**
- Modify: `next.config.ts`

`react-pdf` uses `canvas` as an optional dependency. Next.js webpack needs to be told to ignore it to avoid build errors. Also, the pdf.worker needs to be served as a static asset.

**Step 1: Add webpack config**

Update `next.config.ts`:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
  webpack: (config) => {
    config.resolve.alias.canvas = false
    return config
  },
};

export default nextConfig;
```

**Step 2: Verify build**

Run:
```bash
pnpm run build
```
Expected: Build succeeds.

**Step 3: Commit**

```bash
git add next.config.ts
git commit -m "chore: configure webpack to ignore canvas for react-pdf"
```

---

### Task 5: Wire up the detail page

**Files:**
- Modify: `app/(dashboard)/expenses/import/[id]/page.tsx`

**Step 1: Update the page**

Replace the contents of `app/(dashboard)/expenses/import/[id]/page.tsx`:

```tsx
import { getStatementImportById } from "@/actions/statementimports"
import Header from "@/components/header"
import Breadcrumb, {
  BreadcrumbLink,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { notFound } from "next/navigation"
import dynamic from "next/dynamic"

const PdfViewer = dynamic(
  () => import("@/components/expenses/pdf-viewer"),
  { ssr: false, loading: () => <p className="text-sm text-muted-foreground p-4">Loading viewer...</p> }
)

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const result = await getStatementImportById(id)
  if (!result.success) notFound()

  const { fileName, presignedUrl } = result.data

  return (
    <main className="p-4 max-w-7xl mx-auto space-y-8 w-full">
      <Header>
        <Breadcrumb>
          <BreadcrumbLink href={"/expenses"} text={"Expenses"} />
          <BreadcrumbSeparator />
          <BreadcrumbLink
            href={"/expenses/import"}
            text={"Import Transactions"}
          />
          <BreadcrumbSeparator />
          <span className="text-foreground font-semibold">{fileName}</span>
        </Breadcrumb>
      </Header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="border rounded-lg overflow-hidden h-[calc(100vh-200px)]">
          <PdfViewer url={presignedUrl} />
        </div>
        <div>
          {/* Reserved for future transaction extraction UI */}
        </div>
      </div>
    </main>
  )
}
```

Key decisions:
- `dynamic` import with `ssr: false` because `react-pdf` requires browser APIs
- `notFound()` if the import doesn't exist or user doesn't own it
- Breadcrumb shows `fileName` instead of raw ID
- Two-column grid: PDF viewer (left), empty placeholder (right)
- Viewer height: `calc(100vh - 200px)` to fill viewport minus header/breadcrumb

**Step 2: Verify dev server**

Run:
```bash
pnpm run dev
```
Navigate to `/expenses/import/{valid-id}` and verify:
- PDF loads and displays
- Page navigation works
- Zoom controls work
- Breadcrumb shows file name

**Step 3: Commit**

```bash
git add app/\(dashboard\)/expenses/import/\[id\]/page.tsx
git commit -m "feat: wire up PDF viewer on statement import detail page"
```

---

### Task 6: Final verification

**Step 1: Run lint**

Run:
```bash
pnpm run lint
```
Expected: No errors.

**Step 2: Run build**

Run:
```bash
pnpm run build
```
Expected: Build succeeds.
