// =====================================================================
// Meus Estudos – service worker
// Estratégia "rede primeiro": sempre tenta buscar a versão mais nova no
// servidor; só usa a cópia guardada (cache) quando está sem internet.
// Assim, cada git push aparece no app sem precisar limpar nada.
//
// Ao mudar a lista de arquivos ou a estratégia, aumente a VERSAO:
// o cache antigo é apagado na ativação.
// =====================================================================

const VERSAO = 'v1';
const CACHE = `meus-estudos-${VERSAO}`;

// Arquivos do "esqueleto" do app, guardados já na instalação
const ARQUIVOS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './config.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/favicon.svg',
  './icons/favicon-32.png',
  './icons/apple-touch-icon.png',
];

// 1) Instalação: guarda o esqueleto (cache: 'no-cache' = confere com o servidor)
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(ARQUIVOS.map((url) => new Request(url, { cache: 'no-cache' }))))
      .then(() => self.skipWaiting())          // ativa a versão nova sem esperar
  );
});

// 2) Ativação: apaga caches de versões antigas
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())        // passa a controlar as abas já abertas
  );
});

// 3) Requisições: só cuida dos arquivos do próprio site (GET).
//    Supabase e a biblioteca do CDN passam direto, sem cache.
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  e.respondWith(
    fetch(req, { cache: 'no-cache' })
      .then((resp) => {
        // Guarda a cópia mais recente para usar quando estiver offline
        if (resp.ok) {
          const copia = resp.clone();
          caches.open(CACHE).then((c) => c.put(req, copia));
        }
        return resp;
      })
      .catch(() => caches.match(req).then((r) => r || caches.match('./index.html')))
  );
});
