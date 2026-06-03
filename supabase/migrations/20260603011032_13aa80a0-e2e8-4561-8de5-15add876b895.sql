UPDATE public.ai_agents
SET display_name = 'Rosane Beatriz',
    system_prompt = REPLACE(system_prompt, 'Veronica', 'Rosane Beatriz')
WHERE name = 'veronica';

UPDATE public.ai_agents
SET system_prompt = REPLACE(system_prompt, 'Veronica', 'Rosane Beatriz')
WHERE name = 'felipe';