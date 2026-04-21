// ==============================
// AZREP — script.js  (Yenilənmiş: YouTube-vari Yorum Sistemi + Firestore)
// ==============================

import { initializeApp }          from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAnalytics }           from "https://www.gstatic.com/firebasejs/10.12.0/firebase-analytics.js";
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  orderBy,
  query,
  where,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDzCQsF10gofC5sdwIXK2wlX0QKRxY4vE4",
    authDomain: "hiprhyme-2587e.firebaseapp.com",
    projectId: "hiprhyme-2587e",
    storageBucket: "hiprhyme-2587e.firebasestorage.app",
    messagingSenderId: "401645996625",
    appId: "1:401645996625:web:a168b32f7121b9fb95c670",
    measurementId: "G-09GGXC0499"
};

const app       = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db        = getFirestore(app);

let news            = [];
let currentImages   = [];
let currentVideoFile = null;
let currentVideoTrim = { start: 0, end: null };
let activeMediaType  = 'image';
let currentSection   = 'home';

let cropState = {
  img: null, containerW: 0, containerH: 0,
  imgW: 0, imgH: 0, boxX: 0, boxY: 0, boxW: 0, boxH: 0,
  ratio: 1, dragging: false, resizing: false,
  dragStartX: 0, dragStartY: 0, handle: null
};

document.addEventListener('DOMContentLoaded', () => {
  setCurrentDate(); initNav(); initTicker(); initModal();
  initDrawer(); initImageUpload(); initVideoUpload();
  initMediaTabs(); initLinkInput(); initPublish(); loadNews();
});

