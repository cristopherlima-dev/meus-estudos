# Meus Estudos – Roadmap

PWA pessoal para controlar as aulas e as avaliações da faculdade (Uninter – TADS).
Stack: HTML/CSS/JS puro (módulos ES) · Supabase (projeto `meus-apps`, tabelas `est_`) · GitHub Pages.

**App:** https://cristopherlima-dev.github.io/meus-estudos/

_Última atualização: 12/10/2026_

---

## ✅ Feito

| # | Etapa | Data |
|---|-------|------|
| 1 | Levantamento de como funcionam as aulas e as avaliações da Uninter | 11/10 |
| 2 | Mockup aprovado (8 telas) | 11/10 |
| 3 | Pasta + `.gitignore` + repositório `cristopherlima-dev/meus-estudos` (via `gh`) | 11/10 |
| 4 | `sql/est-001-tabelas.sql` rodado no Supabase (4 tabelas + RLS) | 11/10 |
| 5 | `config.js`, `index.html`, `style.css` | 11/10 |
| 6 | `app.js` completo: disciplinas, aulas, itens, avaliações, cálculo de nota, prazos | 12/10 |
| 7 | Aulas ao vivo (`sql/est-002-aulas-ao-vivo.sql`) + editar nome do item | 12/10 |
| 8 | GitHub Pages ativado via `gh api` | 12/10 |
| 9 | PWA: `manifest.json`, `sw.js` (rede primeiro), ícones e favicon | 12/10 |
| 10 | README completo | 12/10 |

## ⏭️ Próximo passo

- [ ] Instalar o app no celular e no PC e usar no dia a dia
- [ ] Anotar ajustes que aparecerem com o uso

## 📌 Regras do app

- O app nasce **vazio**: tudo é cadastrado pelo app.
- Estrutura: Disciplina (módulo, fase, ano) → Aulas (mínimo 6) → Itens.
- Grupos de itens: Aula teórica · Vídeos | Aula teórica · Texto | Aula prática | Material complementar.
- Não guarda PDFs: só marca lido/não lido.
- Aulas 7+ são complementares (não caem em avaliação).
- Aulas ao vivo: só nas disciplinas com "Tem aulas ao vivo". Desmarcar só esconde a aba.
- Avaliações: APOL 1 (15%, aulas 1–3) · APOL 2 (15%, aulas 4–6) · Prova Mista (70%, presencial, agendada) · Trabalho opcional (só entregue + prazo).
- Aprovação: média **70**.
- Nota necessária na prova = (70 − (APOL1 × 0,15 + APOL2 × 0,15)) ÷ 0,70.
- Se reprovar: 2ª chamada/Substitutiva (substitui a prova) → Exame (100%) → Recuperação (100%) → regime tutorial.
- Pesos e situação **não ficam no banco**: o app calcula.

## 🗂️ Banco (Supabase `meus-apps`)

- `est_disciplinas` · `est_aulas` · `est_itens` · `est_avaliacoes` · `est_aulas_ao_vivo`
- RLS "dono" em todas; excluir disciplina apaga tudo dela (cascade).

## ⚠️ Lições

- Antes de o Claude gravar um arquivo que já existe, **fechar a aba dele no VS Code**. Em 12/10 o editor salvou por cima do `app.js` novo.
- Ao mudar a lista de arquivos do `sw.js`, aumentar a `VERSAO`.

## 💡 Backlog

- Pesos quando a disciplina tem trabalho (ainda não conhecido)
- Incluir outros cursos além da Uninter
