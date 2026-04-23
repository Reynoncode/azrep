// ==============================
// artists.js — Sənətçilər bölümü
// ==============================

import { db, collection, getDocs, orderBy, query } from './firebase.js';
import { escHtml } from './utils.js';
import { news, releases, podcasts } from './state.js';

// ============================================================
// ANA RENDER
// ============================================================
export async function renderArtistsSection(containerEl) {
  containerEl.innerHTML = `<div class="artists-loading">YÜKLƏNİR…</div>`;

  let artists = [];
  try {
    const snap = await getDocs(query(collection(db, 'artists'), orderBy('name', 'asc')));
    artists = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.error('Artists yüklənmədi:', e);
  }

  // Son paylaşımlar — news + releases + podcasts birləşdir, max 5
  const allPosts = [
    ...news.map(n => ({ ...n, _type: 'news' })),
    ...releases.map(r => ({ ...r, _type: 'release' })),
    ...podcasts.map(p => ({ ...p, _type: 'podcast' })),
  ].sort((a, b) => {
    const ta = a.createdAt?.seconds || 0;
    const tb = b.createdAt?.seconds || 0;
    return tb - ta;
  }).slice(0, 5);

  // Ən çox dinlənilən — artists-dən listeners sahəsinə görə sırala, top 10
  const topArtists = [...artists]
    .sort((a, b) => (b.monthlyListeners || 0) - (a.monthlyListeners || 0))
    .slice(0, 10);

  containerEl.innerHTML = `
    <div class="artists-page">

      <!-- SOL: Son paylaşımlar -->
      <aside class="artists-sidebar-left">
        <div class="artists-sidebar-title">SON PAYLAŞIMLAR</div>
        <div class="artists-recent-list" id="artistsRecentList">
          ${allPosts.length === 0
            ? `<div class="artists-empty">Hələ paylaşım yoxdur</div>`
            : allPosts.map(p => buildRecentPostCard(p)).join('')}
        </div>
      </aside>

      <!-- ORTA: Sənətçi profil kartları -->
      <main class="artists-main">
        <div class="artists-main-header">
          <div class="artists-main-title">SƏNƏTÇİLƏR</div>
          <div class="artists-count">${artists.length} sənətçi</div>
        </div>
        <div class="artists-grid" id="artistsGrid">
          ${artists.length === 0
            ? `<div class="artists-empty-center">Hələ sənətçi əlavə edilməyib</div>`
            : artists.map(a => buildArtistCard(a)).join('')}
        </div>
      </main>

      <!-- SAĞ: Top 10 ən çox dinlənilən -->
      <aside class="artists-sidebar-right">
        <div class="artists-sidebar-title">ƏN ÇOX DİNLƏNİLƏN</div>
        <div class="artists-top-list">
          ${topArtists.length === 0
            ? `<div class="artists-empty">Məlumat yoxdur</div>`
            : topArtists.map((a, i) => buildTopArtistRow(a, i + 1)).join('')}
        </div>
      </aside>

    </div>
  `;

  // Recent post kartlarına keçid — nav link-ə click simulasiya edir
  containerEl.querySelectorAll('.recent-post-card[data-section]').forEach(card => {
    card.addEventListener('click', () => {
      const targetSection = card.dataset.section;
      if (!targetSection) return;
      const navLink = document.querySelector(`.nav-link[data-section="${targetSection}"]`);
      if (navLink) navLink.click();
    });
  });
}

