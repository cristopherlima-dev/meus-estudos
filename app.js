// =====================================================================
// Meus Estudos – lógica do app
// Blocos: 1 Conexão · 2 Estado · 3 Utilitários · 4 Regras de nota
//         5 Login · 6 Navegação · 7 Dados · 8 Início · 9 Prazos
//         10 Disciplina · 11 Aula · 12 Avaliação · 12.1 Aula ao vivo
//         13 Form. disciplina · 14 Início do app
// =====================================================================

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_KEY } from './config.js';


// ---------------------------------------------------------------------
// 1. CONEXÃO COM O SUPABASE
// ---------------------------------------------------------------------
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

// Atalho: $('aviso') em vez de document.getElementById('aviso')
const $ = (id) => document.getElementById(id);


// ---------------------------------------------------------------------
// 2. ESTADO – o que o app "sabe" neste momento
// Como é um app pessoal com poucos dados, carregamos tudo de uma vez
// e fazemos as contas (progresso, médias, prazos) aqui no navegador.
// ---------------------------------------------------------------------
const estado = {
  disciplinas: [],
  aulas: [],
  itens: [],
  avaliacoes: [],
  aoVivo: [],           // aulas ao vivo
  discAtual: null,      // id da disciplina aberta
  aulaAtual: null,      // id da aula aberta
  aba: 'aulas',         // aba aberta na tela da disciplina
  voltar: null,         // função chamada pelo botão "‹ Voltar"
};

// Grupos de itens da aula, na ordem em que aparecem na tela
const GRUPOS = {
  teoria_video: 'Aula teórica · Vídeos',
  teoria_texto: 'Aula teórica · Texto',
  pratica:      'Aula prática',
  complementar: 'Material complementar',
};

// Tipos de avaliação, na ordem em que aparecem na tela
//  nota:     tem nota de 0 a 100
//  agendada: é presencial (mostra o campo "Agendada para")
//  extra:    só existe se reprovar (pode ser removida)
const TIPOS = {
  apol1:           { nome: 'APOL 1', peso: '15%', desc: 'Aulas 1 a 3 · com consulta', nota: true },
  apol2:           { nome: 'APOL 2', peso: '15%', desc: 'Aulas 4 a 6 · com consulta', nota: true },
  prova:           { nome: 'Prova Mista', peso: '70%', desc: 'Presencial no polo · sem consulta', nota: true, agendada: true },
  trabalho:        { nome: 'Trabalho', peso: null, desc: 'Entrega do trabalho', nota: false },
  segunda_chamada: { nome: '2ª chamada / Substitutiva', peso: '70%', desc: 'Paga · substitui a Prova Mista', nota: true, agendada: true, extra: true },
  exame:           { nome: 'Exame', peso: '100%', desc: 'Presencial · basta tirar 70', nota: true, agendada: true, extra: true },
  recuperacao:     { nome: 'Recuperação', peso: '100%', desc: 'Paga · presencial · basta tirar 70', nota: true, agendada: true, extra: true },
};
const ORDEM_TIPOS = Object.keys(TIPOS);

const MEDIA = 70;


// ---------------------------------------------------------------------
// 3. UTILITÁRIOS
// ---------------------------------------------------------------------

// Escapa o texto digitado antes de colocá-lo no HTML
function esc(texto) {
  return String(texto ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Data de hoje no formato do banco (AAAA-MM-DD), no fuso do aparelho.
// Não usar toISOString(): ela converte para UTC e, à noite, já seria "amanhã".
function hojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// "2026-10-14" -> "14/10"   ·   "2026-10-14" -> "14/10/26"
const dm  = (iso) => iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : '';
const dma = (iso) => iso ? `${dm(iso)}/${iso.slice(2, 4)}` : '';

// Quantos dias faltam até a data (0 = hoje, negativo = já passou)
function diasAte(iso) {
  const [a, m, d] = iso.split('-').map(Number);
  const alvo = new Date(a, m - 1, d);
  const h = new Date();
  const hoje = new Date(h.getFullYear(), h.getMonth(), h.getDate());
  return Math.round((alvo - hoje) / 86400000);
}

// 62.714 -> "62,7"
const fmtNota = (n) => Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

// "62,5" / "62.5" / "" -> 62.5 / null. NaN se for inválido.
function lerNota(texto) {
  const t = String(texto).trim().replace(',', '.');
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : NaN;
}

// Janela de confirmação própria. Uso: if (await confirmar('Excluir?')) { ... }
function confirmar(mensagem, { ok = 'Confirmar', perigo = false } = {}) {
  return new Promise((resolve) => {
    const modal = $('modal');
    const botaoOk = $('modal-ok');

    $('modal-msg').textContent = mensagem;
    botaoOk.textContent = ok;
    botaoOk.className = 'btn ' + (perigo ? 'btn-perigo-cheio' : 'btn-primario');
    modal.hidden = false;

    function fechar(resposta) {
      modal.hidden = true;
      botaoOk.onclick = null;
      $('modal-cancelar').onclick = null;
      modal.onclick = null;
      resolve(resposta);
    }

    botaoOk.onclick = () => fechar(true);
    $('modal-cancelar').onclick = () => fechar(false);
    modal.onclick = (e) => { if (e.target === modal) fechar(false); };
  });
}

// Mesma janela, com um campo de texto. Uso: const novo = await pedirTexto('Editar', 'texto atual')
// Devolve o texto digitado, ou null se cancelar.
async function pedirTexto(mensagem, valor) {
  const campo = $('modal-input');
  campo.value = valor;
  campo.hidden = false;
  setTimeout(() => { campo.focus(); campo.select(); }, 0);

  // Enter no campo = clicar em "Salvar"
  campo.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); $('modal-ok').click(); } };

  const ok = await confirmar(mensagem, { ok: 'Salvar' });
  campo.hidden = true;
  campo.onkeydown = null;
  return ok ? campo.value.trim() : null;
}

// Mensagem rápida no rodapé
let timerAviso;
function aviso(msg) {
  const el = $('aviso');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(timerAviso);
  timerAviso = setTimeout(() => { el.hidden = true; }, 2500);
}

// Mostra um erro do Supabase de forma amigável
function falha(contexto, error) {
  console.error(contexto, error);
  aviso(`Erro ao ${contexto}. Tente de novo.`);
}

function mostrarErro(id, msg) {
  $(id).textContent = msg;
  $(id).hidden = false;
}

// Monta uma etiqueta colorida
const chip = (cor, texto) => `<span class="chip ${cor}">${esc(texto)}</span>`;

// Monta uma barra de progresso (pct de 0 a 100)
const barra = (pct) => `<div class="barra ${pct >= 100 ? 'cheia' : ''}"><i style="width:${pct}%"></i></div>`;

