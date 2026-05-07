# Quant Signal Engine

Backtest classic quant trading signals on real historical market data. Three strategies, walk forward simulation, full performance statistics, and AI generated commentary on each backtest run.

**Educational analytics tool. NOT financial advice. NO trade execution. NO brokerage integration.** This codebase reads market data and computes statistics. It does not place orders, hold custody of any assets, or connect to any account that can execute trades.

## What it does

Three classic systematic strategies, each implemented as a pure function from OHLC bars to a signal series:

1. **RSI Mean Reversion** with the standard 14 period Wilder smoothed RSI. Long when RSI under 30, exit when RSI over 70.
2. **Moving Average Crossover** with the textbook 50 day fast and 200 day slow simple moving averages. Long during the golden cross regime, flat during the death cross.
3. **Bollinger Band Breakout** with a 20 period SMA and 2 standard deviation bands. Long on an upper band breakout, exit at the SMA mean.

Each strategy is run against historical OHLC data through a walk forward backtester:

* Signals fire at the close of bar k.
* The portfolio transitions at the open of bar k plus one. No look ahead.
* Position size is set by capped Kelly fraction estimated from realized trade history.
* Slippage and per share commission are configurable, default to zero.
* Trades, equity curve, and daily returns are tracked bar by bar.

The summary statistics include total return, annualized return, Sharpe ratio, max drawdown, win rate, average winning and losing trade percentage, longest losing streak, and the buy and hold benchmark return for the same window.

## Disclaimers

* Past performance does not predict future results.
* Backtest results carry look ahead bias from parameter selection and survivorship bias from the choice of symbol.
* Slippage, commissions, taxes, and borrow costs degrade real returns below the backtested numbers.
* This tool does not execute trades and is not connected to any brokerage.
* The SEC publishes retail investor education at [investor.gov](https://www.investor.gov). Read it before risking real capital.

## Tech stack

* Next.js 15 with the App Router and TypeScript strict.
* Tailwind for styling.
* Recharts for the equity and drawdown charts.
* yahoo-finance2 as the primary market data source. Free, no API key.
* Alpha Vantage as a secondary source for resilience. Free tier is 500 requests per day.
* Llama 3.3 70B via Groq's OpenAI compatible endpoint for commentary on each backtest. Free tier.

## Local development

```bash
npm install
cp .env.example .env.local   # optional. add GROQ_API_KEY for AI commentary
npm run dev
```

The app runs on http://localhost:3000. The backtest API is at `/api/backtest`.

## Tests

```bash
npm test
```

The test suite covers the indicator math (SMA, RSI, Bollinger, rolling standard deviation) and the backtester (equity curve length invariants, buy and hold benchmark sanity, ending equity bounds).

## Pages

* `/` Landing page with three featured backtests.
* `/backtest` Form to configure and run a single backtest. Renders the equity curve, drawdown, summary statistics, trade log, and AI commentary panel.
* `/strategies` Detail pages for each strategy, including the math, the rules, when each shines, and when each suffers.
* `/portfolio` A paper trading dashboard. Pick a starting capital and a basket of (symbol, strategy) subscriptions. Saved to localStorage. No auth, no execution.

## Project layout

```
src/
  lib/
    indicators.ts     SMA, RSI, Bollinger, rolling stdev
    strategies.ts     Three strategy implementations and meta
    backtester.ts     Walk forward engine and statistics
    marketData.ts     Yahoo and Alpha Vantage market data
    aiCommentary.ts   Groq commentary with deterministic fallback
    types.ts          Shared types
    format.ts         Display formatters
  app/
    api/
      backtest/route.ts   POST endpoint for backtests
      symbols/route.ts    GET endpoint for symbol search
    backtest/             Backtest page and form
    strategies/           Strategy detail pages
    portfolio/            Paper trading dashboard
  components/             Header, Footer, charts, tables, disclaimers
tests/
  indicators.test.ts
  backtester.test.ts
```

## Deployment

The repo is structured for one click Vercel import. Set `GROQ_API_KEY` in the project's environment variables for AI commentary, otherwise the deterministic fallback commentary is used.

## License

MIT. See LICENSE.
