-- Seed local apenas (dev). Nunca rodar em produção.
-- Cria 1 profile admin para testes manuais e 3 prospects fictícios.

-- Admin de testes (só funciona se já existir um auth.users com este id)
-- Use o magic link em http://localhost:54323 para criar primeiro.

insert into public.prospects (full_name, email, linkedin_url, segment, consent, source) values
  ('Maria Silva', 'maria.silva@example.com', 'https://linkedin.com/in/maria-silva-fake', 'Fractional CMO', true, 'seed'),
  ('João Pereira', 'joao.pereira@example.com', 'https://linkedin.com/in/joao-pereira-fake', 'Consultor de Growth', true, 'seed'),
  ('Ana Costa', 'ana.costa@example.com', 'https://linkedin.com/in/ana-costa-fake', 'Agência de Performance', true, 'seed')
on conflict (email) do nothing;
