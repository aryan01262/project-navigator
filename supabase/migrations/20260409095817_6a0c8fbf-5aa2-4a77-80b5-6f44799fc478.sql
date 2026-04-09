
-- 1. Profiles table (auto-created on signup)
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'supervisor', 'engineer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Contractors table
CREATE TABLE public.contractors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact TEXT,
  specialization TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.contractors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own contractors" ON public.contractors FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own contractors" ON public.contractors FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own contractors" ON public.contractors FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own contractors" ON public.contractors FOR DELETE USING (auth.uid() = user_id);

-- 3. Projects table
CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own projects" ON public.projects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own projects" ON public.projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own projects" ON public.projects FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own projects" ON public.projects FOR DELETE USING (auth.uid() = user_id);

-- 4. Six Week Plans table
CREATE TABLE public.six_week_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  building_name TEXT NOT NULL DEFAULT '',
  start_date TEXT NOT NULL DEFAULT '',
  end_date TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.six_week_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own six_week_plans" ON public.six_week_plans FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.user_id = auth.uid()));
CREATE POLICY "Users can insert own six_week_plans" ON public.six_week_plans FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.user_id = auth.uid()));
CREATE POLICY "Users can update own six_week_plans" ON public.six_week_plans FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.user_id = auth.uid()));
CREATE POLICY "Users can delete own six_week_plans" ON public.six_week_plans FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.user_id = auth.uid()));

-- 5. Plan Activities table
CREATE TABLE public.plan_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  six_week_plan_id UUID NOT NULL REFERENCES public.six_week_plans(id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT '',
  contractor_id UUID REFERENCES public.contractors(id) ON DELETE SET NULL,
  trade TEXT NOT NULL DEFAULT '',
  trade_activity TEXT NOT NULL DEFAULT '',
  unit TEXT NOT NULL DEFAULT '',
  estimated_quantity NUMERIC NOT NULL DEFAULT 0,
  floor_units TEXT[] NOT NULL DEFAULT '{}',
  remaining_quantity NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.plan_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own plan_activities" ON public.plan_activities FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.six_week_plans swp
    JOIN public.projects p ON p.id = swp.project_id
    WHERE swp.id = six_week_plan_id AND p.user_id = auth.uid()
  ));
CREATE POLICY "Users can insert own plan_activities" ON public.plan_activities FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.six_week_plans swp
    JOIN public.projects p ON p.id = swp.project_id
    WHERE swp.id = six_week_plan_id AND p.user_id = auth.uid()
  ));
CREATE POLICY "Users can update own plan_activities" ON public.plan_activities FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.six_week_plans swp
    JOIN public.projects p ON p.id = swp.project_id
    WHERE swp.id = six_week_plan_id AND p.user_id = auth.uid()
  ));
CREATE POLICY "Users can delete own plan_activities" ON public.plan_activities FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.six_week_plans swp
    JOIN public.projects p ON p.id = swp.project_id
    WHERE swp.id = six_week_plan_id AND p.user_id = auth.uid()
  ));

-- 6. Weekly Plans table
CREATE TABLE public.weekly_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  six_week_plan_id UUID NOT NULL REFERENCES public.six_week_plans(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.plan_activities(id) ON DELETE SET NULL,
  week_number INT NOT NULL DEFAULT 1,
  category TEXT NOT NULL DEFAULT '',
  contractor_id UUID REFERENCES public.contractors(id) ON DELETE SET NULL,
  trade_activity TEXT NOT NULL DEFAULT '',
  unit TEXT NOT NULL DEFAULT '',
  estimated_quantity NUMERIC NOT NULL DEFAULT 0,
  floor_units TEXT[] NOT NULL DEFAULT '{}',
  constraint_text TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','assigned','forwarded','logged','submitted','validated','confirmed')),
  assigned_to_engineer BOOLEAN NOT NULL DEFAULT false,
  remaining_quantity NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.weekly_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own weekly_plans" ON public.weekly_plans FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.six_week_plans swp
    JOIN public.projects p ON p.id = swp.project_id
    WHERE swp.id = six_week_plan_id AND p.user_id = auth.uid()
  ));
CREATE POLICY "Users can insert own weekly_plans" ON public.weekly_plans FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.six_week_plans swp
    JOIN public.projects p ON p.id = swp.project_id
    WHERE swp.id = six_week_plan_id AND p.user_id = auth.uid()
  ));
