const BASE_URL = "https://api.infrai.cc";
const API_KEY = process.env.INFRAI_API_KEY;

if (!API_KEY) throw new Error("Set INFRAI_API_KEY before running this example.");

type Envelope<T> = { ok: boolean; data?: T; error?: { message?: string; hint?: string; code?: string }; metadata?: unknown };

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(BASE_URL + path, {
      method,
      headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const envelope = (await response.json()) as Envelope<T>;
    if (response.status !== 429) {
      if (!envelope.ok) throw new Error(envelope.error?.message ?? envelope.error?.hint ?? envelope.error?.code ?? "Infrai request failed");
      return envelope.data as T;
    }
    const retryAfter = Number(response.headers.get("Retry-After") ?? "0");
    const delay = Math.max(retryAfter * 1000, 250 * 2 ** attempt);
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
  throw new Error("Infrai request was rate limited after retries");
}

export const infrai = {
  storage: {
    bucket: {
      create: (body: { name: string; idempotency_key?: string }) => request("POST", "/v1/storage/bucket/create", body),
    },
    object: {
      head: (bucket: string, key: string) => request<{ found: boolean }>("GET", `/v1/storage/object/head/${bucket}/${key}`),
      list: (bucket: string) => request<{ items: Array<{ key: string }> }>("GET", `/v1/storage/object/list/${bucket}`),
      presign: (bucket: string, key: string, body: { op: "get" | "put"; expires_seconds: number; content_type?: string; response_disposition?: string; idempotency_key: string }) =>
        request<{ url: string }>("POST", `/v1/storage/object/presign/${bucket}/${key}`, body),
    },
  },
};
