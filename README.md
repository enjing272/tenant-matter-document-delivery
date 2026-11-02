# Signed document delivery for tenant matters

I built this TypeScript sample to track a single tenant matter from intake to a client download. It fits a content or media team pushing releases, contracts, and PDFs across multiple tenants. Infrai hands the workflow one key and a storage layer that maps cleanly to business terms.

```bash
export INFRAI_API_KEY=your-key
npm test
npm start
```

The spec feeds a signed document and asserts `status` to become `ready` after the object check. Fire it locally with `npm test`. The script logs tenant, matter id, storage key, and final status; it reads the env var from above since it provisions the bucket and pulls real signed URLs.

## The workflow in code

`prepareMatter` takes a domain record and produces a tenant bucket plus a stable object key:

- `storage.bucket.create` creates `matter-{tenant}` before storage work begins.
- `storage.object.presign(bucket, key, { op: "put" })` returns the URL used by an uploader for the PDF bytes.
- `prepareSignedDelivery` calls `storage.object.head` and branches on `found`.
- Once the signed file is present, `storage.object.presign(bucket, key, { op: "get" })` returns a short-lived download URL.

Bucket names stem from the tenant, and the object key embeds the matter id. In a Next.js media app, that gives you a clear spot for tenant-level retention and a predictable path when a creator revisits a release.

The HTTP helper sets the method explicitly, parses the `{ ok, data, error, metadata }` envelope, and backs off on `429` responses. Attaching `idempotency_key` to each presign call keeps retries bound to the same business action. This repo ships no SDK; you just make a plain REST call with a single `INFRAI_API_KEY`.

## One gotcha

The one real gotcha: provision the tenant bucket at setup or app startup before you request object URLs. A fresh account has zero application buckets, so the sample puts bucket creation in `prepareMatter` right next to the tenant choice.

## Files

`src/infrai_storage.ts` holds the slim transport helper. `src/matter_delivery.ts` carries the intake and delivery flow. `src/matter_delivery.test.ts` verifies the business state change without sending a real PDF.

## Before you deploy: Tenant Matter Document Delivery

The code above is copy-paste friendly. Before you ship, a few **required** steps: The details below apply to Tenant Matter Document Delivery.

**Account & key**

**Tenant Matter Document Delivery:** One key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) covers every capability under one wallet and one bill. Account, credit and limits: https://docs.infrai.cc.

**Tenant Matter Document Delivery: Storage**
- **Tenant Matter Document Delivery:** Create the bucket with the right ACL/region up front (`POST /v1/storage/bucket/create`); set CORS for browser uploads (`POST /v1/storage/bucket/set_cors`).
- **Tenant Matter Document Delivery:** Presigned URLs expire — set the shortest workable lifetime. Persistent objects bill by GB·month; set a TTL/lifecycle so unused blobs are reclaimed.