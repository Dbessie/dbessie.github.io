-- Run this in your Supabase project: SQL Editor → New Query → paste → Run

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.portfolios (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name        TEXT NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.holdings (
  id             UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  portfolio_id   UUID REFERENCES public.portfolios(id) ON DELETE CASCADE NOT NULL,
  ticker         TEXT NOT NULL,
  name           TEXT,
  shares         NUMERIC(15, 6) NOT NULL CHECK (shares > 0),
  purchase_price NUMERIC(15, 4) NOT NULL CHECK (purchase_price > 0),
  purchase_date  DATE NOT NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS holdings_portfolio_id_idx ON public.holdings(portfolio_id);
CREATE INDEX IF NOT EXISTS portfolios_user_id_idx ON public.portfolios(user_id);

-- Row Level Security
ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holdings   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own portfolios"
  ON public.portfolios FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage holdings via portfolio"
  ON public.holdings FOR ALL
  USING  (portfolio_id IN (SELECT id FROM public.portfolios WHERE user_id = auth.uid()))
  WITH CHECK (portfolio_id IN (SELECT id FROM public.portfolios WHERE user_id = auth.uid()));
