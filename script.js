// ==============================
// AZREP — script.js
// ==============================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, orderBy, query } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "BURAYA_API_KEY",
  authDomain: "BURAYA_AUTH_DOMAIN",
  projectId: "BURAYA_PROJECT_ID",
  storageBucket: "BURAYA_STORAGE_BUCKET",
  messagingSenderId: "BURAYA_SENDER_ID",
  appId: "BURAYA_APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ====================================================
// STATE
// ====================================================
let news = [];
let currentImages = [];       // array of dataURLs (max 10)
let currentVideoFile = null;
let currentVideoTrim = { start: 0, end: null };
let activeMediaType = 'image';
let currentSection = 'home';

let cropState = {
  img: null,
  containerW: 0, containerH: 0,
  imgW: 0, imgH: 0,
  boxX: 0, boxY: 0, boxW: 0, boxH: 0,
  ratio: 1,
  dragging: false, resizing: false,
  dragStartX: 0, dragStartY: 0,
  handle: null
};

// ====================================================
// INIT
// ====================================================
document.addEventListener('DOMContentLoaded', () => {
  setCurrentDate();
  initNav();
  initTicker();
  initModal();
  initImageUpload();
  initVideoUpload();
  initMediaTabs();
  initLinkInput();
  initPublish();
  renderView();
});

// ====================================================
// DATE
// ====================================================
function setCurrentDate() {
  const el = document.getElementById('current-date');
  if (!el) return;
  const now = new Date();
  const opts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  el.textContent = now.toLocaleDateString('az-AZ', opts).toUpperCase();
}

// ====================================================
// NAV
// ====================================================
function initNav() {
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      currentSection = link.dataset.section;
      renderView();
    });
  });
}

// ====================================================
// RENDER VIEW
// ====================================================
function renderView() {
  const featureSection = document.querySelector('.feature-section');
  const newsGridSection = document.querySelector('.news-grid-section');
  const sectionTag = newsGridSection ? newsGridSection.querySelector('.section-tag') : null;

  if (currentSection === 'news') {
    if (featureSection) featureSection.style.display = 'none';
    if (sectionTag) sectionTag.textContent = 'BÜTÜN XƏBƏRLƏR';
  } else {
    if (featureSection) featureSection.style.display = '';
    if (sectionTag) sectionTag.textContent = 'SON XƏBƏRLƏR';
  }
  renderNewsGrid(news);
}

// ====================================================
// TICKER
// ====================================================
function initTicker() {
  const ticker = document.querySelector('.ticker-track');
  if (!ticker) return;
  ticker.addEventListener('mouseenter', () => ticker.style.animationPlayState = 'paused');
  ticker.addEventListener('mouseleave', () => ticker.style.animationPlayState = 'running');
}

// ====================================================
// MODAL
// ====================================================
function initModal() {
  const modal = document.getElementById('newsModal');
  document.getElementById('openModalBtn').addEventListener('click', () => modal.classList.add('open'));
  document.getElementById('closeModalBtn').addEventListener('click', closeNewsModal);
  modal.addEventListener('click', e => { if (e.target === modal) closeNewsModal(); });
  document.getElementById('newsTitle').addEventListener('input', function () {
    document.getElementById('titleCount').textContent = `${this.value.length}/120`;
  });
  document.getElementById('newsBtnLabel').addEventListener('input', function () {
    document.getElementById('btnLabelCount').textContent = `${this.value.length}/25`;
  });
}

function closeNewsModal() {
  document.getElementById('newsModal').classList.remove('open');
  resetForm();
}

function resetForm() {
  document.getElementById('newsTitle').value = '';
  document.getElementById('newsBody').value = '';
  document.getElementById('newsLink').value = '';
  document.getElementById('newsBtnLabel').value = '';
  document.getElementById('titleCount').textContent = '0/120';
  document.getElementById('btnLabelCount').textContent = '0/25';
  document.querySelectorAll('.hashtag-input').forEach(i => i.value = '');
  currentImages = [];
  renderImagePreviews();
  document.getElementById('imageDropLabel').innerHTML = '<span>Şəkillər seçmək üçün klikləyin</span><small>JPG, PNG, WEBP — maks. 10 şəkil</small>';
  const vp = document.querySelector('.video-media-preview');
  if (vp) vp.remove();
  currentVideoFile = null;
  document.getElementById('btnLabelGroup').style.display = 'none';
}