// Buscas rápidas no estado
const discPorId  = (id) => estado.disciplinas.find((d) => d.id === id);
const aulaPorId  = (id) => estado.aulas.find((a) => a.id === id);
const avalPorId  = (id) => estado.avaliacoes.find((a) => a.id === id);
const aulasDa    = (discId) => estado.aulas.filter((a) => a.disciplina_id === discId).sort((a, b) => a.numero - b.numero);
const itensDa    = (aulaId) => estado.itens.filter((i) => i.aula_id === aulaId);
const avalsDa    = (discId) => estado.avaliacoes.filter((a) => a.disciplina_id === discId)
                                 .sort((a, b) => ORDEM_TIPOS.indexOf(a.tipo) - ORDEM_TIPOS.indexOf(b.tipo));
const avalDoTipo = (discId, tipo) => estado.avaliacoes.find((a) => a.disciplina_id === discId && a.tipo === tipo);
const aoVivoDa   = (discId) => estado.aoVivo.filter((v) => v.disciplina_id === discId).sort((a, b) => a.numero - b.numero);
const aoVivoPorId = (id) => estado.aoVivo.find((v) => v.id === id);

// "19:00:00" (como vem do banco) -> "19:00"
const hm = (hora) => hora ? hora.slice(0, 5) : '';


// ---------------------------------------------------------------------
// 4. REGRAS DE PROGRESSO E DE NOTA
// ---------------------------------------------------------------------

// Progresso de uma aula: % de itens marcados (aula sem itens = 0%)
function pctAula(aulaId) {
  const itens = itensDa(aulaId);
  if (!itens.length) return 0;
  return Math.round(itens.filter((i) => i.concluido).length / itens.length * 100);
}

// Progresso da disciplina: média do progresso das aulas
function progressoDisc(discId) {
  const aulas = aulasDa(discId);
  const pcts = aulas.map((a) => pctAula(a.id));
  return {
    pct: pcts.length ? Math.round(pcts.reduce((s, p) => s + p, 0) / pcts.length) : 0,
    concluidas: pcts.filter((p) => p === 100).length,
    total: aulas.length,
  };
}

// Avaliação "feita": trabalho entregue ou nota lançada
const feita = (a) => (a.tipo === 'trabalho' ? a.entregue : a.nota !== null);

// Situação da disciplina, calculada a partir das notas (nada disso fica no banco).
// Devolve: { sit: 'em_curso' | 'aprovado' | 'reprovado' | 'tutorial', ... }
function situacao(discId) {
  const nota = (tipo) => {
    const a = avalDoTipo(discId, tipo);
    return a && a.nota !== null ? Number(a.nota) : null;
  };
  const a1 = nota('apol1'), a2 = nota('apol2'), p = nota('prova');
  const sc = nota('segunda_chamada'), ex = nota('exame'), rec = nota('recuperacao');

  // APOL não lançada conta como 0 quando já existe nota de prova
  const apols = (a1 ?? 0) * 0.15 + (a2 ?? 0) * 0.15;

  // Cada prova feita gera uma "tentativa" com sua média
  const tentativas = [];
  if (p   !== null) tentativas.push({ etapa: 'Regular',     media: apols + p * 0.7 });
  if (sc  !== null) tentativas.push({ etapa: '2ª chamada',  media: apols + sc * 0.7 });
  if (ex  !== null) tentativas.push({ etapa: 'Exame',       media: ex });
  if (rec !== null) tentativas.push({ etapa: 'Recuperação', media: rec });

  const base = { a1, a2, p, sc, ex, rec, apols };

  if (!tentativas.length) return { sit: 'em_curso', ...base };

  const aprovada = tentativas.find((t) => t.media >= MEDIA - 1e-9);
  if (aprovada) return { sit: 'aprovado', ...aprovada, ...base };

  const ultima = tentativas[tentativas.length - 1];
  if (rec !== null) return { sit: 'tutorial', ...ultima, ...base };
  return { sit: 'reprovado', ...ultima, ...base };
}

// Nota necessária na prova (Prova Mista ou 2ª chamada), dadas as APOLs
const notaNecessaria = (apols) => (MEDIA - apols) / 0.7;

// Texto da "próxima chance" de uma disciplina reprovada
function proximaChance(s) {
  if (s.sc === null) return '2ª chamada';
  if (s.ex === null) return 'Exame';
  return 'Recuperação';
}

// Etiqueta de prazo de uma avaliação
function chipPrazo(a) {
  if (feita(a)) return chip('ok', a.tipo === 'trabalho' ? 'Entregue' : 'Feita');
  if (a.data_inicio && diasAte(a.data_inicio) > 0) return chip('neutro', `Abre ${dm(a.data_inicio)}`);
  if (!a.data_fim) return chip('neutro', 'Sem data');
  const d = diasAte(a.data_fim);
  if (d < 0)   return chip('erro', 'Encerrada');
  if (d === 0) return chip('erro', 'Hoje');
  if (d <= 3)  return chip('erro', d === 1 ? '1 dia' : `${d} dias`);
  if (d <= 15) return chip('aviso', `${d} dias`);
  return chip('neutro', `até ${dm(a.data_fim)}`);
}

// Etiqueta de situação de uma disciplina
function chipSituacao(discId) {
  const s = situacao(discId);
  if (s.sit === 'aprovado')  return chip('ok', 'Aprovada');
  if (s.sit === 'reprovado') return chip('erro', 'Reprovada');
  if (s.sit === 'tutorial')  return chip('erro', 'Regime tutorial');
  const p = progressoDisc(discId);
  return `<small>${p.concluidas}/${p.total} aulas</small>`;
}


// ---------------------------------------------------------------------
// 5. LOGIN
// ---------------------------------------------------------------------
function mostrarLogin() {
  $('app').hidden = true;
  $('tela-login').hidden = false;
  $('login-senha').value = '';
}

async function entrar() {
  $('tela-login').hidden = true;
  $('app').hidden = false;
  await carregarTudo();
  abrirInicio();
}

$('form-login').addEventListener('submit', async (e) => {
  e.preventDefault();
  const botao = e.submitter;
  botao.disabled = true;
  $('login-erro').hidden = true;

  const { error } = await sb.auth.signInWithPassword({
    email: $('login-email').value.trim(),
    password: $('login-senha').value,
  });

  botao.disabled = false;
  if (error) return mostrarErro('login-erro', 'E-mail ou senha incorretos.');
  entrar();
});

$('btn-sair').addEventListener('click', async () => {
  await sb.auth.signOut();
  mostrarLogin();
});


