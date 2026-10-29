import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { ensureDemoData } from "@/lib/store";

const allowedStatuses = new Set(["received", "preparing", "ready", "delivered", "cancelled"]);

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = (await request.json()) as { status?: string };
    if (!body.status || !allowedStatuses.has(body.status)) {
      return Response.json({ error: "Status de pedido inválido." }, { status: 400 });
    }
    const tenant = await ensureDemoData();
    const [order] = await db.update(orders).set({ status: body.status, updatedAt: new Date() })
      .where(and(eq(orders.id, id), eq(orders.tenantId, tenant.id))).returning();
    if (!order) return Response.json({ error: "Pedido não encontrado." }, { status: 404 });
    return Response.json({ ok: true, order });
  } catch (error) {
    console.error("Falha ao atualizar o pedido:", error);
    return Response.json({ error: "Não foi possível atualizar o pedido." }, { status: 500 });
  }
}
