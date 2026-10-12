# 📚 Meus Estudos

PWA pessoal para acompanhar as aulas e as avaliações da faculdade (Uninter – Tecnologia em Análise e Desenvolvimento de Sistemas).
Substitui o checklist que eu mantinha no Notion e calcula sozinho quanto preciso tirar em cada prova.

**App:** https://cristopherlima-dev.github.io/meus-estudos/

---

## O que o app faz

- **Disciplinas por fase**: módulo, fase, ano, período e código. O Início mostra a fase mais recente, o progresso, os próximos prazos e as disciplinas pendentes de fases anteriores.
- **Aulas com checklist**: cada aula tem itens em 4 grupos (Aula teórica · Vídeos, Aula teórica · Texto, Aula prática e Material complementar). É possível marcar, editar, apagar e **copiar os itens da aula anterior**.
- **Aulas ao vivo** (só nas disciplinas que têm): descrição, data, hora e "assistida", ao vivo ou pela gravação.
- **Avaliações**: APOL 1, APOL 2, Prova Mista e Trabalho (opcional), com datas, data agendada e nota.
- **Cálculo da nota**: com as duas APOLs lançadas, mostra a nota necessária na Prova Mista. Se reprovar, mostra a média e libera 2ª chamada, Exame e Recuperação, com a nota necessária em cada uma.
- **Prazos**: avaliações ainda não feitas e aulas ao vivo ainda não assistidas, ordenadas por data.
- **PWA**: dá para instalar no celular e no PC, e abre sem internet (os dados precisam de conexão).

## Regras de nota (Uninter)

| Avaliação | Peso | Observação |
|---|---|---|
| APOL 1 | 15% | Aulas 1 a 3, com consulta |
| APOL 2 | 15% | Aulas 4 a 6, com consulta |
| Prova Mista | 70% | Presencial, sem consulta |
| 2ª chamada / Substitutiva | 70% | Substitui a Prova Mista |
| Exame | 100% | Precisa de 70 |
| Recuperação | 100% | Precisa de 70 |

- Aprovação: **média 70**
- Nota necessária na prova = (70 − (APOL1 × 0,15 + APOL2 × 0,15)) ÷ 0,70
- Pesos e situação **não ficam no banco**: o app calcula a partir das notas

## Tecnologias

- HTML, CSS e JavaScript puro (módulos ES), sem framework e sem build
- [Supabase](https://supabase.com): banco Postgres, login por e-mail e senha e RLS (cada usuário só vê os próprios dados)
- GitHub Pages: hospedagem
- Service worker com estratégia "rede primeiro"

O banco é o mesmo projeto Supabase (`meus-apps`) usado pelos apps Meus Remédios e Minhas Finanças. As tabelas deste app usam o prefixo `est_`.

## Estrutura

```
meus-estudos/
├── index.html          # estrutura de todas as telas
├── style.css           # visual (cores no :root)
├── app.js              # lógica, dividida em blocos numerados
├── config.js           # URL e publishable key do Supabase
├── manifest.json       # dados do PWA (nome, cores, ícones)
├── sw.js               # service worker (rede primeiro)
├── icons/              # ícones do app e favicon
└── sql/
    ├── est-001-tabelas.sql       # disciplinas, aulas, itens, avaliações + RLS
    └── est-002-aulas-ao-vivo.sql # aulas ao vivo + RLS
```

## Banco de dados

| Tabela | Guarda |
|---|---|
| `est_disciplinas` | nome, código, módulo, fase, ano, período, tem trabalho, tem aulas ao vivo |
| `est_aulas` | número e título de cada aula da disciplina |
| `est_itens` | checklist da aula: grupo, nome, ordem, concluído |
| `est_avaliacoes` | tipo, datas, data agendada, nota, entregue |
| `est_aulas_ao_vivo` | número, descrição, data, hora, assistida |

Excluir uma disciplina apaga junto as aulas, os itens, as avaliações e as aulas ao vivo dela (`on delete cascade`).

## Como rodar localmente

O app usa módulos JS, então precisa de um servidor local (abrir o `index.html` com duplo clique não funciona):

```powershell
python -m http.server 5500
```

Depois abra `http://localhost:5500`. O Live Server do VS Code também funciona.

## Como configurar do zero

1. No Supabase, rode os scripts da pasta `sql/` em ordem.
2. Em `config.js`, coloque a URL do projeto e a **publishable key**. Ela é pública por natureza, porque quem protege os dados é o RLS. **Nunca** coloque a secret key ou a service_role.
3. Crie o usuário em *Authentication → Users*.
4. Publique com o GitHub Pages (branch `main`, raiz).

## Atualizando o app

Cada `git push` na `main` republica o site em cerca de 1 minuto. Como o service worker busca primeiro na rede, a versão nova aparece sozinha. Ao mudar a lista de arquivos do `sw.js`, aumente a `VERSAO` nele.

## Próximas ideias

- Pesos quando a disciplina tem trabalho
- Incluir outros cursos além da Uninter
