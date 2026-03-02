"use client"

import dynamic from "next/dynamic"

const PdfViewerImpl = dynamic(
  () => import("@/components/expenses/pdf-viewer/pdf-viewer-impl"),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground text-sm">Loading viewer...</p>
      </div>
    ),
  }
)

interface PdfViewerProps {
  url: string
}

export default function PdfViewer({ url }: PdfViewerProps) {
  return <PdfViewerImpl url={url} />
}
