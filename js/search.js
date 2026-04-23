// ==============================
// search.js — Navbar axtarış
// ==============================

import { news, releases, podcasts, artists } from './state.js';
import { setCurrentSection } from './state.js';
import { renderView } from './news.js';
import { escHtml } from './utils.js';

let searchTimeout = null;

export function initSearch() {
  const input   = document.getElementById('navSearchInput');
  const results = document.getElementById('navSearchResults');

  if (!input || !results) return;

  input.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    const q = input.value.trim();
    if (!q) { closeResults(); return; }
    searchTimeout = setTimeout(() => performSearch(q), 180);
  });

  input.addEventListener('focus', () => {
    const q = input.value.trim();
    if (q.length > 0) performSearch(q);
  });

  // Kənara klikdə bağla
  document.addEventListener('click', e => {
    if (!input.contains(e.target) && !results.contains(e.target)) {
      closeResults();
    }
  });

  // Escape ilə bağla
  input.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeResults(); input.blur(); }
  });
}

function closeResults() {
  const results = document.getElementById('navSearchResults');
  if (results) { results.classList.remove('open'); results.innerHTML = ''; }
}

function performSearch(q) {
  const results = document.getElementById('navSearchResults');
  if (!results) return;

  const lq = q.toLowerCase();

  // 1) Xəbərlər — başlıq + body axtarış
  const matchedNews = news.filter(n => {
    const title = (n.title || '').toLowerCase();
    const body  = (n.body  || '').toLowerCase();
    return title.includes(lq) || body.includes(lq);
  }).slice(0, 5);

  // 2) Sənətçilər
  const matchedArtists = artists.filter(a => {
    return (a.name || '').toLowerCase().includes(lq) ||
           (a.realName || '').toLowerCase().includes(lq) ||
           (a.genre || '').toLowerCase().includes(lq) ||
           (a.bio  || '').toLowerCase().includes(lq);
  }).slice(0, 3);

  // 3) Relizlər
  const matchedReleases = releases.filter(r => {
    return (r.title  || '').toLowerCase().includes(lq) ||
           (r.artist || '').toLowerCase().includes(lq) ||
           (r.type   || '').toLowerCase().includes(lq);
  }).slice(0, 3);

  // 4) Podcastlar
  const matchedPodcasts = podcasts.filter(p => {
    return (p.title    || '').toLowerCase().includes(lq) ||
           (p.category || '').toLowerCase().includes(lq) ||
           (p.desc     || '').toLowerCase().includes(lq);
  }).slice(0, 3);

  const total = matchedNews.length + matchedArtists.length + matchedReleases.length + matchedPodcasts.length;

  results.innerHTML = '';

  if (total === 0) {
    results.innerHTML = `<div class="search-no-results">Nəticə tapılmadı</div>`;
    results.classList.add('open');
    return;
  }

  // ── Xəbərlər bölməsi
  if (matchedNews.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'search-results-section';
    sec.innerHTML = `<div class="search-results-section-title">Xəbərlər</div>`;
    matchedNews.forEach(n => {
      const item = document.createElement('div');
      item.className = 'search-result-news';
      const excerpt = highlightText((n.body || ''), q, 120);
      item.innerHTML = `
        <div class="search-result-news-tag">XƏBƏR</div>
        <div class="search-result-news-title">${highlightText(escHtml(n.title || ''), q)}</div>
        ${excerpt ? `<div class="search-result-news-excerpt">${excerpt}</div>` : ''}
      `;
      item.addEventListener('click', () => {
        closeResults();
        document.getElementById('navSearchInput').value = '';
        // Xəbərlər bölməsinə keç
        setCurrentSection('news');
        renderView();
        // Xəbəri aç — kiçik gecikmə ilə ki render tamamlansın
        setTimeout(() => {
          const card = document.querySelector(`.news-card[data-id="${n.id}"]`);
          if (card) { card.scrollIntoView({ behavior: 'smooth', block: 'center' }); card.click(); }
        }, 200);
      });
      sec.appendChild(item);
    });
    results.appendChild(sec);
  }

  // ── Sənətçilər bölməsi
  if (matchedArtists.length > 0) {
    const sec = buildCardSection('Sənətçilər', matchedArtists, a => ({
      thumb: a.photo || null,
      emoji: '🎤',
      name: a.name || '',
      sub: a.realName || a.genre || '',
      badge: 'Sənətçi',
      onClick: () => {
        closeResults();
        document.getElementById('navSearchInput').value = '';
        setCurrentSection('azrap');
        renderView();
        setTimeout(() => {
          const card = document.querySelector(`.artist-card[data-id="${a.id}"]`);
          if (card) { card.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
        }, 200);
      }
    }));
    results.appendChild(sec);
  }

  // ── Relizlər bölməsi
  if (matchedReleases.length > 0) {
    const sec = buildCardSection('Relizlər', matchedReleases, r => ({
      thumb: r.thumb || null,
      emoji: '🎵',
      name: r.title || '',
      sub: r.artist || '',
      badge: r.type || 'Reliz',
      onClick: () => {
        closeResults();
        document.getElementById('navSearchInput').value = '';
        setCurrentSection('albums');
        renderView();
      }
    }));
    results.appendChild(sec);
  }

  // ── Podcastlar bölməsi
  if (matchedPodcasts.length > 0) {
    const sec = buildCardSection('Podcastlar', matchedPodcasts, p => ({
      thumb: p.thumb || null,
      emoji: '🎙',
      name: p.title || '',
      sub: p.category || '',
      badge: 'Podcast',
      onClick: () => {
        closeResults();
        document.getElementById('navSearchInput').value = '';
        setCurrentSection('interview');
        renderView();
      }
    }));
    results.appendChild(sec);
  }

  results.classList.add('open');
}

function buildCardSection(title, items, mapper) {
  const sec = document.createElement('div');
  sec.className = 'search-results-section';
  sec.innerHTML = `<div class="search-results-section-title">${escHtml(title)}</div>`;
  items.forEach(item => {
    const m = mapper(item);
    const el = document.createElement('div');
    el.className = 'search-result-card';
    const thumbHtml = m.thumb
      ? `<img class="search-result-card-thumb" src="${escHtml(m.thumb)}" alt="" />`
      : `<div class="search-result-card-thumb-placeholder">${m.emoji}</div>`;
    el.innerHTML = `
      ${thumbHtml}
      <div class="search-result-card-body">
        <div class="search-result-card-name">${escHtml(m.name)}</div>
        ${m.sub ? `<div class="search-result-card-sub">${escHtml(m.sub)}</div>` : ''}
      </div>
      <div class="search-result-card-badge">${escHtml(m.badge)}</div>
    `;
    el.addEventListener('click', m.onClick);
    sec.appendChild(el);
  });
  return sec;
}

// Axtarış sözünü mətndə vurğula (highlight)
function highlightText(text, q, maxLen = null) {
  if (!text) return '';
  let display = escHtml(text);
  if (maxLen && text.length > maxLen) {
    // q-nun yerini tap, ətrafını göstər
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx > 0) {
      const start = Math.max(0, idx - 40);
      display = (start > 0 ? '…' : '') + escHtml(text.substring(start, start + maxLen)) + '…';
    } else {
      display = escHtml(text.substring(0, maxLen)) + '…';
    }
  }
  // Highlight
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return display.replace(new RegExp(escaped, 'gi'), match => `<mark style="background:#FF3C00;color:#fff;padding:0 1px;">${match}</mark>`);
}
