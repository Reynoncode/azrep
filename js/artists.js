// ==============================
// artists.js — Sənətçilər bölümü
// ==============================

import { db, collection, getDocs, addDoc, orderBy, query, serverTimestamp } from './firebase.js';
import { escHtml } from './utils.js';
import { news, releases, podcasts, artists as artistsState, setArtists, pushArtist } from './state.js';

// ============================================================
// ANA RENDER
// ============================================================
export async function renderArtistsSection(containerEl) {
  containerEl.innerHTML = `<div class="artists-loading">YÜKLƏNİR…</div>`;

  let artists = [];
  try {
    const snap = await getDocs(query(collection(db, 'artists'), orderBy('name', 'asc')));
    artists = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    setArtists(artists);
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

      <!-- ÜST: Ən çox dinlənilən — navbar kimi horizontal scroll -->
      <div class="artists-top-bar">
        <div class="artists-top-bar-label">ƏN ÇOX DİNLƏNİLƏN</div>
        <div class="artists-top-bar-scroll">
          ${topArtists.length === 0
            ? `<div class="artists-empty" style="padding:0 16px">Məlumat yoxdur</div>`
            : topArtists.map((a, i) => buildTopArtistChip(a, i + 1)).join('')}
        </div>
      </div>

      <!-- ORTA: Sənətçi profil kartları (max 10 görünür, qalanı scroll) -->
      <main class="artists-main">
        <div class="artists-grid" id="artistsGrid">
          ${artists.length === 0
            ? `<div class="artists-empty-center">Hələ sənətçi əlavə edilməyib</div>`
            : artists.map(a => buildArtistCard(a)).join('')}
        </div>
      </main>

      <!-- ALT: Son paylaşımlar (max 5) -->
      <div class="artists-recent-section">
        <div class="artists-sidebar-title">SON PAYLAŞIMLAR</div>
        <div class="artists-recent-list" id="artistsRecentList">
          ${allPosts.length === 0
            ? `<div class="artists-empty">Hələ paylaşım yoxdur</div>`
            : allPosts.map(p => buildRecentPostCard(p)).join('')}
        </div>
      </div>

    </div>
  `;

  // Artist kartlarına click → profil aç
  containerEl.querySelectorAll('.artist-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.dataset.id;
      const artist = artists.find(a => a.id === id);
      if (artist) openArtistProfile(artist);
    });
  });

  // Top artist chip-lərinə click (yeni top-bar)
  containerEl.querySelectorAll('.top-artist-chip[data-id]').forEach(chip => {
    chip.addEventListener('click', () => {
      const id = chip.dataset.id;
      const artist = artists.find(a => a.id === id);
      if (artist) openArtistProfile(artist);
    });
  });
  // Top artist sətirlərinə click (köhnə sidebar, fallback)
  containerEl.querySelectorAll('.top-artist-row[data-id]').forEach(row => {
    row.addEventListener('click', () => {
      const id = row.dataset.id;
      const artist = artists.find(a => a.id === id);
      if (artist) openArtistProfile(artist);
    });
  });

  // Recent post kartlarına keçid
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
// SƏNƏTÇİ PROFİL SƏHİFƏSİ
// ============================================================
export function openArtistProfile(artist) {
  // Ana məzmunu gizlə
  const siteMain = document.querySelector('body > main.site-main');
  const siteFooter = document.querySelector('.site-footer');
  const profilePage = document.getElementById('artistProfilePage');
  const profileContent = document.getElementById('artistProfileContent');
  if (!profilePage || !profileContent) return;

  if (siteMain) siteMain.style.display = 'none';
  if (siteFooter) siteFooter.style.display = 'none';
  profilePage.classList.add('profile-open');

  const img = artist.photo
    ? `<img src="${escHtml(artist.photo)}" alt="${escHtml(artist.name)}" class="ap-photo" />`
    : `<div class="ap-photo ap-photo-placeholder"><span>${escHtml((artist.name || '?')[0].toUpperCase())}</span></div>`;

  const genres = (artist.genres || []).map(g =>
    `<span class="ap-genre-tag">${escHtml(g)}</span>`).join('');

  const listeners = artist.monthlyListeners ? formatListeners(artist.monthlyListeners) : null;

  const socialLinks = [];
  if (artist.spotifyUrl) socialLinks.push(`<a class="ap-social-btn ap-spotify" href="${escHtml(artist.spotifyUrl)}" target="_blank" rel="noopener">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
    Spotify
  </a>`);
  if (artist.instagramUrl) socialLinks.push(`<a class="ap-social-btn ap-instagram" href="${escHtml(artist.instagramUrl)}" target="_blank" rel="noopener">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
    Instagram
  </a>`);
  if (artist.youtubeUrl) socialLinks.push(`<a class="ap-social-btn ap-youtube" href="${escHtml(artist.youtubeUrl)}" target="_blank" rel="noopener">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.4a2.78 2.78 0 0 0 1.95-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02"/></svg>
    YouTube
  </a>`);

  profileContent.innerHTML = `
    <div class="artist-profile-page">
      <button class="ap-back-btn" id="apBackBtn">← Sənətçilərə Qayıt</button>

      <div class="ap-hero">
        <div class="ap-hero-left">
          ${img}
        </div>
        <div class="ap-hero-right">
          <div class="ap-type-label">SƏNƏTÇİ</div>
          <h1 class="ap-name">${escHtml(artist.name || '')}</h1>
          ${artist.realName ? `<div class="ap-realname">${escHtml(artist.realName)}</div>` : ''}
          ${genres ? `<div class="ap-genres">${genres}</div>` : ''}
          ${listeners ? `<div class="ap-listeners"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg> ${listeners} aylıq dinləyici</div>` : ''}
          ${socialLinks.length ? `<div class="ap-socials">${socialLinks.join('')}</div>` : ''}
        </div>
      </div>

      ${artist.bio ? `
      <div class="ap-section">
        <div class="ap-section-title">BİOQRAFİYA</div>
        <p class="ap-bio-text">${escHtml(artist.bio)}</p>
      </div>` : ''}

      <div class="ap-section">
        <div class="ap-section-title">RELİZLƏR</div>
        <div class="ap-releases-scroll-wrap">
          <div class="ap-releases-grid" id="apReleasesGrid">
            <div class="ap-empty-note">YÜKLƏNİR…</div>
          </div>
        </div>
      </div>

      <div class="ap-section">
        <div class="ap-section-title">XƏBƏRLƏR</div>
        <div class="ap-news-list" id="apNewsList">
          <div class="ap-empty-note">YÜKLƏNİR…</div>
        </div>
      </div>
    </div>
  `;

  document.getElementById('apBackBtn').addEventListener('click', closeArtistProfile);

  // Sənətçinin relizlərini doldur
  const artistReleasesGrid = document.getElementById('apReleasesGrid');
  if (artistReleasesGrid) {
    const artistReleases = releases.filter(r =>
      (r.taggedArtists || []).some(a => a.id === artist.id) ||
      (r.artist || '').toLowerCase() === (artist.name || '').toLowerCase()
    );
    if (artistReleases.length === 0) {
      artistReleasesGrid.innerHTML = `<div class="ap-empty-note">Hələ reliz yoxdur</div>`;
    } else {
      artistReleasesGrid.innerHTML = artistReleases.map(r => buildArtistReleaseCard(r)).join('');
    }
  }

  // Sənətçinin xəbərlərini doldur
  const artistNewsList = document.getElementById('apNewsList');
  if (artistNewsList) {
    const artistNews = news.filter(n =>
      (n.taggedArtists || []).some(a => a.id === artist.id)
    );
    if (artistNews.length === 0) {
      artistNewsList.innerHTML = `<div class="ap-empty-note">Hələ xəbər yoxdur</div>`;
    } else {
      artistNewsList.innerHTML = artistNews.map(n => buildArtistNewsRow(n)).join('');
    }
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

export function closeArtistProfile() {
  const siteMain = document.querySelector('body > main.site-main');
  const siteFooter = document.querySelector('.site-footer');
  const profilePage = document.getElementById('artistProfilePage');
  if (profilePage) profilePage.classList.remove('profile-open');
  if (siteMain) siteMain.style.display = '';
  if (siteFooter) siteFooter.style.display = '';
  // Sənətçilər bölümünü yenidən göstər
  const navLink = document.querySelector('.nav-link[data-section="azrap"]');
  if (navLink) navLink.click();
}

// ============================================================
// SƏNƏTÇİ MODAL (Əlavə et)
// ============================================================
export function initArtistModal() {
  const modal = document.getElementById('artistModal');
  if (!modal) return;

  // Açmaq
  const openBtns = [
    document.getElementById('openArtistModalBtn'),
    document.getElementById('openArtistModalBtnDrawer'),
  ];
  openBtns.forEach(btn => {
    if (btn) btn.addEventListener('click', () => modal.classList.add('open'));
  });

  // Bağlamaq
  document.getElementById('closeArtistModalBtn').addEventListener('click', () => closeArtistModal());
  modal.addEventListener('click', e => { if (e.target === modal) closeArtistModal(); });

  // Foto
  const photoInput   = document.getElementById('artistPhotoInput');
  const photoZone    = document.getElementById('artistPhotoZone');
  const photoPreview = document.getElementById('artistPhotoPreview');
  const photoImg     = document.getElementById('artistPhotoImg');
  photoZone.addEventListener('click', () => photoInput.click());
  photoInput.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      photoImg.src = ev.target.result;
      photoPreview.style.display = '';
      photoZone.style.display = 'none';
    };
    reader.readAsDataURL(file);
  });
  document.getElementById('artistPhotoRemove').addEventListener('click', () => {
    photoImg.src = '';
    photoInput.value = '';
    photoPreview.style.display = 'none';
    photoZone.style.display = '';
  });

  // Publish
  document.getElementById('artistPublishBtn').addEventListener('click', publishArtist);
}

async function publishArtist() {
  const name = document.getElementById('artistName').value.trim();
  if (!name) {
    alert('Sənətçi adı məcburidir!');
    return;
  }

  const photoImg = document.getElementById('artistPhotoImg');
  const photo = photoImg.src && photoImg.src !== window.location.href ? photoImg.src : null;

  const genreRaw = document.getElementById('artistGenres').value.trim();
  const genres = genreRaw ? genreRaw.split(',').map(g => g.trim()).filter(Boolean) : [];

  const data = {
    name,
    slug: generateSlug(name),
    realName:        document.getElementById('artistRealName').value.trim() || null,
    bio:             document.getElementById('artistBio').value.trim() || null,
    genres,
    monthlyListeners: parseInt(document.getElementById('artistListeners').value) || 0,
    spotifyUrl:      document.getElementById('artistSpotify').value.trim() || null,
    instagramUrl:    document.getElementById('artistInstagram').value.trim() || null,
    youtubeUrl:      document.getElementById('artistYoutube').value.trim() || null,
    photo,
    createdAt:       serverTimestamp(),
  };

  const publishBtn = document.getElementById('artistPublishBtn');
  publishBtn.textContent = 'ƏLAVƏ EDİLİR…';
  publishBtn.disabled = true;

  try {
    const docRef = await addDoc(collection(db, 'artists'), data);
    pushArtist({ id: docRef.id, ...data });
    closeArtistModal();
    // Sənətçilər bölümünə get
    const navLink = document.querySelector('.nav-link[data-section="azrap"]');
    if (navLink) navLink.click();
  } catch (err) {
    console.error('Artist əlavə edilmədi:', err);
    alert('Xəta baş verdi: ' + err.message);
  } finally {
    publishBtn.textContent = 'SƏNƏTÇİ ƏLAVƏ ET';
    publishBtn.disabled = false;
  }
}

function closeArtistModal() {
  document.getElementById('artistModal').classList.remove('open');
  // Formu sıfırla
  document.getElementById('artistName').value = '';
  document.getElementById('artistRealName').value = '';
  document.getElementById('artistBio').value = '';
  document.getElementById('artistGenres').value = '';
  document.getElementById('artistListeners').value = '';
  document.getElementById('artistSpotify').value = '';
  document.getElementById('artistInstagram').value = '';
  document.getElementById('artistYoutube').value = '';
  document.getElementById('artistPhotoImg').src = '';
  document.getElementById('artistPhotoInput').value = '';
  document.getElementById('artistPhotoPreview').style.display = 'none';
  document.getElementById('artistPhotoZone').style.display = '';
}

// ============================================================
// SƏNƏTÇI KARTI (orta sütun) — compact
// ============================================================
function buildArtistCard(a) {
  const img = a.photo
    ? `<img src="${escHtml(a.photo)}" alt="${escHtml(a.name)}" class="artist-card-img" />`
    : `<div class="artist-card-img artist-card-img-placeholder"><span>${escHtml((a.name || '?')[0].toUpperCase())}</span></div>`;

  const primaryGenre = (a.genres || [])[0] || '';

  return `
    <article class="artist-card" data-id="${escHtml(a.id)}">
      <div class="artist-card-inner">
        <div class="artist-card-photo-col">${img}</div>
        <div class="artist-card-info">
          <div class="artist-card-name">${escHtml(a.name || '')}</div>
          ${primaryGenre ? `<div class="artist-card-genre">${escHtml(primaryGenre)}</div>` : ''}
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
    <div class="top-artist-row" data-id="${escHtml(a.id)}" style="cursor:pointer;">
      <span class="${rankClass}">${rank}</span>
      ${img}
      <div class="top-artist-info">
        <div class="top-artist-name">${escHtml(a.name || '')}</div>
        <div class="top-artist-listeners">${listeners}</div>
      </div>
      ${a.spotifyUrl ? `<a class="top-artist-spotify" href="${escHtml(a.spotifyUrl)}" target="_blank" rel="noopener" onclick="event.stopPropagation()" title="Spotify-də aç">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
      </a>` : ''}
    </div>
  `;
}


// ============================================================
// TOP ARTIST CHIP (yeni horizontal navbar üçün)
// ============================================================
function buildTopArtistChip(a, rank) {
  const img = a.photo
    ? `<img src="${escHtml(a.photo)}" alt="${escHtml(a.name)}" class="top-chip-avatar" />`
    : `<div class="top-chip-avatar top-chip-avatar-ph">${escHtml((a.name || '?')[0].toUpperCase())}</div>`;

  const rankCls = rank === 1 ? 'top-chip-rank top-chip-rank-1' : 'top-chip-rank';
  return `
    <div class="top-artist-chip" data-id="${escHtml(a.id)}">
      <span class="${rankCls}">${rank}</span>
      ${img}
      <span class="top-chip-name">${escHtml(a.name || '')}</span>
    </div>
  `;
}

// ============================================================
// ARTİST PROFİLİ — Reliz karti (horizontal scroll)
// ============================================================
function buildArtistReleaseCard(r) {
  const thumb = r.thumbnail
    ? `<img src="${escHtml(r.thumbnail)}" alt="${escHtml(r.title)}" class="ap-rel-thumb" />`
    : `<div class="ap-rel-thumb ap-rel-nothumb">♪</div>`;
  const typeLabel = r.releaseType ? `<span class="ap-rel-type">${escHtml(r.releaseType)}</span>` : '';
  return `
    <div class="ap-rel-card">
      <div class="ap-rel-thumb-wrap">${thumb}${typeLabel}</div>
      <div class="ap-rel-title">${escHtml((r.title || '').slice(0, 32))}${(r.title || '').length > 32 ? '…' : ''}</div>
      <div class="ap-rel-date">${escHtml(r.date || '')}</div>
    </div>
  `;
}

// ============================================================
// ARTİST PROFİLİ — Xəbər sətri
// ============================================================
function buildArtistNewsRow(n) {
  const thumb = n.media
    ? `<img src="${escHtml(n.media)}" alt="" class="ap-news-thumb" />`
    : `<div class="ap-news-thumb ap-news-nothumb">📰</div>`;
  return `
    <div class="ap-news-row">
      ${thumb}
      <div class="ap-news-info">
        <div class="ap-news-title">${escHtml((n.title || '').slice(0, 80))}${(n.title || '').length > 80 ? '…' : ''}</div>
        <div class="ap-news-date">${escHtml(n.date || '')}</div>
      </div>
    </div>
  `;
}

// ============================================================
// HELPER
// ============================================================
function generateSlug(name) {
  return name
    .toLowerCase()
    .replace(/ə/g, 'e').replace(/ı/g, 'i').replace(/ö/g, 'o')
    .replace(/ü/g, 'u').replace(/ğ/g, 'g').replace(/ş/g, 's')
    .replace(/ç/g, 'c').replace(/[^a-z0-9\s-]/g, '')
    .trim().replace(/\s+/g, '-').replace(/-+/g, '-');
}

function formatListeners(n) {
  if (!n) return '0';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace('.0', '') + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1).replace('.0', '') + 'K';
  return String(n);
}
