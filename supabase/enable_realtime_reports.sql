-- Enable Realtime for the reports table
-- By default, new tables are not included in the 'supabase_realtime' publication.
-- This command adds the table to the publication so subscriptions listen to changes.

ALTER PUBLICATION supabase_realtime ADD TABLE public.reports;