// ============================================================
// SƏNƏTÇI KARTI (orta sütun)
// ============================================================
function buildArtistCard(a) {
  const img = a.photo
    ? `<img src="${escHtml(a.photo)}" alt="${escHtml(a.name)}" class="artist-card-img" />`
    : `<div class="artist-card-img artist-card-img-placeholder"><span>${escHtml((a.name || '?')[0].toUpperCase())}</span></div>`;

  const genres = (a.genres || []).slice(0, 3).map(g =>
    `<span class="artist-genre-tag">${escHtml(g)}</span>`).join('');

  const listeners = a.monthlyListeners
    ? formatListeners(a.monthlyListeners)
    : null;

  const spotifyBtn = a.spotifyUrl
    ? `<a class="artist-spotify-btn" href="${escHtml(a.spotifyUrl)}" target="_blank" rel="noopener">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
        Spotify
      </a>`
    : '';

  const links = [];
  if (a.instagramUrl) links.push(`<a class="artist-social-link" href="${escHtml(a.instagramUrl)}" target="_blank" rel="noopener" title="Instagram">
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
  </a>`);
  if (a.youtubeUrl) links.push(`<a class="artist-social-link" href="${escHtml(a.youtubeUrl)}" target="_blank" rel="noopener" title="YouTube">
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.4a2.78 2.78 0 0 0 1.95-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02"/></svg>
  </a>`);
  if (a.soundcloudUrl) links.push(`<a class="artist-social-link" href="${escHtml(a.soundcloudUrl)}" target="_blank" rel="noopener" title="SoundCloud">
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M1.175 12.225c-.017 0-.034.002-.051.003.003-.045.014-.088.014-.134 0-1.054-.83-1.908-1.854-1.908-.392 0-.753.12-1.053.322.002-.043.003-.087.003-.131C-1.766 8.54-3.118 7.23-4.79 7.23c-.09 0-.178.007-.265.018.193-.468.303-.976.303-1.508C-4.752 3.627-6.44 2-8.526 2c-1.748 0-3.222 1.102-3.79 2.648C-13.065 4.44-13.82 4.3-14.601 4.3c-2.45 0-4.432 1.908-4.432 4.26 0 .05.004.1.006.149-.08-.012-.16-.02-.242-.02C-20.825 8.689-22 9.826-22 11.232c0 1.406 1.175 2.543 2.731 2.543h20.444C2.731 13.775 3 12.876 3 11.913c0-1.068-.725-1.688-1.825-1.688z"/></svg>
  </a>`);

  return `
    <article class="artist-card" data-id="${escHtml(a.id)}">
      <div class="artist-card-inner">
        <div class="artist-card-photo-col">
          ${img}
        </div>
        <div class="artist-card-info">
          <div class="artist-card-top">
            <div>
              <div class="artist-card-name">${escHtml(a.name || '')}</div>
              ${a.realName ? `<div class="artist-card-realname">${escHtml(a.realName)}</div>` : ''}
            </div>
            <div class="artist-card-socials">${links.join('')}</div>
          </div>
          ${genres ? `<div class="artist-card-genres">${genres}</div>` : ''}
          ${a.bio ? `<p class="artist-card-bio">${escHtml(a.bio)}</p>` : ''}
          <div class="artist-card-footer">
            ${listeners ? `<div class="artist-listeners"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg> ${listeners} dinləyici/ay</div>` : ''}
            ${spotifyBtn}
          </div>
        </div>
      </div>
    </article>
  `;
}

// ============================================================
// SON PAYLAŞIM KARTI (sol sütun)
// ============================================================
function buildRecentPostCard(post) {
  const typeMap = { news: 'XƏBƏr', release: 'RELİZ', podcast: 'PODCAST' };
  const sectionMap = { news: 'news', release: 'albums', podcast: 'interview' };
  const colorMap = { news: '#0D0D0D', release: '#FF3C00', podcast: '#002BED' };

  const typeLabel = typeMap[post._type] || post._type.toUpperCase();
  const section   = sectionMap[post._type] || 'home';
  const color     = colorMap[post._type] || '#0D0D0D';

  const thumb = (post.thumbnail || post.media)
    ? `<img src="${escHtml(post.thumbnail || post.media)}" alt="" class="recent-post-thumb" />`
    : `<div class="recent-post-thumb recent-post-nothumb" style="background:${color}20;color:${color}">
        ${post._type === 'release' ? '♪' : post._type === 'podcast' ? '🎙' : '📰'}
       </div>`;

  return `
    <div class="recent-post-card" data-section="${section}" data-id="${escHtml(post.id)}">
      ${thumb}
      <div class="recent-post-info">
        <span class="recent-post-type" style="color:${color}">${typeLabel}</span>
        <div class="recent-post-title">${escHtml((post.title || '').slice(0, 50))}${(post.title || '').length > 50 ? '…' : ''}</div>
        <div class="recent-post-date">${escHtml(post.date || '')}</div>
      </div>
      <div class="recent-post-arrow">›</div>
    </div>
  `;
}

// ============================================================
// TOP ARTIST SƏTRI (sağ sütun)
// ============================================================
function buildTopArtistRow(a, rank) {
  const img = a.photo
    ? `<img src="${escHtml(a.photo)}" alt="${escHtml(a.name)}" class="top-artist-avatar" />`
    : `<div class="top-artist-avatar top-artist-avatar-ph">${escHtml((a.name || '?')[0].toUpperCase())}</div>`;

  const listeners = a.monthlyListeners ? formatListeners(a.monthlyListeners) : '—';
  const rankClass = rank === 1 ? 'top-rank top-rank-1' : rank <= 3 ? 'top-rank top-rank-top' : 'top-rank';

  return `
    <div class="top-artist-row" ${a.spotifyUrl ? `data-href="${escHtml(a.spotifyUrl)}"` : ''}>
      <span class="${rankClass}">${rank}</span>
      ${img}
      <div class="top-artist-info">
        <div class="top-artist-name">${escHtml(a.name || '')}</div>
        <div class="top-artist-listeners">${listeners}</div>
      </div>
      ${a.spotifyUrl ? `<a class="top-artist-spotify" href="${escHtml(a.spotifyUrl)}" target="_blank" rel="noopener" title="Spotify-də aç">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
      </a>` : ''}
    </div>
  `;
}

// ============================================================
// HELPER
// ============================================================
function formatListeners(n) {
  if (!n) return '0';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace('.0', '') + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1).replace('.0', '') + 'K';
  return String(n);
}