async function loadNews() {
  showGridLoading(true);
  try {
    const q = query(collection(db, 'news'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    news = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (err) {
    console.error('Xəbərlər yüklənərkən xəta:', err);
    showGridError(err.message); return;
  } finally { showGridLoading(false); }
  renderView();
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
function setCurrentDate() {
  const el = document.getElementById('current-date');
  if (!el) return;
  el.textContent = new Date().toLocaleDateString('az-AZ', { weekday:'long', year:'numeric', month:'long', day:'numeric' }).toUpperCase();
}
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
function renderView() {
  const featureSection  = document.querySelector('.feature-section');
  const newsGridSection = document.querySelector('.news-grid-section');
  const sectionTag      = newsGridSection ? newsGridSection.querySelector('.section-tag') : null;
  if (currentSection === 'news') {
    if (featureSection) featureSection.style.display = 'none';
    if (sectionTag) sectionTag.textContent = 'BÜTÜN XƏBƏRLƏR';
    renderNewsGrid(news);
  } else {
    if (featureSection) featureSection.style.display = '';
    if (sectionTag) sectionTag.textContent = 'SON XƏBƏRLƏR';
    renderNewsGrid(news.slice(0, 4));
  }
}
function initTicker() {
  const ticker = document.querySelector('.ticker-track');
  if (!ticker) return;
  ticker.addEventListener('mouseenter', () => ticker.style.animationPlayState = 'paused');
  ticker.addEventListener('mouseleave', () => ticker.style.animationPlayState = 'running');
}
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
function initDrawer() {
  const drawer  = document.getElementById('sideDrawer');
  const overlay = document.getElementById('drawerOverlay');
  const openBtn = document.getElementById('hamburgerBtn');
  const closeBtn = document.getElementById('drawerClose');
  function openDrawer()  { drawer.classList.add('open'); overlay.classList.add('open'); document.body.style.overflow = 'hidden'; }
  function closeDrawer() { drawer.classList.remove('open'); overlay.classList.remove('open'); document.body.style.overflow = ''; }
  if (openBtn)  openBtn.addEventListener('click', openDrawer);
  if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
  if (overlay)  overlay.addEventListener('click', closeDrawer);
  document.querySelectorAll('.drawer-link').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
      const matchingNav = document.querySelector(`.nav-link[data-section="${link.dataset.section}"]`);
      if (matchingNav) matchingNav.classList.add('active');
      currentSection = link.dataset.section;
      renderView();
      closeDrawer();
    });
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDrawer(); });
}
function resetForm() {
  document.getElementById('newsTitle').value    = '';
  document.getElementById('newsBody').value     = '';
  document.getElementById('newsLink').value     = '';
  document.getElementById('newsBtnLabel').value = '';
  document.getElementById('titleCount').textContent    = '0/120';
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
function initImageUpload() {
  const zone  = document.getElementById('imageDropZone');
  const input = document.getElementById('imageInput');
  input.setAttribute('multiple', 'true');
  zone.addEventListener('click', () => input.click());
  input.addEventListener('change', () => { if (input.files.length > 0) handleImageFiles(input.files); input.value = ''; });
  document.getElementById('closeImageEditBtn').addEventListener('click', () => document.getElementById('imageEditModal').classList.remove('open'));
  document.getElementById('cancelCropBtn').addEventListener('click', () => document.getElementById('imageEditModal').classList.remove('open'));
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
    reader.onload = e => { currentImages.push(e.target.result); loaded++; if (loaded === toAdd.length) renderImagePreviews(); };
    reader.readAsDataURL(file);
  });
  if (toAdd.length < files.length) alert(`Yalnız ${toAdd.length} şəkil əlavə edildi. Limit: 10 şəkil.`);
}
function renderImagePreviews() {
  const zone = document.getElementById('imageDropZone');
  let container = document.getElementById('imagePreviewContainer');
  if (!container) { container = document.createElement('div'); container.id = 'imagePreviewContainer'; zone.parentElement.appendChild(container); }
  if (currentImages.length === 0) {
    container.innerHTML = '';
    document.getElementById('imageDropLabel').innerHTML = '<span>Şəkillər seçmək üçün klikləyin</span><small>JPG, PNG, WEBP — maks. 10 şəkil</small>';
    return;
  }
  document.getElementById('imageDropLabel').innerHTML = `<span>✓ ${currentImages.length} şəkil seçildi</span><small>Daha əlavə etmək üçün klikləyin (maks. 10)</small>`;
  container.innerHTML = `
    <div class="img-preview-grid">
      ${currentImages.map((src, i) => `<div class="img-preview-thumb"><img src="${src}" alt="preview ${i+1}" /><button class="img-thumb-remove" data-idx="${i}" title="Sil">✕</button></div>`).join('')}
    </div>
    <div class="img-preview-count">${currentImages.length}/10 şəkil seçildi</div>
  `;
  container.querySelectorAll('.img-thumb-remove').forEach(btn => {
    btn.addEventListener('click', e => { e.stopPropagation(); currentImages.splice(parseInt(btn.dataset.idx), 1); renderImagePreviews(); });
  });
}
function applyCrop() {
  const img = document.getElementById('cropImage');
  const scaleX = img.naturalWidth / img.clientWidth, scaleY = img.naturalHeight / img.clientHeight;
  const canvas = document.createElement('canvas');
  canvas.width = cropState.boxW * scaleX; canvas.height = cropState.boxH * scaleY;
  canvas.getContext('2d').drawImage(img, cropState.boxX * scaleX, cropState.boxY * scaleY, cropState.boxW * scaleX, cropState.boxH * scaleY, 0, 0, canvas.width, canvas.height);
  currentImages.push(canvas.toDataURL('image/jpeg', 0.92));
  renderImagePreviews();
  document.getElementById('imageEditModal').classList.remove('open');
}
function resetCropBox() {
  const img = document.getElementById('cropImage');
  const W = img.clientWidth, H = img.clientHeight;
  let bw, bh;
  if (cropState.ratio === 'free') { bw = W * 0.7; bh = H * 0.7; }
  else { bw = Math.min(W * 0.7, H * 0.7 * cropState.ratio); bh = bw / cropState.ratio; }
  cropState.boxX = (W - bw) / 2; cropState.boxY = (H - bh) / 2;
  cropState.boxW = bw; cropState.boxH = bh;
  applyCropBoxStyle();
}
function applyCropBoxStyle() {
  const box = document.getElementById('cropBox');
  box.style.left = cropState.boxX + 'px'; box.style.top = cropState.boxY + 'px';
  box.style.width = cropState.boxW + 'px'; box.style.height = cropState.boxH + 'px';
}
function startCropDrag(e) { cropState.dragging = true; cropState.dragStartX = e.clientX - cropState.boxX; cropState.dragStartY = e.clientY - cropState.boxY; e.preventDefault(); }
function startCropResize(e, handle) {
  cropState.resizing = true; cropState.handle = handle.className.replace('crop-handle ', '');
  cropState.dragStartX = e.clientX; cropState.dragStartY = e.clientY;
  cropState._startBox = { ...cropState }; e.preventDefault();
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
    if (cropState.ratio !== 'free') { if (h.includes('r') || h.includes('l')) nh = nw / cropState.ratio; else nw = nh * cropState.ratio; }
    cropState.boxX = Math.max(0, Math.min(nx, W - nw)); cropState.boxY = Math.max(0, Math.min(ny, H - nh));
    cropState.boxW = Math.min(nw, W); cropState.boxH = Math.min(nh, H);
    applyCropBoxStyle();
  }
}
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
    btn.addEventListener('click', () => { document.querySelectorAll('.ratio-btn[data-vratio]').forEach(b => b.classList.remove('active')); btn.classList.add('active'); });
  });
  const vBox = document.getElementById('videoCropBox');
  let vDrag = false, vResize = false, vHandle = null, vSX = 0, vSY = 0, vSB = {};
  let vCrop = { x: 10, y: 10, w: 80, h: 80 };
  function applyVCropStyle() { vBox.style.left = vCrop.x + '%'; vBox.style.top = vCrop.y + '%'; vBox.style.width = vCrop.w + '%'; vBox.style.height = vCrop.h + '%'; }
  applyVCropStyle();
  vBox.addEventListener('mousedown', e => { vDrag = true; vSX = e.clientX; vSY = e.clientY; vSB = { ...vCrop }; e.preventDefault(); });
  vBox.querySelectorAll('.crop-handle').forEach(h => {
    h.addEventListener('mousedown', e => { e.stopPropagation(); vResize = true; vHandle = h.className.replace('crop-handle ', ''); vSX = e.clientX; vSY = e.clientY; vSB = { ...vCrop }; e.preventDefault(); });
  });
  document.addEventListener('mousemove', e => {
    const cont = document.getElementById('videoCropContainer');
    if (!cont) return;
    const W = cont.clientWidth, H = cont.clientHeight;
    if (vDrag) { vCrop.x = Math.min(Math.max(0, vSB.x + (e.clientX - vSX) / W * 100), 100 - vCrop.w); vCrop.y = Math.min(Math.max(0, vSB.y + (e.clientY - vSY) / H * 100), 100 - vCrop.h); applyVCropStyle(); }
    if (vResize) {
      const dx = (e.clientX - vSX) / W * 100, dy = (e.clientY - vSY) / H * 100;
      if (vHandle.includes('r')) vCrop.w = Math.max(10, vSB.w + dx);
      if (vHandle.includes('b')) vCrop.h = Math.max(10, vSB.h + dy);
      if (vHandle.includes('l')) { vCrop.w = Math.max(10, vSB.w - dx); vCrop.x = vSB.x + (vSB.w - vCrop.w); }
      if (vHandle.includes('t')) { vCrop.h = Math.max(10, vSB.h - dy); vCrop.y = vSB.y + (vSB.h - vCrop.h); }
      vCrop.w = Math.min(vCrop.w, 100 - vCrop.x); vCrop.h = Math.min(vCrop.h, 100 - vCrop.y); applyVCropStyle();
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
  editVid.onloadedmetadata = () => { document.getElementById('trimStart').value = 0; document.getElementById('trimEnd').value = editVid.duration.toFixed(1); };
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
  preview.innerHTML = `<video src="${url}" muted controls style="max-height:160px;width:100%;"></video><div style="font-family:'IBM Plex Mono',monospace;font-size:9px;color:#888;margin-top:4px;letter-spacing:1px;">MÜDDƏTİ: ${dur}</div><div class="media-preview-actions"><button class="action-btn secondary" id="reEditVideoBtn">Yenidən edit et</button></div>`;
  document.getElementById('reEditVideoBtn').addEventListener('click', () => document.getElementById('videoEditModal').classList.add('open'));
}
function initLinkInput() {
  document.getElementById('newsLink').addEventListener('input', function () {
    document.getElementById('btnLabelGroup').style.display = this.value.trim() ? 'flex' : 'none';
  });
}
function initPublish() { document.getElementById('publishBtn').addEventListener('click', publishNews); }
async function publishNews() {
  const title = document.getElementById('newsTitle').value.trim();
  if (!title) { alert('Başlıq boş ola bilməz!'); return; }
  const publishBtn = document.getElementById('publishBtn');
  publishBtn.disabled = true; publishBtn.textContent = 'YÜKLƏNIR…';
  const body = document.getElementById('newsBody').value.trim();
  const link = document.getElementById('newsLink').value.trim();
  const btnLabel = document.getElementById('newsBtnLabel').value.trim() || 'Ətraflı oxu';
  const tags = [...document.querySelectorAll('.hashtag-input')].map(i => i.value.trim()).filter(Boolean).map(t => t.startsWith('#') ? t : '#' + t);
  const now = new Date();
  const dateStr = now.toLocaleString('az-AZ', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }).toUpperCase();
  let imageUrls = [], mediaUrl = null, mediaType = null;
  try {
    if (activeMediaType === 'image' && currentImages.length > 0) {
      mediaType = 'image';
      for (let i = 0; i < currentImages.length; i++) { const compressed = await compressImage(currentImages[i], 800, 0.75); imageUrls.push(compressed); }
      mediaUrl = imageUrls[0];
    }
    if (activeMediaType === 'video' && currentVideoFile) { mediaType = 'video'; mediaUrl = await fileToBase64(currentVideoFile); }
    const docData = { title, body, link, btnLabel, tags, date: dateStr, mediaType: mediaType || null, media: mediaUrl || null, images: imageUrls, createdAt: serverTimestamp() };
    const docRef = await addDoc(collection(db, 'news'), docData);
    news.unshift({ id: docRef.id, ...docData });
    renderView(); closeNewsModal();
  } catch (err) {
    console.error('Yayımlanarkən xəta:', err); alert('Xəta baş verdi: ' + err.message);
  } finally { publishBtn.disabled = false; publishBtn.textContent = 'YAYIMLA'; }
}

// ============================================================
// NEWS GRID
// ============================================================
function renderNewsGrid(items) {
  const grid = document.getElementById('newsGrid');
  if (!grid) return;
  // Mövcud expanded row-u sil
  grid.querySelectorAll('.news-expanded-row').forEach(r => r.remove());
  if (!items || items.length === 0) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:48px;font-family:'IBM Plex Mono',monospace;font-size:11px;color:#AAA;letter-spacing:2px;">HƏLƏ XƏBƏRLƏRİ ƏLAVƏ EDİLMƏYİB</div>`;
    return;
  }
  grid.innerHTML = items.map(item => buildNewsCard(item)).join('');
  grid.querySelectorAll('.news-card').forEach(card => {
    card.addEventListener('click', e => {
      if (e.target.closest('.news-card-link-btn')) return;
      const id = card.dataset.id;
      const item = news.find(n => n.id === id);
      if (item) toggleExpandedRow(card, item, grid);
    });
  });
  grid.querySelectorAll('.news-card-link-btn[data-href]').forEach(btn => {
    btn.addEventListener('click', e => { e.stopPropagation(); window.open(btn.dataset.href, '_blank'); });
  });
}
function buildNewsCard(item) {
  let topMedia = '';
  if (item.mediaType === 'image' && item.media) topMedia = `<img src="${item.media}" alt="${escHtml(item.title)}" />`;
  else if (item.mediaType === 'video' && item.media) topMedia = `<video src="${item.media}" muted autoplay loop playsinline></video>`;
  else topMedia = `<div class="news-card-top-placeholder">NO MEDIA</div>`;
  const hasMultiple = item.images && item.images.length > 1;
  const tagsHTML = (item.tags || []).slice(0, 3).map(t => `<span class="news-card-tag">${escHtml(t)}</span>`).join('');
  const linkBtn = item.link ? `<a class="news-card-link-btn" data-href="${escHtml(item.link)}" href="${escHtml(item.link)}" target="_blank" rel="noopener">${escHtml(item.btnLabel)}</a>` : '';
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
function getGridColumns(grid) {
  const style = window.getComputedStyle(grid);
  const cols = style.gridTemplateColumns.split(' ').filter(s => s.trim() !== '').length;
  return cols || 4;
}
function closeExpandedRow(row, card) {
  row.classList.remove('open');
  if (card) card.classList.remove('is-open');
  setTimeout(() => { if (row.parentNode) row.remove(); }, 460);
}
function toggleExpandedRow(card, item, grid) {
  const existingRow = grid.querySelector('.news-expanded-row.open');
  if (existingRow && existingRow.dataset.forId === item.id) { closeExpandedRow(existingRow, card); return; }
  if (existingRow) { const prevCard = grid.querySelector(`.news-card[data-id="${existingRow.dataset.forId}"]`); closeExpandedRow(existingRow, prevCard); }
  card.classList.add('is-open');
  const row = buildExpandedRow(item);
  const cols = getGridColumns(grid);
  const cards = Array.from(grid.querySelectorAll('.news-card'));
  const idx = cards.indexOf(card);
  const rowLastIdx = Math.min(Math.floor(idx / cols) * cols + cols - 1, cards.length - 1);
  cards[rowLastIdx].insertAdjacentElement('afterend', row);
  requestAnimationFrame(() => requestAnimationFrame(() => row.classList.add('open')));
  setTimeout(() => row.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 80);
  row.querySelector('.exp-close-row-btn').addEventListener('click', e => { e.stopPropagation(); closeExpandedRow(row, card); });
  const escHandler = e => { if (e.key === 'Escape') { closeExpandedRow(row, card); document.removeEventListener('keydown', escHandler); } };
  document.addEventListener('keydown', escHandler);
  initExpandedSlider(row, item);
  loadComments(item.id, row);
}
function buildExpandedRow(item) {
  const images = item.images && item.images.length > 0 ? item.images : (item.media && item.mediaType === 'image' ? [item.media] : []);
  let mediaHTML = '';
  if (images.length > 1) {
    mediaHTML = `<div class="exp-slider" id="expSlider_${item.id}"><div class="exp-slider-track" id="expSliderTrack_${item.id}">${images.map((src, i) => `<div class="exp-slide"><img src="${src}" alt="slide ${i+1}" loading="lazy" /></div>`).join('')}</div><button class="exp-slider-btn exp-slider-prev">&#8249;</button><button class="exp-slider-btn exp-slider-next">&#8250;</button><div class="exp-slider-dots">${images.map((_, i) => `<span class="exp-dot${i===0?' active':''}" data-idx="${i}"></span>`).join('')}</div></div>`;
  } else if (images.length === 1) {
    mediaHTML = `<div class="exp-media-single"><img src="${images[0]}" alt="${escHtml(item.title)}" /></div>`;
  } else if (item.mediaType === 'video' && item.media) {
    mediaHTML = `<div class="exp-media-single"><video src="${item.media}" controls autoplay muted playsinline></video></div>`;
  }
  const tagsHTML = (item.tags || []).map(t => `<span class="exp-tag">${escHtml(t)}</span>`).join('');
  const linkBtn = item.link ? `<a class="exp-link-btn" href="${escHtml(item.link)}" target="_blank" rel="noopener">${escHtml(item.btnLabel || 'Ətraflı')}</a>` : '';
  const row = document.createElement('div');
  row.className = 'news-expanded-row';
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
  const images = item.images && item.images.length > 0 ? item.images : (item.media && item.mediaType === 'image' ? [item.media] : []);
  if (images.length <= 1) return;
  let cur = 0;
  const dots = row.querySelectorAll('.exp-dot');
  function goTo(idx) { cur = Math.max(0, Math.min(idx, images.length - 1)); track.style.transform = `translateX(-${cur * 100}%)`; dots.forEach((d, i) => d.classList.toggle('active', i === cur)); }
  row.querySelector('.exp-slider-prev').addEventListener('click', e => { e.stopPropagation(); goTo(cur - 1); });
  row.querySelector('.exp-slider-next').addEventListener('click', e => { e.stopPropagation(); goTo(cur + 1); });
  dots.forEach(dot => dot.addEventListener('click', e => { e.stopPropagation(); goTo(parseInt(dot.dataset.idx)); }));
  let tx = 0;
  track.addEventListener('touchstart', e => { tx = e.touches[0].clientX; }, { passive: true });
  track.addEventListener('touchend', e => { const dx = e.changedTouches[0].clientX - tx; if (Math.abs(dx) > 40) goTo(dx < 0 ? cur + 1 : cur - 1); }, { passive: true });
}

// ============================================================
// UTILS
// ============================================================
function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function compressImage(base64, maxWidth, quality) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement('canvas');
      canvas.width = img.width * scale; canvas.height = img.height * scale;
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.src = base64;
  });
}
function fileToBase64(file) {
  return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = e => resolve(e.target.result); reader.onerror = reject; reader.readAsDataURL(file); });
}
function formatDate(ts) {
  if (!ts) return 'İndi';
  try { const d = ts?.toDate ? ts.toDate() : new Date(ts); return d.toLocaleDateString('az-AZ', { day:'2-digit', month:'short', year:'numeric' }); } catch { return ''; }
}

