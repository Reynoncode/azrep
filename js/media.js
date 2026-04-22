// ==============================
// media.js — Şəkil & Video upload, crop, edit
// ==============================

import {
  currentImages, setCurrentImages, pushImage, spliceImage,
  currentVideoFile, setCurrentVideoFile,
  currentVideoTrim, setCurrentVideoTrim,
  activeMediaType, setActiveMediaType,
  cropState, setCropState
} from './state.js';

// ---- RESET FORM ----
export function resetForm() {
  document.getElementById('newsTitle').value    = '';
  document.getElementById('newsBody').value     = '';
  document.getElementById('newsLink').value     = '';
  document.getElementById('newsBtnLabel').value = '';
  document.getElementById('titleCount').textContent    = '0/120';
  document.getElementById('btnLabelCount').textContent = '0/25';
  document.querySelectorAll('.hashtag-input').forEach(i => i.value = '');
  setCurrentImages([]);
  renderImagePreviews();
  document.getElementById('imageDropLabel').innerHTML =
    '<span>Şəkillər seçmək üçün klikləyin</span><small>JPG, PNG, WEBP — maks. 10 şəkil</small>';
  const vp = document.querySelector('.video-media-preview');
  if (vp) vp.remove();
  setCurrentVideoFile(null);
  document.getElementById('btnLabelGroup').style.display = 'none';
}

// ---- MEDIA TABS ----
export function initMediaTabs() {
  document.querySelectorAll('.media-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.media-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.media-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      setActiveMediaType(tab.dataset.tab);
      document.getElementById(activeMediaType === 'image' ? 'imagePanel' : 'videoPanel').classList.add('active');
    });
  });
}

// ---- LINK INPUT ----
export function initLinkInput() {
  document.getElementById('newsLink').addEventListener('input', function () {
    document.getElementById('btnLabelGroup').style.display = this.value.trim() ? 'flex' : 'none';
  });
}

// ============================================================
// ŞƏKİL UPLOAD & CROP
// ============================================================
export function initImageUpload() {
  const zone  = document.getElementById('imageDropZone');
  const input = document.getElementById('imageInput');
  input.setAttribute('multiple', 'true');
  zone.addEventListener('click', () => input.click());
  input.addEventListener('change', () => {
    if (input.files.length > 0) handleImageFiles(input.files);
    input.value = '';
  });

  document.getElementById('closeImageEditBtn').addEventListener('click', () =>
    document.getElementById('imageEditModal').classList.remove('open'));
  document.getElementById('cancelCropBtn').addEventListener('click', () =>
    document.getElementById('imageEditModal').classList.remove('open'));
  document.getElementById('applyCropBtn').addEventListener('click', applyCrop);

  document.querySelectorAll('.ratio-btn[data-ratio]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.ratio-btn[data-ratio]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      setCropState({ ratio: btn.dataset.ratio === 'free' ? 'free' : parseFloat(btn.dataset.ratio) });
      resetCropBox();
    });
  });

  const cropBox = document.getElementById('cropBox');
  cropBox.addEventListener('mousedown', startCropDrag);
  cropBox.querySelectorAll('.crop-handle').forEach(h => {
    h.addEventListener('mousedown', e => { e.stopPropagation(); startCropResize(e, h); });
  });
  document.addEventListener('mousemove', onCropMouseMove);
  document.addEventListener('mouseup', () => setCropState({ dragging: false, resizing: false }));
}

function handleImageFiles(files) {
  const remaining = 10 - currentImages.length;
  if (remaining <= 0) { alert('Maksimum 10 şəkil seçə bilərsiniz!'); return; }
  const toAdd = Array.from(files).slice(0, remaining);
  let loaded = 0;
  toAdd.forEach(file => {
    const reader = new FileReader();
    reader.onload = e => {
      pushImage(e.target.result);
      loaded++;
      if (loaded === toAdd.length) renderImagePreviews();
    };
    reader.readAsDataURL(file);
  });
  if (toAdd.length < files.length)
    alert(`Yalnız ${toAdd.length} şəkil əlavə edildi. Limit: 10 şəkil.`);
}

