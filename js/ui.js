// ==============================
// ui.js — Nav, Drawer, Modal, Ticker
// ==============================

import { currentSection, setCurrentSection, setCurrentPostType } from './state.js';
import { renderView } from './news.js';
import { resetForm } from './media.js';

export function setCurrentDate() {
  const el = document.getElementById('current-date');
  if (!el) return;
  el.textContent = new Date()
    .toLocaleDateString('az-AZ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    .toUpperCase();
}

export function initNav() {
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      setCurrentSection(link.dataset.section);
      renderView();
    });
  });
}

export function initTicker() {
  const ticker = document.querySelector('.ticker-track');
  if (!ticker) return;
  ticker.addEventListener('mouseenter', () => ticker.style.animationPlayState = 'paused');
  ticker.addEventListener('mouseleave', () => ticker.style.animationPlayState = 'running');
}

// ── Modal növ seçim ekranını göstər
function showTypeScreen() {
  document.getElementById('postTypeScreen').style.display = '';
  document.getElementById('newsForm').style.display      = 'none';
  document.getElementById('releaseForm').style.display   = 'none';
  document.getElementById('podcastForm').style.display   = 'none';
  document.getElementById('modalMainTitle').textContent  = 'YENİ ƏLAVƏ ET';
  setCurrentPostType(null);
}

export function initModal() {
  const modal = document.getElementById('newsModal');

  // Modal aç
  document.getElementById('openModalBtn').addEventListener('click', () => {
    modal.classList.add('open');
    showTypeScreen();
  });

  // Modal bağla
  document.getElementById('closeModalBtn').addEventListener('click', closeNewsModal);
  modal.addEventListener('click', e => { if (e.target === modal) closeNewsModal(); });

  // Növ seçim kartları
  document.querySelectorAll('.post-type-card').forEach(card => {
    card.addEventListener('click', () => {
      const type = card.dataset.type;
      setCurrentPostType(type);
      document.getElementById('postTypeScreen').style.display = 'none';

      if (type === 'news') {
        document.getElementById('newsForm').style.display = '';
        document.getElementById('modalMainTitle').textContent = 'YENİ XƏBƏR';
      } else if (type === 'release') {
        document.getElementById('releaseForm').style.display = '';
        document.getElementById('modalMainTitle').textContent = 'YENİ RELİZ';
      } else if (type === 'podcast') {
        document.getElementById('podcastForm').style.display = '';
        document.getElementById('modalMainTitle').textContent = 'YENİ PODCAST';
      }
    });
  });

  // Geri düymələri
  document.getElementById('backToTypeBtn').addEventListener('click', () => { resetForm(); showTypeScreen(); });
  document.getElementById('backToTypeFromRelease').addEventListener('click', () => { resetReleaseForm(); showTypeScreen(); });
  document.getElementById('backToTypeFromPodcast').addEventListener('click', () => { resetPodcastForm(); showTypeScreen(); });

  // Char counter - xəbər başlığı
  document.getElementById('newsTitle').addEventListener('input', function () {
    document.getElementById('titleCount').textContent = `${this.value.length}/120`;
  });
  document.getElementById('newsBtnLabel').addEventListener('input', function () {
    document.getElementById('btnLabelCount').textContent = `${this.value.length}/25`;
  });

  // Char counter - reliz
  document.getElementById('releaseTitle').addEventListener('input', function () {
    document.getElementById('releaseTitleCount').textContent = `${this.value.length}/120`;
  });

  // Char counter - podcast
  document.getElementById('podcastTitle').addEventListener('input', function () {
    document.getElementById('podcastTitleCount').textContent = `${this.value.length}/120`;
  });

  // Reliz thumbnail
  const releaseThumbInput = document.getElementById('releaseThumbInput');
  const releaseThumbZone  = document.getElementById('releaseThumbZone');
  const releaseThumbPreview = document.getElementById('releaseThumbPreview');
  const releaseThumbImg   = document.getElementById('releaseThumbImg');
  releaseThumbZone.addEventListener('click', () => releaseThumbInput.click());
  releaseThumbInput.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      releaseThumbImg.src = ev.target.result;
      releaseThumbPreview.style.display = '';
      releaseThumbZone.style.display = 'none';
    };
    reader.readAsDataURL(file);
  });
  document.getElementById('releaseThumbRemove').addEventListener('click', () => {
    releaseThumbImg.src = '';
    releaseThumbInput.value = '';
    releaseThumbPreview.style.display = 'none';
    releaseThumbZone.style.display = '';
  });

  // Podcast thumbnail
  const podcastThumbInput = document.getElementById('podcastThumbInput');
  const podcastThumbZone  = document.getElementById('podcastThumbZone');
  const podcastThumbPreview = document.getElementById('podcastThumbPreview');
  const podcastThumbImg   = document.getElementById('podcastThumbImg');
  podcastThumbZone.addEventListener('click', () => podcastThumbInput.click());
  podcastThumbInput.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      podcastThumbImg.src = ev.target.result;
      podcastThumbPreview.style.display = '';
      podcastThumbZone.style.display = 'none';
    };
    reader.readAsDataURL(file);
  });
  document.getElementById('podcastThumbRemove').addEventListener('click', () => {
    podcastThumbImg.src = '';
    podcastThumbInput.value = '';
    podcastThumbPreview.style.display = 'none';
    podcastThumbZone.style.display = '';
  });

  // Dinamik hashtag əlavə et düymələri
  document.querySelectorAll('.add-hashtag-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const listId = btn.dataset.target;
      const list = document.getElementById(listId);
      const count = list.querySelectorAll('.hashtag-input').length;
      if (count >= 8) return;
      const inp = document.createElement('input');
      inp.type = 'text';
      inp.className = 'form-input hashtag-input';
      inp.placeholder = '#hashtag';
      inp.maxLength = 30;
      list.appendChild(inp);
      inp.focus();
    });
  });
}