// ============================================================
// 🔥 YORUMLAR — YouTube-vari sistem (Firestore + parentId)
// ============================================================
async function loadComments(newsId, row) {
  const container = row.querySelector(`#expComments_${newsId}`);
  if (!container) return;

  let allComments = [];
  try {
    const q = query(collection(db, 'comments'), where('newsId', '==', newsId), orderBy('createdAt', 'asc'));
    const snap = await getDocs(q);
    allComments = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (err) { console.error('Yorumlar yüklənmədi:', err); }

  const topLevel = allComments.filter(c => !c.parentId);
  const replies  = allComments.filter(c => !!c.parentId);
  const total    = allComments.length;

  container.innerHTML = `
    <div class="exp-comments-header">
      <div class="exp-comments-title">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
        YORUMLAR ${total > 0 ? `<span class="comment-count-badge">${total}</span>` : ''}
      </div>
      ${total > 0 ? `<button class="comments-toggle-btn" data-open="false" data-news-id="${newsId}"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg> ${total} yorumu göstər</button>` : ''}
    </div>

    <div class="comment-add-form">
      <div class="comment-form-avatar"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg></div>
      <div class="comment-form-fields">
        <input type="text" class="comment-name-input main-name-input" placeholder="Adınız" maxlength="40" autocomplete="off" />
        <textarea class="comment-text-input main-text-input" placeholder="Yorum əlavə edin..." maxlength="500" rows="1"></textarea>
        <div class="comment-form-actions main-form-actions" style="display:none;">
          <span class="comment-error-msg main-error-msg"></span>
          <div class="comment-form-btns">
            <button class="comment-cancel-btn main-cancel-btn">Ləğv et</button>
            <button class="comment-submit-btn main-submit-btn" data-parent-id="" data-news-id="${newsId}">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="comment-list" id="commentList_${newsId}" style="display:none;">
      ${topLevel.length === 0
        ? '<div class="comment-empty">Hələ yorum yoxdur. İlk yorumu sən yaz!</div>'
        : topLevel.map(c => buildCommentItemHTML(c, replies, newsId)).join('')}
    </div>
  `;

  // Ana textarea focus/blur
  const mainTextarea = container.querySelector('.main-text-input');
  const mainActions  = container.querySelector('.main-form-actions');
  const mainCancel   = container.querySelector('.main-cancel-btn');
  const mainName     = container.querySelector('.main-name-input');

  mainTextarea.addEventListener('focus', () => { mainActions.style.display = 'flex'; mainTextarea.rows = 3; });
  mainCancel.addEventListener('click', () => { mainTextarea.value = ''; mainTextarea.rows = 1; mainActions.style.display = 'none'; mainName.value = ''; mainName.classList.remove('error'); });

  // Yorumlar toggle
  const toggleBtn = container.querySelector('.comments-toggle-btn');
  const listEl    = container.querySelector(`#commentList_${newsId}`);
  if (toggleBtn && listEl) {
    toggleBtn.addEventListener('click', () => {
      const isOpen = toggleBtn.dataset.open === 'true';
      listEl.style.display = isOpen ? 'none' : 'flex';
      toggleBtn.dataset.open = isOpen ? 'false' : 'true';
      toggleBtn.innerHTML = isOpen
        ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg> ${total} yorumu göstər`
        : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="18 15 12 9 6 15"></polyline></svg> Yorumları gizlət`;
    });
  }

  // Cavabları göstər toggles
  container.querySelectorAll('.comment-replies-toggle').forEach(t => initRepliesToggle(t, container));

  // Cavab ver düymələri
  container.querySelectorAll('.comment-reply-btn').forEach(btn => {
    btn.addEventListener('click', () => toggleReplyForm(container, btn.dataset.commentId));
  });
  container.querySelectorAll('.reply-cancel-btn').forEach(btn => {
    btn.addEventListener('click', () => { const rf = btn.closest('.comment-reply-form'); if (rf) rf.style.display = 'none'; });
  });

  // Submit (event delegation)
  container.addEventListener('click', async (e) => {
    const submitBtn = e.target.closest('.comment-submit-btn');
    if (!submitBtn) return;
    const formEl   = submitBtn.closest('.comment-add-form') || submitBtn.closest('.comment-reply-form');
    if (!formEl) return;
    const nameInput = formEl.querySelector('.comment-name-input');
    const textInput = formEl.querySelector('.comment-text-input');
    const errorMsg  = formEl.querySelector('.comment-error-msg');
    const parentId  = submitBtn.dataset.parentId || null;
    const nId       = submitBtn.dataset.newsId || newsId;

    const author = (nameInput?.value || '').trim();
    const text   = (textInput?.value || '').trim();

    if (!author) {
      if (nameInput) { nameInput.classList.add('error'); nameInput.focus(); }
      if (errorMsg)  { errorMsg.textContent = 'Ad yazmaq məcburidir'; errorMsg.classList.add('visible'); }
      return;
    }
    if (nameInput) nameInput.classList.remove('error');
    if (errorMsg)  { errorMsg.textContent = ''; errorMsg.classList.remove('visible'); }
    if (!text) { if (textInput) textInput.focus(); return; }

    const origHTML = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>';

    try {
      const commentData = { newsId: nId, author, text, parentId: parentId || null, createdAt: serverTimestamp() };
      const docRef = await addDoc(collection(db, 'comments'), commentData);
      const newComment = { id: docRef.id, ...commentData };

      if (textInput) { textInput.value = ''; textInput.rows = 1; }

      if (parentId) {
        // Cavab əlavə et
        const replyForm = container.querySelector(`#replyForm_${parentId}`);
        if (replyForm) replyForm.style.display = 'none';
        addReplyToDOM(container, parentId, newComment, nId);
      } else {
        // Ana yorum əlavə et
        const listEl2 = container.querySelector(`#commentList_${nId}`);
        if (listEl2) {
          listEl2.style.display = 'flex';
          const emptyEl = listEl2.querySelector('.comment-empty');
          if (emptyEl) emptyEl.remove();
          const el = document.createElement('div');
          el.className = 'comment-item';
          el.dataset.commentId = docRef.id;
          el.innerHTML = buildCommentBodyHTML(newComment, [], nId);
          listEl2.appendChild(el);
          el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          initNewCommentEvents(el, container, nId);
          // Toggle/badge yenilə
          updateCommentsToggle(container, nId, 1);
        }
        // Ana formu bağla
        const ma = container.querySelector('.main-form-actions');
        if (ma) ma.style.display = 'none';
      }
    } catch (err) {
      alert('Yorum göndərilmədi: ' + err.message);
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = origHTML;
    }
  });
}

function buildCommentItemHTML(comment, allReplies, newsId) {
  const myReplies = allReplies.filter(r => r.parentId === comment.id);
  return `<div class="comment-item" data-comment-id="${comment.id}">${buildCommentBodyHTML(comment, myReplies, newsId)}</div>`;
}

function buildCommentBodyHTML(comment, myReplies, newsId) {
  const dateStr = formatDate(comment.createdAt);
  const replyForms = `
    <div class="comment-reply-form" id="replyForm_${comment.id}" style="display:none;">
      <input type="text" class="comment-name-input reply-name-input" placeholder="Adınız" maxlength="40" autocomplete="off" />
      <textarea class="comment-text-input reply-text-input" placeholder="@${escHtml(comment.author || 'Anonim')} cavab verin..." maxlength="500" rows="2"></textarea>
      <div class="comment-form-actions">
        <span class="comment-error-msg"></span>
        <div class="comment-form-btns">
          <button class="comment-cancel-btn reply-cancel-btn">Ləğv et</button>
          <button class="comment-submit-btn reply-submit-btn" data-parent-id="${comment.id}" data-news-id="${newsId}">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
          </button>
        </div>
      </div>
    </div>`;
  const repliesHTML = myReplies.length > 0 ? `
    <button class="comment-replies-toggle" data-comment-id="${comment.id}">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
      ${myReplies.length} cavabı göstər
    </button>
    <div class="comment-replies" id="replies_${comment.id}" style="display:none;">
      ${myReplies.map(r => `<div class="comment-item comment-reply" data-comment-id="${r.id}">${buildCommentBodyHTML(r, [], newsId)}</div>`).join('')}
    </div>` : '';
  return `
    <div class="comment-avatar"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg></div>
    <div class="comment-body">
      <div class="comment-item-header">
        <span class="comment-author">${escHtml(comment.author || 'Anonim')}</span>
        <span class="comment-date">${escHtml(dateStr)}</span>
      </div>
      <div class="comment-text">${escHtml(comment.text || '')}</div>
      <div class="comment-actions">
        <button class="comment-reply-btn" data-comment-id="${comment.id}" data-author="${escHtml(comment.author || 'Anonim')}">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 17 4 12 9 7"></polyline><path d="M20 18v-2a4 4 0 0 0-4-4H4"></path></svg>
          Cavab ver
        </button>
      </div>
      ${replyForms}
      ${repliesHTML}
    </div>
  `;
}

function initRepliesToggle(toggle, container) {
  toggle.addEventListener('click', () => {
    const cid = toggle.dataset.commentId;
    const repliesEl = container.querySelector(`#replies_${cid}`);
    if (!repliesEl) return;
    const isVisible = repliesEl.style.display !== 'none';
    repliesEl.style.display = isVisible ? 'none' : 'flex';
    const count = repliesEl.querySelectorAll('.comment-reply').length;
    toggle.innerHTML = isVisible
      ? `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg> ${count} cavabı göstər`
      : `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="18 15 12 9 6 15"></polyline></svg> ${count} cavabı gizlət`;
  });
}

function toggleReplyForm(container, commentId) {
  const allForms = container.querySelectorAll('.comment-reply-form');
  const target = container.querySelector(`#replyForm_${commentId}`);
  const wasHidden = !target || target.style.display === 'none';
  allForms.forEach(f => f.style.display = 'none');
  if (wasHidden && target) {
    target.style.display = 'flex';
    target.querySelector('.reply-name-input')?.focus();
  }
}

function addReplyToDOM(container, parentId, newComment, newsId) {
  const parentItem = container.querySelector(`.comment-item[data-comment-id="${parentId}"]`);
  if (!parentItem) return;
  const bodyEl = parentItem.querySelector('.comment-body');
  if (!bodyEl) return;
  let repliesEl = container.querySelector(`#replies_${parentId}`);
  if (!repliesEl) {
    // Yeni replies container yarat
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'comment-replies-toggle';
    toggleBtn.dataset.commentId = parentId;
    toggleBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="18 15 12 9 6 15"></polyline></svg> 1 cavabı gizlət`;
    repliesEl = document.createElement('div');
    repliesEl.className = 'comment-replies';
    repliesEl.id = `replies_${parentId}`;
    repliesEl.style.display = 'flex';
    bodyEl.appendChild(toggleBtn);
    bodyEl.appendChild(repliesEl);
    initRepliesToggle(toggleBtn, container);
  } else {
    repliesEl.style.display = 'flex';
    // Toggle mətni yenilə
    const tog = container.querySelector(`.comment-replies-toggle[data-comment-id="${parentId}"]`);
    if (tog) {
      const cnt = repliesEl.querySelectorAll('.comment-reply').length + 1;
      tog.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="18 15 12 9 6 15"></polyline></svg> ${cnt} cavabı gizlət`;
    }
  }
  const replyEl = document.createElement('div');
  replyEl.className = 'comment-item comment-reply';
  replyEl.dataset.commentId = newComment.id;
  replyEl.innerHTML = buildCommentBodyHTML(newComment, [], newsId);
  repliesEl.appendChild(replyEl);
  replyEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  initNewCommentEvents(replyEl, container, newsId);
  updateCommentsToggle(container, newsId, 1);
}

