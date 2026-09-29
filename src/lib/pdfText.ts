// Client-side PDF text extraction for the Voice Card upload flow — no
// server round-trip, the file never leaves the browser. Uses pdf.js's own
// worker bundle (Vite-friendly `new URL(...)` import so the worker gets a
// real, versioned, cacheable URL instead of a bare path guess).
import * as pdfjsLib from 'pdfjs-dist'
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc

export async function extractPdfText(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const doc = await pdfjsLib.getDocument({ data: buffer }).promise
  const pages: string[] = []
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i)
    const content = await page.getTextContent()
    const pageText = content.items.map((item) => ('str' in item ? item.str : '')).join(' ')
    pages.push(pageText)
  }
  return pages.join('\n\n')
}
