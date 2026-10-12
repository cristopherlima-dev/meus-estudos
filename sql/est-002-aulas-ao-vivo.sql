-- =============================================================
-- Meus Estudos - aulas ao vivo
-- Rodar uma vez no SQL Editor do Supabase (projeto meus-apps).
-- =============================================================


-- -------------------------------------------------------------
-- 1) Nova opção na disciplina: "Tem aulas ao vivo"
-- -------------------------------------------------------------
alter table public.est_disciplinas
  add column tem_ao_vivo boolean not null default false;


-- -------------------------------------------------------------
-- 2) AULAS AO VIVO
-- Numeradas dentro da disciplina (Aula ao vivo 1, 2, 3...).
-- data + hora separadas (o app não usa <input type="time">).
-- assistida: marcada ao assistir ao vivo ou a gravação.
-- Excluir a disciplina apaga as aulas ao vivo dela.
-- -------------------------------------------------------------
create table public.est_aulas_ao_vivo (
  id             bigint generated always as identity primary key,
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  disciplina_id  bigint not null references public.est_disciplinas (id) on delete cascade,
  numero         smallint not null check (numero between 1 and 50),
  descricao      text check (char_length(descricao) <= 200),
  data           date,
  hora           time,
  assistida      boolean not null default false,
  assistida_em   timestamptz,
  criado_em      timestamptz not null default now(),
  unique (disciplina_id, numero)
);

create index est_aulas_ao_vivo_disciplina_idx on public.est_aulas_ao_vivo (disciplina_id);


-- -------------------------------------------------------------
-- 3) SEGURANÇA (RLS) – cada usuário só vê as próprias linhas
-- -------------------------------------------------------------
alter table public.est_aulas_ao_vivo enable row level security;

create policy "est_aulas_ao_vivo: dono" on public.est_aulas_ao_vivo
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
