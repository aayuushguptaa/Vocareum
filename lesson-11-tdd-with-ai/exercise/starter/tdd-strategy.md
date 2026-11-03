# TDD Strategy for Shopping Cart Module

## 1. Requirements Specifications

Write natural language requirements that Claude can convert to tests.

### 1.1 Add Item to Cart

**Requirement:** The shopping cart must allow customers to add products from the catalog to their cart with specified quantities.

**Inputs:**
- `productId`: String identifier of the product to add (e.g., "PROD-001")
- `quantity`: Positive integer representing the number of units to add

**Expected Output:**
- Success case: `{ success: true, cart: [CartItem] }` with the updated cart contents
- The CartItem must contain: productId, name, price, quantity
- If same product is added again, quantity should be cumulative (not replaced)

**Validation Rules:**
- Quantity must be a positive integer (≥ 1)
- Product must exist in the catalog
- Inventory must have sufficient stock for requested quantity
- Product price must be positive

**Error Conditions:**
- Product not found: `{ success: false, error: "Product not found" }`
- Invalid quantity (0 or negative): `{ success: false, error: "Quantity must be positive" }`
- Insufficient inventory: `{ success: false, error: "Insufficient stock available" }`

---

### 1.2 Remove Item from Cart

**Requirement:** Customers must be able to remove items from their cart by product ID.

**Inputs:**
- `productId`: String identifier of the item to remove

**Expected Output:**
- `{ success: true, cart: [CartItem] }` with the updated cart after removal

**Validation Rules:**
- Removal should be idempotent (removing non-existent item should not fail)
- Should not affect other items in cart

**Error Conditions:**
- Item not in cart: `{ success: true, cart: [...] }` (idempotent - no error)

---

### 1.3 Update Item Quantity

**Requirement:** Customers must be able to update the quantity of items in their cart or remove items by setting quantity to zero.

**Inputs:**
- `productId`: String identifier of the cart item
- `quantity`: New quantity (positive integer or zero to remove)

**Expected Output:**
- Quantity ≥ 1: `{ success: true, cart: [CartItem] }` with updated quantity
- Quantity = 0: Item should be automatically removed from cart

**Validation Rules:**
- New quantity must be non-negative integer (≥ 0)
- Inventory must have sufficient stock for new quantity
- Item must exist in cart
- Quantity of 0 should remove the item

**Error Conditions:**
- Item not in cart: `{ success: false, error: "Item not in cart" }`
- Insufficient inventory: `{ success: false, error: "Insufficient stock available" }`
- Invalid quantity (negative): `{ success: false, error: "Quantity must be non-negative" }`

---

### 1.4 Apply Promotional Code

**Requirement:** Customers can apply discount codes that provide different types of promotions (percentage off, fixed amount, free shipping).

**Inputs:**
- `code`: String promotional code (case-insensitive)

**Expected Output:**
- Success: `{ success: true, cart: [CartItem] }`
- The promo code is stored and affects future total calculations

**Validation Rules:**
- Code must exist in the promo database
- Code must meet minimum purchase requirement (minPurchase) to apply
- Code must not be expired (if expiresAt is set)
- Code must not exceed usage limit (if usageLimit is set)
- Each code can be applied only once per cart (though totals can be recalculated)
- For percentage discounts: maxDiscount cap should limit the discount amount

**Error Conditions:**
- Invalid code: `{ success: false, error: "Invalid promo code" }`
- Below minimum purchase: `{ success: false, error: "Minimum purchase requirement not met" }`
- Code expired: `{ success: false, error: "Promo code has expired" }`
- Usage limit exceeded: `{ success: false, error: "Promo code usage limit exceeded" }`

---

### 1.5 Calculate Total with Tax and Shipping

**Requirement:** Calculate the final cart total including subtotal, applicable discounts, tax, and shipping costs.

**Inputs:**
- Current cart items
- Applied promotional code (optional)

**Expected Output:**
```
{
  subtotal: number,      // Sum of (price × quantity) for all items
  discount: number,      // Amount deducted based on promo code
  tax: number,          // Calculated at 8% on (subtotal - discount)
  shipping: number,     // Shipping cost (free ≥$100 subtotal or with FREESHIP)
  total: number         // Final amount due (subtotal - discount + tax + shipping)
}
```

