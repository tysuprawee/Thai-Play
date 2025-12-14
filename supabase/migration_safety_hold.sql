-- Add pending_release to orders status check constraint
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE public.orders
ADD CONSTRAINT orders_status_check 
CHECK (status IN ('pending_payment', 'escrowed', 'delivered', 'pending_release', 'completed', 'disputed', 'cancelled'));
