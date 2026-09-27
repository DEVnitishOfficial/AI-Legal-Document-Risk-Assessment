import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { timeAgo } from "./timeAgo";

const FIXED_NOW = new Date("2026-01-15T12:00:00.000Z");

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(FIXED_NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

const secondsAgo = (seconds: number) => new Date(FIXED_NOW.getTime() - seconds * 1000);

describe("timeAgo", () => {
  it("says 'just now' for anything under a minute old", () => {
    expect(timeAgo(secondsAgo(0))).toBe("just now");
    expect(timeAgo(secondsAgo(59))).toBe("just now");
  });

  it("reports minutes for anything from 1 minute up to under an hour", () => {
    expect(timeAgo(secondsAgo(60))).toBe("1 minute ago");
    expect(timeAgo(secondsAgo(5 * 60))).toBe("5 minutes ago");
  });

  it("reports hours for anything from 1 hour up to under a day", () => {
    expect(timeAgo(secondsAgo(60 * 60))).toBe("1 hour ago");
    expect(timeAgo(secondsAgo(3 * 60 * 60))).toBe("3 hours ago");
  });

  it("reports days for anything from 1 day up to under a week", () => {
    // Intl.RelativeTimeFormat's `numeric: "auto"` renders exactly-1-day as
    // the friendlier "yesterday" rather than "1 day ago" — that's correct,
    // intended behavior, not a bug, so the test expects it too.
    expect(timeAgo(secondsAgo(24 * 60 * 60))).toBe("yesterday");
    expect(timeAgo(secondsAgo(3 * 24 * 60 * 60))).toBe("3 days ago");
  });

  it("falls back to a plain locale date once it's a week or older", () => {
    const eightDaysAgo = secondsAgo(8 * 24 * 60 * 60);
    expect(timeAgo(eightDaysAgo)).toBe(eightDaysAgo.toLocaleDateString());
  });

  it("accepts an ISO string, not just a Date object", () => {
    const iso = secondsAgo(5 * 60).toISOString();
    expect(timeAgo(iso)).toBe("5 minutes ago");
  });
});