// ---------------------------------------------------------------------
// 6. NAVEGAÇÃO ENTRE TELAS
// mostrar('aula', 'Aula 3', () => abrirDisciplina(id), 'inicio')
//   tela   -> parte final do id da <section> (tela-aula)
//   titulo -> texto do topo
//   voltar -> função do botão "‹ Voltar" (null = sem botão)
//   menu   -> qual botão do menu inferior fica marcado
// ---------------------------------------------------------------------
function mostrar(tela, titulo, voltar = null, menu = 'inicio') {
  document.querySelectorAll('.tela').forEach((s) => { s.hidden = true; });
  $(`tela-${tela}`).hidden = false;

  $('topo-titulo').textContent = titulo;
  estado.voltar = voltar;
  $('btn-voltar').hidden = !voltar;

  document.querySelectorAll('.menu button').forEach((b) => {
    b.classList.toggle('ativo', b.dataset.tela === menu);
  });
  window.scrollTo(0, 0);
}

$('btn-voltar').addEventListener('click', () => estado.voltar?.());

document.querySelector('.menu').addEventListener('click', (e) => {
  const botao = e.target.closest('button');
  if (!botao) return;
  const tela = botao.dataset.tela;
  if (tela === 'prazos') abrirPrazos();
  else if (tela === 'form-disc') abrirFormDisc(null);
  else abrirInicio();
});


// ---------------------------------------------------------------------
// 7. DADOS – carrega as 5 tabelas de uma vez
// ---------------------------------------------------------------------
async function carregarTudo() {
  const [d, a, i, v, av] = await Promise.all([
    sb.from('est_disciplinas').select('*'),
    sb.from('est_aulas').select('*'),
    sb.from('est_itens').select('*').order('ordem').order('id'),
    sb.from('est_avaliacoes').select('*'),
    sb.from('est_aulas_ao_vivo').select('*'),
  ]);

  const erro = d.error || a.error || i.error || v.error || av.error;
  if (erro) { falha('carregar os dados', erro); return false; }

  estado.disciplinas = d.data;
  estado.aulas = a.data;
  estado.itens = i.data;
  estado.avaliacoes = v.data;
  estado.aoVivo = av.data;
  return true;
}

// Ordem das fases: ano, módulo e fase (a mais recente primeiro)
const chaveFase = (d) => `${d.ano}-${d.modulo}-${d.fase === 'II' ? 2 : 1}`;
const porFaseDesc = (a, b) => chaveFase(b).localeCompare(chaveFase(a)) || a.nome.localeCompare(b.nome, 'pt-BR');


// ---------------------------------------------------------------------
// 8. TELA INÍCIO
// ---------------------------------------------------------------------
function abrirInicio() {
  mostrar('inicio', 'Meus Estudos');

  const vazio = estado.disciplinas.length === 0;
  $('inicio-vazio').hidden = !vazio;
  $('inicio-conteudo').hidden = vazio;
  if (vazio) return;

  // Fase atual = a mais recente cadastrada
  const ordenadas = [...estado.disciplinas].sort(porFaseDesc);
  const chaveAtual = chaveFase(ordenadas[0]);
  const daFase = ordenadas.filter((d) => chaveFase(d) === chaveAtual);
  const outras = ordenadas.filter((d) => chaveFase(d) !== chaveAtual);
  const ref = daFase[0];

  // --- Resumo da fase ---
  $('fase-titulo').textContent = `Módulo ${ref.modulo} · Fase ${ref.fase}`;
  const inicios = daFase.map((d) => d.data_inicio).filter(Boolean).sort();
  const fins = daFase.map((d) => d.data_fim).filter(Boolean).sort();
  $('fase-periodo').textContent = inicios.length && fins.length
    ? `${dma(inicios[0])} a ${dma(fins[fins.length - 1])}`
    : String(ref.ano);

  const progs = daFase.map((d) => progressoDisc(d.id));
  const pct = Math.round(progs.reduce((s, p) => s + p.pct, 0) / progs.length);
  const concl = progs.reduce((s, p) => s + p.concluidas, 0);
  const total = progs.reduce((s, p) => s + p.total, 0);
  $('fase-pct').textContent = `${pct}%`;
  $('fase-barra').style.width = `${pct}%`;
  $('fase-barra').parentElement.classList.toggle('cheia', pct >= 100);
  $('fase-itens').textContent = `${concl} de ${total} aulas concluídas`;

  // --- Próximos prazos (3 primeiros) ---
  const prazos = listaPrazos().slice(0, 3);
  $('inicio-prazos').innerHTML = prazos.map(htmlPrazo).join('');
  $('inicio-prazos-vazio').hidden = prazos.length > 0;

  // --- Disciplinas da fase ---
  $('inicio-disciplinas').innerHTML = daFase.map((d) => `
    <div class="linha-lista" data-disc="${d.id}">
      <div class="topo-linha"><b>${esc(d.nome)}</b>${chipSituacao(d.id)}</div>
      ${barra(progressoDisc(d.id).pct)}
    </div>`).join('');

  // --- Pendentes de fases anteriores (não aprovadas) ---
  const pendentes = outras.filter((d) => situacao(d.id).sit !== 'aprovado');
  $('card-pendentes').hidden = pendentes.length === 0;
  $('inicio-pendentes').innerHTML = pendentes.map((d) => {
    const s = situacao(d.id);
    const detalhe = s.sit === 'reprovado' ? `Reprovada · próxima chance: ${proximaChance(s)}`
                  : s.sit === 'tutorial'  ? 'Refazer em regime tutorial'
                  : 'Em curso';
    return `
      <div class="linha-lista" data-disc="${d.id}">
        <div class="topo-linha"><b>${esc(d.nome)}</b>${chip('erro', `Pendente · ${d.modulo}${d.fase === 'II' ? 2 : 1}`)}</div>
        <small>${detalhe}</small>
      </div>`;
  }).join('');
}

// Toque numa disciplina (fase atual ou pendentes) abre a disciplina
$('inicio-disciplinas').addEventListener('click', clicarDisciplina);
$('inicio-pendentes').addEventListener('click', clicarDisciplina);
function clicarDisciplina(e) {
  const linha = e.target.closest('[data-disc]');
  if (linha) abrirDisciplina(Number(linha.dataset.disc));
}

$('btn-primeira').addEventListener('click', () => abrirFormDisc(null));


// ---------------------------------------------------------------------
// 9. TELA PRAZOS
// Junta duas coisas, ordenadas pela data:
//  - avaliações ainda não feitas, com prazo de hoje em diante,
//    de disciplinas que ainda não foram aprovadas;
//  - aulas ao vivo ainda não assistidas, de hoje em diante.
// Cada prazo vira { tipo: 'aval' | 'aovivo', data, reg } (reg = o registro)
// ---------------------------------------------------------------------
function listaPrazos() {
  const avals = estado.avaliacoes
    .filter((a) => !feita(a) && a.data_fim && diasAte(a.data_fim) >= 0)
    .filter((a) => {
      const s = situacao(a.disciplina_id).sit;
      return s !== 'aprovado' && s !== 'tutorial';
    })
    .map((a) => ({ tipo: 'aval', data: a.data_fim, reg: a }));

  const aoVivo = estado.aoVivo
    .filter((v) => !v.assistida && v.data && diasAte(v.data) >= 0)
    .filter((v) => discPorId(v.disciplina_id)?.tem_ao_vivo)
    .map((v) => ({ tipo: 'aovivo', data: v.data, reg: v }));

  return [...avals, ...aoVivo].sort((a, b) => a.data.localeCompare(b.data));
}

