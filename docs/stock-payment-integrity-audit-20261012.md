# Stock/payment audit — 2026-10-12

Branch: `feature/dashboard-realtime-net-20261009`. No production changes.

## Confirmed from code

- `supabase/functions/payplug/index.ts` and `supabase/functions/paypal-webhook/index.ts` mark orders paid but do not explicitly call `consume_order_stock`.
- `supabase/migrations/20260909120000_baseline.sql` defines `reserve_order_stock`, `release_order_stock`, `consume_order_stock` with admin/stock_manager role checks. These functions are not suitable to call directly from unauthenticated payment webhooks.
- `consume_order_stock` looks up size but not color; it uses `GREATEST(0, quantity - ordered)` rather than rejecting insufficient stock, and has no explicit row lock on the order.
- `validate_and_create_order` does not check available stock.
- The baseline migration has no automatic trigger invoking stock consumption on payment status transition. Other live triggers may exist and must be inspected before installing a new one.
- `products.stock` and `stock_levels.quantity` are separate and may drift.

## Safe implementation plan

1. Read-only audit of actual database triggers and deployed functions; confirm whether stock is already consumed by an existing mechanism.
2. Define authoritative stock per product, size, color and location; reconcile existing discrepancies before changing logic.
3. Implement a transaction-safe, idempotent payment transition handler in SQL, with row locks and strict insufficient-stock handling; do not double-charge or mark paid order unfulfilled silently.
4. Wire PayPlug/PayPal to a single verified path; handle duplicate webhooks and failures.
5. Run isolated database tests for repeated and concurrent events, colors/sizes, cancellation/refunds, and read-only cross-site synchronization.
6. Deploy only after explicit approval because the Supabase database is shared with `.com`.

No live database or payment mutations were performed.
