-- 1. Create Notifications Table
CREATE TABLE public.notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  type TEXT CHECK (type IN ('order_update', 'order_message', 'system')),
  resource_id UUID NOT NULL, -- usually order_id
  title TEXT,
  message TEXT,
  link TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- 2. Trigger Function for Order Status Updates
CREATE OR REPLACE FUNCTION public.handle_order_status_update()
RETURNS TRIGGER AS $$
DECLARE
  recipient_id UUID;
  notification_title TEXT;
  notification_msg TEXT;
  order_link TEXT;
BEGIN
  -- Determine Recipient (The party that DIDN'T trigger the update)
  -- Limitation: We don't know who triggered it directly in trigger, 
  -- but generally:
  -- 'escrowed' -> Buyer verified payment -> Notify Seller
  -- 'delivered' -> Seller delivered -> Notify Buyer
  -- 'pending_release' -> Buyer confirmed -> Notify Seller (System check)
  -- 'completed' -> System/Admin released -> Notify Seller (Money received)
  -- 'cancelled' -> Notify both? or counterparty.

  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  order_link := '/orders/' || NEW.id;

  IF NEW.status = 'escrowed' THEN
    recipient_id := NEW.seller_id;
    notification_title := 'New Order Paid';
    notification_msg := 'Buyer has transferred payment. Please deliver the item.';
  ELSIF NEW.status = 'delivered' THEN
    recipient_id := NEW.buyer_id;
    notification_title := 'Order Delivered';
    notification_msg := 'Seller has delivered the item. Please check and confirm.';
  ELSIF NEW.status = 'pending_release' THEN
    recipient_id := NEW.seller_id;
    notification_title := 'Payment Pending Release';
    notification_msg := 'Buyer confirmed receipt. Funds are being verified (24-72h).';
  ELSIF NEW.status = 'completed' THEN
    recipient_id := NEW.seller_id; -- Main beneficiary
    notification_title := 'Order Completed';
    notification_msg := 'Funds have been released to your wallet.';
    -- Optionally notify buyer too
  ELSIF NEW.status = 'cancelled' THEN
     -- Notify both logic is complex in simple trigger, pick seller for now if mostly buyer cancels
     recipient_id := NEW.seller_id;
     notification_title := 'Order Cancelled';
     notification_msg := 'Order was cancelled.';
  END IF;

  IF recipient_id IS NOT NULL THEN
    -- Upsert Notification (Deduplication Logic)
    -- Try to UPDATE existing notification first to avoid duplicates in feed
    UPDATE public.notifications 
    SET title = notification_title, message = notification_msg, created_at = now(), is_read = false
    WHERE user_id = recipient_id AND type = 'order_update' AND resource_id = NEW.id;
    
    IF NOT FOUND THEN
      INSERT INTO public.notifications (user_id, type, resource_id, title, message, link)
      VALUES (recipient_id, 'order_update', NEW.id, notification_title, notification_msg, order_link);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_order_status_change
  AFTER UPDATE ON public.orders
  FOR EACH ROW EXECUTE PROCEDURE public.handle_order_status_update();

-- 3. Trigger Function for Order Messages
CREATE OR REPLACE FUNCTION public.handle_new_order_message()
RETURNS TRIGGER AS $$
DECLARE
  recipient_id UUID;
  order_link TEXT;
  sender_name TEXT;
BEGIN
  -- Get Order details to find recipient
  SELECT 
    CASE WHEN buyer_id = NEW.sender_id THEN seller_id ELSE buyer_id END
  INTO recipient_id
  FROM public.orders WHERE id = NEW.order_id;
  
  -- Get Sender Name
  SELECT display_name INTO sender_name FROM public.profiles WHERE id = NEW.sender_id;

  order_link := '/orders/' || NEW.order_id;

  -- Upsert Notification
  UPDATE public.notifications 
  SET title = 'New Message from ' || sender_name, 
      message = NEW.message_th, 
      created_at = now(), 
      is_read = false
  WHERE user_id = recipient_id AND type = 'order_message' AND resource_id = NEW.order_id;
  
  IF NOT FOUND THEN
    INSERT INTO public.notifications (user_id, type, resource_id, title, message, link)
    VALUES (recipient_id, 'order_message', NEW.order_id, 'New Message from ' || sender_name, NEW.message_th, order_link);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_order_message_insert
  AFTER INSERT ON public.order_messages
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_order_message();
