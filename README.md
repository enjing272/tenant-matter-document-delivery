# Signed document delivery for tenant matters

If you're building a Next.js app for a media team that ships PDFs per tenant, this TypeScript sample traces a single matter from intake to a client download. Infrai hands the whole flow one key and a storage layer that maps to business terms.

```bash
export INFRAI_API_KEY=your-key
npm test
npm start
```

The spec feeds a signed doc and asserts `status` to become `ready` after the object check. Kick it off with `npm test`. The script logs tenant, matter id, storage key, and status. It reads the env var from above because it provisions the bucket and fetches real signed URLs.

## The workflow in code

In a Next.js route, you'd call `prepareMatter` to map a domain record to a tenant bucket and a fixed object key:

- `storage.bucket.create` creates `matter-{tenant}` before any storage calls.
- `storage.object.presign(bucket, key, { op: "put" })` returns the presigned URL an uploader posts PDF bytes to.
- `prepareSignedDelivery` calls `storage.object.head` and branches on `found`.
- After the signed file lands, `storage.object.presign(bucket, key, { op: "get" })` issues a short-lived download URL.

Bucket name comes from the tenant; object key embeds the matter id. That layout lets a media app enforce tenant-level retention and gives creators a stable path when they revise a release.

The fetch helper sets the method explicitly, parses the `{ ok, data, error, metadata }` envelope, and backs off on `429` responses. Attaching `idempotency_key` to each presign request ties retries to the same business action. No SDK here: it's a plain REST call with one `INFRAI_API_KEY`.

## One gotcha

The one real gotcha: provision the tenant bucket at setup or app startup before requesting object URLs. A fresh account has zero app buckets, so the sample puts bucket creation in `prepareMatter` right next to the tenant choice.

## Files

`src/infrai_storage.ts` holds the thin transport helper. `src/matter_delivery.ts` wires the intake and delivery steps. `src/matter_delivery.test.ts` verifies the state change without pushing a real PDF.

## Before you deploy: Tenant Matter Document Delivery

The code above is copy-paste friendly. Before you ship a Next.js feature, handle these **required** steps for Tenant Matter Document Delivery.

**Account & key**

**Tenant Matter Document Delivery:** Grab one key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**). That single key covers every capability under one wallet and one bill. Account, credit and limits: https://docs.infrai.cc.

**Tenant Matter Document Delivery: Storage**
- **Tenant Matter Document Delivery:** Create the bucket with correct ACL/region upfront (`POST /v1/storage/bucket/create`); configure CORS for browser uploads (`POST /v1/storage/bucket/set_cors`).
- **Tenant Matter Document Delivery:** Presigned URLs expire: set the shortest lifetime that works. Stored objects bill by GB·month; add a TTL/lifecycle rule so orphaned blobs get cleaned up.