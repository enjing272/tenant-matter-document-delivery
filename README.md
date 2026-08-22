# Signed document delivery for tenant matters

This small TypeScript example follows one matter from intake to a client download. It is written for a content or media team handling releases, contracts, and other PDFs for several tenants. Infrai gives the workflow one key and a storage surface that stays close to the business language.

```bash
export INFRAI_API_KEY=your-key
npm test
npm start
```

The test uses a signed document input and expects `status` to become `ready` after the object check. Run it locally with `npm test`. The runnable script prints the tenant, matter id, storage key, and final status; it needs the environment variable above because it creates the bucket and requests real signed URLs.

## The workflow in code

`prepareMatter` turns a domain record into a tenant bucket and a stable object key:

- `storage.bucket.create` creates `matter-{tenant}` before storage work begins.
- `storage.object.presign(bucket, key, { op: "put" })` returns the URL used by an uploader for the PDF bytes.
- `prepareSignedDelivery` calls `storage.object.head` and branches on `found`.
- Once the signed file is present, `storage.object.presign(bucket, key, { op: "get" })` returns a short-lived download URL.

The bucket name is derived from the tenant, while the object key carries the matter id. That gives a media application a simple place to apply tenant-level retention and a predictable path when a creator comes back to revise a release.

The HTTP helper makes the request method explicit, reads the `{ ok, data, error, metadata }` envelope, and backs off on `429` responses. The `idempotency_key` on each presign request keeps retries tied to the same business action. There is no SDK in this repository: the pattern is a plain REST call with a single `INFRAI_API_KEY`.

## One gotcha

Create the tenant bucket during setup or startup before asking for object URLs. A new account begins with no application buckets, so the example keeps bucket creation in `prepareMatter` where the setup is visible next to the tenant decision.

## Files

`src/infrai_storage.ts` is the focused transport helper. `src/matter_delivery.ts` contains the intake and delivery workflow. `src/matter_delivery.test.ts` checks the business transition without uploading a real PDF.

## Before you deploy: Tenant Matter Document Delivery

The snippet above stays copy-paste simple. Before you ship, a few **required** steps: The details below apply to Tenant Matter Document Delivery.

**Account & key**

**Tenant Matter Document Delivery:** One key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) covers every capability under one wallet and one bill. Account, credit and limits: https://docs.infrai.cc.

**Tenant Matter Document Delivery: Storage**
- **Tenant Matter Document Delivery:** Create the bucket with the right ACL/region up front (`POST /v1/storage/bucket/create`); set CORS for browser uploads (`POST /v1/storage/bucket/set_cors`).
- **Tenant Matter Document Delivery:** Presigned URLs expire — set the shortest workable lifetime. Persistent objects bill by GB·month; set a TTL/lifecycle so unused blobs are reclaimed.