// Etiqueta de dias para uma aula ao vivo
function chipAoVivo(v) {
  const d = diasAte(v.data);
  if (d === 0) return chip('erro', `Hoje${v.hora ? ' ' + hm(v.hora) : ''}`);
  if (d === 1) return chip('aviso', 'Amanhã');
  if (d <= 7)  return chip('aviso', `${d} dias`);
  return chip('neutro', dm(v.data));
}

function htmlPrazo(p) {
  const d = discPorId(p.reg.disciplina_id);

  if (p.tipo === 'aovivo') {
    const v = p.reg;
    return `
      <div class="linha-lista" data-aovivo="${v.id}">
        <div class="topo-linha"><b>Aula ao vivo ${v.numero} · ${esc(d?.nome)}</b>${chipAoVivo(v)}</div>
        <small>${dma(v.data)}${v.hora ? ' às ' + hm(v.hora) : ''}</small>
      </div>`;
  }

  const a = p.reg;
  const agendada = a.data_agendada ? ` · agendada ${dm(a.data_agendada)}` : '';
  return `
    <div class="linha-lista" data-aval="${a.id}">
      <div class="topo-linha"><b>${esc(TIPOS[a.tipo].nome)} · ${esc(d?.nome)}</b>${chipPrazo(a)}</div>
      <small>até ${dma(a.data_fim)}${agendada}</small>
    </div>`;
}

function abrirPrazos() {
  mostrar('prazos', 'Prazos', null, 'prazos');
  const prazos = listaPrazos();
  $('lista-prazos').innerHTML = prazos.map(htmlPrazo).join('');
  $('lista-prazos-vazia').hidden = prazos.length > 0;
}

// Toque num prazo abre a avaliação ou a aula ao vivo;
// o "Voltar" retorna para a tela de origem
function clicarPrazo(e, origem) {
  const aval = e.target.closest('[data-aval]');
  if (aval) return abrirAvaliacao(Number(aval.dataset.aval), origem);
  const vivo = e.target.closest('[data-aovivo]');
  if (vivo) abrirAoVivo(Number(vivo.dataset.aovivo), null, origem);
}
$('lista-prazos').addEventListener('click', (e) => clicarPrazo(e, abrirPrazos));
$('inicio-prazos').addEventListener('click', (e) => clicarPrazo(e, abrirInicio));


// ---------------------------------------------------------------------
// 10. TELA DISCIPLINA (abas Aulas e Avaliações)
// ---------------------------------------------------------------------
function abrirDisciplina(discId) {
  const d = discPorId(discId);
  if (!d) return abrirInicio();
  if (estado.discAtual !== discId) estado.aba = 'aulas';   // outra disciplina: volta para "Aulas"
  estado.discAtual = discId;

  mostrar('disciplina', 'Disciplina', abrirInicio);

  $('disc-nome').textContent = d.nome;
  const partes = [d.codigo, `Módulo ${d.modulo}`, `Fase ${d.fase}`, d.ano];
  if (d.data_inicio && d.data_fim) partes.push(`${dma(d.data_inicio)} a ${dma(d.data_fim)}`);
  $('disc-info').textContent = partes.filter(Boolean).join(' · ');

  // Aba "Ao vivo" só para disciplinas com aulas ao vivo
  $('aba-aovivo').hidden = !d.tem_ao_vivo;
  if (estado.aba === 'aovivo' && !d.tem_ao_vivo) estado.aba = 'aulas';

  document.querySelector(`input[name="disc-aba"][value="${estado.aba}"]`).checked = true;
  mostrarAba();
  renderAulas();
  renderAvaliacoes();
  renderAoVivo();
}

function mostrarAba() {
  $('painel-aulas').hidden = estado.aba !== 'aulas';
  $('painel-avaliacoes').hidden = estado.aba !== 'avaliacoes';
  $('painel-aovivo').hidden = estado.aba !== 'aovivo';
}

document.querySelectorAll('input[name="disc-aba"]').forEach((r) =>
  r.addEventListener('change', () => { estado.aba = r.value; mostrarAba(); }));

// --- Aba Aulas ---
function renderAulas() {
  $('lista-aulas').innerHTML = aulasDa(estado.discAtual).map((a) => {
    const itens = itensDa(a.id);
    const pct = pctAula(a.id);
    const titulo = a.titulo ? ` · ${esc(a.titulo)}` : '';
    const direita = pct === 100 ? chip('ok', 'Concluída')
                  : itens.length ? `<small>${itens.filter((i) => i.concluido).length}/${itens.length}</small>`
                  : '<small>sem itens</small>';
    const extra = a.numero > 6 ? '<small>Complementar · não cai em avaliação</small>' : '';
    return `
      <div class="linha-lista" data-aula="${a.id}">
        <div class="topo-linha"><b>Aula ${a.numero}${titulo}</b>${direita}</div>
        ${extra}
        ${barra(pct)}
      </div>`;
  }).join('');
}

$('lista-aulas').addEventListener('click', (e) => {
  const linha = e.target.closest('[data-aula]');
  if (linha) abrirAula(Number(linha.dataset.aula));
});

$('btn-nova-aula').addEventListener('click', async () => {
  const aulas = aulasDa(estado.discAtual);
  const numero = aulas.length ? aulas[aulas.length - 1].numero + 1 : 1;

  const { error } = await sb.from('est_aulas').insert({ disciplina_id: estado.discAtual, numero });
  if (error) return falha('adicionar a aula', error);

  await carregarTudo();
  renderAulas();
  aviso(`Aula ${numero} adicionada`);
});

// --- Aba Avaliações ---
function renderAvaliacoes() {
  const discId = estado.discAtual;

  $('lista-avaliacoes').innerHTML = avalsDa(discId).map((a) => {
    const t = TIPOS[a.tipo];
    const peso = t.peso ? ` ${chip('neutro', t.peso)}` : '';
    const periodo = a.data_inicio || a.data_fim
      ? `${a.data_inicio ? dm(a.data_inicio) : '?'} a ${a.data_fim ? dm(a.data_fim) : '?'}` : 'Datas não informadas';
    const agendada = a.data_agendada ? ` · agendada ${dma(a.data_agendada)}` : '';
    const nota = t.nota
      ? `<div class="nota">Nota: <b>${a.nota !== null ? fmtNota(a.nota) : '--'}</b></div>`
      : `<div class="nota">${a.entregue ? 'Entregue ✓' : 'Não entregue'}</div>`;
    return `
      <div class="aval" data-aval="${a.id}">
        <div class="topo-linha"><b>${esc(t.nome)}${peso}</b>${chipPrazo(a)}</div>
        <small>${esc(t.desc)}</small>
        <small>${periodo}${agendada}</small>
        ${nota}
      </div>`;
  }).join('');

  renderCalculo(discId);
}

