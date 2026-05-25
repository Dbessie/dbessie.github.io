'use client'

import Link from 'next/link'
import { Trash2, ChevronRight } from 'lucide-react'
import type { PortfolioStats } from '@/lib/types'

interface Props {
  id: string
  name: string
  description: string | null
  stats: PortfolioStats
  onDelete: () => void
}

function fmtCurrency(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n)
}

function fmtPct(n: number) {
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`
}

export default function PortfolioCard({ id, name, description, stats, onDelete }: Props) {
  const positive = stats.totalGainLoss >= 0
  const todayPositive = stats.todayChange >= 0

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 text-lg truncate">{name}</h3>
          {description && <p className="text-sm text-gray-500 mt-0.5 truncate">{description}</p>}
        </div>
        <button
          onClick={e => { e.preventDefault(); onDelete() }}
          className="ml-3 text-gray-300 hover:text-red-500 transition-colors"
        >
          <Trash2 size={16} />
        </button>
      </div>

      <div className="mb-4">
        <p className="text-3xl font-bold text-gray-900">{fmtCurrency(stats.totalValue)}</p>
        <div className="flex items-center gap-3 mt-1">
          <span className={`text-sm font-medium ${positive ? 'text-emerald-600' : 'text-red-600'}`}>
            {fmtCurrency(stats.totalGainLoss)} ({fmtPct(stats.totalGainLossPercent)})
          </span>
          <span className="text-gray-300">·</span>
          <span className={`text-sm ${todayPositive ? 'text-emerald-600' : 'text-red-600'}`}>
            {todayPositive ? '▲' : '▼'} {fmtCurrency(Math.abs(stats.todayChange))} today
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500">{stats.holdingCount} {stats.holdingCount === 1 ? 'holding' : 'holdings'}</span>
        <Link href={`/dashboard/portfolio/${id}`}
          className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium">
          View <ChevronRight size={16} />
        </Link>
      </div>
    </div>
  )
}
