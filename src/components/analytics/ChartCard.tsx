import { useRef, type ReactNode } from 'react'
import { Download, Image, FileText, Table2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { exportChartToCSV, exportChartToPNG, exportChartToPDF } from '@/lib/chartExport'

interface ChartCardProps {
  title: string
  children: ReactNode
  data?: Record<string, unknown>[]
  filename?: string
  height?: number
  headerRight?: ReactNode
}

export function ChartCard({ title, children, data, filename, headerRight }: ChartCardProps) {
  const ref = useRef<HTMLDivElement>(null)

  return (
    <Card className="shadow-soft">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{title}</CardTitle>
          <div className="flex items-center gap-1">
            {headerRight}
            {data && data.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground">
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem onClick={() => exportChartToPNG(ref, filename || title)}>
                    <Image className="mr-2 h-3.5 w-3.5" /> Export PNG
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportChartToPDF(ref, filename || title)}>
                    <FileText className="mr-2 h-3.5 w-3.5" /> Export PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportChartToCSV(data, filename || title)}>
                    <Table2 className="mr-2 h-3.5 w-3.5" /> Export CSV
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent ref={ref}>{children}</CardContent>
    </Card>
  )
}

export function ChartCardGrid({ title, children, data, filename, span }: ChartCardProps & { span?: string }) {
  const ref = useRef<HTMLDivElement>(null)

  return (
    <Card className={`shadow-soft ${span || ''}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{title}</CardTitle>
          {data && data.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground">
                  <Download className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={() => exportChartToPNG(ref, filename || title)}>
                  <Image className="mr-2 h-3.5 w-3.5" /> Export PNG
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportChartToPDF(ref, filename || title)}>
                  <FileText className="mr-2 h-3.5 w-3.5" /> Export PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportChartToCSV(data, filename || title)}>
                  <Table2 className="mr-2 h-3.5 w-3.5" /> Export CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>
      <CardContent ref={ref}>{children}</CardContent>
    </Card>
  )
}