$('lista-avaliacoes').addEventListener('click', (e) => {
  const card = e.target.closest('[data-aval]');
  if (card) abrirAvaliacao(Number(card.dataset.aval), () => abrirDisciplina(estado.discAtual));
});

// Caixa de cálculo: média, nota necessária e próximas chances
function renderCalculo(discId) {
  const s = situacao(discId);
  const el = $('calc-nota');
  let cor = '', html = '';

  if (s.sit === 'em_curso') {
    if (s.a1 === null || s.a2 === null) {
      const falta = s.a1 === null && s.a2 === null ? 'as notas das APOLs' : `a nota da ${s.a1 === null ? 'APOL 1' : 'APOL 2'}`;
      html = `<span>Nota necessária na Prova Mista</span><strong>Lance ${falta}</strong>
              <small>Com as duas APOLs, o app calcula quanto você precisa tirar na prova.</small>`;
    } else {
      const nec = notaNecessaria(s.apols);
      if (nec > 100) {
        cor = 'erro';
        html = `<span>As APOLs somam ${fmtNota(s.apols)} pontos</span><strong>Não dá mais para passar no regular</strong>
                <small>Ainda haverá 2ª chamada, exame e recuperação.</small>`;
      } else {
        cor = 'aviso';
        html = `<span>As APOLs somam ${fmtNota(s.apols)} pontos. Na Prova Mista você precisa de</span>
                <strong>${fmtNota(Math.max(0, nec))}</strong>`;
      }
    }
  } else if (s.sit === 'aprovado') {
    cor = 'ok';
    html = `<span>Média final (${s.etapa})</span><strong>${fmtNota(s.media)} · Aprovado</strong>`;
  } else if (s.sit === 'reprovado') {
    cor = 'erro';
    const prox = proximaChance(s);
    const precisa = prox === '2ª chamada'
      ? `Na 2ª chamada você precisa de ${fmtNota(Math.min(100, Math.max(0, notaNecessaria(s.apols))))}. No exame ou na recuperação: 70.`
      : `${prox === 'Exame' ? 'No exame' : 'Na recuperação'} você precisa de 70.`;
    html = `<span>Média (${s.etapa})</span><strong>${fmtNota(s.media)} · Reprovado</strong>
            <small>APOL 1: ${s.a1 !== null ? fmtNota(s.a1) : '--'} · APOL 2: ${s.a2 !== null ? fmtNota(s.a2) : '--'}</small>
            <small>${precisa}</small>`;
  } else {
    cor = 'erro';
    html = `<span>Reprovado na recuperação</span><strong>Regime tutorial</strong>
            <small>Será preciso refazer a disciplina. Cadastre-a de novo na nova fase.</small>`;
  }

  el.className = `calc ${cor}`;
  el.innerHTML = html;

  // Botões para abrir as chances que ainda não existem (só se reprovado)
  const faltam = s.sit === 'reprovado'
    ? ['segunda_chamada', 'exame', 'recuperacao'].filter((t) => !avalDoTipo(discId, t))
    : [];
  $('chances').innerHTML = faltam.map((t) =>
    `<button type="button" class="btn" data-tipo="${t}">+ Adicionar ${esc(TIPOS[t].nome)}</button>`).join('');
}

$('chances').addEventListener('click', async (e) => {
  const botao = e.target.closest('[data-tipo]');
  if (!botao) return;
  const { error } = await sb.from('est_avaliacoes').insert({ disciplina_id: estado.discAtual, tipo: botao.dataset.tipo });
  if (error) return falha('adicionar a avaliação', error);
  await carregarTudo();
  renderAvaliacoes();
  aviso('Adicionada. Toque nela para informar as datas.');
});

$('btn-editar-disc').addEventListener('click', () => abrirFormDisc(estado.discAtual));


// ---------------------------------------------------------------------
// 11. TELA AULA (checklist)
// ---------------------------------------------------------------------
function abrirAula(aulaId) {
  const aula = aulaPorId(aulaId);
  if (!aula) return abrirDisciplina(estado.discAtual);
  estado.aulaAtual = aulaId;

  mostrar('aula', `Aula ${aula.numero}`, () => abrirDisciplina(aula.disciplina_id));
  $('aula-titulo').value = aula.titulo || '';
  $('item-titulo').value = '';
  $('item-erro').hidden = true;
  renderAula();
}

// Aula anterior (da mesma disciplina) que já tenha itens – usada para copiar
function aulaAnteriorComItens(aula) {
  return aulasDa(aula.disciplina_id)
    .filter((a) => a.numero < aula.numero && itensDa(a.id).length)
    .pop();
}

function renderAula() {
  const aula = aulaPorId(estado.aulaAtual);
  const itens = itensDa(aula.id);
  const pct = pctAula(aula.id);

  $('aula-pct').textContent = `${pct}%`;
  $('aula-barra').style.width = `${pct}%`;
  $('aula-barra').parentElement.classList.toggle('cheia', pct >= 100);
  $('aula-resumo').hidden = itens.length === 0;

  // Sem itens: mostra o estado vazio (com o botão de copiar, se houver de onde)
  const anterior = aulaAnteriorComItens(aula);
  $('aula-vazia').hidden = itens.length > 0;
  $('btn-copiar').hidden = !anterior;
  if (anterior) $('btn-copiar').textContent = `Copiar itens da Aula ${anterior.numero}`;

  // Itens agrupados, na ordem dos GRUPOS
  $('lista-itens').innerHTML = Object.entries(GRUPOS).map(([grupo, nome]) => {
    const doGrupo = itens.filter((i) => i.grupo === grupo);
    if (!doGrupo.length) return '';
    return `
      <div class="card grupo">
        <h3>${nome}</h3>
        ${doGrupo.map((i) => `
          <label class="ck" data-item="${i.id}">
            <input type="checkbox" ${i.concluido ? 'checked' : ''}>
            <span>${esc(i.titulo)}</span>
            <button type="button" class="editar" aria-label="Editar item">✎</button>
            <button type="button" class="apagar" aria-label="Apagar item">×</button>
          </label>`).join('')}
      </div>`;
  }).join('');
}

// Marcar/desmarcar item
$('lista-itens').addEventListener('change', async (e) => {
  const linha = e.target.closest('[data-item]');
  if (!linha) return;
  const item = estado.itens.find((i) => i.id === Number(linha.dataset.item));
  const novo = e.target.checked;

  const mudanca = { concluido: novo, concluido_em: novo ? new Date().toISOString() : null };
  const { error } = await sb.from('est_itens').update(mudanca).eq('id', item.id);
  if (error) { e.target.checked = !novo; return falha('atualizar o item', error); }

  Object.assign(item, mudanca);
  renderAula();
  if (pctAula(item.aula_id) === 100) aviso('Aula concluída 🎉');
});

