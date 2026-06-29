-- Create model_usage table
CREATE TABLE IF NOT EXISTS public.model_usage (
    model_name text PRIMARY KEY,
    last_checked timestamptz DEFAULT now(),
    is_healthy boolean DEFAULT true,
    latency_ms integer DEFAULT 0
);

-- Create failover_logs table
CREATE TABLE IF NOT EXISTS public.failover_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp timestamptz DEFAULT now(),
    from_model text,
    to_model text,
    reason text
);

-- Create resume_analyses table
CREATE TABLE IF NOT EXISTS public.resume_analyses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    resume_text text NOT NULL,
    jd_text text NOT NULL,
    score integer NOT NULL,
    suggestions jsonb NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- Create user_writing_samples table
CREATE TABLE IF NOT EXISTS public.user_writing_samples (
    user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    sample_text text NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security (RLS) on user tables
ALTER TABLE public.resume_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_writing_samples ENABLE ROW LEVEL SECURITY;

-- Disable RLS on system logs or allow authenticated read, write restricted
ALTER TABLE public.model_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.failover_logs ENABLE ROW LEVEL SECURITY;

-- Policies for public.model_usage
CREATE POLICY "Allow public read access to model_usage" 
    ON public.model_usage FOR SELECT USING (true);
CREATE POLICY "Allow service role write access to model_usage" 
    ON public.model_usage FOR ALL TO service_role USING (true);

-- Policies for public.failover_logs
CREATE POLICY "Allow public read access to failover_logs" 
    ON public.failover_logs FOR SELECT USING (true);
CREATE POLICY "Allow service role write access to failover_logs" 
    ON public.failover_logs FOR ALL TO service_role USING (true);

-- Policies for public.resume_analyses
CREATE POLICY "Allow users to select their own resume_analyses" 
    ON public.resume_analyses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Allow users to insert their own resume_analyses" 
    ON public.resume_analyses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Allow users to delete their own resume_analyses" 
    ON public.resume_analyses FOR DELETE USING (auth.uid() = user_id);

-- Policies for public.user_writing_samples
CREATE POLICY "Allow users to select their own user_writing_samples" 
    ON public.user_writing_samples FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Allow users to insert/update their own user_writing_samples" 
    ON public.user_writing_samples FOR ALL USING (auth.uid() = user_id);