CREATE POLICY "Users can update own weekly_plans" ON public.weekly_plans FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.six_week_plans swp
    JOIN public.projects p ON p.id = swp.project_id
    WHERE swp.id = six_week_plan_id AND p.user_id = auth.uid()
  ));
CREATE POLICY "Users can delete own weekly_plans" ON public.weekly_plans FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.six_week_plans swp
    JOIN public.projects p ON p.id = swp.project_id
    WHERE swp.id = six_week_plan_id AND p.user_id = auth.uid()
  ));

-- 7. Daily Plans table
CREATE TABLE public.daily_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  weekly_plan_id UUID NOT NULL REFERENCES public.weekly_plans(id) ON DELETE CASCADE,
  day_number INT NOT NULL DEFAULT 1,
  date TEXT NOT NULL DEFAULT '',
  planned_quantity NUMERIC NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT '',
  constraint_text TEXT NOT NULL DEFAULT '',
  floor_units TEXT[] NOT NULL DEFAULT '{}',
  engineer_note TEXT,
  rov TEXT,
  completed_quantity NUMERIC,
  remaining_quantity NUMERIC,
  is_done BOOLEAN DEFAULT false,
  supervisor_note TEXT,
  constraint_log TEXT,
  validated_by_engineer BOOLEAN DEFAULT false,
  confirmed_by_admin BOOLEAN DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','assigned','forwarded','logged','submitted','validated','confirmed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.daily_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own daily_plans" ON public.daily_plans FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.weekly_plans wp
    JOIN public.six_week_plans swp ON swp.id = wp.six_week_plan_id
    JOIN public.projects p ON p.id = swp.project_id
    WHERE wp.id = weekly_plan_id AND p.user_id = auth.uid()
  ));
CREATE POLICY "Users can insert own daily_plans" ON public.daily_plans FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.weekly_plans wp
    JOIN public.six_week_plans swp ON swp.id = wp.six_week_plan_id
    JOIN public.projects p ON p.id = swp.project_id
    WHERE wp.id = weekly_plan_id AND p.user_id = auth.uid()
  ));
CREATE POLICY "Users can update own daily_plans" ON public.daily_plans FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.weekly_plans wp
    JOIN public.six_week_plans swp ON swp.id = wp.six_week_plan_id
    JOIN public.projects p ON p.id = swp.project_id
    WHERE wp.id = weekly_plan_id AND p.user_id = auth.uid()
  ));
CREATE POLICY "Users can delete own daily_plans" ON public.daily_plans FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.weekly_plans wp
    JOIN public.six_week_plans swp ON swp.id = wp.six_week_plan_id
    JOIN public.projects p ON p.id = swp.project_id
    WHERE wp.id = weekly_plan_id AND p.user_id = auth.uid()
  ));

-- 8. Tickets table
CREATE TABLE public.tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  six_week_plan_id UUID REFERENCES public.six_week_plans(id) ON DELETE SET NULL,
  weekly_plan_id UUID REFERENCES public.weekly_plans(id) ON DELETE SET NULL,
  daily_plan_id UUID REFERENCES public.daily_plans(id) ON DELETE SET NULL,
  trade_name TEXT NOT NULL DEFAULT '',
  task_id TEXT NOT NULL DEFAULT '',
  constraint_text TEXT NOT NULL DEFAULT '',
  rov_comment TEXT,
  date TEXT NOT NULL DEFAULT '',
  target_quantity NUMERIC NOT NULL DEFAULT 0,
  completed_quantity NUMERIC NOT NULL DEFAULT 0,
  shortfall_quantity NUMERIC NOT NULL DEFAULT 0,
  recovery_id TEXT NOT NULL DEFAULT '',
  contractor_name TEXT NOT NULL DEFAULT '',
  unit TEXT NOT NULL DEFAULT '',
  rov TEXT,
  recovery_deadline TEXT,
  contractor_statement TEXT,
  assigned_to TEXT NOT NULL DEFAULT 'engineer',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','in-progress','closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own tickets" ON public.tickets FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.user_id = auth.uid()));
CREATE POLICY "Users can insert own tickets" ON public.tickets FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.user_id = auth.uid()));
CREATE POLICY "Users can update own tickets" ON public.tickets FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.user_id = auth.uid()));
CREATE POLICY "Users can delete own tickets" ON public.tickets FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.user_id = auth.uid()));

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
