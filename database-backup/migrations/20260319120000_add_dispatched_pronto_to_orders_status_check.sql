-- Migration: add_dispatched_pronto_to_orders_status_check
-- Date: 2026-03-19
-- Context: RotasDeliveryScreen uses 'dispatched' (saiu para entrega) and
--          'pronto' (pronto na cozinha) as order statuses, but these were
--          missing from the orders_status_check constraint causing a
--          constraint violation when the delivery operator tapped the button.

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
    'cancelled'
  ]));
