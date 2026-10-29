import { describe, expect, it } from "vitest";
import {
  DELIVERY_FEE,
  calculateDiscount,
  calculateOrderTotals,
  couponWindow,
  meetsMinimumSubtotal,
  normalizeCouponCode,
} from "./pricing";

describe("normalizeCouponCode", () => {
  it("remove espaços e coloca em caixa alta", () => {
    expect(normalizeCouponCode("  pao 10 ")).toBe("PAO10");
    expect(normalizeCouponCode("cafe\tda\tcasa")).toBe("CAFEDACASA");
  });

  it("devolve string vazia para valores ausentes", () => {
    expect(normalizeCouponCode(undefined)).toBe("");
    expect(normalizeCouponCode(null)).toBe("");
    expect(normalizeCouponCode("")).toBe("");
  });
});

describe("couponWindow", () => {
  const now = new Date("2026-10-29T12:00:00-03:00");

  it("considera ativo o cupom sem janela e sem bloqueio", () => {
    expect(couponWindow({ discountType: "fixed", discountValue: "5" }, now)).toBe("active");
  });

  it("respeita o bloqueio manual", () => {
    expect(
      couponWindow({ discountType: "fixed", discountValue: "5", isActive: false }, now),
    ).toBe("inactive");
  });

  it("detecta cupom agendado", () => {
    expect(
      couponWindow(
        {
          discountType: "fixed",
          discountValue: "5",
          startsAt: new Date("2026-10-30T00:00:00-03:00"),
        },
        now,
      ),
    ).toBe("scheduled");
  });

  it("detecta cupom expirado", () => {
    expect(
      couponWindow(
        {
          discountType: "fixed",
          discountValue: "5",
          expiresAt: new Date("2026-10-28T23:59:59-03:00"),
        },
        now,
      ),
    ).toBe("expired");
  });

  it("mantém o cupom ativo dentro da janela", () => {
    expect(
      couponWindow(
        {
          discountType: "fixed",
          discountValue: "5",
          startsAt: new Date("2026-10-01T00:00:00-03:00"),
          expiresAt: new Date("2026-11-01T00:00:00-03:00"),
        },
        now,
      ),
    ).toBe("active");
  });
});

describe("calculateDiscount", () => {
  it("aplica percentual sobre o subtotal", () => {
    expect(calculateDiscount(50, { discountType: "percent", discountValue: "10" })).toBe(5);
  });

  it("aplica desconto fixo", () => {
    expect(calculateDiscount(20, { discountType: "fixed", discountValue: "7.5" })).toBe(7.5);
  });

  it("nunca passa do subtotal", () => {
    expect(calculateDiscount(20, { discountType: "fixed", discountValue: "30" })).toBe(20);
    expect(calculateDiscount(20, { discountType: "percent", discountValue: "150" })).toBe(20);
  });

  it("ignora valores inválidos ou não positivos", () => {
    expect(calculateDiscount(0, { discountType: "fixed", discountValue: "10" })).toBe(0);
    expect(calculateDiscount(-10, { discountType: "fixed", discountValue: "10" })).toBe(0);
    expect(calculateDiscount(20, { discountType: "fixed", discountValue: "-5" })).toBe(0);
    expect(calculateDiscount(20, { discountType: "fixed", discountValue: "abc" })).toBe(0);
  });
});

describe("meetsMinimumSubtotal", () => {
  it("aceita pedido no valor mínimo ou acima", () => {
    expect(meetsMinimumSubtotal(40, { minimumSubtotal: "40" })).toBe(true);
    expect(meetsMinimumSubtotal(41, { minimumSubtotal: "40" })).toBe(true);
  });

  it("recusa pedido abaixo do mínimo", () => {
    expect(meetsMinimumSubtotal(39.99, { minimumSubtotal: "40" })).toBe(false);
  });

  it("não exige mínimo quando o campo está vazio ou zerado", () => {
    expect(meetsMinimumSubtotal(1, { minimumSubtotal: null })).toBe(true);
    expect(meetsMinimumSubtotal(1, { minimumSubtotal: "0" })).toBe(true);
  });
});

describe("calculateOrderTotals", () => {
  it("não cobra entrega na retirada", () => {
    expect(
      calculateOrderTotals({ subtotal: 50, discountAmount: 10, fulfillmentType: "pickup" }),
    ).toEqual({ subtotal: 50, discountAmount: 10, deliveryFee: 0, total: 40 });
  });

  it("cobra a taxa fixa na entrega", () => {
    expect(
      calculateOrderTotals({ subtotal: 50, discountAmount: 10, fulfillmentType: "delivery" }),
    ).toEqual({
      subtotal: 50,
      discountAmount: 10,
      deliveryFee: DELIVERY_FEE,
      total: 40 + DELIVERY_FEE,
    });
  });

  it("limita o desconto ao subtotal", () => {
    expect(
      calculateOrderTotals({ subtotal: 20, discountAmount: 35, fulfillmentType: "pickup" }),
    ).toEqual({ subtotal: 20, discountAmount: 20, deliveryFee: 0, total: 0 });
  });

  it("normaliza entradas inválidas", () => {
    expect(
      calculateOrderTotals({ subtotal: -10, discountAmount: Number.NaN, fulfillmentType: "pickup" }),
    ).toEqual({ subtotal: 0, discountAmount: 0, deliveryFee: 0, total: 0 });
  });

  it("mantém o total positivo somando apenas a entrega quando o subtotal zera", () => {
    expect(
      calculateOrderTotals({ subtotal: 0, discountAmount: 0, fulfillmentType: "delivery" }).total,
    ).toBe(DELIVERY_FEE);
  });
});
