-- RUN THIS SCRIPT TO RESET CATEGORIES
-- It will NOT delete your users or orders.

-- 1. Remove old categories
DELETE FROM public.categories;

-- 2. Add only RoV and Valorant
INSERT INTO public.categories (name_th, slug, type) VALUES
('RoV', 'rov', 'game'),
('Valorant', 'valorant', 'game');
