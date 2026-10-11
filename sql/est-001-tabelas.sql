-- =============================================================
-- Meus Estudos - tabelas iniciais (prefixo est_)
-- Projeto Supabase: meus-apps
-- Rodar uma vez no SQL Editor do Supabase.
-- O banco nasce vazio: nenhum dado inicial é inserido.
-- =============================================================


-- -------------------------------------------------------------
-- 1) DISCIPLINAS
-- Cada disciplina pertence a um módulo/fase/ano (ex.: D - I - 2026).
-- -------------------------------------------------------------
create table public.est_disciplinas (
  id            bigint generated always as identity primary key,
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nome          text not null check (char_length(nome) between 1 and 100),
  codigo        text check (char_length(codigo) <= 20),
  modulo        text not null check (modulo ~ '^[A-Z]$'),          -- uma letra: A, B, C, D...
  fase          text not null check (fase in ('I', 'II')),
  ano           smallint not null check (ano between 2020 and 2100),
  data_inicio   date,
  data_fim      date,
  tem_trabalho  boolean not null default false,
  criado_em     timestamptz not null default now(),
  check (data_fim is null or data_inicio is null or data_fim >= data_inicio)
);

create index est_disciplinas_user_idx on public.est_disciplinas (user_id, ano, modulo, fase);


-- -------------------------------------------------------------
-- 2) AULAS
-- Numeradas dentro da disciplina (1, 2, 3...). Título é opcional.
-- Excluir a disciplina apaga as aulas dela (on delete cascade).
-- -------------------------------------------------------------
create table public.est_aulas (
  id             bigint generated always as identity primary key,
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  disciplina_id  bigint not null references public.est_disciplinas (id) on delete cascade,
  numero         smallint not null check (numero between 1 and 50),
  titulo         text check (char_length(titulo) <= 120),
  criado_em      timestamptz not null default now(),
  unique (disciplina_id, numero)                                   -- não deixa repetir "Aula 3"
);

create index est_aulas_disciplina_idx on public.est_aulas (disciplina_id);


-- -------------------------------------------------------------
-- 3) ITENS (checklist de cada aula)
-- grupo define em qual bloco o item aparece na tela:
--   teoria_video | teoria_texto | pratica | complementar
-- ordem define a posição dentro do grupo.
-- Excluir a aula apaga os itens dela.
-- -------------------------------------------------------------
create table public.est_itens (
  id            bigint generated always as identity primary key,
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  aula_id       bigint not null references public.est_aulas (id) on delete cascade,
  grupo         text not null check (grupo in ('teoria_video', 'teoria_texto', 'pratica', 'complementar')),
  titulo        text not null check (char_length(titulo) between 1 and 120),
  ordem         smallint not null default 0,
  concluido     boolean not null default false,
  concluido_em  timestamptz,
  criado_em     timestamptz not null default now()
);

create index est_itens_aula_idx on public.est_itens (aula_id, grupo, ordem);


-- -------------------------------------------------------------
-- 4) AVALIAÇÕES
-- tipo:
--   apol1 | apol2 | prova | trabalho | segunda_chamada | exame | recuperacao
-- Cada tipo aparece no máximo uma vez por disciplina.
-- nota de 0 a 100 (vazia = ainda não fez).
-- entregue: usado só no trabalho.
-- Pesos e situação (aprovado/reprovado) NÃO ficam aqui: o app calcula.
-- -------------------------------------------------------------
create table public.est_avaliacoes (
  id             bigint generated always as identity primary key,
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  disciplina_id  bigint not null references public.est_disciplinas (id) on delete cascade,
  tipo           text not null check (tipo in ('apol1', 'apol2', 'prova', 'trabalho', 'segunda_chamada', 'exame', 'recuperacao')),
  data_inicio    date,
  data_fim       date,
  data_agendada  date,
  nota           numeric(5,2) check (nota between 0 and 100),
  entregue       boolean not null default false,
  criado_em      timestamptz not null default now(),
  unique (disciplina_id, tipo),
  check (data_fim is null or data_inicio is null or data_fim >= data_inicio)
);

create index est_avaliacoes_prazo_idx on public.est_avaliacoes (user_id, data_fim);


-- -------------------------------------------------------------
-- 5) SEGURANÇA (RLS)
-- Cada usuário só enxerga e altera as próprias linhas.
-- -------------------------------------------------------------
alter table public.est_disciplinas enable row level security;
alter table public.est_aulas       enable row level security;
alter table public.est_itens       enable row level security;
alter table public.est_avaliacoes  enable row level security;

create policy "est_disciplinas: dono" on public.est_disciplinas
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "est_aulas: dono" on public.est_aulas
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "est_itens: dono" on public.est_itens
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "est_avaliacoes: dono" on public.est_avaliacoes
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
