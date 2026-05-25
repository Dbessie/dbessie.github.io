import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const ticker = searchParams.get('ticker')
  const range = searchParams.get('range') ?? '1y'

  if (!ticker) {
    return NextResponse.json({ error: 'No ticker provided' }, { status: 400 })
  }

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=${range}`
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      next: { revalidate: 3600 },
    })

    if (!res.ok) throw new Error(`Yahoo Finance returned ${res.status}`)

    const data = await res.json()
    const chart = data?.chart?.result?.[0]

    if (!chart) {
      return NextResponse.json({ error: 'No data found' }, { status: 404 })
    }

    const timestamps: number[] = chart.timestamp ?? []
    const closes: (number | null)[] = chart.indicators?.quote?.[0]?.close ?? []

    const history = timestamps
      .map((ts, i) => ({
        date: new Date(ts * 1000).toISOString().split('T')[0],
        close: closes[i],
      }))
      .filter(d => d.close !== null && d.close !== undefined) as { date: string; close: number }[]

    return NextResponse.json(history)
  } catch (err) {
    console.error('History fetch error:', err)
    return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 })
  }
}
