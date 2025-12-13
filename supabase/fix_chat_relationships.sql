-- Fix relationships to allow joining conversations with profiles
BEGIN;

-- 1. Drop existing constraints if they exist (names might vary, so we try standardized names or just replace)
-- Assuming default generated names or the ones we might have implicitly created. 
-- Since we created the table recently, we can try to drop the column constraints.
-- But safest is to alter the column definition or drop specific constraints if named.
-- In the previous migration we didn't name them explicitly.
-- We will try to finding the constraints or just ALTER COLUMN to set new references.

-- Actually, simpler to just ADD the new constraint after dropping the old one.
-- But finding the old name is hard in SQL script without procedural code.
-- Let's try to 'CASCADE' drop the FKs on the columns if possible? No.

-- Let's try to alter the columns to reference profiles.
ALTER TABLE public.conversations
    DROP CONSTRAINT IF EXISTS conversations_participant1_id_fkey, -- Standard naming guess
    DROP CONSTRAINT IF EXISTS conversations_participant2_id_fkey;

-- If the above names are wrong, we might strictly need to look them up. 
-- However, we can just "Add" a new foreign key if we can't find the old one, but that leaves the old one.
-- Let's assume standard naming based on "table_column_fkey".

ALTER TABLE public.conversations
    ADD CONSTRAINT conversations_participant1_id_fkey 
    FOREIGN KEY (participant1_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.conversations
    ADD CONSTRAINT conversations_participant2_id_fkey 
    FOREIGN KEY (participant2_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

COMMIT;
