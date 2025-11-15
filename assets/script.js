// util + news fetching using rss2json
const RSS2JSON = "https://api.rss2json.com/v1/api.json?rss_url=";

// principais pares (strings para pesquisar)
const MAIN_KEYWORDS = [
  "EURUSD", "GBPUSD", "USDJPY", "USDCAD", "AUDUSD", "NZDUSD", "USDCHF", "XAUUSD", "BTCUSD"
];

function qForPairs(){
  // cria query para Google News search (spaces -> +)
  // Ex.: EURUSD OR GBPUSD OR USDJPY ...
  return encodeURIComponent(MAIN_KEYWORDS.join(" OR "));
}

async function fetchNewsFor(q, lang='en'){
  // usa Google News search RSS endpoint
  const rss = `https://news.google.com/rss/search?q=${q}&hl=${lang}&gl=US&ceid=US:en`;
  const url = RSS2JSON + encodeURIComponent(rss);
  const res = await fetch(url);
  if(!res.ok) throw new Error("Erro ao buscar RSS");
  const json = await res.json();
  return json;
}

function el(id){ return document.getElementById(id); }

function timeAgo(dt){
  try {
    const d = new Date(dt);
    return d.toLocaleString();
  } catch(e){ return dt; }
}

// render helpers
function renderNewsList(container, data){
  container.innerHTML = '';
  if(!data || !data.items || data.items.length === 0){
    container.innerHTML = `<div class="card small">Nenhuma notícia encontrada.</div>`;
    return;
  }
  data.items.forEach(i => {
    const div = document.createElement('div');
    div.className = 'item';
    const img = document.createElement('img');
    img.className = 'thumb';
    img.src = i.enclosure && i.enclosure.link ? i.enclosure.link : (i.thumbnail || 'https://via.placeholder.com/140x90?text=no+image');
    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.innerHTML = `<div class="title"><a href="${i.link}" target="_blank">${i.title}</a></div>
      <div class="excerpt">${i.description ? i.description.slice(0,180) : ''}</div>
      <div class="source small">${i.source && i.source.name ? i.source.name : ''} • ${timeAgo(i.pubDate)}</div>`;
    div.appendChild(img);
    div.appendChild(meta);
    container.appendChild(div);
  });
}

// quick fetch for home page
async function loadHomeNews(){
  const container = el('newsList');
  el('lastUpdate').textContent = 'Carregando...';
  try{
    const q = qForPairs();
    const data = await fetchNewsFor(q, 'en');
    renderNewsList(container, data);
    el('lastUpdate').textContent = new Date().toLocaleTimeString();
  }catch(e){
    container.innerHTML = `<div class="card small">Erro ao carregar notícias: ${e.message}</div>`;
    el('lastUpdate').textContent = '-';
    console.error(e);
  }
}

// calendar page fetch
async function loadCalendarNews(){
  const c = el('calList');
  el('calUpdate').textContent = 'Carregando...';
  try{
    // keywords for economic calendar + events
    const q = encodeURIComponent("economic calendar OR FOMC OR CPI OR NFP OR interest rate OR central bank");
    const data = await fetchNewsFor(q, 'en');
    renderNewsList(c, data);
    el('calUpdate').textContent = new Date().toLocaleTimeString();
  }catch(e){
    c.innerHTML = `<div class="card small">Erro: ${e.message}</div>`;
    el('calUpdate').textContent = '-';
  }
}

// alerts page: user sets keywords, we poll and show matches (localStorage)
async function searchAndNotify(keywords){
  const q = encodeURIComponent(keywords.join(" OR "));
  const data = await fetchNewsFor(q, 'en');
  return data.items || [];
}

// performance page: we create simple aggregates by currency/pair from local news results (mock)
async function loadPerformance(){
  const elchart = el('perfList');
  elchart.innerHTML = '<div class="card small">Carregando...</div>';
  try{
    const q = qForPairs();
    const data = await fetchNewsFor(q, 'en');
    // simple aggregation: count mentions per pair
    const counts = {};
    (data.items || []).forEach(it => {
      MAIN_KEYWORDS.forEach(p => {
        const re = new RegExp(`\\b${p}\\b`, 'i');
        if(re.test(it.title + ' ' + (it.description||''))){
          counts[p] = (counts[p]||0) + 1;
        }
      });
    });
    let html = '<div class="card"><h3>Menções recentes por par</h3><div style="margin-top:8px">';
    MAIN_KEYWORDS.forEach(p => {
      html += `<div class="pair" style="margin-bottom:6px"><div>${p}</div><div class="pill">${counts[p]||0}</div></div>`;
    });
    html += '</div></div>';
    elchart.innerHTML = html;
  }catch(e){ elchart.innerHTML = `<div class="card small">Erro: ${e.message}</div>`; }
}

// initialization depending on page
document.addEventListener('DOMContentLoaded', ()=>{
  if(el('newsList')){ loadHomeNews(); setInterval(loadHomeNews, 120000); }
  if(el('calList')){ loadCalendarNews(); setInterval(loadCalendarNews, 180000); }
  if(el('perfList')){ loadPerformance(); setInterval(loadPerformance, 180000); }
});