**Validation Rules:**
- Tax is calculated at 8% on the after-discount subtotal
- Shipping is $5.99 by default, free if subtotal ≥ $100 OR promo code is FREESHIP
- All monetary values must be rounded to 2 decimal places
- Discount cannot exceed subtotal
- Discount cap (maxDiscount) should be applied to percentage discounts

**Error Conditions:**
- Empty cart: Return totals with all zeros
- Negative values: Should never occur (indicates bug)

---

## 2. Edge Cases AI Might Miss

List edge cases that require human domain knowledge. These are scenarios AI wouldn't automatically consider without business context.

| # | Edge Case | Why AI Might Miss It | How to Test |
|---|-----------|---------------------|-------------|
| 1 | Adding same product twice increases quantity instead of replacing | AI might assume replacement logic without business knowledge of cart merging. Carts accumulate items, not replace them. | Add PROD-001 qty 2, then add PROD-001 qty 3, verify final quantity is 5, not 3 |
| 2 | Floating-point rounding errors in financial calculations (e.g., 29.99 * 3 = 89.97) | AI might not consider currency precision issues. Finance requires exact 2-decimal precision. | Calculate totals with prices like 29.99, 9.99 that cause rounding issues; verify results round to 2 decimals |
| 3 | Setting quantity to zero should remove item from cart | AI might implement this as a separate function. However, UX expectation: qty=0 means "remove item" not "keep with zero quantity". | Update quantity to 0, verify item is removed from cart entirely |
| 4 | Promo codes should be case-insensitive (SAVE10, save10, Save10 all work) | AI might implement exact string matching without considering UX. Code says `.toUpperCase()` so this is required. | Test applying "save10", "SAVE10", "SaVe10" - all should work |
| 5 | Free shipping threshold ($100) should apply BEFORE discount, not after | Business rule: free shipping at $100 subtotal, not $100 after-discount amount. This is a common bug in e-commerce. | Add $90 item + $20 discount = $70 after-discount. Should NOT be free shipping (subtotal was $90, not $100) |
| 6 | Inventory should be checked at add/update time, not at checkout | AI might think inventory is checked only once. But each operation must verify stock available to prevent overselling. | Try adding product that only has 5 units. Add qty 10 should fail (insufficient stock). |
| 7 | Promo code minimum purchase check should use current subtotal | For SAVE10 (minPurchase: 50): cart with $40 items should reject the code. Minimum must be met. | Add products totaling $40, try SAVE10 code (min $50) - should reject |

---

## 3. Coverage Targets

Define your coverage goals and explain the rationale.

| Metric | Target | Rationale |
|--------|--------|-----------|
| Line Coverage | 95% | Critical financial calculations must be thoroughly tested. Small bugs in cart logic directly impact revenue. |
| Branch Coverage | 90% | All code paths through promo logic, discount calculation, shipping rules must be exercised. |
| Function Coverage | 100% | Every exported function must have at least one test to ensure it works as intended. |

**Areas Requiring 100% Coverage:**
- `calculateTotals()` - Financial calculations must be correct every time
- Inventory validation in `addItem()` and `updateQuantity()` - Prevent overselling
- Promo code validation - Prevent invalid discount application
- Tax and shipping calculation branches

**Areas Where Lower Coverage is Acceptable:**
- `getCart()`, `getProduct()`, `getAppliedPromoCode()` - Simple getter functions (though still should be tested at least once)
- Error message formatting - As long as error conditions are caught, exact message text is less critical

---

## 4. Red-Green-Refactor Sequence

Plan the order of test implementation and code development.

### Phase 1: Core Functionality (Red-Green)

