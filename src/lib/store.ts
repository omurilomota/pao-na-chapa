import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  batchReservations,
  batches,
  categories,
  corporateAccounts,
  coupons,
  customers,
  customOrders,
  loyaltyLedger,
  orderItems,
  orders,
  productionCalendar,
  products,
  restaurantSettings,
  subscriptions,
  tenants,
  timeWindows,
  verticalPlugins,
} from "@/db/schema";

export const DEMO_TENANT_SLUG = "pao-na-chapa";

function atTime(dayOffset: number, hour: number, minute = 0) {
  const value = new Date();
  value.setDate(value.getDate() + dayOffset);
  value.setHours(hour, minute, 0, 0);
  return value;
}

function calendarDate(dayOffset: number) {
  const value = atTime(dayOffset, 12);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

export async function ensureDemoData() {
  await db
    .insert(tenants)
    .values({
      slug: DEMO_TENANT_SLUG,
      name: "Padaria e Doceria Pão na Chapa",
      vertical: "bakery",
      phone: "(18) 99999-0107",
      email: "contato@exemplo.com",
      address: "Rua das Flores, 180 – Centro",
      city: "Junqueirópolis",
      state: "SP",
      brandColor: "#d85c36",
      settings: {
        openingHours: {
          weekdays: "05:40–19:00",
          saturday: "05:40–17:00",
          sunday: "06:00–12:00",
        },
        postalCode: "00000-000",
      },
    })
    .onConflictDoNothing({ target: tenants.slug });

  const [tenant] = await db.select().from(tenants).where(eq(tenants.slug, DEMO_TENANT_SLUG)).limit(1);
  if (!tenant) throw new Error("Não foi possível carregar a loja de demonstração.");

  await db.transaction(async (tx) => {
    await tx.execute(
      // A transaction-scoped lock prevents duplicate demo rows on simultaneous first requests.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (await import("drizzle-orm")).sql`select pg_advisory_xact_lock(146284731)`,
    );
    const [existingProduct] = await tx.select({ id: products.id }).from(products).where(eq(products.tenantId, tenant.id)).limit(1);
    if (existingProduct) return;

    const categoryRows = await tx
      .insert(categories)
      .values([
        { tenantId: tenant.id, name: "Pães & fornadas", slug: "paes-fornadas", description: "Pães fresquinhos ao longo do dia", sortOrder: 0 },
        { tenantId: tenant.id, name: "Café da manhã", slug: "cafe-da-manha", description: "Comece bem o dia", sortOrder: 1 },
        { tenantId: tenant.id, name: "Salgados", slug: "salgados", description: "Feitos na casa, sempre fresquinhos", sortOrder: 2 },
        { tenantId: tenant.id, name: "Encomendas", slug: "encomendas", description: "Celebrações feitas com carinho", sortOrder: 3 },
      ])
      .returning();
    const categoryBySlug = Object.fromEntries(categoryRows.map((category) => [category.slug, category.id]));

    const productRows = await tx
      .insert(products)
      .values([
        { tenantId: tenant.id, categoryId: categoryBySlug["paes-fornadas"], slug: "pao-frances", name: "Pão francês", description: "Casquinha dourada, miolo macio. Sai quentinho várias vezes ao dia.", price: "0.85", productType: "bakery", availabilityPeriods: ["breakfast", "afternoon"], isFeatured: true, sortOrder: 0 },
        { tenantId: tenant.id, categoryId: categoryBySlug["cafe-da-manha"], slug: "pao-na-chapa", name: "Pão na chapa com requeijão", description: "Na chapa, crocante por fora e com requeijão cremoso.", price: "8.90", productType: "prepared", availabilityPeriods: ["breakfast", "afternoon"], imageUrl: "/images/vitrine-pao-na-chapa.jpg", isFeatured: true, sortOrder: 1 },
        { tenantId: tenant.id, categoryId: categoryBySlug["cafe-da-manha"], slug: "cafe-coado", name: "Café coado", description: "Café fresquinho passado na hora.", price: "4.50", productType: "prepared", availabilityPeriods: ["breakfast", "afternoon"], isFeatured: true, sortOrder: 2 },
        { tenantId: tenant.id, categoryId: categoryBySlug["paes-fornadas"], slug: "croissant-manteiga", name: "Croissant de manteiga", description: "Folhado artesanal, dourado e amanteigado.", price: "8.50", productType: "bakery", availabilityPeriods: ["breakfast", "afternoon"], isFeatured: true, sortOrder: 3 },
        { tenantId: tenant.id, categoryId: categoryBySlug["salgados"], slug: "pao-de-queijo", name: "Pão de queijo", description: "Porção com 4 unidades, quentinhas do forno.", price: "9.90", productType: "prepared", availabilityPeriods: ["breakfast", "afternoon"], isFeatured: true, sortOrder: 4 },
        { tenantId: tenant.id, categoryId: categoryBySlug["salgados"], slug: "coxinha-frango", name: "Coxinha de frango", description: "Massa leve, recheio cremoso e tempero da casa.", price: "7.90", productType: "prepared", availabilityPeriods: ["lunch", "afternoon"], isFeatured: false, sortOrder: 5 },
        { tenantId: tenant.id, categoryId: categoryBySlug["cafe-da-manha"], slug: "tapioca-queijo", name: "Tapioca de queijo", description: "Feita na hora com queijo derretido.", price: "11.90", productType: "prepared", availabilityPeriods: ["breakfast", "afternoon"], isFeatured: false, sortOrder: 6 },
        { tenantId: tenant.id, categoryId: categoryBySlug["encomendas"], slug: "bolo-festa", name: "Bolo de festa", description: "Confeitado à mão. Consulte sabores e agenda de produção.", price: "89.00", productType: "custom", availabilityPeriods: ["all"], isFeatured: true, sortOrder: 7 },
        { tenantId: tenant.id, categoryId: categoryBySlug["encomendas"], slug: "kit-festa", name: "Kit festa para 10", description: "Mini salgados, docinhos e bolo para comemorar.", price: "189.00", productType: "custom", availabilityPeriods: ["all"], isFeatured: false, sortOrder: 8 },
      ])
      .returning();
    const productBySlug = Object.fromEntries(productRows.map((product) => [product.slug, product]));

    const customerRows = await tx
      .insert(customers)
      .values([
        { tenantId: tenant.id, name: "Bruna Costa", phone: "18996112040", email: "bruna.costa@email.com", loyaltyPoints: 246, tier: "ouro", lifetimeSpend: "1286.50", lastOrderAt: atTime(0, 8, 31) },
        { tenantId: tenant.id, name: "Marcos Vieira", phone: "18996223351", loyaltyPoints: 92, tier: "prata", lifetimeSpend: "684.20", lastOrderAt: atTime(0, 8, 17) },
        { tenantId: tenant.id, name: "Juliana Moraes", phone: "18996334462", loyaltyPoints: 181, tier: "prata", lifetimeSpend: "918.90", lastOrderAt: atTime(0, 7, 56) },
        { tenantId: tenant.id, name: "Rafael Lima", phone: "18996445573", loyaltyPoints: 42, tier: "bronze", lifetimeSpend: "231.80", lastOrderAt: atTime(0, 7, 42) },
        { tenantId: tenant.id, name: "Isabela Nunes", phone: "18996556684", loyaltyPoints: 315, tier: "ouro", lifetimeSpend: "1890.00", lastOrderAt: atTime(-1, 16, 25) },
        { tenantId: tenant.id, name: "Enzo Carvalho", phone: "18996667795", loyaltyPoints: 67, tier: "bronze", lifetimeSpend: "397.50", lastOrderAt: atTime(-1, 15, 48) },
        { tenantId: tenant.id, name: "Camila Rocha", phone: "18996778806", loyaltyPoints: 124, tier: "prata", lifetimeSpend: "738.60", lastOrderAt: atTime(-2, 9, 12) },
        { tenantId: tenant.id, name: "Paulo Ferreira", phone: "18996889917", loyaltyPoints: 28, tier: "bronze", lifetimeSpend: "164.90", lastOrderAt: atTime(-2, 7, 9) },
      ])
      .returning();

    const orderSeeds = [
      { number: "PN-02481", customer: 0, channel: "storefront", fulfillmentType: "pickup", status: "preparing", paymentStatus: "paid", subtotal: "34.80", minutesAgo: 4, items: [["pao-na-chapa", 2], ["cafe-coado", 2]] as [string, number][] },
      { number: "PN-02480", customer: 1, channel: "whatsapp", fulfillmentType: "pickup", status: "ready", paymentStatus: "paid", subtotal: "18.70", minutesAgo: 12, items: [["pao-de-queijo", 1], ["cafe-coado", 2]] as [string, number][] },
      { number: "PN-02479", customer: 2, channel: "ifood", fulfillmentType: "delivery", status: "preparing", paymentStatus: "paid", subtotal: "68.50", minutesAgo: 23, items: [["croissant-manteiga", 2], ["tapioca-queijo", 1], ["pao-frances", 5]] as [string, number][] },
      { number: "PN-02478", customer: 3, channel: "storefront", fulfillmentType: "pickup", status: "received", paymentStatus: "pending", subtotal: "13.50", minutesAgo: 35, items: [["coxinha-frango", 1], ["cafe-coado", 1]] as [string, number][] },
      { number: "PN-02477", customer: 4, channel: "whatsapp", fulfillmentType: "pickup", status: "delivered", paymentStatus: "paid", subtotal: "42.60", minutesAgo: 53, items: [["pao-na-chapa", 2], ["pao-frances", 10]] as [string, number][] },
      { number: "PN-02476", customer: 5, channel: "storefront", fulfillmentType: "delivery", status: "delivered", paymentStatus: "paid", subtotal: "27.90", minutesAgo: 76, items: [["pao-de-queijo", 1], ["coxinha-frango", 1], ["cafe-coado", 1]] as [string, number][] },
    ];
    const orderRows = await tx
      .insert(orders)
      .values(orderSeeds.map((order) => ({
        tenantId: tenant.id,
        orderNumber: order.number,
        customerId: customerRows[order.customer].id,
        channel: order.channel,
        fulfillmentType: order.fulfillmentType,
        status: order.status,
        paymentStatus: order.paymentStatus,
        subtotal: order.subtotal,
        total: order.subtotal,
        createdAt: new Date(Date.now() - order.minutesAgo * 60_000),
      })))
      .returning();
    const items = orderRows.flatMap((order, index) => orderSeeds[index].items.map(([slug, quantity]) => {
      const product = productBySlug[slug];
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
    await tx.insert(orderItems).values(items);

    const batchRows = await tx.insert(batches).values([
      { tenantId: tenant.id, productId: productBySlug["pao-frances"].id, label: "Pão francês", expectedAt: atTime(0, 9, 45), capacity: 180, reservedCount: 62, status: "baking", notes: "Próxima fornada da manhã" },
      { tenantId: tenant.id, productId: productBySlug["pao-de-queijo"].id, label: "Pão de queijo", expectedAt: atTime(0, 11, 0), capacity: 72, reservedCount: 24, status: "scheduled", notes: "Assar às 10h40" },
      { tenantId: tenant.id, productId: productBySlug["coxinha-frango"].id, label: "Salgados da tarde", expectedAt: atTime(0, 15, 30), capacity: 96, reservedCount: 18, status: "scheduled", notes: "Coxinhas e assados" },
      { tenantId: tenant.id, productId: productBySlug["croissant-manteiga"].id, label: "Croissant", expectedAt: atTime(0, 16, 0), capacity: 36, reservedCount: 11, status: "scheduled", notes: "Lote da tarde" },
    ]).returning();

    await tx.insert(batchReservations).values([
      { tenantId: tenant.id, batchId: batchRows[0].id, customerId: customerRows[0].id, productId: productBySlug["pao-frances"].id, customerName: "Bruna Costa", phone: customerRows[0].phone, quantity: 12, reservationCode: "FOR-8104", status: "reserved", pickupAt: atTime(0, 9, 45) },
      { tenantId: tenant.id, batchId: batchRows[1].id, customerId: customerRows[1].id, productId: productBySlug["pao-de-queijo"].id, customerName: "Marcos Vieira", phone: customerRows[1].phone, quantity: 8, reservationCode: "FOR-8103", status: "reserved", pickupAt: atTime(0, 11, 0) },
      { tenantId: tenant.id, batchId: batchRows[2].id, customerId: customerRows[3].id, productId: productBySlug["coxinha-frango"].id, customerName: "Rafael Lima", phone: customerRows[3].phone, quantity: 6, reservationCode: "FOR-8098", status: "reserved", pickupAt: atTime(0, 15, 30) },
    ]);

    await tx.insert(customOrders).values([
      { tenantId: tenant.id, customerId: customerRows[4].id, customerName: "Isabela Nunes", phone: customerRows[4].phone, orderType: "cake", flavor: "Ninho com morango", quantity: 1, eventDate: calendarDate(1), fulfillmentType: "pickup", message: "Parabéns, Laura! 8 anos", totalAmount: "268.00", depositAmount: "100.00", depositPaid: true, status: "production", notes: "Bolo para 25 pessoas" },
      { tenantId: tenant.id, customerId: customerRows[6].id, customerName: "Camila Rocha", phone: customerRows[6].phone, orderType: "party-kit", flavor: "Mini salgados variados", quantity: 120, eventDate: calendarDate(2), fulfillmentType: "pickup", totalAmount: "318.00", depositAmount: "120.00", depositPaid: true, status: "confirmed", notes: "3 sabores, 40 de cada" },
      { tenantId: tenant.id, customerId: customerRows[2].id, customerName: "Juliana Moraes", phone: customerRows[2].phone, orderType: "cake", flavor: "Chocolate com brigadeiro", quantity: 1, eventDate: calendarDate(3), fulfillmentType: "delivery", deliveryAddress: "Centro, Junqueirópolis", message: "Feliz aniversário, vó!", totalAmount: "198.00", depositAmount: "79.20", depositPaid: false, status: "requested", notes: "Aguardando sinal" },
      { tenantId: tenant.id, customerId: customerRows[1].id, customerName: "Marcos Vieira", phone: customerRows[1].phone, orderType: "savories", flavor: "Mini hambúrguer + hot dog", quantity: 50, eventDate: calendarDate(5), fulfillmentType: "pickup", totalAmount: "245.00", depositAmount: "98.00", depositPaid: true, status: "confirmed", notes: "Retirada às 17h" },
    ]);

    const promoEnd = atTime(7, 23, 59);
    await tx.insert(coupons).values([
      { tenantId: tenant.id, code: "BOMDIA15", title: "Combo café + pão na chapa", discountType: "percent", discountValue: "15", minimumSubtotal: "10", expiresAt: promoEnd, maxRedemptions: 60, maxPerCustomer: 1, redemptionCount: 38, isActive: true },
      { tenantId: tenant.id, code: "VOLTEI5", title: "R$ 5 para voltar", discountType: "fixed", discountValue: "5", minimumSubtotal: "25", expiresAt: atTime(14, 23, 59), maxRedemptions: 100, maxPerCustomer: 1, redemptionCount: 12, isActive: true },
    ]);

    await tx.insert(timeWindows).values([
      { tenantId: tenant.id, name: "Café da manhã", slug: "cafe-da-manha", startsAt: "05:40:00", endsAt: "10:00:00", sortOrder: 0 },
      { tenantId: tenant.id, name: "Almoço", slug: "almoco", startsAt: "11:00:00", endsAt: "14:00:00", sortOrder: 1 },
      { tenantId: tenant.id, name: "Café da tarde", slug: "cafe-da-tarde", startsAt: "15:00:00", endsAt: "19:00:00", sortOrder: 2 },
    ]);
    await tx.insert(subscriptions).values([
      { tenantId: tenant.id, customerId: customerRows[0].id, planName: "Clube do Pão Quente", verticalPlan: "bread-club", billingInterval: "monthly", amount: "89.90", status: "active", nextRenewalAt: atTime(12, 8), preferences: { delivery: false, weekdays: [1, 2, 3, 4, 5] } },
      { tenantId: tenant.id, customerId: customerRows[4].id, planName: "Café & Salgado da Semana", verticalPlan: "coffee-weekly", billingInterval: "weekly", amount: "39.90", status: "active", nextRenewalAt: atTime(4, 7), preferences: { pickupTime: "07:30" } },
      { tenantId: tenant.id, customerId: customerRows[6].id, planName: "Clube do Pão Quente", verticalPlan: "bread-club", billingInterval: "monthly", amount: "89.90", status: "paused", nextRenewalAt: atTime(18, 8), preferences: { delivery: true } },
    ]);

    await tx.insert(productionCalendar).values([
      { tenantId: tenant.id, eventDate: calendarDate(1), capacity: 8, bookedQuantity: 6, notes: "2 horários disponíveis" },
      { tenantId: tenant.id, eventDate: calendarDate(2), capacity: 8, bookedQuantity: 5, notes: "Agenda quase cheia" },
      { tenantId: tenant.id, eventDate: calendarDate(3), capacity: 8, bookedQuantity: 8, isBlocked: true, notes: "Capacidade máxima" },
    ]);
    await tx.insert(corporateAccounts).values([
      { tenantId: tenant.id, companyName: "Clínica São Lucas", contactName: "Mariana Lopes", phone: "18997001122", email: "compras@clinicasaolucas.com.br", billingCycle: "monthly", creditLimit: "900.00", status: "active" },
      { tenantId: tenant.id, companyName: "Colégio Integração", contactName: "Roberto Alves", phone: "18997002233", billingCycle: "weekly", creditLimit: "650.00", status: "active" },
    ]);
    await tx.insert(verticalPlugins).values([
      { tenantId: tenant.id, key: "bakery", enabled: true, configuration: { reservations: true, customOrders: true, dayparts: true } },
      { tenantId: tenant.id, key: "restaurant", enabled: false, configuration: { dailyMenu: true, mealPlans: true } },
    ]);
    await tx.insert(restaurantSettings).values({ tenantId: tenant.id });
    await tx.insert(loyaltyLedger).values([
      { tenantId: tenant.id, customerId: customerRows[0].id, pointsDelta: 34, reason: "Pedido #PN-02481" },
      { tenantId: tenant.id, customerId: customerRows[1].id, pointsDelta: 19, reason: "Pedido #PN-02480" },
    ]);
  });

  return tenant;
}

export async function getWorkspaceData() {
  const tenant = await ensureDemoData();
  const [productRows, categoryRows, customerRows, orderRows, itemRows, customOrderRows, batchRows, reservationRows, couponRows, subscriptionRows, accountRows] = await Promise.all([
    db.select().from(products).where(eq(products.tenantId, tenant.id)).orderBy(products.sortOrder),
    db.select().from(categories).where(eq(categories.tenantId, tenant.id)).orderBy(categories.sortOrder),
    db.select().from(customers).where(eq(customers.tenantId, tenant.id)).orderBy(desc(customers.lastOrderAt)),
    db.select({ order: orders, customerName: customers.name, customerPhone: customers.phone })
      .from(orders).leftJoin(customers, eq(orders.customerId, customers.id))
      .where(eq(orders.tenantId, tenant.id)).orderBy(desc(orders.createdAt)).limit(20),
    db.select().from(orderItems).where(eq(orderItems.tenantId, tenant.id)),
    db.select().from(customOrders).where(eq(customOrders.tenantId, tenant.id)).orderBy(customOrders.eventDate),
    db.select({ batch: batches, productName: products.name })
      .from(batches).leftJoin(products, eq(batches.productId, products.id))
      .where(eq(batches.tenantId, tenant.id)).orderBy(batches.expectedAt),
    db.select().from(batchReservations).where(eq(batchReservations.tenantId, tenant.id)).orderBy(desc(batchReservations.createdAt)),
    db.select().from(coupons).where(eq(coupons.tenantId, tenant.id)).orderBy(desc(coupons.createdAt)),
    db.select({ subscription: subscriptions, customerName: customers.name, customerPhone: customers.phone })
      .from(subscriptions).leftJoin(customers, eq(subscriptions.customerId, customers.id))
      .where(eq(subscriptions.tenantId, tenant.id)).orderBy(desc(subscriptions.createdAt)),
    db.select().from(corporateAccounts).where(eq(corporateAccounts.tenantId, tenant.id)).orderBy(corporateAccounts.companyName),
  ]);

  const itemsByOrder = new Map<string, typeof itemRows>();
  for (const item of itemRows) {
    const current = itemsByOrder.get(item.orderId) ?? [];
    current.push(item);
    itemsByOrder.set(item.orderId, current);
  }

  return {
    tenant,
    categories: categoryRows,
    products: productRows,
    customers: customerRows,
    orders: orderRows.map(({ order, customerName, customerPhone }) => ({
      ...order,
      customerName: customerName ?? "Cliente balcão",
      customerPhone,
      items: itemsByOrder.get(order.id) ?? [],
    })),
    customOrders: customOrderRows,
    batches: batchRows.map(({ batch, productName }) => ({ ...batch, productName: productName ?? "Produção da casa" })),
    reservations: reservationRows,
    coupons: couponRows,
    subscriptions: subscriptionRows.map(({ subscription, customerName, customerPhone }) => ({ ...subscription, customerName: customerName ?? "Cliente", customerPhone })),
    corporateAccounts: accountRows,
  };
}
