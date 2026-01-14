-- SQL to add anon RLS policies for Tenderix
-- Run this in Supabase SQL Editor
-- ==========================================

-- Gate conditions - allow anon to insert and read
DO $$
BEGIN
    -- Insert policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'gate_conditions'
        AND policyname = 'anon_insert_gate_conditions'
    ) THEN
        CREATE POLICY anon_insert_gate_conditions ON gate_conditions
        FOR INSERT TO anon WITH CHECK (true);
    END IF;

    -- Select policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'gate_conditions'
        AND policyname = 'anon_select_gate_conditions'
    ) THEN
        CREATE POLICY anon_select_gate_conditions ON gate_conditions
        FOR SELECT TO anon USING (true);
    END IF;

    -- Update policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'gate_conditions'
        AND policyname = 'anon_update_gate_conditions'
    ) THEN
        CREATE POLICY anon_update_gate_conditions ON gate_conditions
        FOR UPDATE TO anon USING (true);
    END IF;
END $$;

-- Or run this simpler version (will error if policy exists, but that's ok):
-- CREATE POLICY anon_all_gate_conditions ON gate_conditions FOR ALL TO anon USING (true) WITH CHECK (true);
