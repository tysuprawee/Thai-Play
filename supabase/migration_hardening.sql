-- 1. CHAT GUARD (Server Side)
CREATE OR REPLACE FUNCTION public.check_chat_content()
RETURNS trigger AS $$
DECLARE
    content text := NEW.content;
BEGIN
    -- Phone Numbers (06x, 08x, 09x)
    IF content ~* '(^|\s|[^0-9])0[689]\d{1}[-\s]?\d{3}[-\s]?\d{4}($|\s|[^0-9])' OR
       content ~* '(^|\s)(\+66|66)[-\s]?\d{2}[-\s]?\d{3}[-\s]?\d{4}($|\s|[^0-9])' THEN
         RAISE EXCEPTION 'Safety Violation: Phone numbers are not allowed. Please keep all communication on-platform.';
    END IF;

    -- URL / Links (http, https, www, .com)
    IF content ~* '(https?:\/\/|www\.|[a-zA-Z0-9-]+\.(com|net|org|io|me|th))' THEN
         RAISE EXCEPTION 'Safety Violation: External links are not allowed.';
    END IF;

    -- Line ID / Socials
    IF content ~* '(line\s*(-)?\s*id|lineid|line\s*:|@)[a-zA-Z0-9_.]+' OR
       content ~* '(line\.me\/ti\/p\/)' OR
       content ~* '(facebook|fb)\s' THEN
         RAISE EXCEPTION 'Safety Violation: External contact check detected. Please keep all communication on-platform.';
    END IF;

    -- Risk Keywords (Thai)
    IF content ~* '(โอนตรง|แอดไลน์|อินบ็อกซ์)' THEN
         RAISE EXCEPTION 'Safety Violation: Direct transfer keywords detected.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_chat_message_check ON public.messages;
CREATE TRIGGER on_chat_message_check
    BEFORE INSERT ON public.messages
    FOR EACH ROW
    EXECUTE PROCEDURE public.check_chat_content();


-- 2. SNIPING PROTECTION (RPC Reveal)
-- Add revealed_at if not exists
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS revealed_at timestamp with time zone;

-- RPC Function to securely reveal secret
CREATE OR REPLACE FUNCTION public.reveal_secret(order_uuid uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order record;
    v_secret record;
    v_secret_data jsonb;
BEGIN
    -- 1. Verify Buyer & Status
    SELECT * INTO v_order FROM public.orders
    WHERE id = order_uuid
    AND buyer_id = auth.uid()
    AND status IN ('escrowed', 'delivered', 'completed', 'disputed');

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order not found or access denied';
    END IF;

    -- 2. "Break the Seal" (Idempotent update)
    UPDATE public.orders
    SET revealed_at = now()
    WHERE id = order_uuid AND revealed_at IS NULL;

    -- 3. Fetch Secret
    SELECT * INTO v_secret FROM public.listing_secrets
    WHERE listing_id = v_order.listing_id;

    IF NOT FOUND THEN
         RETURN NULL;
    END IF;

    -- 4. Return as JSON
    v_secret_data := jsonb_build_object(
        'content', v_secret.content,
        'secret_type', v_secret.secret_type,
        'credential_data', v_secret.credential_data
    );

    RETURN v_secret_data;
END;
$$;

-- 3. LOCK DOWN RLS
-- Remove the generic "Buyers can view" policy so they MUST use the RPC
-- (Note: Sellers still have their own policy to manage/view their own secrets)
DROP POLICY IF EXISTS "Buyers can view secrets for paid orders" ON public.listing_secrets;
DROP POLICY IF EXISTS "Buyers can view secrets for paid orders" ON public.listing_secrets CASCADE;