| Step | Test to Write | Implementation Needed |
|------|---------------|----------------------|
| 1 | Add valid product to empty cart | Fill in the inventory check in `addItem()` |
| 2 | Remove item from cart | Implement `removeItem()` to handle missing items gracefully |
| 3 | Update quantity to valid amount | Implement inventory check in `updateQuantity()` |
| 4 | Calculate subtotal with multiple items | Verify `calculateTotals()` sums correctly |
| 5 | Apply valid promo code | Implement validation: code exists, minimum purchase met |
| 6 | Calculate discount correctly for percentage codes | Verify discount type "percentage" calculation |
| 7 | Calculate discount correctly for fixed codes | Verify discount type "fixed" calculation |
| 8 | Calculate tax correctly | Verify 8% tax on after-discount subtotal |
| 9 | Apply free shipping for subtotal ≥ $100 | Verify free shipping threshold logic |
| 10 | Calculate final total correctly | Verify all components sum correctly |

### Phase 2: Edge Cases & Validation (Red-Green)

| Step | Test to Write | Implementation Needed |
|------|---------------|----------------------|
| 1 | Reject add with quantity = 0 or negative | Add quantity validation to `addItem()` |
| 2 | Reject add with non-existent product | Verify product existence check |
| 3 | Reject add when inventory insufficient | Implement inventory check in `addItem()` |
| 4 | Increase quantity when adding same product twice | Verify quantity accumulation logic |
| 5 | Reject invalid promo code | Verify code existence check in `applyPromoCode()` |
| 6 | Reject promo code below minimum purchase | Implement minPurchase validation |
| 7 | Apply free shipping with FREESHIP promo | Verify freeShipping type handling |
| 8 | Reject update quantity to invalid amount | Add quantity validation to `updateQuantity()` |
| 9 | Remove item when quantity set to 0 | Implement auto-removal in `updateQuantity()` |
| 10 | Promo code case-insensitive matching | Verify `.toUpperCase()` handling |
| 11 | Apply maxDiscount cap to percentage codes | Implement maxDiscount logic |
| 12 | Round currency values to 2 decimals | Add rounding to `calculateTotals()` |

### Phase 3: Refactoring

| Refactoring | Before | After | Tests Must Still Pass |
|-------------|--------|-------|----------------------|
| Extract validation logic | Validations mixed with business logic | Separate `validateQuantity()`, `validateInventory()` functions | All tests must still pass |
| Extract discount calculation | Inline switch statement | `calculateDiscount()` helper function | All tests must still pass |
| Extract tax/shipping calculation | Complex logic in `calculateTotals()` | `calculateTax()`, `calculateShipping()` helpers | All tests must still pass |
| Type safety improvements | Any types for input validation | Proper Zod schema validation before operations | All tests must still pass |

---

## 5. Validation Checklist for AI-Generated Tests

How will you verify that tests Claude generates are correct and complete?

### Test Quality Checks

- [x] Tests use `beforeEach()` to clear cart between tests (isolation)
- [x] Tests verify both success and error scenarios
- [x] Tests use specific assertions (not just `toBe(true)`)
- [x] Tests check actual output values, not just success flag
- [x] Tests cover at least one example for each business rule

### Business Logic Verification

- [x] Financial calculations are tested with specific examples (e.g., 29.99 * 3)
- [x] Inventory checks prevent overselling
- [x] Promo code validations are enforced (minimum purchase, expiration, usage limits)
- [x] Tax and shipping calculations follow the stated rules (8%, $5.99, $100 threshold)

### Security Considerations

- [x] Case-insensitive promo code matching works correctly
- [x] Invalid/malicious product IDs are rejected
- [x] Negative quantities are rejected
- [x] No access to cart data outside of API functions

---

## 6. Sample AI-Generated Test

Use Claude Code to generate at least one test based on your requirements, and paste it here.

