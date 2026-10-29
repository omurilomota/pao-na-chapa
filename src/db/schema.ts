import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

const id = () => uuid("id").defaultRandom().primaryKey();
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () => timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();
const tenantRef = () => uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" });

export const tenants = pgTable("tenants", {
  id: id(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 160 }).notNull(),
  vertical: varchar("vertical", { length: 40 }).notNull().default("bakery"),
  phone: varchar("phone", { length: 32 }),
  email: varchar("email", { length: 255 }),
  address: text("address"),
  city: varchar("city", { length: 120 }),
  state: varchar("state", { length: 2 }),
  timezone: varchar("timezone", { length: 64 }).notNull().default("America/Sao_Paulo"),
  brandColor: varchar("brand_color", { length: 16 }).notNull().default("#d85c36"),
  settings: jsonb("settings").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const users = pgTable("users", {
  id: id(),
  tenantId: tenantRef(),
  name: varchar("name", { length: 160 }).notNull(),
  phone: varchar("phone", { length: 32 }).notNull(),
  email: varchar("email", { length: 255 }),
  role: varchar("role", { length: 24 }).notNull().default("customer"),
  otpVerifiedAt: timestamp("otp_verified_at", { withTimezone: true }),
  createdAt: createdAt(),
}, (table) => [uniqueIndex("users_tenant_phone_unique").on(table.tenantId, table.phone)]);

export const customers = pgTable("customers", {
  id: id(),
  tenantId: tenantRef(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  name: varchar("name", { length: 160 }).notNull(),
  phone: varchar("phone", { length: 32 }).notNull(),
  email: varchar("email", { length: 255 }),
  birthday: date("birthday", { mode: "string" }),
  loyaltyPoints: integer("loyalty_points").notNull().default(0),
  tier: varchar("tier", { length: 24 }).notNull().default("bronze"),
  lifetimeSpend: numeric("lifetime_spend", { precision: 10, scale: 2 }).notNull().default("0"),
  lastOrderAt: timestamp("last_order_at", { withTimezone: true }),
  createdAt: createdAt(),
}, (table) => [
  uniqueIndex("customers_tenant_phone_unique").on(table.tenantId, table.phone),
  index("customers_tenant_created_idx").on(table.tenantId, table.createdAt),
]);

export const addresses = pgTable("addresses", {
  id: id(),
  tenantId: tenantRef(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  label: varchar("label", { length: 60 }).notNull().default("Casa"),
  recipient: varchar("recipient", { length: 160 }),
  street: varchar("street", { length: 180 }).notNull(),
  number: varchar("number", { length: 24 }).notNull(),
  complement: varchar("complement", { length: 120 }),
  neighborhood: varchar("neighborhood", { length: 120 }).notNull(),
  city: varchar("city", { length: 120 }).notNull(),
  state: varchar("state", { length: 2 }).notNull(),
  postalCode: varchar("postal_code", { length: 16 }),
  reference: text("reference"),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: createdAt(),
});

export const categories = pgTable("categories", {
  id: id(),
  tenantId: tenantRef(),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull(),
  description: text("description"),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: createdAt(),
}, (table) => [uniqueIndex("categories_tenant_slug_unique").on(table.tenantId, table.slug)]);

export const products = pgTable("products", {
  id: id(),
  tenantId: tenantRef(),
  categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
  slug: varchar("slug", { length: 120 }).notNull(),
  name: varchar("name", { length: 160 }).notNull(),
  description: text("description"),
  price: numeric("price", { precision: 10, scale: 2 }).notNull().default("0"),
  imageUrl: text("image_url"),
  productType: varchar("product_type", { length: 32 }).notNull().default("prepared"),
  availabilityPeriods: text("availability_periods").array().notNull().default(["all"]),
  stock: integer("stock"),
  isAvailable: boolean("is_available").notNull().default(true),
  isActive: boolean("is_active").notNull().default(true),
  isFeatured: boolean("is_featured").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [
  uniqueIndex("products_tenant_slug_unique").on(table.tenantId, table.slug),
  index("products_tenant_category_idx").on(table.tenantId, table.categoryId),
]);

export const productVariants = pgTable("product_variants", {
  id: id(),
  tenantId: tenantRef(),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  priceAdjustment: numeric("price_adjustment", { precision: 10, scale: 2 }).notNull().default("0"),
  isAvailable: boolean("is_available").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const coupons = pgTable("coupons", {
  id: id(),
  tenantId: tenantRef(),
  code: varchar("code", { length: 32 }).notNull(),
  title: varchar("title", { length: 140 }).notNull(),
  discountType: varchar("discount_type", { length: 24 }).notNull().default("fixed"),
  discountValue: numeric("discount_value", { precision: 10, scale: 2 }).notNull(),
  minimumSubtotal: numeric("minimum_subtotal", { precision: 10, scale: 2 }).notNull().default("0"),
  startsAt: timestamp("starts_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  maxRedemptions: integer("max_redemptions"),
  maxPerCustomer: integer("max_per_customer").notNull().default(1),
  redemptionCount: integer("redemption_count").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: createdAt(),
}, (table) => [uniqueIndex("coupons_tenant_code_unique").on(table.tenantId, table.code)]);

export const orders = pgTable("orders", {
  id: id(),
  tenantId: tenantRef(),
  orderNumber: varchar("order_number", { length: 32 }).notNull(),
  customerId: uuid("customer_id").references(() => customers.id, { onDelete: "set null" }),
  channel: varchar("channel", { length: 24 }).notNull().default("storefront"),
  fulfillmentType: varchar("fulfillment_type", { length: 24 }).notNull().default("pickup"),
  status: varchar("status", { length: 24 }).notNull().default("received"),
  paymentStatus: varchar("payment_status", { length: 24 }).notNull().default("pending"),
  scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
  subtotal: numeric("subtotal", { precision: 10, scale: 2 }).notNull().default("0"),
  discountAmount: numeric("discount_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  deliveryFee: numeric("delivery_fee", { precision: 10, scale: 2 }).notNull().default("0"),
  total: numeric("total", { precision: 10, scale: 2 }).notNull().default("0"),
  couponId: uuid("coupon_id").references(() => coupons.id, { onDelete: "set null" }),
  notes: text("notes"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [
  uniqueIndex("orders_tenant_number_unique").on(table.tenantId, table.orderNumber),
  index("orders_tenant_created_idx").on(table.tenantId, table.createdAt),
  index("orders_tenant_status_idx").on(table.tenantId, table.status),
]);

export const orderItems = pgTable("order_items", {
  id: id(),
  tenantId: tenantRef(),
  orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
  variantId: uuid("variant_id").references(() => productVariants.id, { onDelete: "set null" }),
  nameSnapshot: varchar("name_snapshot", { length: 180 }).notNull(),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull(),
  lineTotal: numeric("line_total", { precision: 10, scale: 2 }).notNull(),
});

export const payments = pgTable("payments", {
  id: id(),
  tenantId: tenantRef(),
  orderId: uuid("order_id").references(() => orders.id, { onDelete: "cascade" }),
  customOrderId: uuid("custom_order_id"),
  provider: varchar("provider", { length: 32 }).notNull().default("manual"),
  method: varchar("method", { length: 24 }).notNull().default("pix"),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  status: varchar("status", { length: 24 }).notNull().default("pending"),
  providerReference: varchar("provider_reference", { length: 120 }),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  createdAt: createdAt(),
});

export const redemptions = pgTable("redemptions", {
  id: id(),
  tenantId: tenantRef(),
  couponId: uuid("coupon_id").notNull().references(() => coupons.id, { onDelete: "cascade" }),
  customerId: uuid("customer_id").references(() => customers.id, { onDelete: "set null" }),
  orderId: uuid("order_id").references(() => orders.id, { onDelete: "set null" }),
  redeemedAt: createdAt(),
});

export const loyaltyLedger = pgTable("loyalty_ledger", {
  id: id(),
  tenantId: tenantRef(),
  customerId: uuid("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  orderId: uuid("order_id").references(() => orders.id, { onDelete: "set null" }),
  pointsDelta: integer("points_delta").notNull(),
  reason: varchar("reason", { length: 120 }).notNull(),
  createdAt: createdAt(),
}, (table) => [index("loyalty_tenant_customer_idx").on(table.tenantId, table.customerId)]);

export const subscriptions = pgTable("subscriptions", {
  id: id(),
  tenantId: tenantRef(),
  customerId: uuid("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  planName: varchar("plan_name", { length: 140 }).notNull(),
  verticalPlan: varchar("vertical_plan", { length: 48 }).notNull().default("bread-club"),
  billingInterval: varchar("billing_interval", { length: 24 }).notNull().default("monthly"),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  status: varchar("status", { length: 24 }).notNull().default("active"),
  nextRenewalAt: timestamp("next_renewal_at", { withTimezone: true }),
  preferences: jsonb("preferences").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: createdAt(),
});

export const notifications = pgTable("notifications", {
  id: id(),
  tenantId: tenantRef(),
  customerId: uuid("customer_id").references(() => customers.id, { onDelete: "cascade" }),
  channel: varchar("channel", { length: 24 }).notNull().default("whatsapp"),
  title: varchar("title", { length: 160 }).notNull(),
  body: text("body").notNull(),
  status: varchar("status", { length: 24 }).notNull().default("queued"),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  createdAt: createdAt(),
});

// Bakery vertical: dayparts, fresh-bake batches, party orders and production capacity.
export const timeWindows = pgTable("time_windows", {
  id: id(),
  tenantId: tenantRef(),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull(),
  startsAt: time("starts_at").notNull(),
  endsAt: time("ends_at").notNull(),
  daysOfWeek: integer("days_of_week").array().notNull().default([0, 1, 2, 3, 4, 5, 6]),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
}, (table) => [uniqueIndex("time_windows_tenant_slug_unique").on(table.tenantId, table.slug)]);

export const batches = pgTable("batches", {
  id: id(),
  tenantId: tenantRef(),
  productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
  label: varchar("label", { length: 160 }).notNull(),
  expectedAt: timestamp("expected_at", { withTimezone: true }).notNull(),
  capacity: integer("capacity").notNull().default(0),
  reservedCount: integer("reserved_count").notNull().default(0),
  status: varchar("status", { length: 24 }).notNull().default("scheduled"),
  notes: text("notes"),
  createdAt: createdAt(),
}, (table) => [index("batches_tenant_expected_idx").on(table.tenantId, table.expectedAt)]);

export const batchReservations = pgTable("batch_reservations", {
  id: id(),
  tenantId: tenantRef(),
  batchId: uuid("batch_id").notNull().references(() => batches.id, { onDelete: "cascade" }),
  customerId: uuid("customer_id").references(() => customers.id, { onDelete: "set null" }),
  productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
  customerName: varchar("customer_name", { length: 160 }).notNull(),
  phone: varchar("phone", { length: 32 }).notNull(),
  quantity: integer("quantity").notNull().default(1),
  reservationCode: varchar("reservation_code", { length: 24 }).notNull(),
  status: varchar("status", { length: 24 }).notNull().default("reserved"),
  pickupAt: timestamp("pickup_at", { withTimezone: true }).notNull(),
  createdAt: createdAt(),
}, (table) => [uniqueIndex("batch_reservations_tenant_code_unique").on(table.tenantId, table.reservationCode)]);

export const customOrders = pgTable("custom_orders", {
  id: id(),
  tenantId: tenantRef(),
  customerId: uuid("customer_id").references(() => customers.id, { onDelete: "set null" }),
  customerName: varchar("customer_name", { length: 160 }).notNull(),
  phone: varchar("phone", { length: 32 }).notNull(),
  orderType: varchar("order_type", { length: 48 }).notNull().default("cake"),
  flavor: varchar("flavor", { length: 160 }),
  quantity: integer("quantity").notNull().default(1),
  eventDate: date("event_date", { mode: "string" }).notNull(),
  fulfillmentType: varchar("fulfillment_type", { length: 24 }).notNull().default("pickup"),
  deliveryAddress: text("delivery_address"),
  message: text("message"),
  totalAmount: numeric("total_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  depositAmount: numeric("deposit_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  depositPaid: boolean("deposit_paid").notNull().default(false),
  status: varchar("status", { length: 24 }).notNull().default("requested"),
  notes: text("notes"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [
  index("custom_orders_tenant_event_idx").on(table.tenantId, table.eventDate),
  index("custom_orders_tenant_status_idx").on(table.tenantId, table.status),
]);

export const customOrderItems = pgTable("custom_order_items", {
  id: id(),
  tenantId: tenantRef(),
  customOrderId: uuid("custom_order_id").notNull().references(() => customOrders.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 180 }).notNull(),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull().default("0"),
  notes: text("notes"),
});

export const productionCalendar = pgTable("production_calendar", {
  id: id(),
  tenantId: tenantRef(),
  eventDate: date("event_date", { mode: "string" }).notNull(),
  capacity: integer("capacity").notNull().default(10),
  bookedQuantity: integer("booked_quantity").notNull().default(0),
  isBlocked: boolean("is_blocked").notNull().default(false),
  notes: text("notes"),
}, (table) => [uniqueIndex("production_calendar_tenant_date_unique").on(table.tenantId, table.eventDate)]);

export const corporateAccounts = pgTable("corporate_accounts", {
  id: id(),
  tenantId: tenantRef(),
  companyName: varchar("company_name", { length: 180 }).notNull(),
  contactName: varchar("contact_name", { length: 160 }).notNull(),
  phone: varchar("phone", { length: 32 }).notNull(),
  email: varchar("email", { length: 255 }),
  billingCycle: varchar("billing_cycle", { length: 24 }).notNull().default("monthly"),
  creditLimit: numeric("credit_limit", { precision: 10, scale: 2 }).notNull().default("0"),
  status: varchar("status", { length: 24 }).notNull().default("active"),
  createdAt: createdAt(),
});

export const restaurantSettings = pgTable("restaurant_settings", {
  id: id(),
  tenantId: tenantRef(),
  menuRefreshTime: time("menu_refresh_time").notNull().default("10:30:00"),
  subscriptionProduct: varchar("subscription_product", { length: 120 }).notNull().default("marmita-executiva"),
  deliveryRadiusKm: numeric("delivery_radius_km", { precision: 5, scale: 2 }).notNull().default("5"),
  settings: jsonb("settings").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: createdAt(),
}, (table) => [uniqueIndex("restaurant_settings_tenant_unique").on(table.tenantId)]);

export const verticalPlugins = pgTable("vertical_plugins", {
  id: id(),
  tenantId: tenantRef(),
  key: varchar("key", { length: 60 }).notNull(),
  enabled: boolean("enabled").notNull().default(true),
  configuration: jsonb("configuration").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: createdAt(),
}, (table) => [uniqueIndex("vertical_plugins_tenant_key_unique").on(table.tenantId, table.key)]);
