'use strict';
// Progressive enhancement: native, scoped external form works without an engine/JS.
(() => {
  const panel = document.querySelector('.google-search');
  if (!panel) return;
  const engine = panel.dataset.engineId;
  const form = panel.querySelector('form');
  const input = form.elements.q;
  const filetype = form.elements.as_filetype;
  const status = panel.querySelector('[data-content-status]');
  const fallback = panel.querySelector('[data-content-fallback]');
  const results = panel.querySelector('[data-content-results]');
  const cap = () => { input.value = input.value.slice(0, 300); };
  input.addEventListener('input', cap);
  // Also constrain programmatic values in the unconfigured native form.
  form.addEventListener('submit', cap);
  if (!engine || !/^[A-Za-z0-9:_-]{1,100}$/.test(engine)) return;

  panel.querySelector('[data-search-note]').textContent = 'Os resultados aparecem nesta página. Ao buscar, você envia os termos a um serviço externo, que pode usar cookies. Nem todo o acervo pode estar indexado.';
  let loading, activeName, request = 0, timer;
  const elements = new Map();
  const finish = message => {
    clearTimeout(timer);
    results.setAttribute('aria-busy', 'false');
    status.textContent = message;
  };
  const unavailable = () => finish('Não foi possível exibir os resultados. Tente novamente ou abra a busca em outra aba.');
  const load = () => {
    if (loading) return loading;
    loading = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      let settled = false;
      const fail = () => {
        if (settled) return;
        settled = true;
        clearTimeout(loadTimer);
        script.remove();
        reject(new Error('Search provider unavailable'));
      };
      const loadTimer = setTimeout(fail, 12000);
      window.__gcse = {
        parsetags: 'explicit',
        initializationCallback: () => {
          if (settled) return;
          settled = true;
          clearTimeout(loadTimer);
          if (window.google?.search?.cse?.element) resolve(window.google.search.cse.element);
          else reject(new Error('Search API unavailable'));
        },
        searchCallbacks: {web: {
          // Official ready callback avoids the provider's eval-based result templates.
          // Keep provider branding, navigation and advertising configuration intact.
          ready: (name, query, promos, matches, div) => {
            div.replaceChildren();
            for (const item of [...(promos || []), ...(matches || [])]) {
              let url;
              try { url = new URL(item.url); } catch { continue; }
              if (!['https:', 'http:'].includes(url.protocol)) continue;
              const article = document.createElement('article');
              article.className = 'content-search-result';
              const link = document.createElement('a');
              link.href = url.href;
              link.target = '_self';
              link.rel = 'noopener noreferrer';
              link.className = 'gs-title';
              link.textContent = item.titleNoFormatting || item.visibleUrl || url.hostname;
              const snippet = document.createElement('p');
              snippet.textContent = item.contentNoFormatting || '';
              article.append(link, snippet);
              div.append(article);
            }
            if (!div.children.length) {
              const empty = document.createElement('p');
              empty.textContent = 'Nenhum resultado encontrado para esta busca.';
              div.append(empty);
            }
            return true;
          }, rendered: name => {
          if (name === activeName) finish('Busca concluída. Consulte os resultados abaixo.');
        }}}
      };
      script.async = true;
      script.src = 'https://cse.google.com/cse.js?cx=' + encodeURIComponent(engine);
      script.onerror = fail;
      document.head.append(script);
    }).catch(error => { loading = undefined; throw error; });
    return loading;
  };

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const query = input.value.trim();
    if (!query) { input.focus(); return; }
    const type = filetype.value === 'pdf' ? 'pdf' : '';
    const current = ++request;
    activeName = null;
    clearTimeout(timer);
    const external = new URL('https://www.google.com/search');
    external.search = new URLSearchParams({q: query, as_sitesearch: 'pentagrama.org.br', as_filetype: type});
    fallback.href = external.href;
    fallback.hidden = false;
    results.hidden = false;
    for (const child of results.children) child.hidden = true;
    results.setAttribute('aria-busy', 'true');
    status.textContent = 'Carregando resultados…';
    try {
      const api = await load();
      if (current !== request) return;
      const name = 'content-' + (type || 'all');
      if (!elements.has(name)) {
        const container = document.createElement('div');
        results.append(container);
        api.render({div: container, tag: 'searchresults-only', gname: name, attributes: {
          autoSearchOnLoad: false, enableHistory: false, overlayResults: false, as_sitesearch: 'pentagrama.org.br',
          as_filetype: type, linkTarget: '_self', enableImageSearch: false,
          ivt: true
        }});
        elements.set(name, container);
      }
      const element = api.getElement(name);
      if (!element) throw new Error('Search element unavailable');
      elements.get(name).hidden = false;
      activeName = name;
      // Includes zero results, script blockers and provider/network timeouts.
      timer = setTimeout(unavailable, 15000);
      element.execute(query);
    } catch {
      if (current === request) unavailable();
    }
  });
})();
