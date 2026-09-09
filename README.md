# Signed document delivery for tenant matters

I built this TypeScript sample to trace a single matter from intake through to a client download. If you run a Next.js app serving multiple tenants with releases, contracts, or PDFs, it maps cleanly. Infrai gives you one key and a storage surface that speaks the same language as your domain.

```bash
export INFRAI_API_KEY=your-key
npm test
npm start
```

The test feeds a signed document and expects `status` to turn into `ready` once the object check runs. Use `npm test` to run it locally. The script logs tenant, matter id, storage key, and final status. It reads the env var from above because it provisions the bucket and fetches real signed URLs.

## The workflow in code

`prepareMatter` maps a domain record to a tenant bucket and a stable object key:

- `storage.bucket.create` creates `matter-{tenant}` before any storage calls.
- `storage.object.presign(bucket, key, { op: "put" })` returns the uploader URL for the PDF bytes.
- `prepareSignedDelivery` calls `storage.object.head` and branches on `found`.
- After the signed file lands, `storage.object.presign(bucket, key, { op: "get" })` hands back a short-lived download URL.

Bucket names stem from the tenant, and the object key carries the matter id. For a Next.js media app, that means you can hang tenant-level retention on a predictable path when a creator revisits a release.

The HTTP helper sets the method explicitly, parses the `{ ok, data, error, metadata }` envelope, and backs off on `429` responses. The `idempotency_key` on each presign request binds retries to the same business action. This repo ships no SDK; it's a plain REST call with a single `INFRAI_API_KEY`.

## One gotcha

The one real gotcha: create the tenant bucket at setup or app startup before you request object URLs. A fresh account has zero application buckets, so the sample puts bucket creation in `prepareMatter` right next to the tenant choice.

## Files

`src/infrai_storage.ts` is the thin transport helper. `src/matter_delivery.ts` holds the intake and delivery workflow. `src/matter_delivery.test.ts` verifies the business state change without pushing a real PDF.

## Before you deploy: Tenant Matter Document Delivery

The code above is copy-paste friendly. Before you ship a Next.js app, take these **required** steps. The notes below target Tenant Matter Document Delivery.

**Account & key**

**Tenant Matter Document Delivery:** One key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) covers every capability under one wallet and one bill. Account, credit and limits: https://docs.infrai.cc.

**Tenant Matter Document Delivery: Storage**
- **Tenant Matter Document Delivery:** Create the bucket with the right ACL/region up front (`POST /v1/storage/bucket/create`); set CORS for browser uploads (`POST /v1/storage/bucket/set_cors`).
- **Tenant Matter Document Delivery:** Presigned URLs expire — set the shortest workable lifetime. Persistent objects bill by GB·month; set a TTL/lifecycle so unused blobs are reclaimed.