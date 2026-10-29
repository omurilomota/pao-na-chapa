import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { customOrders, payments } from "@/db/schema";
import { ensureDemoData } from "@/lib/store";

const statuses = new Set(["requested", "confirmed", "production", "ready", "delivered", "cancelled"]);

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = (await request.json()) as { status?: string; depositPaid?: boolean };
    const tenant = await ensureDemoData();
    const changes: { status?: string; depositPaid?: boolean; updatedAt: Date } = { updatedAt: new Date() };
    if (body.status && statuses.has(body.status)) changes.status = body.status;
    if (typeof body.depositPaid === "boolean") {
      changes.depositPaid = body.depositPaid;
      if (body.depositPaid && !body.status) changes.status = "confirmed";
    }
    if (Object.keys(changes).length === 1) return Response.json({ error: "Nenhuma alteração válida." }, { status: 400 });
    const [order] = await db.update(customOrders).set(changes)
      .where(and(eq(customOrders.id, id), eq(customOrders.tenantId, tenant.id))).returning();
    if (!order) return Response.json({ error: "Encomenda não encontrada." }, { status: 404 });
    if (body.depositPaid === true) {
      await db.update(payments).set({ status: "paid", paidAt: new Date() })
        .where(and(eq(payments.customOrderId, order.id), eq(payments.tenantId, tenant.id)));
    }
    return Response.json({ ok: true, order });
  } catch (error) {
    console.error("Falha ao atualizar encomenda:", error);
    return Response.json({ error: "Não foi possível atualizar a encomenda." }, { status: 500 });
  }
}
