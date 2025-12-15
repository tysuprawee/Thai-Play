-- Update Trigger Function for Order Status Updates
CREATE OR REPLACE FUNCTION public.handle_order_status_update()
RETURNS TRIGGER AS $$
DECLARE
  recipient_id UUID;
  listing_title TEXT;
  notification_title TEXT;
  notification_msg TEXT;
  order_link TEXT;
BEGIN
  -- Get Listing Title
  SELECT l.title_th INTO listing_title
  FROM public.orders o
  JOIN public.listings l ON o.listing_id = l.id
  WHERE o.id = NEW.id;

  -- Default fallback if title missing
  IF listing_title IS NULL THEN
    listing_title := 'Order';
  END IF;

  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  order_link := '/orders/' || NEW.id;

  IF NEW.status = 'escrowed' THEN
    recipient_id := NEW.seller_id;
    notification_title := '💰 ชำระเงินแล้ว: ' || listing_title;
    notification_msg := 'ผู้ซื้อได้ชำระเงินแล้ว กรุณาส่งมอบสินค้า';
  ELSIF NEW.status = 'delivered' THEN
    recipient_id := NEW.buyer_id;
    notification_title := '📦 ส่งมอบแล้ว: ' || listing_title;
    notification_msg := 'ผู้ขายแจ้งส่งมอบสินค้าแล้ว กรุณาตรวจสอบ';
  ELSIF NEW.status = 'pending_release' THEN
    recipient_id := NEW.seller_id;
    notification_title := '⏳ รอตรวจสอบ: ' || listing_title;
    notification_msg := 'ผู้ซื้อยืนยันรับของแล้ว กำลังตรวจสอบความปลอดภัย (24-72 ชม.)';
  ELSIF NEW.status = 'completed' THEN
    recipient_id := NEW.seller_id; 
    notification_title := '✅ สำเร็จ: ' || listing_title;
    notification_msg := 'เงินเข้าบัญชีของคุณแล้ว';
  ELSIF NEW.status = 'cancelled' THEN
     recipient_id := NEW.seller_id;
     notification_title := '❌ ยกเลิก: ' || listing_title;
     notification_msg := 'คำสั่งซื้อถูกยกเลิก';
  ELSIF NEW.status = 'disputed' THEN
     -- Notify both? Or just admin? Let's notify sender of dispute?
     -- If buyer disputes, notify seller.
     -- We need to know who disputed. But here we just see status change.
     -- Default to notifying seller that it is disputed.
     recipient_id := NEW.seller_id;
     notification_title := '⚠️ มีปัญหา: ' || listing_title;
     notification_msg := 'คำสั่งซื้อถูกแจ้งปัญหา (Disputed)';
  END IF;

  IF recipient_id IS NOT NULL THEN
    -- Upsert Notification
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

-- Update Trigger Function for Order Messages
CREATE OR REPLACE FUNCTION public.handle_new_order_message()
RETURNS TRIGGER AS $$
DECLARE
  recipient_id UUID;
  listing_title TEXT;
  order_link TEXT;
  sender_name TEXT;
BEGIN
  -- Get Order details & Listing Title
  SELECT 
    CASE WHEN o.buyer_id = NEW.sender_id THEN o.seller_id ELSE o.buyer_id END,
    l.title_th
  INTO recipient_id, listing_title
  FROM public.orders o
  JOIN public.listings l ON o.listing_id = l.id
  WHERE o.id = NEW.order_id;
  
  -- Get Sender Name
  SELECT display_name INTO sender_name FROM public.profiles WHERE id = NEW.sender_id;

  order_link := '/orders/' || NEW.order_id;
  
  IF listing_title IS NULL THEN
     listing_title := 'Order';
  END IF;

  -- Upsert Notification
  -- Title: "Sender Name (Listing Title)"
  -- Message: "Message content"
  UPDATE public.notifications 
  SET title = sender_name || ' 💬 ' || listing_title, 
      message = NEW.message_th, 
      created_at = now(), 
      is_read = false
  WHERE user_id = recipient_id AND type = 'order_message' AND resource_id = NEW.order_id;
  
  IF NOT FOUND THEN
    INSERT INTO public.notifications (user_id, type, resource_id, title, message, link)
    VALUES (recipient_id, 'order_message', NEW.order_id, sender_name || ' 💬 ' || listing_title, NEW.message_th, order_link);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
