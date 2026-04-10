
-- Update projects: allow all authenticated users to SELECT
DROP POLICY IF EXISTS "Users can view own projects" ON public.projects;
CREATE POLICY "Authenticated users can view all projects"
  ON public.projects FOR SELECT TO authenticated
  USING (true);

-- Update six_week_plans: allow all authenticated to SELECT
DROP POLICY IF EXISTS "Users can view own six_week_plans" ON public.six_week_plans;
CREATE POLICY "Authenticated users can view all six_week_plans"
  ON public.six_week_plans FOR SELECT TO authenticated
  USING (true);

-- Update plan_activities: allow all authenticated to SELECT
DROP POLICY IF EXISTS "Users can view own plan_activities" ON public.plan_activities;
CREATE POLICY "Authenticated users can view all plan_activities"
  ON public.plan_activities FOR SELECT TO authenticated
  USING (true);

-- Update weekly_plans: allow all authenticated to SELECT, INSERT, UPDATE
DROP POLICY IF EXISTS "Users can view own weekly_plans" ON public.weekly_plans;
CREATE POLICY "Authenticated users can view all weekly_plans"
  ON public.weekly_plans FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can insert own weekly_plans" ON public.weekly_plans;
CREATE POLICY "Authenticated users can insert weekly_plans"
  ON public.weekly_plans FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update own weekly_plans" ON public.weekly_plans;
CREATE POLICY "Authenticated users can update weekly_plans"
  ON public.weekly_plans FOR UPDATE TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can delete own weekly_plans" ON public.weekly_plans;
CREATE POLICY "Authenticated users can delete weekly_plans"
  ON public.weekly_plans FOR DELETE TO authenticated
  USING (true);

-- Update daily_plans: allow all authenticated to SELECT, INSERT, UPDATE
DROP POLICY IF EXISTS "Users can view own daily_plans" ON public.daily_plans;
CREATE POLICY "Authenticated users can view all daily_plans"
  ON public.daily_plans FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can insert own daily_plans" ON public.daily_plans;
CREATE POLICY "Authenticated users can insert daily_plans"
  ON public.daily_plans FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update own daily_plans" ON public.daily_plans;
CREATE POLICY "Authenticated users can update daily_plans"
  ON public.daily_plans FOR UPDATE TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can delete own daily_plans" ON public.daily_plans;
CREATE POLICY "Authenticated users can delete daily_plans"
  ON public.daily_plans FOR DELETE TO authenticated
  USING (true);

-- Update tickets: allow all authenticated to SELECT, INSERT, UPDATE
DROP POLICY IF EXISTS "Users can view own tickets" ON public.tickets;
CREATE POLICY "Authenticated users can view all tickets"
  ON public.tickets FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can insert own tickets" ON public.tickets;
CREATE POLICY "Authenticated users can insert tickets"
  ON public.tickets FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update own tickets" ON public.tickets;
CREATE POLICY "Authenticated users can update tickets"
  ON public.tickets FOR UPDATE TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can delete own tickets" ON public.tickets;
CREATE POLICY "Authenticated users can delete tickets"
  ON public.tickets FOR DELETE TO authenticated
  USING (true);

-- Update contractors: allow all authenticated to SELECT
DROP POLICY IF EXISTS "Users can view own contractors" ON public.contractors;
CREATE POLICY "Authenticated users can view all contractors"
  ON public.contractors FOR SELECT TO authenticated
  USING (true);
