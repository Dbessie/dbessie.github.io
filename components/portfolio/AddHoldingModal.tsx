'use client'

import { useState } from 'react'
import Modal from '@/components/ui/Modal'
import { createClient } from '@/lib/supabase'
import { Search } from 'lucide-react'

interface Props {
  portfolioId: string
  onClose: () => void
  onAdded: () => void
}

export default function AddHoldingModal({ portfolioId, onClose, onAdded }: Props) {
  const [ticker, setTicker] = useState('')
  const [tickerInfo, setTickerInfo] = useState<{ name: string; price: number; currency: string } | null>(null)
  const [validating, setValidating] = useState(false)
  const [tickerError, setTickerError] = useState('')

  const [shares, setShares] = useState('')
  const [purchasePrice, setPurchasePrice] = useState('')
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0])

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const validateTicker = async () => {
    if (!ticker.trim()) return
    setValidating(true)
    setTickerError('')
    setTickerInfo(null)

    const res = await fetch(`/api/prices?tickers=${ticker.trim().toUpperCase()}`)
    const data = await res.json()
    const info = data[ticker.trim().toUpperCase()]

    if (!info) {
      setTickerError('Ticker not found. Try a valid symbol (e.g. VOO, AAPL, IWDA.AS)')
    } else {
      setTickerInfo(info)
      setPurchasePrice(info.price.toFixed(2))
    }
    setValidating(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tickerInfo || !shares || !purchasePrice || !purchaseDate) return
    setSaving(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.from('holdings').insert({
      portfolio_id: portfolioId,
      ticker: ticker.trim().toUpperCase(),
      name: tickerInfo.name,
      shares: parseFloat(shares),
      purchase_price: parseFloat(purchasePrice),
      purchase_date: purchaseDate,
    })

    if (error) {
      setError(error.message)
      setSaving(false)
    } else {
      onAdded()
      onClose()
    }
  }

  return (
    <Modal title="Add Holding" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Ticker Symbol</label>
          <div className="flex gap-2">
            <input
              value={ticker}
              onChange={e => { setTicker(e.target.value.toUpperCase()); setTickerInfo(null); setTickerError('') }}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); validateTicker() } }}
              placeholder="e.g. VOO, AAPL, IWDA.AS"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono uppercase"
            />
            <button
              type="button"
              onClick={validateTicker}
              disabled={validating || !ticker.trim()}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-700 rounded-lg text-sm font-medium transition-colors"
            >
              {validating ? '…' : <Search size={16} />}
            </button>
          </div>
          {tickerError && <p className="text-red-600 text-xs mt-1">{tickerError}</p>}
          {tickerInfo && (
            <div className="mt-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
              <p className="text-sm font-medium text-emerald-800">{tickerInfo.name}</p>
              <p className="text-xs text-emerald-600">
                Current price: {tickerInfo.currency} {tickerInfo.price.toFixed(2)}
              </p>
            </div>
          )}
        </div>

        {tickerInfo && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Shares</label>
                <input
                  type="number"
                  value={shares}
                  onChange={e => setShares(e.target.value)}
                  min="0.000001"
                  step="any"
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Avg. Cost</label>
                <input
                  type="number"
                  value={purchasePrice}
                  onChange={e => setPurchasePrice(e.target.value)}
                  min="0.0001"
                  step="any"
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Date</label>
              <input
                type="date"
                value={purchaseDate}
                onChange={e => setPurchaseDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                required
              />
            </div>

            {error && <p className="text-red-600 text-sm">{error}</p>}

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={saving}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-blue-400 transition-colors">
                {saving ? 'Adding…' : 'Add Holding'}
              </button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  )
}