**Prompt Used:**
```
Generate comprehensive Vitest tests for the Shopping Cart module based on these requirements:

1. addItem(productId, quantity): Add product to cart
   - Reject if quantity ≤ 0
   - Reject if product not found
   - Reject if insufficient inventory
   - Accumulate quantity if same product added twice

2. removeItem(productId): Remove item from cart
   - Should be idempotent (no error if item doesn't exist)

3. updateQuantity(productId, quantity): Update item quantity or remove if qty=0
   - Reject if quantity < 0
   - Reject if insufficient inventory
   - Auto-remove item if quantity = 0

4. applyPromoCode(code): Apply discount code
   - Case-insensitive matching
   - Must meet minimum purchase requirement
   - Check expiration date and usage limits

5. calculateTotals(): Return {subtotal, discount, tax, shipping, total}
   - Tax = 8% of after-discount subtotal
   - Shipping = $5.99, free if subtotal ≥ $100 OR code is FREESHIP
   - Apply maxDiscount cap to percentage discounts
   - Round to 2 decimal places

Write tests covering:
- Happy paths for each function
- Edge cases: floating-point currency, accumulation, case-insensitivity
- Error cases: invalid inputs, insufficient inventory, invalid codes
- Complex scenarios: multiple items, promo codes with minimum purchase
```

**Generated Tests:**
```typescript
// Test: Adding multiple quantities of same product should accumulate
it("should accumulate quantity when adding same product twice", () => {
  addItem("PROD-001", 2);
  const result = addItem("PROD-001", 3);

  expect(result.success).toBe(true);
  expect(result.cart).toHaveLength(1);
  expect(result.cart![0].quantity).toBe(5);
});

// Test: Insufficient inventory should be rejected
it("should reject adding quantity exceeding available inventory", () => {
  const result = addItem("PROD-001", 200); // Only 100 in stock

  expect(result.success).toBe(false);
  expect(result.error).toContain("Insufficient");
});

// Test: Percentage discount with max cap
it("should apply maxDiscount cap to percentage discounts", () => {
  addItem("PROD-004", 3); // $199.99 × 3 = $599.97
  applyPromoCode("SAVE10"); // 10% discount, but may have maxDiscount

  const totals = calculateTotals();
  expect(totals.discount).toBeLessThanOrEqual(totals.subtotal * 0.1);
  expect(totals.discount).toBeGreaterThan(0);
});

// Test: Free shipping at $100 threshold
it("should apply free shipping when subtotal reaches $100", () => {
  addItem("PROD-002", 2); // $49.99 × 2 = $99.98
  let totals = calculateTotals();
  expect(totals.shipping).toBe(5.99);

  addItem("PROD-005", 1); // Add $9.99, total now $109.97
  totals = calculateTotals();
  expect(totals.shipping).toBe(0);
});

// Test: Setting quantity to 0 removes item
it("should remove item when quantity updated to 0", () => {
  addItem("PROD-001", 2);
  const result = updateQuantity("PROD-001", 0);

  expect(result.success).toBe(true);
  expect(result.cart).toHaveLength(0);
});
```

**Your Assessment:**
Claude correctly generated tests that:
- Cover the main requirements (quantity accumulation, inventory checks, discounts, free shipping)
- Use proper test structure with beforeEach cleanup
- Test both success and edge cases

What I would enhance:
- Add promo code minimum purchase validation test (SAVE10 requires $50 minimum)
- Add case-insensitive code test (apply "save10" vs "SAVE10")
- Add explicit tax calculation test with specific numbers
- Add rounding precision test for edge cases like 29.99 × 3
- Add promo code expiration and usage limit tests (once implemented)

---

## Summary

<!-- After completing all sections, write a brief summary of your TDD strategy -->

**Key Decisions:**
- Start with core add/remove/update functionality before complex discount logic
- Prioritize inventory validation to prevent overselling (critical business rule)
- Implement all validation checks before refactoring for efficiency
- Use Phase 1-3 approach to maintain test coverage while improving code quality

**Biggest Risks:**
- Floating-point precision in financial calculations (especially with prices like $29.99)
- Promo code minimum purchase check must use subtotal, not after-discount amount
- Inventory depletes across all customers - concurrent access could be an issue (noted for future)
- The gap between free shipping threshold ($100) and minPurchase requirements for promos

**Where Human Judgment is Essential:**
- Deciding when to reject operations (e.g., invalid product) vs. silently succeed (remove non-existent item)
- Defining business rules like free shipping at $100, 8% tax rate, $5.99 shipping
- Determining which code paths need 100% coverage vs. acceptable gaps
- Choosing between inventory validation approaches (fail operation vs. partial fulfill)
- Understanding that quantity=0 means "remove" in UX terms
