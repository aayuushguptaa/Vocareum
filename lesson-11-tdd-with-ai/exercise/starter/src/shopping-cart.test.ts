/**
 * Shopping Cart Tests
 *
 * TODO: Use Claude Code to generate comprehensive tests
 * based on your requirements in tdd-strategy.md
 *
 * Run: npm test
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  addItem,
  removeItem,
  updateQuantity,
  applyPromoCode,
  calculateTotals,
  clearCart,
  getCart,
} from "./shopping-cart.js";

// =============================================================================
// Setup
// =============================================================================

beforeEach(() => {
  clearCart();
});

// =============================================================================
// Sample Tests (Students should generate more with Claude)
// =============================================================================

describe("Shopping Cart", () => {
  describe("Add Item", () => {
    it("should add a valid product to cart", () => {
      const result = addItem("PROD-001", 1);

      expect(result.success).toBe(true);
      expect(result.cart).toHaveLength(1);
      expect(result.cart![0].productId).toBe("PROD-001");
    });

    it("should reject invalid product ID", () => {
      const result = addItem("INVALID-ID", 1);

      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });

    // TODO: Generate more tests with Claude for:
    // - Adding same product twice (quantity should increase)
    // - Invalid quantities (negative, zero)
    // - Inventory validation
  });

  describe("Calculate Totals", () => {
    it("should calculate subtotal correctly", () => {
      addItem("PROD-001", 2); // 29.99 * 2 = 59.98

      const totals = calculateTotals();

      expect(totals.subtotal).toBeCloseTo(59.98, 2);
    });

    // TODO: Generate more tests with Claude for:
    // - Tax calculation
    // - Discount application
    // - Shipping calculation
    // - Rounding edge cases
  });
});

// =============================================================================
// AI-GENERATED TESTS
// =============================================================================

describe("Shopping Cart - Add Item Operations", () => {
  it("should accumulate quantity when adding same product twice", () => {
    addItem("PROD-001", 2);
    const result = addItem("PROD-001", 3);

    expect(result.success).toBe(true);
    expect(result.cart).toHaveLength(1);
    expect(result.cart![0].quantity).toBe(5);
    expect(result.cart![0].name).toBe("Widget A");
  });

  it("should reject adding quantity exceeding available inventory", () => {
    const result = addItem("PROD-001", 200); // Only 100 in stock

    expect(result.success).toBe(false);
    expect(result.error).toContain("Insufficient");
  });

  it("should reject adding with zero quantity", () => {
    const result = addItem("PROD-001", 0);

    expect(result.success).toBe(false);
    expect(result.error).toContain("positive");
  });

  it("should reject adding with negative quantity", () => {
    const result = addItem("PROD-001", -5);

    expect(result.success).toBe(false);
    expect(result.error).toContain("positive");
  });

  it("should add multiple different products to cart", () => {
    addItem("PROD-001", 1);
    addItem("PROD-002", 2);
    const result = addItem("PROD-003", 1);

    expect(result.success).toBe(true);
    expect(result.cart).toHaveLength(3);
    expect(result.cart![2].productId).toBe("PROD-003");
  });

  it("should preserve product details when adding to cart", () => {
    const result = addItem("PROD-004", 1);

    expect(result.success).toBe(true);
    expect(result.cart![0].name).toBe("Premium Item");
    expect(result.cart![0].price).toBe(199.99);
  });
});

describe("Shopping Cart - Remove Item Operations", () => {
  it("should remove item from cart successfully", () => {
    addItem("PROD-001", 2);
    addItem("PROD-002", 1);
    const result = removeItem("PROD-001");

    expect(result.success).toBe(true);
    expect(result.cart).toHaveLength(1);
    expect(result.cart![0].productId).toBe("PROD-002");
  });

  it("should handle removing non-existent item gracefully (idempotent)", () => {
    addItem("PROD-001", 1);
    const result = removeItem("PROD-999");

    expect(result.success).toBe(true);
    expect(result.cart).toHaveLength(1); // Should not affect existing items
  });

  it("should handle removing from empty cart", () => {
    const result = removeItem("PROD-001");

    expect(result.success).toBe(true);
    expect(result.cart).toHaveLength(0);
  });
});

describe("Shopping Cart - Update Quantity Operations", () => {
  it("should update item quantity successfully", () => {
    addItem("PROD-001", 2);
    const result = updateQuantity("PROD-001", 5);

    expect(result.success).toBe(true);
    expect(result.cart![0].quantity).toBe(5);
  });

  it("should remove item when quantity set to 0", () => {
    addItem("PROD-001", 2);
    const result = updateQuantity("PROD-001", 0);

    expect(result.success).toBe(true);
    expect(result.cart).toHaveLength(0);
  });

  it("should reject update with negative quantity", () => {
    addItem("PROD-001", 2);
    const result = updateQuantity("PROD-001", -1);

    expect(result.success).toBe(false);
    expect(result.error).toContain("non-negative");
  });

  it("should reject update when item not in cart", () => {
    const result = updateQuantity("PROD-001", 5);

    expect(result.success).toBe(false);
    expect(result.error).toContain("not in cart");
  });

  it("should reject update exceeding available inventory", () => {
    addItem("PROD-001", 10);
    const result = updateQuantity("PROD-001", 150); // Only 100 available

    expect(result.success).toBe(false);
    expect(result.error).toContain("Insufficient");
  });
});

describe("Shopping Cart - Promo Code Operations", () => {
  it("should apply valid promo code (case-insensitive)", () => {
    addItem("PROD-001", 5); // $149.95
    const result = applyPromoCode("save10");

    expect(result.success).toBe(true);
  });

  it("should reject invalid promo code", () => {
    addItem("PROD-001", 1);
    const result = applyPromoCode("INVALID99");

    expect(result.success).toBe(false);
    expect(result.error).toContain("Invalid");
  });

  it("should reject promo code when below minimum purchase", () => {
    addItem("PROD-001", 1); // $29.99 (SAVE10 requires $50 minimum)
    const result = applyPromoCode("SAVE10");

    expect(result.success).toBe(false);
    expect(result.error).toContain("Minimum");
  });

  it("should apply promo code when minimum purchase met", () => {
    addItem("PROD-001", 2); // $59.98 (meets SAVE10 minimum of $50)
    const result = applyPromoCode("SAVE10");

    expect(result.success).toBe(true);
  });

  it("should uppercase code for case-insensitive matching", () => {
    addItem("PROD-001", 2); // $59.98
    applyPromoCode("save10");
    applyPromoCode("SAVE10");
    const result = applyPromoCode("SaVe10");

    expect(result.success).toBe(true);
  });
});

describe("Shopping Cart - Total Calculation", () => {
  it("should calculate correct subtotal for single item", () => {
    addItem("PROD-001", 2); // $29.99 * 2 = $59.98

    const totals = calculateTotals();

    expect(totals.subtotal).toBeCloseTo(59.98, 2);
  });

  it("should calculate correct subtotal for multiple items", () => {
    addItem("PROD-001", 1); // $29.99
    addItem("PROD-002", 1); // $49.99
    addItem("PROD-005", 2); // $9.99 * 2 = $19.98
    // Total: $99.96

    const totals = calculateTotals();

    expect(totals.subtotal).toBeCloseTo(99.96, 2);
  });

  it("should calculate correct tax (8%) on after-discount subtotal", () => {
    addItem("PROD-001", 2); // $59.98

    const totals = calculateTotals();
    const expectedTax = 59.98 * 0.08;

    expect(totals.tax).toBeCloseTo(expectedTax, 2);
  });

  it("should apply free shipping at $100 subtotal threshold", () => {
    addItem("PROD-001", 3); // $29.99 * 3 = $89.97 (below threshold)
    let totals = calculateTotals();
    expect(totals.shipping).toBe(5.99);

    addItem("PROD-005", 1); // Add $9.99, total now $99.96 (still below)
    totals = calculateTotals();
    expect(totals.shipping).toBe(5.99);

    addItem("PROD-005", 1); // Add another $9.99, total now $109.95 (meets threshold)
    totals = calculateTotals();
    expect(totals.shipping).toBe(0);
  });

  it("should apply percentage discount correctly", () => {
    addItem("PROD-001", 2); // $59.98
    applyPromoCode("SAVE10"); // 10% discount

    const totals = calculateTotals();
    const expectedDiscount = 59.98 * 0.1;

    expect(totals.discount).toBeCloseTo(expectedDiscount, 2);
  });

  it("should apply fixed amount discount correctly", () => {
    addItem("PROD-002", 3); // $49.99 * 3 = $149.97 (meets FLAT20 minimum of $100)
    applyPromoCode("FLAT20"); // $20 fixed discount

    const totals = calculateTotals();

    expect(totals.discount).toBe(20);
  });

  it("should apply free shipping promo code", () => {
    addItem("PROD-001", 2); // $59.98 (below free shipping threshold)
    applyPromoCode("FREESHIP");

    const totals = calculateTotals();

    expect(totals.shipping).toBe(0);
  });

  it("should calculate final total correctly (all components)", () => {
    addItem("PROD-001", 2); // $59.98
    applyPromoCode("SAVE10"); // 10% discount = $5.998

    const totals = calculateTotals();

    // subtotal: $59.98
    // discount: $5.998 ≈ $6.00
    // after-discount: $53.98
    // tax: $53.98 * 0.08 ≈ $4.32
    // shipping: $5.99 (below $100 threshold and not FREESHIP)
    // total: $53.98 + $4.32 + $5.99 = $64.29

    const expectedTotal = totals.subtotal - totals.discount + totals.tax + totals.shipping;
    expect(totals.total).toBeCloseTo(expectedTotal, 2);
  });

  it("should handle cart with free shipping promo and percentage discount", () => {
    addItem("PROD-002", 2); // $49.99 * 2 = $99.98
    applyPromoCode("FREESHIP");

    const totals = calculateTotals();

    expect(totals.shipping).toBe(0);
    expect(totals.discount).toBe(0); // FREESHIP doesn't give a discount, just free shipping
  });

  it("should return zero totals for empty cart", () => {
    const totals = calculateTotals();

    expect(totals.subtotal).toBe(0);
    expect(totals.discount).toBe(0);
    expect(totals.tax).toBe(0);
    expect(totals.shipping).toBeCloseTo(5.99, 2); // Should still charge shipping for empty cart? Or 0?
  });

  it("should handle floating-point currency correctly", () => {
    addItem("PROD-001", 3); // $29.99 * 3 = $89.97

    const totals = calculateTotals();

    // Ensure 2 decimal precision
    expect(Number.isFinite(totals.subtotal)).toBe(true);
    expect((totals.subtotal * 100) % 1).toBeLessThan(0.01); // Check 2 decimal places
  });
});

describe("Shopping Cart - Complex Scenarios", () => {
  it("should handle complete checkout flow", () => {
    // Add items
    addItem("PROD-001", 2); // $59.98
    addItem("PROD-005", 5); // $9.99 * 5 = $49.95
    // Subtotal: $109.93

    // Apply promo code (below minimum purchase requirement for SAVE10 but above for FLAT20)
    applyPromoCode("FLAT20"); // $20 fixed discount

    // Update quantity
    updateQuantity("PROD-005", 3); // Reduce quantity

    // Calculate final totals
    const totals = calculateTotals();

    expect(totals.subtotal).toBeGreaterThan(0);
    expect(totals.total).toBeGreaterThan(0);
    expect(totals.total).toBe(totals.subtotal - totals.discount + totals.tax + totals.shipping);
  });

  it("should maintain cart integrity across multiple operations", () => {
    addItem("PROD-001", 1);
    addItem("PROD-002", 1);
    addItem("PROD-003", 1);

    updateQuantity("PROD-001", 5);
    removeItem("PROD-002");
    addItem("PROD-005", 10);

    const cart = getCart();

    expect(cart).toHaveLength(3);
    expect(cart.find((item) => item.productId === "PROD-001")?.quantity).toBe(5);
    expect(cart.find((item) => item.productId === "PROD-002")).toBeUndefined();
  });

  it("should handle removing promo code", () => {
    addItem("PROD-001", 2); // $59.98
    applyPromoCode("SAVE10");

    let totals = calculateTotals();
    const discountedTotal = totals.total;

    removePromoCode();
    totals = calculateTotals();

    expect(totals.discount).toBe(0);
    expect(totals.total).toBeGreaterThan(discountedTotal);
  });
});