// Botões ✎ (editar) e × (apagar) do item.
// preventDefault evita que o clique no botão marque a caixa do item.
$('lista-itens').addEventListener('click', async (e) => {
  const botao = e.target.closest('.apagar, .editar');
  if (!botao) return;
  e.preventDefault();
  const id = Number(botao.closest('[data-item]').dataset.item);
  const item = estado.itens.find((i) => i.id === id);

  // --- Editar o nome ---
  if (botao.classList.contains('editar')) {
    const titulo = await pedirTexto('Editar item', item.titulo);
    if (titulo === null || titulo === item.titulo) return;     // cancelou ou não mudou
    if (!titulo) return aviso('O nome não pode ficar vazio.');

    const { error } = await sb.from('est_itens').update({ titulo }).eq('id', id);
    if (error) return falha('editar o item', error);
    item.titulo = titulo;
    renderAula();
    return aviso('Item atualizado');
  }

  // --- Apagar ---
  if (!await confirmar(`Apagar o item "${item.titulo}"?`, { ok: 'Apagar', perigo: true })) return;

  const { error } = await sb.from('est_itens').delete().eq('id', id);
  if (error) return falha('apagar o item', error);
  estado.itens = estado.itens.filter((i) => i.id !== id);
  renderAula();
});

// Adicionar item (o grupo escolhido continua selecionado para o próximo)
$('form-item').addEventListener('submit', async (e) => {
  e.preventDefault();
  $('item-erro').hidden = true;

  const titulo = $('item-titulo').value.trim();
  if (!titulo) return mostrarErro('item-erro', 'Informe o nome do item.');

  const grupo = $('item-grupo').value;
  const doGrupo = itensDa(estado.aulaAtual).filter((i) => i.grupo === grupo);
  const ordem = doGrupo.reduce((m, i) => Math.max(m, i.ordem), 0) + 1;

  const { data, error } = await sb.from('est_itens')
    .insert({ aula_id: estado.aulaAtual, grupo, titulo, ordem })
    .select().single();
  if (error) return falha('adicionar o item', error);

  estado.itens.push(data);
  $('item-titulo').value = '';
  $('item-titulo').focus();
  renderAula();
});

// Copiar os itens da aula anterior (todos desmarcados)
$('btn-copiar').addEventListener('click', async () => {
  const aula = aulaPorId(estado.aulaAtual);
  const anterior = aulaAnteriorComItens(aula);
  if (!anterior) return;

  const copias = itensDa(anterior.id).map((i) => ({
    aula_id: aula.id, grupo: i.grupo, titulo: i.titulo, ordem: i.ordem,
  }));

  const { error } = await sb.from('est_itens').insert(copias);
  if (error) return falha('copiar os itens', error);

  await carregarTudo();
  renderAula();
  aviso(`${copias.length} itens copiados da Aula ${anterior.numero}`);
});

// Título da aula: salva ao sair do campo
$('aula-titulo').addEventListener('change', async () => {
  const aula = aulaPorId(estado.aulaAtual);
  const titulo = $('aula-titulo').value.trim() || null;

  const { error } = await sb.from('est_aulas').update({ titulo }).eq('id', aula.id);
  if (error) return falha('salvar o título', error);
  aula.titulo = titulo;
  aviso('Título salvo');
});

$('btn-excluir-aula').addEventListener('click', async () => {
  const aula = aulaPorId(estado.aulaAtual);
  const ok = await confirmar(`Excluir a Aula ${aula.numero} e todos os itens dela?`, { ok: 'Excluir', perigo: true });
  if (!ok) return;

  const { error } = await sb.from('est_aulas').delete().eq('id', aula.id);
  if (error) return falha('excluir a aula', error);

  await carregarTudo();
  aviso('Aula excluída');
  abrirDisciplina(aula.disciplina_id);
});


// ---------------------------------------------------------------------
// 12. TELA AVALIAÇÃO (datas, nota, entregue)
// ---------------------------------------------------------------------
let voltarDaAvaliacao = null;

function abrirAvaliacao(avalId, voltar) {
  const a = avalPorId(avalId);
  if (!a) return;
  const t = TIPOS[a.tipo];
  const d = discPorId(a.disciplina_id);
  estado.discAtual = a.disciplina_id;
  voltarDaAvaliacao = voltar;

  mostrar('avaliacao', t.nome, voltar);

  $('aval-id').value = a.id;
  $('aval-desc').textContent = `${d.nome} · ${t.desc}${t.peso ? ` · peso ${t.peso}` : ''}`;
  $('aval-inicio').value = a.data_inicio || '';
  $('aval-fim').value = a.data_fim || '';
  $('aval-agendada').value = a.data_agendada || '';
  $('aval-nota').value = a.nota !== null ? String(a.nota).replace('.', ',') : '';
  $('aval-entregue').checked = a.entregue;

  // Mostra só os campos que fazem sentido para o tipo
  $('aval-agendada-box').hidden = !t.agendada;
  $('aval-nota-box').hidden = !t.nota;
  $('aval-entregue-box').hidden = a.tipo !== 'trabalho';
  $('btn-excluir-aval').hidden = !t.extra;
  $('aval-erro').hidden = true;
}

$('form-aval').addEventListener('submit', async (e) => {
  e.preventDefault();
  $('aval-erro').hidden = true;

  const a = avalPorId(Number($('aval-id').value));
  const t = TIPOS[a.tipo];
  const inicio = $('aval-inicio').value || null;
  const fim = $('aval-fim').value || null;
  const nota = t.nota ? lerNota($('aval-nota').value) : null;

  if (inicio && fim && fim < inicio) return mostrarErro('aval-erro', 'A data de fechamento é antes da abertura.');
  if (Number.isNaN(nota) || (nota !== null && (nota < 0 || nota > 100)))
    return mostrarErro('aval-erro', 'A nota deve ser um número de 0 a 100.');

  const registro = {
    data_inicio: inicio,
    data_fim: fim,
    data_agendada: t.agendada ? ($('aval-agendada').value || null) : null,
    nota,
    entregue: a.tipo === 'trabalho' ? $('aval-entregue').checked : false,
  };

  const botao = e.submitter;
  botao.disabled = true;
  const { error } = await sb.from('est_avaliacoes').update(registro).eq('id', a.id);
  botao.disabled = false;
  if (error) return falha('salvar a avaliação', error);

  await carregarTudo();
  aviso('Salvo!');
  abrirDisciplinaNaAba('avaliacoes', a.disciplina_id);
});

