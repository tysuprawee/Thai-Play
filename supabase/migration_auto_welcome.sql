-- Update get_or_create_conversation to send automated welcome message for new order chats
CREATE OR REPLACE FUNCTION get_or_create_conversation(user1_id UUID, user2_id UUID, order_id_param UUID DEFAULT NULL)
RETURNS UUID AS $$
DECLARE
    conv_id UUID;
    p1 UUID;
    p2 UUID;
    seller_uid UUID;
    buyer_uid UUID;
    -- "Thank you for purchasing with us! If you have any questions or doubts about this order, please feel free to ask. We will reply as soon as possible."
    welcome_msg TEXT := 'ขอบคุณที่สั่งซื้อสินค้ากับเรา! หากคุณมีคำถามหรือข้อสงสัยเพิ่มเติมเกี่ยวกับคำสั่งซื้อนี้ สามารถสอบถามได้เลยครับ เราจะรีบตอบกลับให้เร็วที่สุด';
    msg_preview TEXT;
BEGIN
    -- Sort IDs to Ensure Consistency
    IF user1_id < user2_id THEN
        p1 := user1_id;
        p2 := user2_id;
    ELSE
        p1 := user2_id;
        p2 := user1_id;
    END IF;

    -- Check if exists
    IF order_id_param IS NULL THEN
        SELECT id INTO conv_id
        FROM conversations
        WHERE participant1_id = p1 AND participant2_id = p2 AND order_id IS NULL;
    ELSE
        SELECT id INTO conv_id
        FROM conversations
        WHERE participant1_id = p1 AND participant2_id = p2 AND order_id = order_id_param;
    END IF;

    -- If not exists, create
    IF conv_id IS NULL THEN
        INSERT INTO conversations (participant1_id, participant2_id, order_id)
        VALUES (p1, p2, order_id_param)
        RETURNING id INTO conv_id;

        -- Auto Message Logic (Only for Order Chat)
        IF order_id_param IS NOT NULL THEN
             -- Get Seller ID and Buyer form Order
             SELECT seller_id, buyer_id INTO seller_uid, buyer_uid FROM orders WHERE id = order_id_param;

             -- Ensure we have a seller and the chat is indeed between buyer and seller (sanity check, usually p1/p2 are them)
             -- Also, verify who initiated. The function is called by `getOrCreateConversation` usually by the viewer.
             -- Regardless of who initiated, the system sends the message as the Seller.
             
             IF seller_uid IS NOT NULL AND buyer_uid IS NOT NULL THEN
                 -- Insert message from Seller to Buyer
                 -- Note: if seller_uid is not p1 or p2 (impossible in valid flow), this strictly follows order data.
                 
                 INSERT INTO messages (conversation_id, sender_id, receiver_id, content, message_type, is_read)
                 VALUES (conv_id, seller_uid, buyer_uid, welcome_msg, 'text', false);

                 -- Truncate for preview
                 msg_preview := welcome_msg;
                 IF LENGTH(msg_preview) > 50 THEN
                    msg_preview := SUBSTRING(msg_preview FROM 1 FOR 50) || '...';
                 END IF;

                 -- Update conversation preview
                 UPDATE conversations
                 SET last_message_preview = msg_preview,
                     updated_at = NOW(),
                     hidden_for = '{}'
                 WHERE id = conv_id;
             END IF;
        END IF;
    END IF;

    RETURN conv_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
