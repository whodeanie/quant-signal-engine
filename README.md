# Quant Signal Engine

Backtest classic quant trading signals on historical market data. Three strategies, walk-forward simulation, performance statistics, trade logs, and optional AI commentary.

**Educational analytics tool. NOT financial advice. NO trade execution. NO brokerage integration.** This codebase reads market data and computes statistics. It does not place orders, hold custody of any assets, or connect to any account that can execute trades.

## What this is not

This is not a trading system, not a signal-selling product, and not evidence of a live profitable strategy. It is a transparent educational app for testing how simple rules behave under a controlled historical simulation.

## What it does

Three classic systematic strategies, each implemented as a pure function from OHLC bars to a signal series:

1. **RSI Mean Reversion** with the standard 14 period Wilder smoothed RSI. Long when RSI under 30, exit when RSI over 70.
2. **Moving Average Crossover** with the textbook 50 day fast and 200 day slow simple moving averages. Long during the golden cross regime, flat during the death cross.
3. **Bollinger Band Breakout** with a 20 period SMA and 2 standard deviation bands. Long on an upper band breakout, exit at the SMA mean.

Each strategy is run against historical OHLC data through a walk forward backtester:

* Signals fire at the close of bar k.
* The portfolio transitions at the open of bar k plus one. No look ahead.
* Position size is set by a capped Kelly fraction estimated from realized closed trades. Early trades use half the configured cap because there is not enough realized history yet.
* Slippage and per share commission are configurable, default to zero.
* Trades, equity curve, and daily returns are tracked bar by bar.
* Input data is validated before the simulation runs: bars must be sorted, OHLC values must be positive, and risk settings must stay within explicit bounds.

The summary statistics include total return, annualized return, Sharpe ratio, max drawdown, win rate, average winning and losing trade percentage, longest losing streak, and the buy and hold benchmark return for the same window.

## Disclaimers

* Past performance does not predict future results.
* Backtest results carry look ahead bias from parameter selection and survivorship bias from the choice of symbol.
* Slippage, commissions, taxes, and borrow costs degrade real returns below the backtested numbers.
* This tool does not execute trades and is not connected to any brokerage.
* The SEC publishes retail investor education at [investor.gov](https://www.investor.gov). Read it before risking real capital.

## Tech stack

* Next.js 16 with the App Router and TypeScript strict.
* Tailwind for styling.
* Recharts for the equity and drawdown charts.
* NASDAQ public quote API as the primary market data source. Free, no API key, reliable from serverless. Returns up to about five years of daily history.
* yahoo-finance2 as a secondary source. Free, no API key, but Yahoo aggressively rate limits serverless IPs.
* Alpha Vantage as a tertiary source. Free tier is 500 requests per day, requires a key.
* Optional OpenAI-compatible commentary endpoint. If `GROQ_API_KEY` is not set, the app returns deterministic fallback commentary.

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
npm run check
```

The test suite covers the indicator math (SMA, RSI, Bollinger, rolling standard deviation), backtester invariants, input validation, and final drawdown accounting. CI runs lint, typecheck, tests, and a production build.

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
