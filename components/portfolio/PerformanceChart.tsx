'use client'

import { useEffect, useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import type { Holding, HistoryPoint } from '@/lib/types'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

interface Props {
  holdings: Holding[]
}

type Range = '3m' | '6m' | '1y'
const RANGES: { label: string; value: Range }[] = [
  { label: '3M', value: '3m' },
  { label: '6M', value: '6m' },
  { label: '1Y', value: '1y' },
]

function fmtDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function PerformanceChart({ holdings }: Props) {
  const [range, setRange] = useState<Range>('1y')
  const [chartData, setChartData] = useState<{ date: string; value: number }[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (holdings.length === 0) return
    setLoading(true)

    const fetchHistory = async () => {
      const tickers = [...new Set(holdings.map(h => h.ticker))]
      const histories: Record<string, HistoryPoint[]> = {}

      await Promise.all(
        tickers.map(async ticker => {
          try {
            const res = await fetch(`/api/prices/history?ticker=${ticker}&range=${range}`)
            if (res.ok) histories[ticker] = await res.json()
          } catch { /* skip failed tickers */ }
        })
      )

      // Build price lookup: ticker -> date -> close
      const lookup: Record<string, Record<string, number>> = {}
      for (const [ticker, hist] of Object.entries(histories)) {
        lookup[ticker] = {}
        for (const { date, close } of hist) {
          lookup[ticker][date] = close
        }
      }

      // Collect all trading dates across all tickers
      const allDates = new Set<string>()
      Object.values(histories).forEach(h => h.forEach(d => allDates.add(d.date)))
      const sortedDates = [...allDates].sort()

      // For each date, compute portfolio value using holdings purchased on or before that date
      const data = sortedDates
        .map(date => {
          let value = 0
          for (const h of holdings) {
            if (h.purchase_date <= date) {
              const price = lookup[h.ticker]?.[date]
              if (price) value += h.shares * price
            }
          }
          return { date, value }
        })
        .filter(d => d.value > 0)

      setChartData(data)
      setLoading(false)
    }

    fetchHistory()
  }, [holdings, range])

  if (holdings.length === 0) return null

  const formatY = (v: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact' }).format(v)

  const formatTooltip = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Performance</h3>
        <div className="flex gap-1">
          {RANGES.map(r => (
            <button
              key={r.value}
              onClick={() => setRange(r.value)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                range === r.value
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-48">
          <LoadingSpinner />
        </div>
      ) : chartData.length === 0 ? (
        <div className="flex justify-center items-center h-48 text-gray-400 text-sm">
          No historical data available
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="date"
              tickFormatter={fmtDate}
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tickFormatter={formatY}
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              tickLine={false}
              axisLine={false}
              width={60}
            />
            <Tooltip
              formatter={(value: number) => [formatTooltip(value), 'Portfolio Value']}
              labelFormatter={fmtDate}
              contentStyle={{
                borderRadius: '0.5rem',
                border: '1px solid #e5e7eb',
                fontSize: '0.8125rem',
              }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#3b82f6' }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