// ====================================================
// MEDIA TABS
// ====================================================
function initMediaTabs() {
  document.querySelectorAll('.media-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.media-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.media-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      activeMediaType = tab.dataset.tab;
      document.getElementById(activeMediaType === 'image' ? 'imagePanel' : 'videoPanel').classList.add('active');
    });
  });
}

// ====================================================
// IMAGE UPLOAD — max 10 şəkil
// ====================================================
function initImageUpload() {
  const zone = document.getElementById('imageDropZone');
  const input = document.getElementById('imageInput');
  input.setAttribute('multiple', 'true');
  zone.addEventListener('click', () => input.click());
  input.addEventListener('change', () => {
    if (input.files.length > 0) handleImageFiles(input.files);
    input.value = '';
  });

  document.getElementById('closeImageEditBtn').addEventListener('click', () => {
    document.getElementById('imageEditModal').classList.remove('open');
  });
  document.getElementById('cancelCropBtn').addEventListener('click', () => {
    document.getElementById('imageEditModal').classList.remove('open');
  });
  document.getElementById('applyCropBtn').addEventListener('click', applyCrop);

  document.querySelectorAll('.ratio-btn[data-ratio]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.ratio-btn[data-ratio]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      cropState.ratio = btn.dataset.ratio === 'free' ? 'free' : parseFloat(btn.dataset.ratio);
      resetCropBox();
    });
  });

  const cropBox = document.getElementById('cropBox');
  cropBox.addEventListener('mousedown', startCropDrag);
  cropBox.querySelectorAll('.crop-handle').forEach(h => {
    h.addEventListener('mousedown', e => { e.stopPropagation(); startCropResize(e, h); });
  });
  document.addEventListener('mousemove', onCropMouseMove);
  document.addEventListener('mouseup', () => { cropState.dragging = false; cropState.resizing = false; });
}

function handleImageFiles(files) {
  const remaining = 10 - currentImages.length;
  if (remaining <= 0) { alert('Maksimum 10 şəkil seçə bilərsiniz!'); return; }
  const toAdd = Array.from(files).slice(0, remaining);
  let loaded = 0;
  toAdd.forEach(file => {
    const reader = new FileReader();
    reader.onload = e => {
      currentImages.push(e.target.result);
      loaded++;
      if (loaded === toAdd.length) renderImagePreviews();
    };
    reader.readAsDataURL(file);
  });
  if (toAdd.length < files.length) alert(`Yalnız ${toAdd.length} şəkil əlavə edildi. Limit: 10 şəkil.`);
}

function renderImagePreviews() {
  const zone = document.getElementById('imageDropZone');
  let container = document.getElementById('imagePreviewContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'imagePreviewContainer';
    zone.parentElement.appendChild(container);
  }
  if (currentImages.length === 0) {
    container.innerHTML = '';
    document.getElementById('imageDropLabel').innerHTML =
      '<span>Şəkillər seçmək üçün klikləyin</span><small>JPG, PNG, WEBP — maks. 10 şəkil</small>';
    return;
  }
  document.getElementById('imageDropLabel').innerHTML =
    `<span>✓ ${currentImages.length} şəkil seçildi</span><small>Daha əlavə etmək üçün klikləyin (maks. 10)</small>`;
  container.innerHTML = `
    <div class="img-preview-grid">
      ${currentImages.map((src, i) => `
        <div class="img-preview-thumb">
          <img src="${src}" alt="preview ${i+1}" />
          <button class="img-thumb-remove" data-idx="${i}" title="Sil">✕</button>
        </div>
      `).join('')}
    </div>
    <div class="img-preview-count">${currentImages.length}/10 şəkil seçildi</div>
  `;
  container.querySelectorAll('.img-thumb-remove').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      currentImages.splice(parseInt(btn.dataset.idx), 1);
      renderImagePreviews();
    });
  });
}

function openImageEditor(file) {
  const reader = new FileReader();
  reader.onload = e => {
    const img = document.getElementById('cropImage');
    img.onload = () => initCropBox(img);
    img.src = e.target.result;
    document.getElementById('imageEditModal').classList.add('open');
  };
  reader.readAsDataURL(file);
}

