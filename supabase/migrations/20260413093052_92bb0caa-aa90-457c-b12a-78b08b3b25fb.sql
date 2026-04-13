
-- Fix six_week_plans INSERT
DROP POLICY IF EXISTS "Users can insert own six_week_plans" ON public.six_week_plans;
CREATE POLICY "Authenticated users can insert six_week_plans" ON public.six_week_plans
FOR INSERT TO authenticated WITH CHECK (true);

-- Fix six_week_plans UPDATE
DROP POLICY IF EXISTS "Users can update own six_week_plans" ON public.six_week_plans;
CREATE POLICY "Authenticated users can update six_week_plans" ON public.six_week_plans
FOR UPDATE TO authenticated USING (true);

-- Fix plan_activities INSERT
DROP POLICY IF EXISTS "Users can insert own plan_activities" ON public.plan_activities;
CREATE POLICY "Authenticated users can insert plan_activities" ON public.plan_activities
FOR INSERT TO authenticated WITH CHECK (true);

-- Fix plan_activities UPDATE
DROP POLICY IF EXISTS "Users can update own plan_activities" ON public.plan_activities;
CREATE POLICY "Authenticated users can update plan_activities" ON public.plan_activities
FOR UPDATE TO authenticated USING (true);

-- Fix plan_activities DELETE
DROP POLICY IF EXISTS "Users can delete own plan_activities" ON public.plan_activities;
CREATE POLICY "Authenticated users can delete plan_activities" ON public.plan_activities
FOR DELETE TO authenticated USING (true);

-- Fix six_week_plans DELETE
DROP POLICY IF EXISTS "Users can delete own six_week_plans" ON public.six_week_plans;
CREATE POLICY "Authenticated users can delete six_week_plans" ON public.six_week_plans
FOR DELETE TO authenticated USING (true);
