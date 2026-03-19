-- Migration: add_delivery_failure_statuses_to_orders_check
-- Date: 2026-03-19
-- Context: Delivery route flow now supports undelivered outcomes.

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE orders
  ADD CONSTRAINT orders_status_check
  CHECK (status = ANY (ARRAY[
    'pending',
    'preparing',
    'pronto',
    'ready',
    'dispatched',
    'delivered',
    'failed_delivery',
    'returned',
    'refused',
    'cancelled'
  ]));
