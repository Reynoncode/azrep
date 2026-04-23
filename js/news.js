// ==============================
// news.js — Xəbər grid, expanded row, slider, publish
// ==============================

import { db, collection, getDocs, addDoc, orderBy, query, serverTimestamp } from './firebase.js';
import { news, releases, podcasts, setNews, setReleases, setPodcasts, pushRelease, pushPodcast, currentImages, currentVideoFile, activeMediaType, currentSection } from './state.js';
import { escHtml, compressImage, fileToBase64 } from './utils.js';
import { closeNewsModal, taggedArtistsByForm } from './ui.js';
import { loadComments } from './comments.js';
import { renderArtistsSection } from './artists.js';
import { renderGundemSection } from './gundem.js';

// ============================================================
// LOAD & RENDER
// ============================================================
export async function loadNews() {
  showGridLoading(true);
  try {
    const [newsSnap, relSnap, podSnap] = await Promise.all([
      getDocs(query(collection(db, 'news'),     orderBy('createdAt', 'desc'))),
      getDocs(query(collection(db, 'releases'), orderBy('createdAt', 'desc'))),
      getDocs(query(collection(db, 'podcasts'), orderBy('createdAt', 'desc'))),
    ]);
    setNews(newsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    setReleases(relSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    setPodcasts(podSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  } catch (err) {
    console.error('Yüklənərkən xəta:', err);
    showGridError(err.message);
    return;
  } finally {
    showGridLoading(false);
  }
  renderView();
}

export function renderView() {
  const featureSection  = document.querySelector('.feature-section');
  const newsGridSection = document.querySelector('.news-grid-section');
  const sectionTag      = newsGridSection?.querySelector('.section-tag');
  const grid            = document.getElementById('newsGrid');

  // Default grid sütununu sıfırla
  if (grid) grid.style.gridTemplateColumns = '';

  if (currentSection === 'news') {
    if (featureSection) featureSection.style.display = 'none';
    if (sectionTag) sectionTag.textContent = 'BÜTÜN XƏBƏRLƏR';
    renderNewsGrid(news);
  } else if (currentSection === 'albums') {
    if (featureSection) featureSection.style.display = 'none';
    if (sectionTag) sectionTag.textContent = 'RELİZLƏR';
    renderReleasesGrid(releases);
  } else if (currentSection === 'interview') {
    if (featureSection) featureSection.style.display = 'none';
    if (sectionTag) sectionTag.textContent = 'PODCASTLAR';
    renderPodcastsGrid(podcasts);
  } else if (currentSection === 'azrap') {
    if (featureSection) featureSection.style.display = 'none';
    if (newsGridSection) newsGridSection.style.paddingTop = '0';
    if (sectionTag) sectionTag.textContent = '';
    if (grid) {
      grid.style.gridTemplateColumns = '1fr';
      renderArtistsSection(grid);
    }
  } else if (currentSection === 'world') {
    if (featureSection) featureSection.style.display = 'none';
    if (newsGridSection) newsGridSection.style.paddingTop = '0';
    if (sectionTag) sectionTag.textContent = '';
    if (grid) {
      grid.style.gridTemplateColumns = '1fr';
      renderGundemSection(grid);
    }
  } else {
    if (featureSection) featureSection.style.display = '';
    if (newsGridSection) newsGridSection.style.paddingTop = '';
    if (sectionTag) sectionTag.textContent = 'SON XƏBƏRLƏR';
    renderNewsGrid(news.slice(0, 4));
  }
}

function showGridLoading(on) {
  const grid = document.getElementById('newsGrid');
  if (!grid) return;
  if (on) grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:48px;font-family:'IBM Plex Mono',monospace;font-size:11px;color:#AAA;letter-spacing:2px;">YÜKLƏNİR…</div>`;
}

function showGridError(msg) {
  const grid = document.getElementById('newsGrid');
  if (!grid) return;
  grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:48px;font-family:'IBM Plex Mono',monospace;font-size:11px;color:#FF3C00;letter-spacing:2px;">XƏTA: ${escHtml(msg)}<br><br>Firebase config-i yoxlayın.</div>`;
}

// ============================================================
// RELEASES GRID
// ============================================================
export function renderReleasesGrid(items) {
  const grid = document.getElementById('newsGrid');
  if (!grid) return;
  grid.querySelectorAll('.news-expanded-row').forEach(r => r.remove());
  if (!items || items.length === 0) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:48px;font-family:'IBM Plex Mono',monospace;font-size:11px;color:#AAA;letter-spacing:2px;">HƏLƏ RELİZ ƏLAVƏ EDİLMƏYİB</div>`;
    return;
  }
  // Release grid 5 sütun
  grid.style.gridTemplateColumns = window.innerWidth <= 768 ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)';
  grid.innerHTML = items.map(item => buildReleaseCard(item)).join('');
  grid.querySelectorAll('.release-card').forEach(card => {
    card.addEventListener('click', () => {
      const id   = card.dataset.id;
      const item = items.find(r => r.id === id);
      if (item) toggleExpandedRelease(card, item, grid);
    });
  });
}

function buildReleaseCard(item) {
  const thumb = item.thumbnail
    ? `<img src="${item.thumbnail}" alt="${escHtml(item.title)}" />`
    : `<div class="rc-thumb-placeholder"><span>♪</span></div>`;

  const typeLabel = item.releaseType ? `<span class="rc-type-badge">${escHtml(item.releaseType)}</span>` : '';

  return `
    <article class="release-card" data-id="${item.id}">
      <div class="rc-thumb">
        ${thumb}
        ${typeLabel}
        <div class="rc-play-overlay"><span class="rc-play-btn">▶</span></div>
      </div>
      <div class="rc-info">
        <div class="rc-title">${escHtml(item.title)}</div>
        <div class="rc-artist">${escHtml(item.artist || '')}</div>
      </div>
    </article>
  `;
}

function toggleExpandedRelease(card, item, grid) {
  const existingRow = grid.querySelector('.news-expanded-row.open');
  if (existingRow && existingRow.dataset.forId === item.id) {
    closeExpandedRow(existingRow, card); return;
  }
  if (existingRow) {
    const prevCard = grid.querySelector(`.release-card[data-id="${existingRow.dataset.forId}"]`);
    closeExpandedRow(existingRow, prevCard);
  }
  card.classList.add('is-open');
  const row   = buildExpandedRelease(item);
  const cols  = 5;
  const cards = Array.from(grid.querySelectorAll('.release-card'));
  const idx   = cards.indexOf(card);
  const rowLastIdx = Math.min(Math.floor(idx / cols) * cols + cols - 1, cards.length - 1);
  cards[rowLastIdx].insertAdjacentElement('afterend', row);
  requestAnimationFrame(() => requestAnimationFrame(() => row.classList.add('open')));
  setTimeout(() => row.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 80);
  row.querySelector('.exp-close-row-btn').addEventListener('click', e => {
    e.stopPropagation(); closeExpandedRow(row, card);
  });
  const escHandler = e => {
    if (e.key === 'Escape') { closeExpandedRow(row, card); document.removeEventListener('keydown', escHandler); }
  };
  document.addEventListener('keydown', escHandler);
  loadComments(item.id, row);
}

function buildExpandedRelease(item) {
  const thumb = item.thumbnail
    ? `<img src="${item.thumbnail}" alt="${escHtml(item.title)}" class="exp-rel-thumb" />`
    : `<div class="exp-rel-thumb exp-rel-nothumb"><span>♪</span></div>`;

  const tagsHTML = (item.tags || []).map(t => `<span class="exp-tag">${escHtml(t)}</span>`).join('');
  const typeLabel = item.releaseType ? `<span class="exp-rel-type">${escHtml(item.releaseType)}</span>` : '';

  // Platform linklərini topla — birdən çox ola bilər (vergüllə ayrılmış)
  const links = (item.link || '').split(',').map(s => s.trim()).filter(Boolean);
  const platformDefs = [
    { key: 'spotify',    icon: '🟢', name: 'Spotify' },
    { key: 'youtube',    icon: '▶',  name: 'YouTube' },
    { key: 'soundcloud', icon: '☁',  name: 'SoundCloud' },
    { key: 'apple',      icon: '🎵', name: 'Apple Music' },
    { key: 'deezer',     icon: '🎵', name: 'Deezer' },
    { key: 'tidal',      icon: '🎵', name: 'Tidal' },
  ];
  const linkBtns = links.length > 0
    ? links.map(url => {
        const l = url.toLowerCase();
        const p = platformDefs.find(d => l.includes(d.key));
        const name = p ? p.name : 'DİNLƏ';
        const icon = p ? p.icon : '🔗';
        return `<a class="exp-platform-btn" href="${escHtml(url)}" target="_blank" rel="noopener">${icon} ${name}</a>`;
      }).join('')
    : '';

  const descHTML = item.description
    ? `<div class="exp-rel-desc">${escHtml(item.description)}</div>`
    : '';

  const row = document.createElement('div');
  row.className     = 'news-expanded-row';
  row.dataset.forId = item.id;
  row.innerHTML = `
    <div class="exp-row-inner exp-rel-inner">
      <button class="exp-close-row-btn">✕</button>
      <div class="exp-rel-layout">

        <!-- SOL: thumb + hashtag + meta + linklər -->
        <div class="exp-rel-left">
          <div class="exp-rel-thumb-wrap">
            ${thumb}
            <div class="exp-rel-thumb-tags">${tagsHTML}</div>
          </div>
          <div class="exp-rel-meta">
            ${typeLabel}
            <h2 class="exp-rel-title">${escHtml(item.title)}</h2>
            <div class="exp-rel-artist">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
              ${escHtml(item.artist || '')}
            </div>
            <div class="exp-rel-date">${escHtml(item.date || '')}</div>
            ${linkBtns ? `<div class="exp-rel-actions">${linkBtns}</div>` : ''}
          </div>
        </div>

        <!-- SAĞ: açıqlama -->
        <div class="exp-rel-right">
          ${descHTML}
        </div>

      </div>
      <div class="exp-comments" id="expComments_${item.id}">
        <div class="comments-loading-state">YÜKLƏNİR…</div>
      </div>
    </div>
  `;
  return row;
}

// ============================================================
// PODCASTS GRID
// ============================================================
export function renderPodcastsGrid(items) {
  const grid = document.getElementById('newsGrid');
  if (!grid) return;
  grid.querySelectorAll('.news-expanded-row').forEach(r => r.remove());
  if (!items || items.length === 0) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:48px;font-family:'IBM Plex Mono',monospace;font-size:11px;color:#AAA;letter-spacing:2px;">HƏLƏ PODCAST ƏLAVƏ EDİLMƏYİB</div>`;
    return;
  }
  grid.innerHTML = items.map(item => buildPodcastCard(item)).join('');
  grid.querySelectorAll('.news-card').forEach(card => {
    card.addEventListener('click', e => {
      if (e.target.closest('.news-card-link-btn')) return;
      const id   = card.dataset.id;
      const item = items.find(n => n.id === id);
      if (item) toggleExpandedPodcast(card, item, grid);
    });
  });
  grid.querySelectorAll('.news-card-link-btn[data-href]').forEach(btn => {
    btn.addEventListener('click', e => { e.stopPropagation(); window.open(btn.dataset.href, '_blank'); });
  });
}