function initCropBox(img) {
  cropState.ratio = 1;
  document.querySelectorAll('.ratio-btn[data-ratio]').forEach(b => b.classList.remove('active'));
  document.querySelector('.ratio-btn[data-ratio="1"]').classList.add('active');
  resetCropBox();
}

function resetCropBox() {
  const img = document.getElementById('cropImage');
  const W = img.clientWidth, H = img.clientHeight;
  let bw, bh;
  if (cropState.ratio === 'free') { bw = W * 0.7; bh = H * 0.7; }
  else { bw = Math.min(W * 0.7, H * 0.7 * cropState.ratio); bh = bw / cropState.ratio; }
  cropState.boxX = (W - bw) / 2;
  cropState.boxY = (H - bh) / 2;
  cropState.boxW = bw; cropState.boxH = bh;
  applyCropBoxStyle();
}

function applyCropBoxStyle() {
  const box = document.getElementById('cropBox');
  box.style.left = cropState.boxX + 'px'; box.style.top = cropState.boxY + 'px';
  box.style.width = cropState.boxW + 'px'; box.style.height = cropState.boxH + 'px';
}

function startCropDrag(e) {
  cropState.dragging = true;
  cropState.dragStartX = e.clientX - cropState.boxX;
  cropState.dragStartY = e.clientY - cropState.boxY;
  e.preventDefault();
}

function startCropResize(e, handle) {
  cropState.resizing = true;
  cropState.handle = handle.className.replace('crop-handle ', '');
  cropState.dragStartX = e.clientX; cropState.dragStartY = e.clientY;
  cropState._startBox = { ...cropState };
  e.preventDefault();
}

function onCropMouseMove(e) {
  const img = document.getElementById('cropImage');
  if (!img) return;
  const W = img.clientWidth, H = img.clientHeight;
  if (cropState.dragging) {
    cropState.boxX = Math.min(Math.max(0, e.clientX - cropState.dragStartX), W - cropState.boxW);
    cropState.boxY = Math.min(Math.max(0, e.clientY - cropState.dragStartY), H - cropState.boxH);
    applyCropBoxStyle();
  }
  if (cropState.resizing) {
    const dx = e.clientX - cropState.dragStartX, dy = e.clientY - cropState.dragStartY;
    const sb = cropState._startBox;
    let nx = sb.boxX, ny = sb.boxY, nw = sb.boxW, nh = sb.boxH;
    const h = cropState.handle;
    if (h.includes('r')) nw = Math.max(40, sb.boxW + dx);
    if (h.includes('l')) { nw = Math.max(40, sb.boxW - dx); nx = sb.boxX + (sb.boxW - nw); }
    if (h.includes('b')) nh = Math.max(40, sb.boxH + dy);
    if (h.includes('t')) { nh = Math.max(40, sb.boxH - dy); ny = sb.boxY + (sb.boxH - nh); }
    if (cropState.ratio !== 'free') {
      if (h.includes('r') || h.includes('l')) nh = nw / cropState.ratio;
      else nw = nh * cropState.ratio;
    }
    cropState.boxX = Math.max(0, Math.min(nx, W - nw));
    cropState.boxY = Math.max(0, Math.min(ny, H - nh));
    cropState.boxW = Math.min(nw, W); cropState.boxH = Math.min(nh, H);
    applyCropBoxStyle();
  }
}

function applyCrop() {
  const img = document.getElementById('cropImage');
  const scaleX = img.naturalWidth / img.clientWidth, scaleY = img.naturalHeight / img.clientHeight;
  const canvas = document.createElement('canvas');
  canvas.width = cropState.boxW * scaleX; canvas.height = cropState.boxH * scaleY;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, cropState.boxX * scaleX, cropState.boxY * scaleY, cropState.boxW * scaleX, cropState.boxH * scaleY, 0, 0, canvas.width, canvas.height);
  currentImages.push(canvas.toDataURL('image/jpeg', 0.92));
  renderImagePreviews();
  document.getElementById('imageEditModal').classList.remove('open');
}

