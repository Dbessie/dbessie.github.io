'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import type { Portfolio, Holding, PriceData, PortfolioStats } from '@/lib/types'
import PortfolioCard from '@/components/dashboard/PortfolioCard'
import CreatePortfolioModal from '@/components/dashboard/CreatePortfolioModal'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { Plus } from 'lucide-react'

function calcStats(holdings: Holding[], prices: Record<string, PriceData>): PortfolioStats {
  let totalValue = 0, totalInvested = 0, todayChange = 0

  for (const h of holdings) {
    const p = prices[h.ticker]
    if (p) {
      totalValue += h.shares * p.price
      totalInvested += h.shares * h.purchase_price
      todayChange += h.shares * p.change
    }
  }

  const totalGainLoss = totalValue - totalInvested
  return {
    totalValue,
    totalInvested,
    totalGainLoss,
    totalGainLossPercent: totalInvested > 0 ? (totalGainLoss / totalInvested) * 100 : 0,
    todayChange,
    holdingCount: holdings.length,
  }
}

function fmtCurrency(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

function fmtPct(n: number) {
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`
}

export default function DashboardPage() {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([])
  const [holdingsByPortfolio, setHoldingsByPortfolio] = useState<Record<string, Holding[]>>({})
  const [prices, setPrices] = useState<Record<string, PriceData>>({})
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()

    const { data: pfData } = await supabase
      .from('portfolios')
      .select('*')
      .order('created_at', { ascending: false })

    if (!pfData) { setLoading(false); return }
    setPortfolios(pfData)

    if (pfData.length === 0) { setLoading(false); return }

    const { data: holdingData } = await supabase
      .from('holdings')
      .select('*')
      .in('portfolio_id', pfData.map(p => p.id))

    const byPortfolio: Record<string, Holding[]> = {}
    pfData.forEach(p => { byPortfolio[p.id] = [] })
    ;(holdingData ?? []).forEach(h => byPortfolio[h.portfolio_id]?.push(h))
    setHoldingsByPortfolio(byPortfolio)

    const tickers = [...new Set((holdingData ?? []).map(h => h.ticker))]
    if (tickers.length > 0) {
      const res = await fetch(`/api/prices?tickers=${tickers.join(',')}`)
      if (res.ok) setPrices(await res.json())
    }

    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this portfolio and all its holdings?')) return
    const supabase = createClient()
    await supabase.from('portfolios').delete().eq('id', id)
    loadData()
  }

  const allHoldings = Object.values(holdingsByPortfolio).flat()
  const globalStats = calcStats(allHoldings, prices)

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Portfolios</h1>
          <p className="text-gray-500 text-sm mt-1">Track and analyze your investments</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} /> New Portfolio
        </button>
      </div>

      {/* Global Summary */}
      {!loading && allHoldings.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Value', value: fmtCurrency(globalStats.totalValue) },
            {
              label: "Today's Change",
              value: fmtCurrency(globalStats.todayChange),
              color: globalStats.todayChange >= 0 ? 'text-emerald-600' : 'text-red-600',
            },
            {
              label: 'Total Return',
              value: `${fmtCurrency(globalStats.totalGainLoss)} (${fmtPct(globalStats.totalGainLossPercent)})`,
              color: globalStats.totalGainLoss >= 0 ? 'text-emerald-600' : 'text-red-600',
            },
            { label: 'Holdings', value: String(globalStats.holdingCount) },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 px-4 py-3">
              <p className="text-xs text-gray-500 mb-1">{s.label}</p>
              <p className={`font-semibold text-sm ${s.color ?? 'text-gray-900'}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Portfolios Grid */}
      {loading ? (
        <div className="flex justify-center py-24">
          <LoadingSpinner size="lg" />
        </div>
      ) : portfolios.length === 0 ? (
        <div className="text-center py-24">
          <p className="text-gray-400 text-lg mb-2">No portfolios yet</p>
          <p className="text-gray-400 text-sm mb-6">Create your first portfolio to start tracking</p>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={16} /> Create Portfolio
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {portfolios.map(p => (
            <PortfolioCard
              key={p.id}
              id={p.id}
              name={p.name}
              description={p.description}
              stats={calcStats(holdingsByPortfolio[p.id] ?? [], prices)}
              onDelete={() => handleDelete(p.id)}
            />
          ))}
        </div>
      )}

      {showCreate && (
        <CreatePortfolioModal onClose={() => setShowCreate(false)} onCreated={loadData} />
      )}
    </div>
  )
}