function buildPodcastCard(item) {
  const thumb = item.thumbnail
    ? `<img src="${item.thumbnail}" alt="${escHtml(item.title)}" />`
    : `<div class="news-card-top-placeholder">🎙</div>`;

  const tagsHTML = (item.tags || []).slice(0, 3).map(t => `<span class="news-card-tag">${escHtml(t)}</span>`).join('');
  const linkBtn  = item.link
    ? `<a class="news-card-link-btn" data-href="${escHtml(item.link)}" href="${escHtml(item.link)}" target="_blank" rel="noopener">İZLƏ →</a>`
    : '';
  const excerpt = (item.description || '').length > 100 ? item.description.slice(0, 100) + '…' : (item.description || '');

  return `
    <article class="news-card" data-id="${item.id}">
      <div class="news-card-top">
        ${thumb}
        <div class="release-badge podcast-badge">${escHtml(item.category || 'PODCAST')}</div>
        <div class="news-card-title-overlay"><h3>${escHtml(item.title)}</h3></div>
      </div>
      <div class="news-card-bottom">
        <p class="news-card-excerpt">${escHtml(excerpt)}</p>
        <div class="news-card-footer">
          <div style="display:flex;flex-direction:column;gap:4px;">
            <span class="news-card-meta">${escHtml(item.date || '')}</span>
            <div class="news-card-tags">${tagsHTML}</div>
          </div>
          ${linkBtn}
        </div>
      </div>
    </article>
  `;
}

