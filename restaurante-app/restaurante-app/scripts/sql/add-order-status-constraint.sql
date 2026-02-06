-- Add check constraint for order status
-- This constraint ensures that orders can only have valid status values
-- Valid statuses: 'pending', 'preparing', 'ready', 'delivered', 'cancelled'
-- Invalid statuses: 'montagem', 'churrasqueira', 'pronto', 'entregue', 'aberto', 'fechado'

ALTER TABLE orders 
DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE orders 
ADD CONSTRAINT orders_status_check 
CHECK (status IN ('pending', 'preparing', 'ready', 'delivered', 'cancelled'));
