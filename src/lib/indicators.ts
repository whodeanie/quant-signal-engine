// Technical indicators implemented in plain TypeScript.
// All functions return arrays of the same length as the input series.
// Positions where the indicator is not yet defined return NaN, which the
// strategies and backtester treat as "no signal".

/**
 * Simple moving average (SMA) over a window of length `period`.
 * sma[i] is undefined (NaN) for i < period - 1.
 */
export function sma(values: number[], period: number): number[] {
  if (period <= 0) throw new Error("sma period must be positive");
  const out = new Array<number>(values.length).fill(NaN);
  if (values.length < period) return out;

  let sum = 0;
  for (let i = 0; i < period; i++) sum += values[i] ?? 0;
  out[period - 1] = sum / period;

  for (let i = period; i < values.length; i++) {
    const incoming = values[i] ?? 0;
    const outgoing = values[i - period] ?? 0;
    sum += incoming - outgoing;
    out[i] = sum / period;
  }
  return out;
}

/**
 * Standard deviation over a window of length `period`, sample (Bessel) corrected.
 * Used by Bollinger Bands.
 */
export function rollingStd(values: number[], period: number): number[] {
  if (period <= 1) throw new Error("rollingStd period must be greater than 1");
  const out = new Array<number>(values.length).fill(NaN);
  if (values.length < period) return out;

  for (let i = period - 1; i < values.length; i++) {
    let mean = 0;
    for (let k = i - period + 1; k <= i; k++) mean += values[k] ?? 0;
    mean /= period;

    let variance = 0;
    for (let k = i - period + 1; k <= i; k++) {
      const diff = (values[k] ?? 0) - mean;
      variance += diff * diff;
    }
    variance /= period - 1;
    out[i] = Math.sqrt(variance);
  }
  return out;
}

/**
 * Wilder smoothed Relative Strength Index.
 * Uses the recursive Wilder formulation, which matches the convention used by
 * most trading platforms when traders refer to "the 14 day RSI".
 *
 * Returns values in the [0, 100] range. Undefined positions return NaN.
 */
export function rsi(closes: number[], period: number = 14): number[] {
  if (period <= 0) throw new Error("rsi period must be positive");
  const out = new Array<number>(closes.length).fill(NaN);
  if (closes.length <= period) return out;

  // Seed with the simple averages of the first `period` gains and losses.
  let gainSum = 0;
  let lossSum = 0;
  for (let i = 1; i <= period; i++) {
    const prev = closes[i - 1] ?? 0;
    const cur = closes[i] ?? 0;
    const change = cur - prev;
    if (change >= 0) gainSum += change;
    else lossSum -= change;
  }
  let avgGain = gainSum / period;
  let avgLoss = lossSum / period;

  out[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = period + 1; i < closes.length; i++) {
    const prev = closes[i - 1] ?? 0;
    const cur = closes[i] ?? 0;
    const change = cur - prev;
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? -change : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return out;
}

/**
 * Bollinger Band envelope around the SMA.
 * upper[i] = sma[i] + numStd * rollingStd[i]
 * lower[i] = sma[i] - numStd * rollingStd[i]
 */
export function bollinger(
  closes: number[],
  period: number = 20,
  numStd: number = 2
): { upper: number[]; middle: number[]; lower: number[] } {
  const middle = sma(closes, period);
  const std = rollingStd(closes, period);
  const upper = new Array<number>(closes.length).fill(NaN);
  const lower = new Array<number>(closes.length).fill(NaN);
  for (let i = 0; i < closes.length; i++) {
    const m = middle[i];
    const s = std[i];
    if (Number.isFinite(m) && Number.isFinite(s)) {
      upper[i] = (m as number) + numStd * (s as number);
      lower[i] = (m as number) - numStd * (s as number);
    }
  }
  return { upper, middle, lower };
}
