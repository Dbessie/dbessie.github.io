import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const tickers = searchParams.get('tickers')

  if (!tickers) {
    return NextResponse.json({ error: 'No tickers provided' }, { status: 400 })
  }

  try {
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(tickers)}`
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Accept: 'application/json',
      },
      next: { revalidate: 60 },
    })

    if (!res.ok) throw new Error(`Yahoo Finance returned ${res.status}`)

    const data = await res.json()
    const quotes: unknown[] = data?.quoteResponse?.result ?? []

    const prices: Record<string, {
      price: number
      change: number
      changePercent: number
      name: string
      currency: string
      previousClose: number
    }> = {}

    for (const q of quotes as Record<string, unknown>[]) {
      prices[q.symbol as string] = {
        price: q.regularMarketPrice as number,
        change: q.regularMarketChange as number,
        changePercent: q.regularMarketChangePercent as number,
        name: (q.longName ?? q.shortName ?? q.symbol) as string,
        currency: (q.currency ?? 'USD') as string,
        previousClose: q.regularMarketPreviousClose as number,
      }
    }

    return NextResponse.json(prices)
  } catch (err) {
    console.error('Price fetch error:', err)
    return NextResponse.json({ error: 'Failed to fetch prices' }, { status: 500 })
  }
}
