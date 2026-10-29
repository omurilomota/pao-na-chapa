export const DELIVERY_FEE = 4.9;

export type CouponLike = {
  discountType: string;
  discountValue: string | number;
  minimumSubtotal?: string | number | null;
  startsAt?: Date | null;
  expiresAt?: Date | null;
  isActive?: boolean;
};

export type CouponWindow = "active" | "inactive" | "scheduled" | "expired";

/** Código de cupom é comparado sem espaços, em caixa alta. */
export function normalizeCouponCode(code: string | null | undefined): string {
  return (code ?? "").trim().toUpperCase().replace(/\s+/g, "");
}

/** Estado temporal do cupom, independente do subtotal do pedido. */
export function couponWindow(coupon: CouponLike, now: Date = new Date()): CouponWindow {
  if (coupon.isActive === false) return "inactive";
  if (coupon.startsAt && coupon.startsAt > now) return "scheduled";
  if (coupon.expiresAt && coupon.expiresAt < now) return "expired";
  return "active";
}

/** Desconto nunca passa do subtotal nem aceita valores inválidos. */
export function calculateDiscount(
  subtotal: number,
  coupon: Pick<CouponLike, "discountType" | "discountValue">,
): number {
  if (!Number.isFinite(subtotal) || subtotal <= 0) return 0;
  const value = Number(coupon.discountValue);
  if (!Number.isFinite(value) || value <= 0) return 0;
  const raw = coupon.discountType === "percent" ? (subtotal * value) / 100 : value;
  return Math.min(subtotal, raw);
}

export function meetsMinimumSubtotal(
  subtotal: number,
  coupon: Pick<CouponLike, "minimumSubtotal">,
): boolean {
  const minimum = Number(coupon.minimumSubtotal ?? 0);
  if (!Number.isFinite(minimum) || minimum <= 0) return true;
  return subtotal >= minimum;
}

export type OrderTotals = {
  subtotal: number;
  discountAmount: number;
  deliveryFee: number;
  total: number;
};

export function calculateOrderTotals(input: {
  subtotal: number;
  discountAmount?: number;
  fulfillmentType?: string;
}): OrderTotals {
  const subtotal = Number.isFinite(input.subtotal) && input.subtotal > 0 ? input.subtotal : 0;
  const requestedDiscount =
    Number.isFinite(input.discountAmount) && (input.discountAmount ?? 0) > 0
      ? (input.discountAmount as number)
      : 0;
  const discountAmount = Math.min(subtotal, requestedDiscount);
  const deliveryFee = input.fulfillmentType === "delivery" ? DELIVERY_FEE : 0;
  return {
    subtotal,
    discountAmount,
    deliveryFee,
    total: Math.max(0, subtotal - discountAmount) + deliveryFee,
  };
}
