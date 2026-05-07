import { describe, it, expect } from "vitest";
import { sma, rsi, bollinger, rollingStd } from "../src/lib/indicators";

describe("sma", () => {
  it("computes a known three day average", () => {
    const out = sma([1, 2, 3, 4, 5], 3);
    expect(Number.isNaN(out[0])).toBe(true);
    expect(Number.isNaN(out[1])).toBe(true);
    expect(out[2]).toBeCloseTo(2);
    expect(out[3]).toBeCloseTo(3);
    expect(out[4]).toBeCloseTo(4);
  });
});

describe("rsi", () => {
  it("returns 100 when there are no losses in the seed window", () => {
    const closes = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
    const out = rsi(closes, 14);
    expect(out[14]).toBeCloseTo(100, 1);
  });
  it("returns a value below 50 when prices are falling", () => {
    const closes = [16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
    const out = rsi(closes, 14);
    expect(out[14]).toBeLessThan(50);
  });
});

describe("bollinger", () => {
  it("centers the bands on the SMA and is symmetric", () => {
    const closes = Array.from({ length: 30 }, (_, i) => 100 + i);
    const { upper, middle, lower } = bollinger(closes, 20, 2);
    const i = 25;
    const m = middle[i] as number;
    const u = upper[i] as number;
    const l = lower[i] as number;
    expect(Math.abs(u - m - (m - l))).toBeLessThan(1e-9);
  });
});

describe("rollingStd", () => {
  it("is zero for a constant series", () => {
    const out = rollingStd([5, 5, 5, 5, 5], 3);
    expect(out[2]).toBeCloseTo(0);
    expect(out[3]).toBeCloseTo(0);
    expect(out[4]).toBeCloseTo(0);
  });
});