function toggleExpandedPodcast(card, item, grid) {
  const existingRow = grid.querySelector('.news-expanded-row.open');
  if (existingRow && existingRow.dataset.forId === item.id) {
    closeExpandedRow(existingRow, card); return;
  }
  if (existingRow) {
    const prevCard = grid.querySelector(`.news-card[data-id="${existingRow.dataset.forId}"]`);
    closeExpandedRow(existingRow, prevCard);
  }
  card.classList.add('is-open');
  const row  = buildExpandedPodcast(item);
  const cols  = getGridColumns(grid);
  const cards = Array.from(grid.querySelectorAll('.news-card'));
  const idx   = cards.indexOf(card);
  const rowLastIdx = Math.min(Math.floor(idx / cols) * cols + cols - 1, cards.length - 1);
  cards[rowLastIdx].insertAdjacentElement('afterend', row);
  requestAnimationFrame(() => requestAnimationFrame(() => row.classList.add('open')));
  setTimeout(() => row.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 80);
  row.querySelector('.exp-close-row-btn').addEventListener('click', e => {
    e.stopPropagation(); closeExpandedRow(row, card);
  });
}

function buildExpandedPodcast(item) {
  const thumb = item.thumbnail ? `<div class="exp-media-single"><img src="${item.thumbnail}" alt="${escHtml(item.title)}" /></div>` : '';
  const tagsHTML = (item.tags || []).map(t => `<span class="exp-tag">${escHtml(t)}</span>`).join('');
  const linkBtn  = item.link
    ? `<a class="exp-link-btn" href="${escHtml(item.link)}" target="_blank" rel="noopener">İZLƏ / DİNLƏ →</a>`
    : '';
  const row = document.createElement('div');
  row.className     = 'news-expanded-row';
  row.dataset.forId = item.id;
  row.innerHTML = `
    <div class="exp-row-inner">
      <button class="exp-close-row-btn">✕</button>
      ${thumb}
      <div class="exp-content">
        <div class="exp-meta">${escHtml(item.category ? item.category.toUpperCase() : 'PODCAST')} · ${escHtml(item.date || '')}</div>
        <h2 class="exp-title">${escHtml(item.title)}</h2>
        <p class="exp-body">${escHtml(item.description || '')}</p>
        <div class="exp-footer"><div class="exp-tags">${tagsHTML}</div>${linkBtn}</div>
      </div>
      <div class="exp-comments" id="expComments_${item.id}">
        <div class="comments-loading-state">YÜKLƏNİR…</div>
      </div>
    </div>
  `;
  loadComments(item.id, row);
  return row;
}

