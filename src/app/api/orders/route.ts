import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { coupons, customers, loyaltyLedger, orderItems, orders, payments, products, redemptions } from "@/db/schema";
import { ensureDemoData } from "@/lib/store";
import {
  calculateDiscount,
  calculateOrderTotals,
  couponWindow,
  meetsMinimumSubtotal,
  normalizeCouponCode,
} from "@/lib/pricing";

export const dynamic = "force-dynamic";

type OrderPayload = {
  name?: string;
  phone?: string;
  email?: string;
  fulfillmentType?: string;
  scheduledFor?: string;
  notes?: string;
  couponCode?: string;
  items?: Array<{ productId?: string; quantity?: number }>;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as OrderPayload;
    const name = body.name?.trim();
    const phone = body.phone?.replace(/\D/g, "");
    const items = Array.isArray(body.items)
      ? body.items.filter((item) => typeof item.productId === "string" && Number.isInteger(item.quantity) && Number(item.quantity) > 0)
      : [];

    if (!name || !phone || phone.length < 10 || items.length === 0) {
      return Response.json({ error: "Informe nome, WhatsApp e pelo menos um produto." }, { status: 400 });
    }

    const tenant = await ensureDemoData();
    const ids = [...new Set(items.map((item) => item.productId as string))];
    const availableProducts = await db.select().from(products).where(and(
      eq(products.tenantId, tenant.id),
      inArray(products.id, ids),
      eq(products.isActive, true),
      eq(products.isAvailable, true),
    ));
    if (availableProducts.length !== ids.length) {
      return Response.json({ error: "Um dos produtos não está mais disponível." }, { status: 409 });
    }

    const productsById = new Map(availableProducts.map((product) => [product.id, product]));
    const subtotal = items.reduce((sum, item) => sum + Number(productsById.get(item.productId as string)?.price ?? 0) * Number(item.quantity), 0);
    const fulfillmentType = body.fulfillmentType === "delivery" ? "delivery" : "pickup";
    const scheduledFor = body.scheduledFor ? new Date(body.scheduledFor) : null;
    if (scheduledFor && Number.isNaN(scheduledFor.getTime())) {
      return Response.json({ error: "Horário de retirada inválido." }, { status: 400 });
    }

    const couponCode = normalizeCouponCode(body.couponCode);
    let selectedCoupon: typeof coupons.$inferSelect | null = null;
    let discountAmount = 0;
    if (couponCode) {
      const [candidate] = await db.select().from(coupons).where(and(
        eq(coupons.tenantId, tenant.id), eq(coupons.code, couponCode), eq(coupons.isActive, true),
      )).limit(1);
      if (!candidate) return Response.json({ error: "Cupom não encontrado ou inativo." }, { status: 400 });
      const window = couponWindow(candidate);
      if (window === "scheduled" || window === "expired") {
        return Response.json({ error: "Esse cupom ainda não está válido ou já expirou." }, { status: 400 });
      }
      if (!meetsMinimumSubtotal(subtotal, candidate)) {
        return Response.json({ error: `O pedido precisa somar ${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(candidate.minimumSubtotal))} para usar este cupom.` }, { status: 400 });
      }
      selectedCoupon = candidate;
      discountAmount = calculateDiscount(subtotal, candidate);
    }
    const { deliveryFee, total } = calculateOrderTotals({ subtotal, discountAmount, fulfillmentType });

    const result = await db.transaction(async (tx) => {
      const [customer] = await tx.insert(customers).values({
        tenantId: tenant.id,
        name,
        phone,
        email: body.email?.trim() || null,
        lastOrderAt: new Date(),
      }).onConflictDoUpdate({
        target: [customers.tenantId, customers.phone],
        set: { name, email: body.email?.trim() || null, lastOrderAt: new Date() },
      }).returning();

      if (selectedCoupon) {
        const [lockedCoupon] = await tx.select().from(coupons).where(eq(coupons.id, selectedCoupon.id)).for("update").limit(1);
        if (!lockedCoupon || !lockedCoupon.isActive || (lockedCoupon.expiresAt && lockedCoupon.expiresAt < new Date()) || (lockedCoupon.startsAt && lockedCoupon.startsAt > new Date())) {
          throw new Error("COUPON:Este cupom não está mais disponível.");
        }
        if (lockedCoupon.maxRedemptions !== null && lockedCoupon.redemptionCount >= lockedCoupon.maxRedemptions) {
          throw new Error("COUPON:Este cupom atingiu o limite de resgates.");
        }
        const previousRedemptions = await tx.select({ id: redemptions.id }).from(redemptions).where(and(
          eq(redemptions.tenantId, tenant.id), eq(redemptions.couponId, lockedCoupon.id), eq(redemptions.customerId, customer.id),
        )).limit(lockedCoupon.maxPerCustomer);
        if (previousRedemptions.length >= lockedCoupon.maxPerCustomer) {
          throw new Error("COUPON:Este cupom já foi usado por este número de WhatsApp.");
        }
      }

      const suffix = `${Date.now().toString().slice(-7)}${Math.floor(Math.random() * 90 + 10)}`;
      const [order] = await tx.insert(orders).values({
        tenantId: tenant.id,
        orderNumber: `PN-${suffix}`,
        customerId: customer.id,
        channel: "storefront",
        fulfillmentType,
        status: "received",
        paymentStatus: "pending",
        scheduledFor,
        subtotal: subtotal.toFixed(2),
        discountAmount: discountAmount.toFixed(2),
        deliveryFee: deliveryFee.toFixed(2),
        total: total.toFixed(2),
        couponId: selectedCoupon?.id ?? null,
        notes: body.notes?.trim() || null,
      }).returning();

      await tx.insert(orderItems).values(items.map((item) => {
        const product = productsById.get(item.productId as string)!;
        const quantity = Number(item.quantity);
        const unitPrice = Number(product.price);
        return {
          tenantId: tenant.id,
          orderId: order.id,
          productId: product.id,
          nameSnapshot: product.name,
          quantity,
          unitPrice: unitPrice.toFixed(2),
          lineTotal: (unitPrice * quantity).toFixed(2),
        };
      }));
      await tx.insert(payments).values({
        tenantId: tenant.id,
        orderId: order.id,
        provider: "manual-pix",
        method: "pix",
        amount: total.toFixed(2),
        status: "pending",
      });
      if (selectedCoupon) {
        await tx.insert(redemptions).values({ tenantId: tenant.id, couponId: selectedCoupon.id, customerId: customer.id, orderId: order.id });
        await tx.update(coupons).set({ redemptionCount: sql`${coupons.redemptionCount} + 1` }).where(eq(coupons.id, selectedCoupon.id));
      }

      const earnedPoints = Math.floor(total);
      await tx.update(customers).set({
        lifetimeSpend: sql`${customers.lifetimeSpend} + ${total.toFixed(2)}`,
        loyaltyPoints: sql`${customers.loyaltyPoints} + ${earnedPoints}`,
      }).where(eq(customers.id, customer.id));
      await tx.insert(loyaltyLedger).values({
        tenantId: tenant.id,
        customerId: customer.id,
        orderId: order.id,
        pointsDelta: earnedPoints,
        reason: `Pedido #${order.orderNumber}`,
      });
      return order;
    });

    return Response.json({ ok: true, order: result, discountAmount }, { status: 201 });
  } catch (error) {
    console.error("Falha ao criar pedido:", error);
    if (error instanceof Error && error.message.startsWith("COUPON:")) {
      return Response.json({ error: error.message.slice(7) }, { status: 409 });
    }
    return Response.json({ error: "Não foi possível registrar o pedido. Tente novamente." }, { status: 500 });
  }
}
