# SmartLedger Accounting Tests

## 1. Multi-product stock
- Create a test bill with two products.
- Verify stock decreases by the exact quantity of each product.
- Verify insufficient stock prevents saving.

## 2. Customer outstanding
- Create a test customer.
- Make a bill with partial payment.
- Verify outstanding = previous balance + bill total - payment received.

## 3. Payments
- Record a customer receipt.
- Verify customer outstanding decreases.
- Record a supplier payment.
- Verify supplier outstanding decreases.

## 4. Profit
- Verify revenue uses bill totals.
- Verify cost uses each item's purchase price × quantity.
- Verify gross profit = revenue - cost.
- Verify expenses are deducted separately for net profit.

## 5. Compatibility
- Open an older single-product bill.
- Verify its invoice, reports and ledger still work.
