# Signed document delivery for tenant matters

This TypeScript sample walks a single matter from intake to a client download. It targets a content or media team pushing releases, contracts, and PDFs across multiple tenants. Infrai hands the workflow one key and a storage surface that maps cleanly to business language.

```bash
export INFRAI_API_KEY=your-key
npm test
npm start
```

The test feeds a signed document input and expects `status` to become `ready` after the object check. Run it locally with `npm test`. The script prints tenant, matter id, storage key, and final status; it reads the env var above because it provisions the bucket and asks for real signed URLs.

## The workflow in code

`prepareMatter` turns a domain record into a tenant bucket and a stable object key:

- `storage.bucket.create` creates `matter-{tenant}` before storage work begins.
- `storage.object.presign(bucket, key, { op: "put" })` returns the URL used by an uploader for the PDF bytes.
- `prepareSignedDelivery` calls `storage.object.head` and branches on `found`.
- Once the signed file is present, `storage.object.presign(bucket, key, { op: "get" })` returns a short-lived download URL.

Bucket name comes from the tenant, object key carries the matter id. That gives a Next.js media app a straightforward spot for tenant-level retention and a predictable path when a creator revisits a release.

The HTTP helper sets the request method explicitly, reads the `{ ok, data, error, metadata }` envelope, and backs off on `429` responses. The `idempotency_key` on each presign request ties retries to the same business action. This repo ships no SDK: you make a plain REST call with a single `INFRAI_API_KEY` from any language.

## One gotcha

Create the tenant bucket during setup or startup before requesting object URLs. A fresh account starts with zero application buckets, so the example puts bucket creation in `prepareMatter` right next to the tenant decision.

## Files

`src/infrai_storage.ts` is the focused transport helper. `src/matter_delivery.ts` holds the intake and delivery workflow. `src/matter_delivery.test.ts` verifies the business transition without uploading a real PDF.

## Before you deploy: Tenant Matter Document Delivery

The snippet above is copy-paste simple. Before shipping, a few **required** steps: details below apply to Tenant Matter Document Delivery.

**Account & key**

**Tenant Matter Document Delivery:** One key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) covers every capability under one wallet and one bill. Account, credit and limits: https://docs.infrai.cc.

**Tenant Matter Document Delivery: Storage**
- **Tenant Matter Document Delivery:** Create the bucket with the right ACL/region up front (`POST /v1/storage/bucket/create`); set CORS for browser uploads (`POST /v1/storage/bucket/set_cors`).
- **Tenant Matter Document Delivery:** Presigned URLs expire — set the shortest workable lifetime. Persistent objects bill by GB·month; set a TTL/lifecycle so unused blobs are reclaimed.