function initNewCommentEvents(el, container, newsId) {
  el.querySelectorAll('.comment-reply-btn').forEach(btn => {
    btn.addEventListener('click', () => toggleReplyForm(container, btn.dataset.commentId));
  });
  el.querySelectorAll('.reply-cancel-btn').forEach(btn => {
    btn.addEventListener('click', () => { const rf = btn.closest('.comment-reply-form'); if (rf) rf.style.display = 'none'; });
  });
  el.querySelectorAll('.comment-replies-toggle').forEach(t => initRepliesToggle(t, container));
}

function updateCommentsToggle(container, newsId, delta) {
  const badge = container.querySelector('.comment-count-badge');
  const titleEl = container.querySelector('.exp-comments-title');
  const listEl  = container.querySelector(`#commentList_${newsId}`);
  const currentCount = parseInt(badge?.textContent || '0') + delta;

  if (badge) {
    badge.textContent = currentCount;
  } else if (titleEl) {
    const b = document.createElement('span');
    b.className = 'comment-count-badge';
    b.textContent = currentCount;
    titleEl.appendChild(b);
  }

  let toggleBtn = container.querySelector('.comments-toggle-btn');
  if (!toggleBtn && currentCount > 0 && titleEl) {
    toggleBtn = document.createElement('button');
    toggleBtn.className = 'comments-toggle-btn';
    toggleBtn.dataset.open = 'true';
    toggleBtn.dataset.newsId = newsId;
    titleEl.parentElement.appendChild(toggleBtn);
    toggleBtn.addEventListener('click', () => {
      const isOpen = toggleBtn.dataset.open === 'true';
      if (listEl) listEl.style.display = isOpen ? 'none' : 'flex';
      toggleBtn.dataset.open = isOpen ? 'false' : 'true';
      const cnt = parseInt(container.querySelector('.comment-count-badge')?.textContent || '0');
      toggleBtn.innerHTML = isOpen
        ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg> ${cnt} yorumu göstər`
        : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="18 15 12 9 6 15"></polyline></svg> Yorumları gizlət`;
    });
  }
  if (toggleBtn && toggleBtn.dataset.open === 'true') {
    const cnt = parseInt(container.querySelector('.comment-count-badge')?.textContent || '0');
    toggleBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="18 15 12 9 6 15"></polyline></svg> Yorumları gizlət`;
  }
}
