import React, { Suspense } from 'react'

const rechartsPromise = import('recharts')

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function lazyRecharts(selector: (mod: typeof import('recharts')) => any) {
  const Lazy = React.lazy(() => rechartsPromise.then((m) => ({ default: selector(m) })))
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Wrapper = (props: any) => (
    <Suspense fallback={null}>
      <Lazy {...props} />
    </Suspense>
  )
  return Wrapper
}

export const LazyBarChart = lazyRecharts((m) => m.BarChart)
export const LazyBar = lazyRecharts((m) => m.Bar)
export const LazyFunnelChart = lazyRecharts((m) => m.FunnelChart)
export const LazyFunnel = lazyRecharts((m) => m.Funnel)
export const LazyLineChart = lazyRecharts((m) => m.LineChart)
export const LazyLine = lazyRecharts((m) => m.Line)
export const LazyAreaChart = lazyRecharts((m) => m.AreaChart)
export const LazyArea = lazyRecharts((m) => m.Area)
export const LazyPieChart = lazyRecharts((m) => m.PieChart)
export const LazyPie = lazyRecharts((m) => m.Pie)
export const LazyCell = lazyRecharts((m) => m.Cell)
export const LazyResponsiveContainer = lazyRecharts((m) => m.ResponsiveContainer)
export const LazyCartesianGrid = lazyRecharts((m) => m.CartesianGrid)
export const LazyXAxis = lazyRecharts((m) => m.XAxis)
export const LazyYAxis = lazyRecharts((m) => m.YAxis)
export const LazyTooltip = lazyRecharts((m) => m.Tooltip)
export const LazyLegend = lazyRecharts((m) => m.Legend)
export const LazyLabelList = lazyRecharts((m) => m.LabelList)
