import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { coupons } from "@/db/schema";
import { ensureDemoData } from "@/lib/store";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { code?: string; title?: string; discountType?: string; discountValue?: number; maxRedemptions?: number; expiresAt?: string };
    const code = body.code?.trim().toUpperCase().replace(/\s+/g, "");
    const title = body.title?.trim();
    const discountValue = Number(body.discountValue);
    if (!code || !title || code.length < 3 || !Number.isFinite(discountValue) || discountValue <= 0) {
      return Response.json({ error: "Informe código, nome e desconto válido." }, { status: 400 });
    }
    const tenant = await ensureDemoData();
    const [existing] = await db.select({ id: coupons.id }).from(coupons)
      .where(and(eq(coupons.tenantId, tenant.id), eq(coupons.code, code))).limit(1);
    if (existing) return Response.json({ error: "Esse código já está em uso." }, { status: 409 });
    const [coupon] = await db.insert(coupons).values({
      tenantId: tenant.id,
      code,
      title,
      discountType: body.discountType === "percent" ? "percent" : "fixed",
      discountValue: discountValue.toFixed(2),
      maxRedemptions: Math.max(1, Math.floor(Number(body.maxRedemptions) || 50)),
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      isActive: true,
    }).returning();
    return Response.json({ ok: true, coupon }, { status: 201 });
  } catch (error) {
    console.error("Falha ao criar cupom:", error);
    return Response.json({ error: "Não foi possível criar o cupom." }, { status: 500 });
  }
}
