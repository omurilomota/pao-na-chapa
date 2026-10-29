import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { batchReservations, batches, customers } from "@/db/schema";
import { ensureDemoData } from "@/lib/store";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { batchId?: string; name?: string; phone?: string; quantity?: number };
    const name = body.name?.trim();
    const phone = body.phone?.replace(/\D/g, "");
    const quantity = Math.floor(Number(body.quantity ?? 1));
    if (!body.batchId || !name || !phone || phone.length < 10 || !Number.isInteger(quantity) || quantity < 1 || quantity > 30) {
      return Response.json({ error: "Revise os dados da reserva." }, { status: 400 });
    }
    const tenant = await ensureDemoData();
    const result = await db.transaction(async (tx) => {
      const [batch] = await tx.select().from(batches)
        .where(and(eq(batches.id, body.batchId!), eq(batches.tenantId, tenant.id)))
        .for("update").limit(1);
      if (!batch || batch.status === "sold-out" || batch.reservedCount + quantity > batch.capacity) return { unavailable: true as const };
      const [customer] = await tx.insert(customers).values({ tenantId: tenant.id, name, phone, lastOrderAt: new Date() })
        .onConflictDoUpdate({ target: [customers.tenantId, customers.phone], set: { name, lastOrderAt: new Date() } })
        .returning();
      const code = `FOR-${Date.now().toString().slice(-4)}${Math.floor(Math.random() * 9)}`;
      const [reservation] = await tx.insert(batchReservations).values({
        tenantId: tenant.id,
        batchId: batch.id,
        productId: batch.productId,
        customerId: customer.id,
        customerName: name,
        phone,
        quantity,
        reservationCode: code,
        status: "reserved",
        pickupAt: batch.expectedAt,
      }).returning();
      await tx.update(batches).set({ reservedCount: sql`${batches.reservedCount} + ${quantity}` }).where(eq(batches.id, batch.id));
      return { unavailable: false as const, reservation };
    });
    if (result.unavailable) return Response.json({ error: "Essa fornada não tem mais essa quantidade disponível." }, { status: 409 });
    return Response.json({ ok: true, reservation: result.reservation }, { status: 201 });
  } catch (error) {
    console.error("Falha ao criar reserva:", error);
    return Response.json({ error: "Não foi possível reservar a fornada." }, { status: 500 });
  }
}
