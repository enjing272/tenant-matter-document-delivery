import test from "node:test";
import assert from "node:assert/strict";
import { prepareSignedDelivery, type DeliveryPlan } from "./matter_delivery.ts";

test("a signed document gets a download URL only after storage confirms it exists", async () => {
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = async (input, init) => {
    calls.push(String(input));
    const path = String(input);
    const data = path.includes("/head/") ? { found: true } : { url: "https://signed.example/document" };
    return new Response(JSON.stringify({ ok: true, data }), { status: 200 });
  };
  try {
    const plan: DeliveryPlan = { bucket: "matter-studio", key: "matter-104/signed-release.pdf", uploadUrl: "https://upload.example", status: "intake" };
    const result = await prepareSignedDelivery(plan);
    assert.equal(result.status, "ready");
    assert.equal(result.downloadUrl, "https://signed.example/document");
    assert.ok(calls[0]?.endsWith("/matter-104/signed-release.pdf"));
  } finally {
    globalThis.fetch = originalFetch;
  }
});
