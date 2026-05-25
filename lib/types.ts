export interface Portfolio {
  id: string
  user_id: string
  name: string
  description: string | null
  created_at: string
}

export interface Holding {
  id: string
  portfolio_id: string
  ticker: string
  name: string | null
  shares: number
  purchase_price: number
  purchase_date: string
  created_at: string
}

export interface PriceData {
  price: number
  change: number
  changePercent: number
  name: string
  currency: string
  previousClose: number
}

export interface HistoryPoint {
  date: string
  close: number
}

export interface HoldingWithPrice extends Holding {
  priceData?: PriceData
  currentValue: number
  purchaseValue: number
  gainLoss: number
  gainLossPercent: number
  todayChange: number
}

export interface PortfolioStats {
  totalValue: number
  totalInvested: number
  totalGainLoss: number
  totalGainLossPercent: number
  todayChange: number
  holdingCount: number
}
