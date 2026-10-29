import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { customOrderItems, customOrders, customers, payments, productionCalendar } from "@/db/schema";
import { ensureDemoData } from "@/lib/store";

type CustomOrderPayload = {
  name?: string;
  phone?: string;
  type?: string;
  flavor?: string;
  quantity?: number;
  eventDate?: string;
  fulfillmentType?: string;
  message?: string;
  totalAmount?: number;
  depositPercent?: number;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CustomOrderPayload;
    const name = body.name?.trim();
    const phone = body.phone?.replace(/\D/g, "");
    const eventDate = body.eventDate?.trim();
    const quantity = Math.max(1, Math.floor(Number(body.quantity ?? 1)));
    const totalAmount = Number(body.totalAmount);
    const validDate = Boolean(eventDate && /^\d{4}-\d{2}-\d{2}$/.test(eventDate) && !Number.isNaN(new Date(`${eventDate}T12:00:00Z`).getTime()) && new Date(`${eventDate}T12:00:00Z`).toISOString().slice(0, 10) === eventDate);
    if (!name || !phone || phone.length < 10 || !validDate || !Number.isFinite(totalAmount) || totalAmount <= 0) {
      return Response.json({ error: "Preencha nome, WhatsApp, data válida e valor da encomenda." }, { status: 400 });
    }
    if (eventDate! < new Date().toISOString().slice(0, 10)) {
      return Response.json({ error: "A data do evento precisa ser hoje ou futura." }, { status: 400 });
    }

    const tenant = await ensureDemoData();
    const depositPercent = Math.min(50, Math.max(30, Number(body.depositPercent) || 40));
    const depositAmount = Number((totalAmount * depositPercent / 100).toFixed(2));
    const orderType = ["cake", "party-kit", "savories", "filled-bread"].includes(body.type ?? "") ? body.type! : "cake";

    const result = await db.transaction(async (tx) => {
      let [calendarDay] = await tx.select().from(productionCalendar)
        .where(and(eq(productionCalendar.tenantId, tenant.id), eq(productionCalendar.eventDate, eventDate!)))
        .for("update").limit(1);
      if (!calendarDay) {
        await tx.insert(productionCalendar).values({ tenantId: tenant.id, eventDate: eventDate!, capacity: 8, bookedQuantity: 0 }).onConflictDoNothing();
        [calendarDay] = await tx.select().from(productionCalendar)
          .where(and(eq(productionCalendar.tenantId, tenant.id), eq(productionCalendar.eventDate, eventDate!)))
          .for("update").limit(1);
      }
      if (!calendarDay || calendarDay.isBlocked || calendarDay.bookedQuantity >= calendarDay.capacity) return { unavailable: true as const };

      const [customer] = await tx.insert(customers).values({ tenantId: tenant.id, name, phone, lastOrderAt: new Date() })
        .onConflictDoUpdate({ target: [customers.tenantId, customers.phone], set: { name, lastOrderAt: new Date() } })
        .returning();
      const [order] = await tx.insert(customOrders).values({
        tenantId: tenant.id,
        customerId: customer.id,
        customerName: name,
        phone,
        orderType,
        flavor: body.flavor?.trim() || null,
        quantity,
        eventDate: eventDate!,
        fulfillmentType: body.fulfillmentType === "delivery" ? "delivery" : "pickup",
        message: body.message?.trim() || null,
        totalAmount: totalAmount.toFixed(2),
        depositAmount: depositAmount.toFixed(2),
        depositPaid: false,
        status: "requested",
      }).returning();
      await tx.insert(customOrderItems).values({
        tenantId: tenant.id,
        customOrderId: order.id,
        name: body.flavor?.trim() || orderType,
        quantity,
        unitPrice: (totalAmount / quantity).toFixed(2),
        notes: body.message?.trim() || null,
      });
      await tx.insert(payments).values({
        tenantId: tenant.id,
        customOrderId: order.id,
        provider: "manual-pix",
        method: "pix",
        amount: depositAmount.toFixed(2),
        status: "pending",
      });
      await tx.update(productionCalendar).set({ bookedQuantity: sql`${productionCalendar.bookedQuantity} + 1` })
        .where(eq(productionCalendar.id, calendarDay.id));
      return { unavailable: false as const, order };
    });

    if (result.unavailable) return Response.json({ error: "Essa data já atingiu a capacidade de produção." }, { status: 409 });
    return Response.json({ ok: true, order: result.order, depositAmount }, { status: 201 });
  } catch (error) {
    console.error("Falha ao registrar encomenda:", error);
    return Response.json({ error: "Não foi possível registrar a encomenda." }, { status: 500 });
  }
}
