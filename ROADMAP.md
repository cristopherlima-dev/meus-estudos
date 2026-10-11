# Meus Estudos – Roadmap

PWA pessoal para controlar as aulas e as avaliações da faculdade (Uninter – TADS).
Stack: HTML/CSS/JS puro (módulos ES) · Supabase (projeto `meus-apps`, tabelas `est_`) · GitHub Pages.

_Última atualização: 11/10/2026_

---

## ✅ Feito

| # | Etapa | Data |
|---|-------|------|
| 1 | Levantamento de como funcionam as aulas e as avaliações da Uninter | 11/10 |
| 2 | Mockup aprovado (8 telas) | 11/10 |
| 3 | Pasta + `.gitignore` + repositório `cristopherlima-dev/meus-estudos` (via `gh`) | 11/10 |
| 4 | `sql/est-001-tabelas.sql` rodado no Supabase (4 tabelas + RLS) | 11/10 |
| 5 | `config.js` (copiado do Minhas Finanças – mesmo projeto Supabase) | 11/10 |
| 6 | `index.html` (estrutura de todas as telas) | 11/10 |
| 7 | `style.css` (visual) | 11/10 |

## ⏭️ Próximo passo

**`app.js` – lógica do app** (será gravado inteiro; teste do app completo no final)

Blocos previstos:
1. Conexão com o Supabase + utilitários (`esc`, `confirmar`, `aviso`, datas)
2. Login / sair
3. Navegação (menu inferior + botão Voltar)
4. Início: estado vazio, fase mais recente, progresso, próximos prazos, disciplinas, pendentes
5. Prazos: avaliações em aberto ordenadas pela data
6. Nova/Editar disciplina: ao salvar cria as aulas (1..N) e APOL 1, APOL 2, Prova Mista (+ Trabalho se marcado)
7. Disciplina: abas Aulas/Avaliações, adicionar aula
8. Aula: checklist por grupo, marcar/desmarcar, adicionar/apagar item, copiar itens da aula anterior, excluir aula
9. Avaliações: editar datas/nota/entregue, cálculo da média e da nota necessária, abrir 2ª chamada / Exame / Recuperação

## 🔜 Depois

- [ ] Testar o app inteiro (cadastrar as disciplinas reais) + commit
- [ ] `manifest.json`
- [ ] `sw.js` (service worker, rede primeiro)
- [ ] Ícones (`icons/icon-192.png`, `icons/icon-512.png`)
- [ ] GitHub Pages
- [ ] README completo (só no final)

## 📌 Regras do app

- O app nasce **vazio**: tudo é cadastrado pelo app.
- Estrutura: Disciplina (módulo, fase, ano) → Aulas (mínimo 6) → Itens.
- Grupos de itens: Aula teórica · Vídeos | Aula teórica · Texto | Aula prática | Material complementar.
- Não guarda PDFs: só marca lido/não lido.
- Aulas 7+ são complementares (não caem em avaliação).
- Avaliações: APOL 1 (15%, aulas 1–3) · APOL 2 (15%, aulas 4–6) · Prova Mista (70%, presencial, agendada) · Trabalho opcional (só entregue + prazo).
- Aprovação: média **70**.
- Nota necessária na prova = (70 − (APOL1 × 0,15 + APOL2 × 0,15)) ÷ 0,70.
- Se reprovar: 2ª chamada/Substitutiva (substitui a prova) → Exame (100%) → Recuperação (100%) → regime tutorial.
- Pesos e situação **não ficam no banco**: o app calcula.

## 🗂️ Banco (Supabase `meus-apps`)

- `est_disciplinas` · `est_aulas` · `est_itens` · `est_avaliacoes`
- RLS "dono" em todas; excluir disciplina apaga aulas, itens e avaliações (cascade).

## 💡 Backlog

- Pesos quando a disciplina tem trabalho (ainda não conhecido)
- Incluir outros cursos além da Uninter
