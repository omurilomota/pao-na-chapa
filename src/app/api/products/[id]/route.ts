import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema";
import { ensureDemoData } from "@/lib/store";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = (await request.json()) as { isAvailable?: boolean; price?: number };
    const changes: { isAvailable?: boolean; price?: string; updatedAt: Date } = { updatedAt: new Date() };
    if (typeof body.isAvailable === "boolean") changes.isAvailable = body.isAvailable;
    if (typeof body.price === "number" && Number.isFinite(body.price) && body.price >= 0) changes.price = body.price.toFixed(2);
    if (Object.keys(changes).length === 1) return Response.json({ error: "Nenhuma alteração válida." }, { status: 400 });
    const tenant = await ensureDemoData();
    const [product] = await db.update(products).set(changes)
      .where(and(eq(products.id, id), eq(products.tenantId, tenant.id))).returning();
    if (!product) return Response.json({ error: "Produto não encontrado." }, { status: 404 });
    return Response.json({ ok: true, product });
  } catch (error) {
    console.error("Falha ao atualizar produto:", error);
    return Response.json({ error: "Não foi possível atualizar o produto." }, { status: 500 });
  }
}
