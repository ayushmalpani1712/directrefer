import { type RefObject } from 'react'
import { toast } from 'sonner'

export async function exportChartToPNG(containerRef: RefObject<HTMLDivElement | null>, filename: string) {
  const el = containerRef.current
  if (!el) return
  try {
    const { default: html2canvas } = await import('html2canvas')
    const canvas = await html2canvas(el, { backgroundColor: 'hsl(0 0% 100%)', scale: 2 })
    const link = document.createElement('a')
    link.download = `${filename}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
    toast.success(`${filename} exported as PNG`)
  } catch {
    toast.error('Export failed')
  }
}

export function exportChartToCSV(data: Record<string, unknown>[], filename: string) {
  if (!data.length) { toast.error('No data to export'); return }
  const headers = Object.keys(data[0])
  const csv = [headers.join(','), ...data.map((row) => headers.map((h) => JSON.stringify(row[h] ?? '')).join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const link = document.createElement('a')
  link.download = `${filename}.csv`
  link.href = URL.createObjectURL(blob)
  link.click()
  URL.revokeObjectURL(link.href)
  toast.success(`${filename} exported as CSV`)
}

export async function exportChartToPDF(containerRef: RefObject<HTMLDivElement | null>, filename: string) {
  const el = containerRef.current
  if (!el) return
  try {
    const { default: html2canvas } = await import('html2canvas')
    const { default: jsPDF } = await import('jspdf')
    const canvas = await html2canvas(el, { backgroundColor: 'hsl(0 0% 100%)', scale: 2 })
    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF('l', 'mm', 'a4')
    const width = pdf.internal.pageSize.getWidth()
    const height = (canvas.height * width) / canvas.width
    pdf.addImage(imgData, 'PNG', 0, 0, width, height)
    pdf.save(`${filename}.pdf`)
    toast.success(`${filename} exported as PDF`)
  } catch {
    toast.error('Export failed')
  }
}