export function renderImagePreviews() {
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
          <img src="${src}" alt="preview ${i + 1}" />
          <button class="img-thumb-remove" data-idx="${i}" title="Sil">✕</button>
        </div>`).join('')}
    </div>
    <div class="img-preview-count">${currentImages.length}/10 şəkil seçildi</div>
  `;
  container.querySelectorAll('.img-thumb-remove').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      spliceImage(parseInt(btn.dataset.idx));
      renderImagePreviews();
    });
  });
}

function applyCrop() {
  const img = document.getElementById('cropImage');
  const scaleX = img.naturalWidth / img.clientWidth;
  const scaleY = img.naturalHeight / img.clientHeight;
  const canvas = document.createElement('canvas');
  canvas.width  = cropState.boxW * scaleX;
  canvas.height = cropState.boxH * scaleY;
  canvas.getContext('2d').drawImage(
    img,
    cropState.boxX * scaleX, cropState.boxY * scaleY,
    cropState.boxW * scaleX, cropState.boxH * scaleY,
    0, 0, canvas.width, canvas.height
  );
  pushImage(canvas.toDataURL('image/jpeg', 0.92));
  renderImagePreviews();
  document.getElementById('imageEditModal').classList.remove('open');
}

function resetCropBox() {
  const img = document.getElementById('cropImage');
  const W = img.clientWidth, H = img.clientHeight;
  let bw, bh;
  if (cropState.ratio === 'free') { bw = W * 0.7; bh = H * 0.7; }
  else { bw = Math.min(W * 0.7, H * 0.7 * cropState.ratio); bh = bw / cropState.ratio; }
  setCropState({ boxX: (W - bw) / 2, boxY: (H - bh) / 2, boxW: bw, boxH: bh });
  applyCropBoxStyle();
}

function applyCropBoxStyle() {
  const box = document.getElementById('cropBox');
  box.style.left   = cropState.boxX + 'px';
  box.style.top    = cropState.boxY + 'px';
  box.style.width  = cropState.boxW + 'px';
  box.style.height = cropState.boxH + 'px';
}

function startCropDrag(e) {
  setCropState({ dragging: true, dragStartX: e.clientX - cropState.boxX, dragStartY: e.clientY - cropState.boxY });
  e.preventDefault();
}

function startCropResize(e, handle) {
  setCropState({
    resizing: true,
    handle: handle.className.replace('crop-handle ', ''),
    dragStartX: e.clientX,
    dragStartY: e.clientY,
    _startBox: { ...cropState }
  });
  e.preventDefault();
}

function onCropMouseMove(e) {
  const img = document.getElementById('cropImage');
  if (!img) return;
  const W = img.clientWidth, H = img.clientHeight;
  if (cropState.dragging) {
    setCropState({
      boxX: Math.min(Math.max(0, e.clientX - cropState.dragStartX), W - cropState.boxW),
      boxY: Math.min(Math.max(0, e.clientY - cropState.dragStartY), H - cropState.boxH)
    });
    applyCropBoxStyle();
  }
  if (cropState.resizing) {
    const dx = e.clientX - cropState.dragStartX;
    const dy = e.clientY - cropState.dragStartY;
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
    setCropState({
      boxX: Math.max(0, Math.min(nx, W - nw)),
      boxY: Math.max(0, Math.min(ny, H - nh)),
      boxW: Math.min(nw, W),
      boxH: Math.min(nh, H)
    });
    applyCropBoxStyle();
  }
}