export function closeNewsModal() {
  document.getElementById('newsModal').classList.remove('open');
  resetForm();
  resetReleaseForm();
  resetPodcastForm();
  showTypeScreen();
}

function resetReleaseForm() {
  document.getElementById('releaseTitle').value  = '';
  document.getElementById('releaseArtist').value = '';
  document.getElementById('releaseLink').value   = '';
  document.getElementById('releaseDesc').value   = '';
  document.getElementById('releaseThumbImg').src = '';
  document.getElementById('releaseThumbInput').value = '';
  document.getElementById('releaseThumbPreview').style.display = 'none';
  document.getElementById('releaseThumbZone').style.display = '';
  document.getElementById('releaseTitleCount').textContent = '0/120';
  // Hashtag-ları sıfırla (yalnız ilk 3-ü saxla)
  const list = document.getElementById('releaseHashtagList');
  const inputs = list.querySelectorAll('.hashtag-input');
  inputs.forEach((inp, i) => { inp.value = ''; if (i >= 3) inp.remove(); });
}

function resetPodcastForm() {
  document.getElementById('podcastTitle').value    = '';
  document.getElementById('podcastCategory').value = '';
  document.getElementById('podcastLink').value     = '';
  document.getElementById('podcastDesc').value     = '';
  document.getElementById('podcastThumbImg').src   = '';
  document.getElementById('podcastThumbInput').value = '';
  document.getElementById('podcastThumbPreview').style.display = 'none';
  document.getElementById('podcastThumbZone').style.display = '';
  document.getElementById('podcastTitleCount').textContent = '0/120';
  const list = document.getElementById('podcastHashtagList');
  const inputs = list.querySelectorAll('.hashtag-input');
  inputs.forEach((inp, i) => { inp.value = ''; if (i >= 3) inp.remove(); });
}

export function initDrawer() {
  const drawer   = document.getElementById('sideDrawer');
  const overlay  = document.getElementById('drawerOverlay');
  const openBtn  = document.getElementById('hamburgerBtn');
  const closeBtn = document.getElementById('drawerClose');

  function openDrawer()  {
    drawer.classList.add('open');
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeDrawer() {
    drawer.classList.remove('open');
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  if (openBtn)  openBtn.addEventListener('click', openDrawer);
  if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
  if (overlay)  overlay.addEventListener('click', closeDrawer);

  document.querySelectorAll('.drawer-link').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
      const matchingNav = document.querySelector(`.nav-link[data-section="${link.dataset.section}"]`);
      if (matchingNav) matchingNav.classList.add('active');
      setCurrentSection(link.dataset.section);
      renderView();
      closeDrawer();
    });
  });

  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDrawer(); });
}

