import { describe, expect, test } from "vitest";
import { fetchDemoQuote } from "./demoQuote";

describe("demo price feed", () => {
  test("accepts valid price", async () => {
    const quote = await fetchDemoQuote("BTCUSDT", (async () => new Response(JSON.stringify({ symbol: "BTCUSDT", price: "78123.45" }), { status: 200 })) as typeof fetch);
    expect(quote).toBe(78123.45);
  });
  test("tries another endpoint on failure", async () => {
    let attempts = 0;
    const quote = await fetchDemoQuote("BTCUSDT", (async () => {
      attempts++;
      return attempts === 1 ? new Response("", { status: 503 }) : new Response(JSON.stringify({ symbol: "BTCUSDT", price: "123" }));
    }) as typeof fetch);
    expect(attempts).toBe(2);
    expect(quote).toBe(123);
  });
  test("rejects invalid, mismatched and missing prices", async () => {
    expect(await fetchDemoQuote("BTCUSDT", (async () => new Response(JSON.stringify({ symbol: "ETHUSDT", price: "123" }))) as typeof fetch)).toBeNull();
    expect(await fetchDemoQuote("BTCUSDT", (async () => new Response(JSON.stringify({ symbol: "BTCUSDT", price: "-1" }))) as typeof fetch)).toBeNull();
    expect(await fetchDemoQuote("../bad", (async () => { throw Error("must not fetch"); }) as typeof fetch)).toBeNull();
  });
});