// Remover 2ª chamada / Exame / Recuperação (criadas por engano)
$('btn-excluir-aval').addEventListener('click', async () => {
  const a = avalPorId(Number($('aval-id').value));
  const ok = await confirmar(`Remover "${TIPOS[a.tipo].nome}" desta disciplina?`, { ok: 'Remover', perigo: true });
  if (!ok) return;

  const { error } = await sb.from('est_avaliacoes').delete().eq('id', a.id);
  if (error) return falha('remover a avaliação', error);

  await carregarTudo();
  aviso('Removida');
  abrirDisciplinaNaAba('avaliacoes', a.disciplina_id);
});

$('btn-cancelar-aval').addEventListener('click', () => voltarDaAvaliacao?.());

function abrirDisciplinaNaAba(aba, discId) {
  estado.discAtual = discId;
  estado.aba = aba;
  abrirDisciplina(discId);
}


// ---------------------------------------------------------------------
// 12.1 AULAS AO VIVO
// Aba "Ao vivo" da disciplina + tela de cadastro/edição.
// A caixa marca "assistida"; tocar no texto abre a edição.
// ---------------------------------------------------------------------
function renderAoVivo() {
  const lista = aoVivoDa(estado.discAtual);
  $('lista-aovivo-vazia').hidden = lista.length > 0;

  $('lista-aovivo').innerHTML = lista.map((v) => {
    const quando = v.data ? `${dma(v.data)}${v.hora ? ' às ' + hm(v.hora) : ''}` : 'Data não informada';
    const desc = v.descricao ? ` · ${esc(v.descricao)}` : '';
    return `
      <div class="ck" data-aovivo="${v.id}">
        <input type="checkbox" ${v.assistida ? 'checked' : ''} aria-label="Assistida">
        <span class="aovivo-tx" data-abrir>
          <b>Aula ao vivo ${v.numero}${desc}</b>
          <small>${quando}</small>
        </span>
        <button type="button" class="editar" data-abrir aria-label="Editar aula ao vivo">✎</button>
      </div>`;
  }).join('');
}

// Marcar/desmarcar "assistida" direto na lista
$('lista-aovivo').addEventListener('change', async (e) => {
  const linha = e.target.closest('[data-aovivo]');
  if (!linha) return;
  const v = aoVivoPorId(Number(linha.dataset.aovivo));
  const novo = e.target.checked;

  const mudanca = { assistida: novo, assistida_em: novo ? new Date().toISOString() : null };
  const { error } = await sb.from('est_aulas_ao_vivo').update(mudanca).eq('id', v.id);
  if (error) { e.target.checked = !novo; return falha('atualizar a aula ao vivo', error); }

  Object.assign(v, mudanca);
  renderAoVivo();
  aviso(novo ? 'Marcada como assistida ✓' : 'Desmarcada');
});

// Tocar no texto ou no ✎ abre a edição
$('lista-aovivo').addEventListener('click', (e) => {
  if (!e.target.closest('[data-abrir]')) return;
  const linha = e.target.closest('[data-aovivo]');
  abrirAoVivo(Number(linha.dataset.aovivo), null, () => abrirDisciplinaNaAba('aovivo', estado.discAtual));
});

$('btn-novo-aovivo').addEventListener('click', () =>
  abrirAoVivo(null, estado.discAtual, () => abrirDisciplinaNaAba('aovivo', estado.discAtual)));

// Abre o formulário.
//   id     -> aula ao vivo existente (editar) ou null (nova)
//   discId -> disciplina (usado só na nova)
//   voltar -> função do botão Voltar / Cancelar
let voltarDoAoVivo = null;

function abrirAoVivo(id, discId, voltar) {
  const v = id ? aoVivoPorId(id) : null;
  discId = v ? v.disciplina_id : discId;
  const d = discPorId(discId);
  if (!d) return;
  estado.discAtual = discId;
  voltarDoAoVivo = voltar;

  // Nova: número = maior número + 1
  const lista = aoVivoDa(discId);
  const numero = v ? v.numero : (lista.length ? lista[lista.length - 1].numero + 1 : 1);

  mostrar('aovivo', `Aula ao vivo ${numero}`, voltar);
  $('aovivo-id').value = v ? v.id : '';
  $('aovivo-id').dataset.numero = numero;
  $('aovivo-desc-disc').textContent = d.nome;
  $('aovivo-descricao').value = v?.descricao || '';
  $('aovivo-data').value = v?.data || '';
  $('aovivo-hora').value = hm(v?.hora);
  $('aovivo-assistida').checked = v ? v.assistida : false;
  $('btn-excluir-aovivo').hidden = !v;
  $('aovivo-erro').hidden = true;
}

// Máscara da hora: digita só números -> "1900" vira "19:00"
$('aovivo-hora').addEventListener('input', (e) => {
  const dig = e.target.value.replace(/\D/g, '').slice(0, 4);
  e.target.value = dig.length > 2 ? `${dig.slice(0, 2)}:${dig.slice(2)}` : dig;
});

$('form-aovivo').addEventListener('submit', async (e) => {
  e.preventDefault();
  $('aovivo-erro').hidden = true;

  const id = Number($('aovivo-id').value) || null;
  const hora = $('aovivo-hora').value.trim();

  // Hora vazia é permitida; se preenchida, precisa ser HH:MM válida
  if (hora) {
    const [h, m] = hora.split(':').map(Number);
    if (!/^\d{2}:\d{2}$/.test(hora) || h > 23 || m > 59)
      return mostrarErro('aovivo-erro', 'Hora inválida. Use o formato 19:00.');
  }

  const assistida = $('aovivo-assistida').checked;
  const antes = id ? aoVivoPorId(id) : null;

  const registro = {
    descricao: $('aovivo-descricao').value.trim() || null,
    data: $('aovivo-data').value || null,
    hora: hora || null,
    assistida,
    // Só grava a data/hora de "assistida" quando muda de não para sim
    assistida_em: assistida ? (antes?.assistida_em || new Date().toISOString()) : null,
  };

  const botao = e.submitter;
  botao.disabled = true;
  const { error } = id
    ? await sb.from('est_aulas_ao_vivo').update(registro).eq('id', id)
    : await sb.from('est_aulas_ao_vivo').insert({
        ...registro, disciplina_id: estado.discAtual, numero: Number($('aovivo-id').dataset.numero),
      });
  botao.disabled = false;
  if (error) return falha('salvar a aula ao vivo', error);

  await carregarTudo();
  aviso('Salvo!');
  voltarDoAoVivo?.();
});

$('btn-excluir-aovivo').addEventListener('click', async () => {
  const v = aoVivoPorId(Number($('aovivo-id').value));
  const ok = await confirmar(`Excluir a Aula ao vivo ${v.numero}?`, { ok: 'Excluir', perigo: true });
  if (!ok) return;

  const { error } = await sb.from('est_aulas_ao_vivo').delete().eq('id', v.id);
  if (error) return falha('excluir a aula ao vivo', error);

  await carregarTudo();
  aviso('Excluída');
  voltarDoAoVivo?.();
});

