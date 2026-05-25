'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import type { Portfolio, Holding, PriceData, HoldingWithPrice } from '@/lib/types'
import AllocationChart from '@/components/portfolio/AllocationChart'
import PerformanceChart from '@/components/portfolio/PerformanceChart'
import AddHoldingModal from '@/components/portfolio/AddHoldingModal'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { ArrowLeft, Plus, Trash2, RefreshCw } from 'lucide-react'

function fmtCurrency(n: number, compact = false) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD',
    notation: compact ? 'compact' : 'standard',
    minimumFractionDigits: compact ? 0 : 2,
  }).format(n)
}

function fmtPct(n: number) {
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`
}

function colorClass(n: number) {
  return n >= 0 ? 'text-emerald-600' : 'text-red-600'
}

export default function PortfolioPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [portfolio, setPortfolio] = useState<Portfolio | null>(null)
  const [holdings, setHoldings] = useState<HoldingWithPrice[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showAdd, setShowAdd] = useState(false)

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)

    const supabase = createClient()

    const [{ data: pf }, { data: holdingData }] = await Promise.all([
      supabase.from('portfolios').select('*').eq('id', id).single(),
      supabase.from('holdings').select('*').eq('portfolio_id', id).order('created_at', { ascending: false }),
    ])

    if (!pf) { router.push('/dashboard'); return }
    setPortfolio(pf)

    const rawHoldings: Holding[] = holdingData ?? []
    const tickers = [...new Set(rawHoldings.map(h => h.ticker))]

    let priceMap: Record<string, PriceData> = {}
    if (tickers.length > 0) {
      const res = await fetch(`/api/prices?tickers=${tickers.join(',')}`)
      if (res.ok) priceMap = await res.json()
    }

    const enriched: HoldingWithPrice[] = rawHoldings.map(h => {
      const p = priceMap[h.ticker]
      const currentValue = p ? h.shares * p.price : 0
      const purchaseValue = h.shares * h.purchase_price
      const gainLoss = currentValue - purchaseValue
      return {
        ...h,
        priceData: p,
        currentValue,
        purchaseValue,
        gainLoss,
        gainLossPercent: purchaseValue > 0 ? (gainLoss / purchaseValue) * 100 : 0,
        todayChange: p ? h.shares * p.change : 0,
      }
    })

    setHoldings(enriched)
    setLoading(false)
    setRefreshing(false)
  }, [id, router])

  useEffect(() => { loadData() }, [loadData])

  const handleDelete = async (holdingId: string) => {
    if (!confirm('Remove this holding?')) return
    const supabase = createClient()
    await supabase.from('holdings').delete().eq('id', holdingId)
    loadData(true)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  const totalValue = holdings.reduce((s, h) => s + h.currentValue, 0)
  const totalInvested = holdings.reduce((s, h) => s + h.purchaseValue, 0)
  const totalGainLoss = totalValue - totalInvested
  const totalGainLossPct = totalInvested > 0 ? (totalGainLoss / totalInvested) * 100 : 0
  const todayChange = holdings.reduce((s, h) => s + h.todayChange, 0)

  return (
    <div>
      {/* Back + Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard" className="text-gray-400 hover:text-gray-600 transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{portfolio?.name}</h1>
          {portfolio?.description && <p className="text-gray-500 text-sm">{portfolio.description}</p>}
        </div>
        <button
          onClick={() => loadData(true)}
          disabled={refreshing}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          title="Refresh prices"
        >
          <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
        </button>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} /> Add Holding
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3">
          <p className="text-xs text-gray-500 mb-1">Total Value</p>
          <p className="font-bold text-lg text-gray-900">{fmtCurrency(totalValue)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3">
          <p className="text-xs text-gray-500 mb-1">Today</p>
          <p className={`font-semibold text-sm ${colorClass(todayChange)}`}>
            {todayChange >= 0 ? '+' : ''}{fmtCurrency(todayChange)}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3">
          <p className="text-xs text-gray-500 mb-1">Total Return</p>
          <p className={`font-semibold text-sm ${colorClass(totalGainLoss)}`}>
            {fmtCurrency(totalGainLoss)} ({fmtPct(totalGainLossPct)})
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3">
          <p className="text-xs text-gray-500 mb-1">Invested</p>
          <p className="font-semibold text-sm text-gray-900">{fmtCurrency(totalInvested)}</p>
        </div>
      </div>

      {/* Charts */}
      {holdings.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
          <PerformanceChart holdings={holdings} />
          <AllocationChart holdings={holdings} />
        </div>
      )}

      {/* Holdings Table */}
      <div className="bg-white rounded-2xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Holdings</h2>
        </div>

        {holdings.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-400 mb-4">No holdings yet</p>
            <button
              onClick={() => setShowAdd(true)}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <Plus size={16} /> Add your first holding
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-xs text-gray-500 border-b border-gray-100">
                  {['Ticker', 'Shares', 'Avg Cost', 'Price', 'Value', 'Return', 'Today', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {holdings.map(h => (
                  <tr key={h.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-mono font-semibold text-gray-900 text-sm">{h.ticker}</p>
                      <p className="text-xs text-gray-400 max-w-[140px] truncate">{h.name}</p>
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-700">
                      {h.shares.toLocaleString('en-US', { maximumFractionDigits: 6 })}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-700">
                      {fmtCurrency(h.purchase_price)}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-700">
                      {h.priceData ? fmtCurrency(h.priceData.price) : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-900 font-medium">
                      {h.currentValue > 0 ? fmtCurrency(h.currentValue) : '—'}
                    </td>
                    <td className={`px-4 py-3 text-sm font-mono ${colorClass(h.gainLoss)}`}>
                      {h.currentValue > 0 ? (
                        <>
                          <div>{h.gainLoss >= 0 ? '+' : ''}{fmtCurrency(h.gainLoss)}</div>
                          <div className="text-xs opacity-75">{fmtPct(h.gainLossPercent)}</div>
                        </>
                      ) : '—'}
                    </td>
                    <td className={`px-4 py-3 text-sm font-mono ${colorClass(h.todayChange)}`}>
                      {h.priceData ? (
                        <>
                          <div>{h.todayChange >= 0 ? '+' : ''}{fmtCurrency(h.todayChange)}</div>
                          <div className="text-xs opacity-75">{fmtPct(h.priceData.changePercent)}</div>
                        </>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleDelete(h.id)}
                        className="text-gray-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAdd && (
        <AddHoldingModal
          portfolioId={id}
          onClose={() => setShowAdd(false)}
          onAdded={() => loadData(true)}
        />
      )}
    </div>
  )
}