// ====================================================
// VIDEO UPLOAD
// ====================================================
function initVideoUpload() {
  const zone = document.getElementById('videoDropZone');
  const input = document.getElementById('videoInput');
  zone.addEventListener('click', () => input.click());
  input.addEventListener('change', () => { if (input.files[0]) openVideoEditor(input.files[0]); });
  document.getElementById('closeVideoEditBtn').addEventListener('click', () => document.getElementById('videoEditModal').classList.remove('open'));
  document.getElementById('cancelVideoEditBtn').addEventListener('click', () => document.getElementById('videoEditModal').classList.remove('open'));
  document.getElementById('applyVideoEditBtn').addEventListener('click', applyVideoEdit);
  document.getElementById('previewTrimBtn').addEventListener('click', previewTrim);
  document.querySelectorAll('.ratio-btn[data-vratio]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.ratio-btn[data-vratio]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
  const vBox = document.getElementById('videoCropBox');
  let vDrag = false, vResize = false, vHandle = null, vSX = 0, vSY = 0, vSB = {};
  let vCrop = { x: 10, y: 10, w: 80, h: 80 };
  function applyVCropStyle() {
    vBox.style.left = vCrop.x + '%'; vBox.style.top = vCrop.y + '%';
    vBox.style.width = vCrop.w + '%'; vBox.style.height = vCrop.h + '%';
  }
  applyVCropStyle();
  vBox.addEventListener('mousedown', e => { vDrag = true; vSX = e.clientX; vSY = e.clientY; vSB = { ...vCrop }; e.preventDefault(); });
  vBox.querySelectorAll('.crop-handle').forEach(h => {
    h.addEventListener('mousedown', e => {
      e.stopPropagation(); vResize = true; vHandle = h.className.replace('crop-handle ', '');
      vSX = e.clientX; vSY = e.clientY; vSB = { ...vCrop }; e.preventDefault();
    });
  });
  document.addEventListener('mousemove', e => {
    const cont = document.getElementById('videoCropContainer');
    if (!cont) return;
    const W = cont.clientWidth, H = cont.clientHeight;
    if (vDrag) {
      vCrop.x = Math.min(Math.max(0, vSB.x + (e.clientX - vSX) / W * 100), 100 - vCrop.w);
      vCrop.y = Math.min(Math.max(0, vSB.y + (e.clientY - vSY) / H * 100), 100 - vCrop.h);
      applyVCropStyle();
    }
    if (vResize) {
      const dx = (e.clientX - vSX) / W * 100, dy = (e.clientY - vSY) / H * 100;
      if (vHandle.includes('r')) vCrop.w = Math.max(10, vSB.w + dx);
      if (vHandle.includes('b')) vCrop.h = Math.max(10, vSB.h + dy);
      if (vHandle.includes('l')) { vCrop.w = Math.max(10, vSB.w - dx); vCrop.x = vSB.x + (vSB.w - vCrop.w); }
      if (vHandle.includes('t')) { vCrop.h = Math.max(10, vSB.h - dy); vCrop.y = vSB.y + (vSB.h - vCrop.h); }
      vCrop.w = Math.min(vCrop.w, 100 - vCrop.x); vCrop.h = Math.min(vCrop.h, 100 - vCrop.y);
      applyVCropStyle();
    }
  });
  document.addEventListener('mouseup', () => { vDrag = false; vResize = false; });
}

function openVideoEditor(file) {
  currentVideoFile = file;
  const url = URL.createObjectURL(file);
  const editVid = document.getElementById('editVideo');
  const prevVid = document.getElementById('videoCropPreview');
  editVid.src = url; prevVid.src = url;
  editVid.onloadedmetadata = () => {
    document.getElementById('trimStart').value = 0;
    document.getElementById('trimEnd').value = editVid.duration.toFixed(1);
  };
  document.getElementById('videoEditModal').classList.add('open');
}

function previewTrim() {
  const vid = document.getElementById('editVideo');
  const start = parseFloat(document.getElementById('trimStart').value) || 0;
  vid.currentTime = start; vid.play();
  const end = parseFloat(document.getElementById('trimEnd').value) || vid.duration;
  const stopAt = () => { if (vid.currentTime >= end) { vid.pause(); vid.removeEventListener('timeupdate', stopAt); } };
  vid.addEventListener('timeupdate', stopAt);
}

function applyVideoEdit() {
  currentVideoTrim.start = parseFloat(document.getElementById('trimStart').value) || 0;
  currentVideoTrim.end = parseFloat(document.getElementById('trimEnd').value) || null;
  showVideoPreview();
  document.getElementById('videoEditModal').classList.remove('open');
}

function showVideoPreview() {
  const zone = document.getElementById('videoDropZone');
  let preview = zone.parentElement.querySelector('.video-media-preview');
  if (!preview) { preview = document.createElement('div'); preview.className = 'video-media-preview media-preview'; zone.parentElement.appendChild(preview); }
  const url = URL.createObjectURL(currentVideoFile);
  const dur = currentVideoTrim.end ? `${currentVideoTrim.start}s – ${currentVideoTrim.end}s` : 'Tam video';
  preview.innerHTML = `
    <video src="${url}" muted controls style="max-height:160px;width:100%;"></video>
    <div style="font-family:'IBM Plex Mono',monospace;font-size:9px;color:#888;margin-top:4px;letter-spacing:1px;">MÜDDƏTİ: ${dur}</div>
    <div class="media-preview-actions"><button class="action-btn secondary" id="reEditVideoBtn">Yenidən edit et</button></div>
  `;
  document.getElementById('reEditVideoBtn').addEventListener('click', () => document.getElementById('videoEditModal').classList.add('open'));
}

// ====================================================
// LINK INPUT
// ====================================================
function initLinkInput() {
  document.getElementById('newsLink').addEventListener('input', function () {
    document.getElementById('btnLabelGroup').style.display = this.value.trim() ? 'flex' : 'none';
  });
}

// ====================================================
// PUBLISH
// ====================================================
function initPublish() {
  document.getElementById('publishBtn').addEventListener('click', publishNews);
}

function publishNews() {
  const title = document.getElementById('newsTitle').value.trim();
  if (!title) { alert('Başlıq boş ola bilməz!'); return; }
  const body = document.getElementById('newsBody').value.trim();
  const link = document.getElementById('newsLink').value.trim();
  const btnLabel = document.getElementById('newsBtnLabel').value.trim() || 'Ətraflı oxu';
  const tags = [...document.querySelectorAll('.hashtag-input')].map(i => i.value.trim()).filter(Boolean).map(t => t.startsWith('#') ? t : '#' + t);
  const now = new Date();
  const dateStr = now.toLocaleString('az-AZ', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).toUpperCase();
  const item = { id: Date.now(), title, body, link, btnLabel, tags, date: dateStr, media: null, mediaType: null, images: [] };
  if (activeMediaType === 'image' && currentImages.length > 0) {
    item.images = [...currentImages];
    item.media = currentImages[0];
    item.mediaType = 'image';
  } else if (activeMediaType === 'video' && currentVideoFile) {
    item.media = URL.createObjectURL(currentVideoFile);
    item.mediaType = 'video';
  }
  news.unshift(item);
  renderView();
  closeNewsModal();
}

// ====================================================
// RENDER NEWS GRID
// ====================================================
function renderNewsGrid(items) {
  const grid = document.getElementById('newsGrid');
  if (!grid) return;
  if (!items || items.length === 0) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:48px;font-family:'IBM Plex Mono',monospace;font-size:11px;color:#AAA;letter-spacing:2px;">HƏLƏ XƏBƏRƏLƏRİ ƏLAVƏ EDİLMƏYİB</div>`;
    return;
  }
  grid.innerHTML = items.map(item => buildNewsCard(item)).join('');
  grid.querySelectorAll('.news-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = parseInt(card.dataset.id);
      const item = news.find(n => n.id === id);
      if (item) openExpandedCard(item);
    });
  });
  grid.querySelectorAll('.news-card-link-btn[data-href]').forEach(btn => {
    btn.addEventListener('click', e => { e.stopPropagation(); window.open(btn.dataset.href, '_blank'); });
  });
}