// ============================================================
// NEWS GRID
// ============================================================
export function renderNewsGrid(items) {
  const grid = document.getElementById('newsGrid');
  if (!grid) return;
  grid.querySelectorAll('.news-expanded-row').forEach(r => r.remove());
  if (!items || items.length === 0) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:48px;font-family:'IBM Plex Mono',monospace;font-size:11px;color:#AAA;letter-spacing:2px;">HƏLƏ XƏBƏRLƏRİ ƏLAVƏ EDİLMƏYİB</div>`;
    return;
  }
  grid.innerHTML = items.map(item => buildNewsCard(item)).join('');
  grid.querySelectorAll('.news-card').forEach(card => {
    card.addEventListener('click', e => {
      if (e.target.closest('.news-card-link-btn')) return;
      const id   = card.dataset.id;
      const item = news.find(n => n.id === id);
      if (item) toggleExpandedRow(card, item, grid);
    });
  });
  grid.querySelectorAll('.news-card-link-btn[data-href]').forEach(btn => {
    btn.addEventListener('click', e => { e.stopPropagation(); window.open(btn.dataset.href, '_blank'); });
  });
}

function buildNewsCard(item) {
  let topMedia;
  if (item.mediaType === 'image' && item.media)
    topMedia = `<img src="${item.media}" alt="${escHtml(item.title)}" />`;
  else if (item.mediaType === 'video' && item.media)
    topMedia = `<video src="${item.media}" muted autoplay loop playsinline></video>`;
  else
    topMedia = `<div class="news-card-top-placeholder">NO MEDIA</div>`;

  const hasMultiple = item.images && item.images.length > 1;
  const tagsHTML    = (item.tags || []).slice(0, 3).map(t => `<span class="news-card-tag">${escHtml(t)}</span>`).join('');
  const linkBtn     = item.link
    ? `<a class="news-card-link-btn" data-href="${escHtml(item.link)}" href="${escHtml(item.link)}" target="_blank" rel="noopener">${escHtml(item.btnLabel)}</a>`
    : '';
  const excerpt = (item.body || '').length > 100 ? item.body.slice(0, 100) + '…' : (item.body || '');

  return `
    <article class="news-card" data-id="${item.id}">
      <div class="news-card-top">
        ${topMedia}
        ${hasMultiple ? `<div class="news-card-multi-badge">&#9654; ${item.images.length}</div>` : ''}
        <div class="news-card-title-overlay"><h3>${escHtml(item.title)}</h3></div>
      </div>
      <div class="news-card-bottom">
        <p class="news-card-excerpt">${escHtml(excerpt)}</p>
        <div class="news-card-footer">
          <div style="display:flex;flex-direction:column;gap:4px;">
            <span class="news-card-meta">${escHtml(item.date || '')}</span>
            <div class="news-card-tags">${tagsHTML}</div>
          </div>
          ${linkBtn}
        </div>
      </div>
    </article>
  `;
}

// ============================================================
// EXPANDED ROW
// ============================================================
function getGridColumns(grid) {
  const cols = window.getComputedStyle(grid).gridTemplateColumns.split(' ').filter(s => s.trim() !== '').length;
  return cols || 4;
}

function closeExpandedRow(row, card) {
  row.classList.remove('open');
  if (card) card.classList.remove('is-open');
  setTimeout(() => { if (row.parentNode) row.remove(); }, 460);
}

function toggleExpandedRow(card, item, grid) {
  const existingRow = grid.querySelector('.news-expanded-row.open');
  if (existingRow && existingRow.dataset.forId === item.id) {
    closeExpandedRow(existingRow, card); return;
  }
  if (existingRow) {
    const prevCard = grid.querySelector(`.news-card[data-id="${existingRow.dataset.forId}"]`);
    closeExpandedRow(existingRow, prevCard);
  }
  card.classList.add('is-open');
  const row  = buildExpandedRow(item);
  const cols  = getGridColumns(grid);
  const cards = Array.from(grid.querySelectorAll('.news-card'));
  const idx   = cards.indexOf(card);
  const rowLastIdx = Math.min(Math.floor(idx / cols) * cols + cols - 1, cards.length - 1);
  cards[rowLastIdx].insertAdjacentElement('afterend', row);
  requestAnimationFrame(() => requestAnimationFrame(() => row.classList.add('open')));
  setTimeout(() => row.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 80);
  row.querySelector('.exp-close-row-btn').addEventListener('click', e => {
    e.stopPropagation(); closeExpandedRow(row, card);
  });
  const escHandler = e => {
    if (e.key === 'Escape') { closeExpandedRow(row, card); document.removeEventListener('keydown', escHandler); }
  };
  document.addEventListener('keydown', escHandler);
  initExpandedSlider(row, item);
  loadComments(item.id, row);
}

function buildExpandedRow(item) {
  const images = item.images && item.images.length > 0
    ? item.images
    : (item.media && item.mediaType === 'image' ? [item.media] : []);

  let mediaHTML = '';
  if (images.length > 1) {
    mediaHTML = `
      <div class="exp-slider" id="expSlider_${item.id}">
        <div class="exp-slider-track" id="expSliderTrack_${item.id}">
          ${images.map((src, i) => `<div class="exp-slide"><img src="${src}" alt="slide ${i + 1}" loading="lazy" /></div>`).join('')}
        </div>
        <button class="exp-slider-btn exp-slider-prev">&#8249;</button>
        <button class="exp-slider-btn exp-slider-next">&#8250;</button>
        <div class="exp-slider-dots">
          ${images.map((_, i) => `<span class="exp-dot${i === 0 ? ' active' : ''}" data-idx="${i}"></span>`).join('')}
        </div>
      </div>`;
  } else if (images.length === 1) {
    mediaHTML = `<div class="exp-media-single"><img src="${images[0]}" alt="${escHtml(item.title)}" /></div>`;
  } else if (item.mediaType === 'video' && item.media) {
    mediaHTML = `<div class="exp-media-single"><video src="${item.media}" controls autoplay muted playsinline></video></div>`;
  }

  const tagsHTML = (item.tags || []).map(t => `<span class="exp-tag">${escHtml(t)}</span>`).join('');
  const linkBtn  = item.link
    ? `<a class="exp-link-btn" href="${escHtml(item.link)}" target="_blank" rel="noopener">${escHtml(item.btnLabel || 'Ətraflı')}</a>`
    : '';

  const row = document.createElement('div');
  row.className     = 'news-expanded-row';
  row.dataset.forId = item.id;
  row.innerHTML = `
    <div class="exp-row-inner">
      <button class="exp-close-row-btn">✕</button>
      ${mediaHTML}
      <div class="exp-content">
        <div class="exp-meta">${escHtml(item.date || '')}</div>
        <h2 class="exp-title">${escHtml(item.title)}</h2>
        <p class="exp-body">${escHtml(item.body || '')}</p>
        <div class="exp-footer"><div class="exp-tags">${tagsHTML}</div>${linkBtn}</div>
      </div>
      <div class="exp-comments" id="expComments_${item.id}">
        <div class="comments-loading-state">YÜKLƏNİR…</div>
      </div>
    </div>
  `;
  return row;
}

function initExpandedSlider(row, item) {
  const track = row.querySelector('.exp-slider-track');
  if (!track) return;
  const images = item.images && item.images.length > 0
    ? item.images
    : (item.media && item.mediaType === 'image' ? [item.media] : []);
  if (images.length <= 1) return;

  let cur  = 0;
  const dots = row.querySelectorAll('.exp-dot');
  function goTo(idx) {
    cur = Math.max(0, Math.min(idx, images.length - 1));
    track.style.transform = `translateX(-${cur * 100}%)`;
    dots.forEach((d, i) => d.classList.toggle('active', i === cur));
  }
  row.querySelector('.exp-slider-prev').addEventListener('click', e => { e.stopPropagation(); goTo(cur - 1); });
  row.querySelector('.exp-slider-next').addEventListener('click', e => { e.stopPropagation(); goTo(cur + 1); });
  dots.forEach(dot => dot.addEventListener('click', e => { e.stopPropagation(); goTo(parseInt(dot.dataset.idx)); }));

  let tx = 0;
  track.addEventListener('touchstart', e => { tx = e.touches[0].clientX; }, { passive: true });
  track.addEventListener('touchend',   e => {
    const dx = e.changedTouches[0].clientX - tx;
    if (Math.abs(dx) > 40) goTo(dx < 0 ? cur + 1 : cur - 1);
  }, { passive: true });
}

// ============================================================
// PUBLISH
// ============================================================
export function initPublish() {
  document.getElementById('publishBtn').addEventListener('click', publishNews);
  document.getElementById('releasePublishBtn').addEventListener('click', publishRelease);
  document.getElementById('podcastPublishBtn').addEventListener('click', publishPodcast);
}

async function publishNews() {
  const title = document.getElementById('newsTitle').value.trim();
  if (!title) { alert('Başlıq boş ola bilməz!'); return; }

  const publishBtn = document.getElementById('publishBtn');
  publishBtn.disabled    = true;
  publishBtn.textContent = 'YÜKLƏNIR…';

  const body     = document.getElementById('newsBody').value.trim();
  const link     = document.getElementById('newsLink').value.trim();
  const btnLabel = document.getElementById('newsBtnLabel').value.trim() || 'Ətraflı oxu';
  const tags     = [...document.querySelectorAll('#newsHashtagList .hashtag-input')]
    .map(i => i.value.trim()).filter(Boolean)
    .map(t => t.startsWith('#') ? t : '#' + t);
  const now     = new Date();
  const dateStr = now.toLocaleString('az-AZ', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).toUpperCase();

  let imageUrls = [], mediaUrl = null, mediaType = null;
  try {
    if (activeMediaType === 'image' && currentImages.length > 0) {
      mediaType = 'image';
      for (let i = 0; i < currentImages.length; i++) {
        const compressed = await compressImage(currentImages[i], 800, 0.75);
        imageUrls.push(compressed);
      }
      mediaUrl = imageUrls[0];
    }
    if (activeMediaType === 'video' && currentVideoFile) {
      mediaType = 'video';
      mediaUrl  = await fileToBase64(currentVideoFile);
    }
    const taggedArtists = (taggedArtistsByForm.news || []).map(a => ({ id: a.id, name: a.name, slug: a.slug }));
    const docData = { title, body, link, btnLabel, tags, taggedArtists, date: dateStr, mediaType: mediaType || null, media: mediaUrl || null, images: imageUrls, createdAt: serverTimestamp() };
    const docRef  = await addDoc(collection(db, 'news'), docData);
    news.unshift({ id: docRef.id, ...docData });
    renderView();
    closeNewsModal();
  } catch (err) {
    console.error('Yayımlanarkən xəta:', err);
    alert('Xəta baş verdi: ' + err.message);
  } finally {
    publishBtn.disabled    = false;
    publishBtn.textContent = 'YAYIMLA';
  }
}

async function publishRelease() {
  const title       = document.getElementById('releaseTitle').value.trim();
  const artist      = document.getElementById('releaseArtist').value.trim();
  const link        = document.getElementById('releaseLink').value.trim();
  const releaseType = document.getElementById('releaseType').value;
  if (!releaseType) { alert('Reliz növünü seçin!'); return; }
  if (!title)       { alert('Adı boş ola bilməz!'); return; }
  if (!artist)      { alert('Sənətçi adı boş ola bilməz!'); return; }
  if (!link)        { alert('Platform linki boş ola bilməz!'); return; }

  const btn = document.getElementById('releasePublishBtn');
  btn.disabled    = true;
  btn.textContent = 'YÜKLƏNIR…';

  const desc = document.getElementById('releaseDesc').value.trim();
  const tags = [...document.querySelectorAll('#releaseHashtagList .hashtag-input')]
    .map(i => i.value.trim()).filter(Boolean)
    .map(t => t.startsWith('#') ? t : '#' + t);
  const now     = new Date();
  const dateStr = now.toLocaleString('az-AZ', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).toUpperCase();

  try {
    let thumbnail = null;
    const thumbInput = document.getElementById('releaseThumbInput');
    if (thumbInput.files[0]) {
      const b64 = await fileToBase64(thumbInput.files[0]);
      thumbnail = await compressImage(b64, 600, 0.8);
    }
    const taggedArtists = (taggedArtistsByForm.release || []).map(a => ({ id: a.id, name: a.name, slug: a.slug }));
    const docData = { title, artist, link, releaseType, description: desc, tags, taggedArtists, thumbnail, date: dateStr, postType: 'release', createdAt: serverTimestamp() };
    const docRef  = await addDoc(collection(db, 'releases'), docData);
    pushRelease({ id: docRef.id, ...docData });
    renderView();
    closeNewsModal();
  } catch (err) {
    console.error('Reliz yayımlanarkən xəta:', err);
    alert('Xəta baş verdi: ' + err.message);
  } finally {
    btn.disabled    = false;
    btn.textContent = 'YAYIMLA';
  }
}

async function publishPodcast() {
  const title    = document.getElementById('podcastTitle').value.trim();
  const category = document.getElementById('podcastCategory').value;
  const link     = document.getElementById('podcastLink').value.trim();
  if (!title)    { alert('Başlıq boş ola bilməz!'); return; }
  if (!category) { alert('Kateqoriya seçin!'); return; }
  if (!link)     { alert('Platform linki boş ola bilməz!'); return; }

  const btn = document.getElementById('podcastPublishBtn');
  btn.disabled    = true;
  btn.textContent = 'YÜKLƏNIR…';

  const desc = document.getElementById('podcastDesc').value.trim();
  const tags = [...document.querySelectorAll('#podcastHashtagList .hashtag-input')]
    .map(i => i.value.trim()).filter(Boolean)
    .map(t => t.startsWith('#') ? t : '#' + t);
  const now     = new Date();
  const dateStr = now.toLocaleString('az-AZ', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).toUpperCase();

  try {
    let thumbnail = null;
    const thumbInput = document.getElementById('podcastThumbInput');
    if (thumbInput.files[0]) {
      const b64 = await fileToBase64(thumbInput.files[0]);
      thumbnail = await compressImage(b64, 600, 0.8);
    }
    const taggedArtists = (taggedArtistsByForm.podcast || []).map(a => ({ id: a.id, name: a.name, slug: a.slug }));
    const docData = { title, category, link, description: desc, tags, taggedArtists, thumbnail, date: dateStr, postType: 'podcast', createdAt: serverTimestamp() };
    const docRef  = await addDoc(collection(db, 'podcasts'), docData);
    pushPodcast({ id: docRef.id, ...docData });
    renderView();
    closeNewsModal();
  } catch (err) {
    console.error('Podcast yayımlanarkən xəta:', err);
    alert('Xəta baş verdi: ' + err.message);
  } finally {
    btn.disabled    = false;
    btn.textContent = 'YAYIMLA';
  }
}