$('btn-cancelar-aovivo').addEventListener('click', () => voltarDoAoVivo?.());


// ---------------------------------------------------------------------
// 13. FORMULÁRIO DE DISCIPLINA (nova e editar)
// ---------------------------------------------------------------------
function abrirFormDisc(discId) {
  const d = discId ? discPorId(discId) : null;
  $('disc-f-erro').hidden = true;

  if (d) {
    mostrar('form-disc', 'Editar disciplina', () => abrirDisciplina(d.id));
    $('disc-id').value = d.id;
    $('disc-f-nome').value = d.nome;
    $('disc-f-codigo').value = d.codigo || '';
    $('disc-f-modulo').value = d.modulo;
    $('disc-f-fase').value = d.fase;
    $('disc-f-ano').value = d.ano;
    $('disc-f-inicio').value = d.data_inicio || '';
    $('disc-f-fim').value = d.data_fim || '';
    $('disc-f-trabalho').checked = d.tem_trabalho;
    $('disc-f-aovivo').checked = d.tem_ao_vivo;
  } else {
    mostrar('form-disc', 'Nova disciplina', null, 'form-disc');
    // Sugere módulo, fase, ano e datas da disciplina mais recente
    // (as disciplinas da mesma fase têm o mesmo período)
    const ultima = [...estado.disciplinas].sort(porFaseDesc)[0];
    $('disc-id').value = '';
    $('disc-f-nome').value = '';
    $('disc-f-codigo').value = '';
    $('disc-f-aulas').value = 6;
    $('disc-f-modulo').value = ultima?.modulo || 'D';
    $('disc-f-fase').value = ultima?.fase || 'I';
    $('disc-f-ano').value = ultima?.ano || new Date().getFullYear();
    $('disc-f-inicio').value = ultima?.data_inicio || '';
    $('disc-f-fim').value = ultima?.data_fim || '';
    $('disc-f-trabalho').checked = false;
    $('disc-f-aovivo').checked = false;
  }

  // Nº de aulas só no cadastro (depois, usa "+ Adicionar aula")
  $('disc-f-aulas-box').hidden = !!d;
  $('disc-f-dica').hidden = !!d;
  $('btn-excluir-disc').hidden = !d;
}

$('form-disc').addEventListener('submit', async (e) => {
  e.preventDefault();
  $('disc-f-erro').hidden = true;

  const id = Number($('disc-id').value) || null;
  const nome = $('disc-f-nome').value.trim();
  const ano = Number($('disc-f-ano').value);
  const numAulas = Number($('disc-f-aulas').value);
  const inicio = $('disc-f-inicio').value || null;
  const fim = $('disc-f-fim').value || null;

  if (!nome) return mostrarErro('disc-f-erro', 'Informe o nome da disciplina.');
  if (!(ano >= 2020 && ano <= 2100)) return mostrarErro('disc-f-erro', 'Informe um ano válido.');
  if (!id && !(numAulas >= 6 && numAulas <= 50)) return mostrarErro('disc-f-erro', 'O número de aulas vai de 6 a 50.');
  if (inicio && fim && fim < inicio) return mostrarErro('disc-f-erro', 'A data de fim é antes do início.');

  const registro = {
    nome,
    codigo: $('disc-f-codigo').value.trim() || null,
    modulo: $('disc-f-modulo').value,
    fase: $('disc-f-fase').value,
    ano,
    data_inicio: inicio,
    data_fim: fim,
    tem_trabalho: $('disc-f-trabalho').checked,
    // Desmarcar só esconde a aba "Ao vivo"; as aulas ao vivo já cadastradas são mantidas
    tem_ao_vivo: $('disc-f-aovivo').checked,
  };

  const botao = e.submitter;
  botao.disabled = true;
  const discId = id ? await atualizarDisciplina(id, registro) : await criarDisciplina(registro, numAulas);
  botao.disabled = false;
  if (!discId) return;

  await carregarTudo();
  aviso('Salvo!');
  abrirDisciplinaNaAba('aulas', discId);
});

// Cria a disciplina + as aulas 1..N + APOL 1, APOL 2, Prova Mista (+ Trabalho)
async function criarDisciplina(registro, numAulas) {
  const { data, error } = await sb.from('est_disciplinas').insert(registro).select('id').single();
  if (error) { falha('salvar a disciplina', error); return null; }
  const discId = data.id;

  const aulas = Array.from({ length: numAulas }, (_, i) => ({ disciplina_id: discId, numero: i + 1 }));
  const tipos = ['apol1', 'apol2', 'prova', ...(registro.tem_trabalho ? ['trabalho'] : [])];
  const avals = tipos.map((tipo) => ({ disciplina_id: discId, tipo }));

  const [r1, r2] = await Promise.all([
    sb.from('est_aulas').insert(aulas),
    sb.from('est_avaliacoes').insert(avals),
  ]);
  if (r1.error || r2.error) falha('criar as aulas e avaliações', r1.error || r2.error);
  return discId;
}

// Atualiza a disciplina e cria/remove o Trabalho se a caixa mudou
async function atualizarDisciplina(id, registro) {
  const { error } = await sb.from('est_disciplinas').update(registro).eq('id', id);
  if (error) { falha('salvar a disciplina', error); return null; }

  const trabalho = avalDoTipo(id, 'trabalho');
  if (registro.tem_trabalho && !trabalho) {
    const r = await sb.from('est_avaliacoes').insert({ disciplina_id: id, tipo: 'trabalho' });
    if (r.error) falha('criar o trabalho', r.error);
  } else if (!registro.tem_trabalho && trabalho) {
    const r = await sb.from('est_avaliacoes').delete().eq('id', trabalho.id);
    if (r.error) falha('remover o trabalho', r.error);
  }
  return id;
}

$('btn-excluir-disc').addEventListener('click', async () => {
  const d = discPorId(Number($('disc-id').value));
  const ok = await confirmar(
    `Excluir "${d.nome}"? Isso apaga também as aulas, os itens e as avaliações dela.`,
    { ok: 'Excluir', perigo: true });
  if (!ok) return;

  const { error } = await sb.from('est_disciplinas').delete().eq('id', d.id);
  if (error) return falha('excluir a disciplina', error);

  estado.discAtual = null;
  await carregarTudo();
  aviso('Disciplina excluída');
  abrirInicio();
});

$('btn-cancelar-disc').addEventListener('click', () => {
  const id = Number($('disc-id').value);
  if (id) abrirDisciplina(id);
  else abrirInicio();
});


// ---------------------------------------------------------------------
// 14. INÍCIO DO APP
// ---------------------------------------------------------------------
async function iniciar() {
  const { data: { session } } = await sb.auth.getSession();
  if (session) entrar();
  else mostrarLogin();
}

iniciar();

// Service worker (arquivo sw.js vem numa próxima etapa; até lá, só ignora o erro)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
