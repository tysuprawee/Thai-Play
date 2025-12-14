-- Update the notification trigger to handle 'disputed' status

CREATE OR REPLACE FUNCTION public.handle_order_status_update()
RETURNS TRIGGER AS $$
DECLARE
  recipient_id UUID;
  notification_title TEXT;
  notification_msg TEXT;
  order_link TEXT;
BEGIN
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
    recipient_id := NEW.seller_id; 
    notification_title := 'Order Completed';
    notification_msg := 'Funds have been released to your wallet.';
  ELSIF NEW.status = 'disputed' THEN
    -- Notify Admin? Or just Notify the other party?
    -- For now, notify the "respondent" (the one who didn't raise it).
    -- But we don't know who raised it here easily without a separate log.
    -- Strategy: Notify ADMIN implicitly (they check dashboard).
    -- Notify USER: "Order #... has been disputed".
    -- Let's notify both for clarity, but trigger limitations usually mean single recipient logic.
    -- Let's assume notify Seller if Buyer disputed? Or just generic system message.
    -- Actually, usually disputes are raised by Buyer. So warn Seller.
    recipient_id := NEW.seller_id;
    notification_title := 'Order Disputed';
    notification_msg := 'A dispute has been raised on this order. Admin will review.';
  ELSIF NEW.status = 'cancelled' THEN
     recipient_id := NEW.seller_id;
     notification_title := 'Order Cancelled';
     notification_msg := 'Order was cancelled.';
  END IF;

  IF recipient_id IS NOT NULL THEN
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
