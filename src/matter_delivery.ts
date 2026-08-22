import { infrai } from "./infrai_storage.ts";

export type MatterIntake = { tenant: string; matterId: string; clientName: string; documentName: string };
export type DeliveryPlan = { bucket: string; key: string; uploadUrl: string; downloadUrl?: string; status: "intake" | "ready" };

function bucketFor(tenant: string): string {
  return `matter-${tenant.toLowerCase().replace(/[^a-z0-9-]/g, "-")}`;
}

export async function prepareMatter(intake: MatterIntake): Promise<DeliveryPlan> {
  const bucket = bucketFor(intake.tenant);
  const key = `${intake.matterId}/${intake.documentName}`;
  try {
    await infrai.storage.bucket.create({ name: bucket, idempotency_key: `bucket-${bucket}` });
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes("already taken")) throw error;
  }
  const upload = await infrai.storage.object.presign(bucket, key, {
    op: "put", expires_seconds: 900, content_type: "application/pdf", idempotency_key: `upload-${intake.matterId}`,
  });
  return { bucket, key, uploadUrl: upload.url, status: "intake" };
}

export async function prepareSignedDelivery(plan: DeliveryPlan): Promise<DeliveryPlan> {
  const head = await infrai.storage.object.head(plan.bucket, plan.key);
  if (!head.found) return plan;
  const download = await infrai.storage.object.presign(plan.bucket, plan.key, {
    op: "get", expires_seconds: 600, response_disposition: "attachment", idempotency_key: `download-${plan.key}`,
  });
  return { ...plan, downloadUrl: download.url, status: "ready" };
}

async function main(): Promise<void> {
  const intake: MatterIntake = { tenant: "northstar-media", matterId: "matter-104", clientName: "Juniper Studio", documentName: "signed-release.pdf" };
  const plan = await prepareMatter(intake);
  const ready = await prepareSignedDelivery(plan);
  console.log(JSON.stringify({ tenant: intake.tenant, matterId: intake.matterId, storageKey: ready.key, status: ready.status }));
}

if (process.argv[1]?.endsWith("matter_delivery.ts")) await main();