function buildNewsCard(item) {
  let topMedia = '';
  if (item.mediaType === 'image' && item.media) {
    topMedia = `<img src="${item.media}" alt="${escHtml(item.title)}" />`;
  } else if (item.mediaType === 'video' && item.media) {
    topMedia = `<video src="${item.media}" muted autoplay loop playsinline></video>`;
  } else {
    topMedia = `<div class="news-card-top-placeholder">NO MEDIA</div>`;
  }
  const hasMultiple = item.images && item.images.length > 1;
  const tagsHTML = item.tags.slice(0, 3).map(t => `<span class="news-card-tag">${escHtml(t)}</span>`).join('');
  const linkBtn = item.link ? `<a class="news-card-link-btn" data-href="${escHtml(item.link)}" href="${escHtml(item.link)}" target="_blank" rel="noopener">${escHtml(item.btnLabel)}</a>` : '';
  const excerpt = item.body.length > 100 ? item.body.slice(0, 100) + '…' : item.body;
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
            <span class="news-card-meta">${escHtml(item.date)}</span>
            <div class="news-card-tags">${tagsHTML}</div>
          </div>
          ${linkBtn}
        </div>
      </div>
    </article>
  `;
}

// ====================================================
// EXPANDED CARD — tam sətir, X, Instagram slider
// ====================================================
function openExpandedCard(item) {
  let overlay = document.getElementById('expandedCardOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'expandedCardOverlay';
    document.body.appendChild(overlay);
  }

  const images = item.images && item.images.length > 0 ? item.images : (item.media && item.mediaType === 'image' ? [item.media] : []);
  let mediaHTML = '';

  if (images.length > 1) {
    mediaHTML = `
      <div class="exp-slider" id="expSlider">
        <div class="exp-slider-track" id="expSliderTrack">
          ${images.map((src, i) => `<div class="exp-slide"><img src="${src}" alt="slide ${i+1}" /></div>`).join('')}
        </div>
        <button class="exp-slider-btn exp-slider-prev" id="expSliderPrev">&#8249;</button>
        <button class="exp-slider-btn exp-slider-next" id="expSliderNext">&#8250;</button>
        <div class="exp-slider-dots">
          ${images.map((_, i) => `<span class="exp-dot${i===0?' active':''}" data-idx="${i}"></span>`).join('')}
        </div>
      </div>`;
  } else if (images.length === 1) {
    mediaHTML = `<div class="exp-media-single"><img src="${images[0]}" alt="${escHtml(item.title)}" /></div>`;
  } else if (item.mediaType === 'video' && item.media) {
    mediaHTML = `<div class="exp-media-single"><video src="${item.media}" controls autoplay muted playsinline></video></div>`;
  }

  const tagsHTML = item.tags.map(t => `<span class="exp-tag">${escHtml(t)}</span>`).join('');
  const linkBtn = item.link ? `<a class="exp-link-btn" href="${escHtml(item.link)}" target="_blank" rel="noopener">${escHtml(item.btnLabel)}</a>` : '';

  overlay.innerHTML = `
    <div class="exp-card">
      <button class="exp-close-btn" id="expCloseBtn">✕</button>
      ${mediaHTML}
      <div class="exp-content">
        <div class="exp-meta">${escHtml(item.date)}</div>
        <h2 class="exp-title">${escHtml(item.title)}</h2>
        <p class="exp-body">${escHtml(item.body)}</p>
        <div class="exp-footer">
          <div class="exp-tags">${tagsHTML}</div>
          ${linkBtn}
        </div>
      </div>
    </div>
  `;

  overlay.classList.add('open');

  document.getElementById('expCloseBtn').addEventListener('click', () => overlay.classList.remove('open'));
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.remove('open'); });

  // ESC klavişi ilə bağla
  const escHandler = e => { if (e.key === 'Escape') { overlay.classList.remove('open'); document.removeEventListener('keydown', escHandler); } };
  document.addEventListener('keydown', escHandler);

  // Slider
  if (images.length > 1) {
    let cur = 0;
    const track = document.getElementById('expSliderTrack');
    const dots = overlay.querySelectorAll('.exp-dot');
    function goTo(idx) {
      cur = Math.max(0, Math.min(idx, images.length - 1));
      track.style.transform = `translateX(-${cur * 100}%)`;
      dots.forEach((d, i) => d.classList.toggle('active', i === cur));
    }
    document.getElementById('expSliderPrev').addEventListener('click', () => goTo(cur - 1));
    document.getElementById('expSliderNext').addEventListener('click', () => goTo(cur + 1));
    dots.forEach(dot => dot.addEventListener('click', () => goTo(parseInt(dot.dataset.idx))));
    let tx = 0;
    track.addEventListener('touchstart', e => { tx = e.touches[0].clientX; }, { passive: true });
    track.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - tx;
      if (Math.abs(dx) > 40) goTo(dx < 0 ? cur + 1 : cur - 1);
    }, { passive: true });
  }
}

// ====================================================
// UTILS
// ====================================================
function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