// ============================================================
// VİDEO UPLOAD & EDİT
// ============================================================
export function initVideoUpload() {
  const zone  = document.getElementById('videoDropZone');
  const input = document.getElementById('videoInput');
  zone.addEventListener('click', () => input.click());
  input.addEventListener('change', () => { if (input.files[0]) openVideoEditor(input.files[0]); });

  document.getElementById('closeVideoEditBtn').addEventListener('click', () =>
    document.getElementById('videoEditModal').classList.remove('open'));
  document.getElementById('cancelVideoEditBtn').addEventListener('click', () =>
    document.getElementById('videoEditModal').classList.remove('open'));
  document.getElementById('applyVideoEditBtn').addEventListener('click', applyVideoEdit);
  document.getElementById('previewTrimBtn').addEventListener('click', previewTrim);

  document.querySelectorAll('.ratio-btn[data-vratio]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.ratio-btn[data-vratio]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Video crop box drag & resize
  const vBox = document.getElementById('videoCropBox');
  let vDrag = false, vResize = false, vHandle = null, vSX = 0, vSY = 0, vSB = {};
  let vCrop = { x: 10, y: 10, w: 80, h: 80 };

  function applyVCropStyle() {
    vBox.style.left   = vCrop.x + '%';
    vBox.style.top    = vCrop.y + '%';
    vBox.style.width  = vCrop.w + '%';
    vBox.style.height = vCrop.h + '%';
  }
  applyVCropStyle();

  vBox.addEventListener('mousedown', e => {
    vDrag = true; vSX = e.clientX; vSY = e.clientY; vSB = { ...vCrop }; e.preventDefault();
  });
  vBox.querySelectorAll('.crop-handle').forEach(h => {
    h.addEventListener('mousedown', e => {
      e.stopPropagation();
      vResize = true;
      vHandle = h.className.replace('crop-handle ', '');
      vSX = e.clientX; vSY = e.clientY; vSB = { ...vCrop };
      e.preventDefault();
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
      const dx = (e.clientX - vSX) / W * 100;
      const dy = (e.clientY - vSY) / H * 100;
      if (vHandle.includes('r')) vCrop.w = Math.max(10, vSB.w + dx);
      if (vHandle.includes('b')) vCrop.h = Math.max(10, vSB.h + dy);
      if (vHandle.includes('l')) { vCrop.w = Math.max(10, vSB.w - dx); vCrop.x = vSB.x + (vSB.w - vCrop.w); }
      if (vHandle.includes('t')) { vCrop.h = Math.max(10, vSB.h - dy); vCrop.y = vSB.y + (vSB.h - vCrop.h); }
      vCrop.w = Math.min(vCrop.w, 100 - vCrop.x);
      vCrop.h = Math.min(vCrop.h, 100 - vCrop.y);
      applyVCropStyle();
    }
  });
  document.addEventListener('mouseup', () => { vDrag = false; vResize = false; });
}

function openVideoEditor(file) {
  setCurrentVideoFile(file);
  const url     = URL.createObjectURL(file);
  const editVid = document.getElementById('editVideo');
  const prevVid = document.getElementById('videoCropPreview');
  editVid.src = url;
  prevVid.src = url;
  editVid.onloadedmetadata = () => {
    document.getElementById('trimStart').value = 0;
    document.getElementById('trimEnd').value   = editVid.duration.toFixed(1);
  };
  document.getElementById('videoEditModal').classList.add('open');
}

function previewTrim() {
  const vid   = document.getElementById('editVideo');
  const start = parseFloat(document.getElementById('trimStart').value) || 0;
  vid.currentTime = start;
  vid.play();
  const end    = parseFloat(document.getElementById('trimEnd').value) || vid.duration;
  const stopAt = () => { if (vid.currentTime >= end) { vid.pause(); vid.removeEventListener('timeupdate', stopAt); } };
  vid.addEventListener('timeupdate', stopAt);
}

function applyVideoEdit() {
  setCurrentVideoTrim({
    start: parseFloat(document.getElementById('trimStart').value) || 0,
    end:   parseFloat(document.getElementById('trimEnd').value)   || null
  });
  showVideoPreview();
  document.getElementById('videoEditModal').classList.remove('open');
}

function showVideoPreview() {
  const zone    = document.getElementById('videoDropZone');
  let preview   = zone.parentElement.querySelector('.video-media-preview');
  if (!preview) {
    preview = document.createElement('div');
    preview.className = 'video-media-preview media-preview';
    zone.parentElement.appendChild(preview);
  }
  const url = URL.createObjectURL(currentVideoFile);
  const dur = currentVideoTrim.end
    ? `${currentVideoTrim.start}s – ${currentVideoTrim.end}s`
    : 'Tam video';
  preview.innerHTML = `
    <video src="${url}" muted controls style="max-height:160px;width:100%;"></video>
    <div style="font-family:'IBM Plex Mono',monospace;font-size:9px;color:#888;margin-top:4px;letter-spacing:1px;">MÜDDƏTİ: ${dur}</div>
    <div class="media-preview-actions">
      <button class="action-btn secondary" id="reEditVideoBtn">Yenidən edit et</button>
    </div>
  `;
  document.getElementById('reEditVideoBtn').addEventListener('click', () =>
    document.getElementById('videoEditModal').classList.add('open'));
}
