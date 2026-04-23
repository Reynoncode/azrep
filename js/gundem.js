// ==============================
// gundem.js — Gündəm (Forum) bölümü
// ==============================

import { db, collection, getDocs, addDoc, orderBy, query, where, serverTimestamp } from './firebase.js';
import { escHtml, formatDate } from './utils.js';

// ============================================================
// ANA RENDER
// ============================================================
export async function renderGundemSection(containerEl) {
  containerEl.innerHTML = `<div class="gundem-loading">YÜKLƏNİR…</div>`;

  let topics = [];
  try {
    const snap = await getDocs(query(collection(db, 'gundem_topics'), orderBy('createdAt', 'desc')));
    topics = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.error('Gündəm yüklənmədi:', e);
  }

  // Yorum sayına görə sırala (ən çox yorum + yanıt alanlar üstdə)
  topics.sort((a, b) => {
    const scoreA = (a.commentCount || 0) + (a.replyCount || 0);
    const scoreB = (b.commentCount || 0) + (b.replyCount || 0);
    return scoreB - scoreA;
  });

  containerEl.innerHTML = `
    <div class="gundem-page">
      <div class="gundem-header">
        <div class="gundem-header-top">
          <div class="gundem-title">GÜNDƏM</div>
          <button class="gundem-new-topic-btn" id="openGundemModalBtn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            MÖVZU ƏLAVƏ ET
          </button>
        </div>
        <div class="gundem-desc">İstədiyin mövzunu aç, fikrini paylaş</div>
      </div>

      <div class="gundem-topics-list" id="gundemTopicsList">
        ${topics.length === 0
          ? `<div class="gundem-empty">Hələ heç bir mövzu açılmayıb. İlk mövzunu sən aç!</div>`
          : topics.map(t => buildTopicRow(t)).join('')}
      </div>
    </div>
  `;

  // Topic row-lara event-lər
  attachTopicEvents(containerEl, topics);

  // Mövzu əlavə et düyməsi
  document.getElementById('openGundemModalBtn')?.addEventListener('click', openGundemModal);
}

// ============================================================
// TOPIC ROW
// ============================================================
function buildTopicRow(t) {
  const totalComments = (t.commentCount || 0) + (t.replyCount || 0);
  const dateStr = formatDate(t.createdAt);
  const hot = totalComments >= 5;

  return `
    <div class="gundem-topic-row" data-id="${escHtml(t.id)}">
      <div class="gundem-topic-main">
        <div class="gundem-topic-top">
          ${hot ? `<span class="gundem-hot-badge">🔥 TREND</span>` : ''}
          <span class="gundem-topic-title">${escHtml(t.title || '')}</span>
        </div>
        <div class="gundem-topic-meta">
          <span class="gundem-topic-author">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            ${escHtml(t.author || 'Anonim')}
          </span>
          <span class="gundem-topic-date">${escHtml(dateStr)}</span>
          ${t.body ? `<span class="gundem-topic-preview">${escHtml(t.body.slice(0, 80))}${t.body.length > 80 ? '…' : ''}</span>` : ''}
        </div>
      </div>
      <div class="gundem-topic-stats">
        <div class="gundem-stat">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
          <span>${totalComments}</span>
        </div>
        <svg class="gundem-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
      </div>
    </div>

    <!-- Expanded yorum bölümü (başlanğıcda bağlı) -->
    <div class="gundem-topic-expanded" id="gundemExpanded_${escHtml(t.id)}" style="display:none;">
      <div class="gundem-comments-wrap" id="gundemComments_${escHtml(t.id)}">
        <div class="gundem-comments-loading">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle></svg>
          YÜKLƏNİR…
        </div>
      </div>
    </div>
  `;
}

// ============================================================
// TOPIC EVENTS
// ============================================================
function attachTopicEvents(containerEl, topics) {
  containerEl.querySelectorAll('.gundem-topic-row').forEach(row => {
    row.addEventListener('click', () => {
      const id = row.dataset.id;
      const expanded = document.getElementById(`gundemExpanded_${id}`);
      if (!expanded) return;

      const isOpen = expanded.style.display !== 'none';

      // Bütün digər expanded-ları bağla
      containerEl.querySelectorAll('.gundem-topic-expanded').forEach(el => {
        el.style.display = 'none';
      });
      containerEl.querySelectorAll('.gundem-topic-row').forEach(r => r.classList.remove('is-open'));

      if (!isOpen) {
        expanded.style.display = 'block';
        row.classList.add('is-open');
        const topic = topics.find(t => t.id === id);
        loadTopicComments(id, expanded, topic);
        setTimeout(() => expanded.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 60);
      }
    });
  });
}

// ============================================================
// TOPIC YORUMLARI YÜKLƏ
// ============================================================
async function loadTopicComments(topicId, expandedEl, topic) {
  const wrapEl = document.getElementById(`gundemComments_${topicId}`);
  if (!wrapEl || wrapEl.dataset.loaded === 'true') return;

  let allComments = [];
  try {
    // NOT: where() + orderBy() fərqli sahələr üzərindədirsə Firestore composite
    // index tələb edir. İndex olmadıqda query səssiz uğursuz olur və yorumlar
    // itmiş görünür. orderBy-ı sorğudan çıxarıb client-side sıralayırıq.
    const q = query(
      collection(db, 'gundem_comments'),
      where('topicId', '==', topicId)
    );
    const snap = await getDocs(q);
    allComments = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Client-side sıralama — Firebase Timestamp və ya plain seconds dəstəklənir
    allComments.sort((a, b) => {
      const toMs = ts => ts?.toMillis?.() ?? (ts?.seconds ?? 0) * 1000;
      return toMs(a.createdAt) - toMs(b.createdAt);
    });
  } catch (e) {
    console.error('Yorumlar yüklənmədi:', e);
    wrapEl.innerHTML = `<div class="comment-empty" style="color:var(--error,#e55)">Yorumlar yüklənərkən xəta baş verdi. Səhifəni yeniləyin.</div>`;
    return;
  }

  const topLevel = allComments.filter(c => !c.parentId);
  const replies  = allComments.filter(c => !!c.parentId);
  const total    = allComments.length;

  wrapEl.dataset.loaded = 'true';

  wrapEl.innerHTML = `
    ${topic?.body ? `<div class="gundem-topic-body">${escHtml(topic.body)}</div>` : ''}

    <div class="gundem-comment-add-form">
      <div class="comment-form-avatar">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
      </div>
      <div class="comment-form-fields">
        <input type="text" class="comment-name-input gundem-main-name" placeholder="Adınız" maxlength="40" autocomplete="off" />
        <textarea class="comment-text-input gundem-main-text" placeholder="Fikrini bur paylaş..." maxlength="1000" rows="1"></textarea>
        <div class="comment-form-actions gundem-main-actions" style="display:none;">
          <span class="comment-error-msg gundem-main-error"></span>
          <div class="comment-form-btns">
            <button class="comment-cancel-btn gundem-main-cancel">Ləğv et</button>
            <button class="comment-submit-btn gundem-main-submit" data-topic-id="${topicId}">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="gundem-comments-count" id="gundemCommentCount_${topicId}">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
      ${total} yorum
    </div>

    <div class="gundem-comment-list" id="gundemCommentList_${topicId}">
      ${topLevel.length === 0
        ? '<div class="comment-empty">Hələ yorum yoxdur. İlk yorumu sən yaz!</div>'
        : topLevel.map(c => buildGundemCommentHTML(c, replies, topicId)).join('')}
    </div>
  `;

  initTopicCommentEvents(wrapEl, topicId);
}

// ============================================================
// YORUM HTML
// ============================================================
function buildGundemCommentHTML(comment, allReplies, topicId) {
  const myReplies = allReplies.filter(r => r.parentId === comment.id);
  return `<div class="comment-item gundem-comment-item" data-comment-id="${comment.id}">${buildGundemCommentBodyHTML(comment, myReplies, topicId)}</div>`;
}

function buildGundemCommentBodyHTML(comment, myReplies, topicId) {
  const dateStr = formatDate(comment.createdAt);

  const replyForm = `
    <div class="comment-reply-form gundem-reply-form" id="gundemReplyForm_${comment.id}" style="display:none;">
      <input type="text" class="comment-name-input reply-name-input" placeholder="Adınız" maxlength="40" autocomplete="off" />
      <textarea class="comment-text-input reply-text-input" placeholder="@${escHtml(comment.author || 'Anonim')} cavab verin..." maxlength="1000" rows="2"></textarea>
      <div class="comment-form-actions">
        <span class="comment-error-msg"></span>
        <div class="comment-form-btns">
          <button class="comment-cancel-btn reply-cancel-btn">Ləğv et</button>
          <button class="comment-submit-btn reply-submit-btn" data-parent-id="${comment.id}" data-topic-id="${topicId}">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
          </button>
        </div>
      </div>
    </div>`;

  const repliesHTML = myReplies.length > 0 ? `
    <button class="comment-replies-toggle gundem-replies-toggle" data-comment-id="${comment.id}">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
      ${myReplies.length} cavabı göstər
    </button>
    <div class="comment-replies" id="gundemReplies_${comment.id}" style="display:none;">
      ${myReplies.map(r => `<div class="comment-item comment-reply gundem-comment-item" data-comment-id="${r.id}">${buildGundemCommentBodyHTML(r, [], topicId)}</div>`).join('')}
    </div>` : '';

  return `
    <div class="comment-avatar">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
    </div>
    <div class="comment-body">
      <div class="comment-item-header">
        <span class="comment-author">${escHtml(comment.author || 'Anonim')}</span>
        <span class="comment-date">${escHtml(dateStr)}</span>
      </div>
      <div class="comment-text">${escHtml(comment.text || '')}</div>
      <div class="comment-actions">
        <button class="comment-reply-btn gundem-reply-btn" data-comment-id="${comment.id}" data-author="${escHtml(comment.author || 'Anonim')}">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 17 4 12 9 7"></polyline><path d="M20 18v-2a4 4 0 0 0-4-4H4"></path></svg>
          Cavab ver
        </button>
      </div>
      ${replyForm}
      ${repliesHTML}
    </div>
  `;
}

// ============================================================
// YORUM EVENTLƏRİ
// ============================================================
function initTopicCommentEvents(wrapEl, topicId) {
  const mainText    = wrapEl.querySelector('.gundem-main-text');
  const mainActions = wrapEl.querySelector('.gundem-main-actions');
  const mainCancel  = wrapEl.querySelector('.gundem-main-cancel');
  const mainName    = wrapEl.querySelector('.gundem-main-name');

  if (mainText) {
    mainText.addEventListener('focus', () => {
      mainActions.style.display = 'flex';
      mainText.rows = 3;
    });
  }
  if (mainCancel) {
    mainCancel.addEventListener('click', () => {
      mainText.value = '';
      mainText.rows = 1;
      mainActions.style.display = 'none';
      mainName.value = '';
    });
  }

  // Submit (ana yorum)
  const mainSubmit = wrapEl.querySelector('.gundem-main-submit');
  if (mainSubmit) {
    mainSubmit.addEventListener('click', async () => {
      const author = mainName?.value.trim();
      const text   = mainText?.value.trim();
      const errEl  = wrapEl.querySelector('.gundem-main-error');
      if (!text) { if (errEl) errEl.textContent = 'Boş göndərmək olmaz'; return; }
      if (errEl) errEl.textContent = '';

      const origHTML = mainSubmit.innerHTML;
      mainSubmit.disabled = true;
      mainSubmit.innerHTML = '…';

      try {
        const data = { topicId, author: author || 'Anonim', text, parentId: null, createdAt: serverTimestamp() };
        const ref  = await addDoc(collection(db, 'gundem_comments'), data);
        const newC = { id: ref.id, ...data };

        // Counter yenilə
        await updateTopicCounter(topicId, 'commentCount', 1);

        // DOM-a əlavə et
        const listEl = wrapEl.querySelector(`#gundemCommentList_${topicId}`);
        if (listEl) {
          const emptyEl = listEl.querySelector('.comment-empty');
          if (emptyEl) emptyEl.remove();
          const el = document.createElement('div');
          el.className = 'comment-item gundem-comment-item';
          el.dataset.commentId = ref.id;
          el.innerHTML = buildGundemCommentBodyHTML(newC, [], topicId);
          listEl.appendChild(el);
          el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          initNewGundemCommentEvents(el, wrapEl, topicId);
        }

        // Sayacı güncəllə
        updateGundemCountDisplay(topicId, 1);

        mainText.value = '';
        mainText.rows = 1;
        mainActions.style.display = 'none';
        mainName.value = '';
      } catch (err) {
        alert('Göndərilmədi: ' + err.message);
      } finally {
        mainSubmit.disabled = false;
        mainSubmit.innerHTML = origHTML;
      }
    });
  }

  // Reply düymələri
  wrapEl.querySelectorAll('.gundem-reply-btn').forEach(btn => {
    btn.addEventListener('click', () => toggleGundemReplyForm(wrapEl, btn.dataset.commentId));
  });

  // Reply submit
  wrapEl.querySelectorAll('.reply-submit-btn').forEach(btn => {
    initReplySubmit(btn, wrapEl, topicId);
  });

  // Reply cancel
  wrapEl.querySelectorAll('.reply-cancel-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const rf = btn.closest('.comment-reply-form');
      if (rf) rf.style.display = 'none';
    });
  });

  // Replies toggle
  wrapEl.querySelectorAll('.gundem-replies-toggle').forEach(t => {
    initGundemRepliesToggle(t, wrapEl);
  });
}

function initReplySubmit(btn, wrapEl, topicId) {
  btn.addEventListener('click', async () => {
    const parentId = btn.dataset.parentId;
    const form     = wrapEl.querySelector(`#gundemReplyForm_${parentId}`);
    if (!form) return;

    const nameInput = form.querySelector('.reply-name-input');
    const textInput = form.querySelector('.reply-text-input');
    const errEl     = form.querySelector('.comment-error-msg');
    const text      = textInput?.value.trim();
    const author    = nameInput?.value.trim();

    if (!text) { if (errEl) errEl.textContent = 'Boş göndərmək olmaz'; return; }
    if (errEl) errEl.textContent = '';

    const origHTML = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '…';

    try {
      const data = { topicId, author: author || 'Anonim', text, parentId, createdAt: serverTimestamp() };
      const ref  = await addDoc(collection(db, 'gundem_comments'), data);
      const newC = { id: ref.id, ...data };

      await updateTopicCounter(topicId, 'replyCount', 1);

      form.style.display = 'none';
      addGundemReplyToDOM(wrapEl, parentId, newC, topicId);
      updateGundemCountDisplay(topicId, 1);
    } catch (err) {
      alert('Göndərilmədi: ' + err.message);
    } finally {
      btn.disabled = false;
      btn.innerHTML = origHTML;
    }
  });
}

function initNewGundemCommentEvents(el, wrapEl, topicId) {
  el.querySelectorAll('.gundem-reply-btn').forEach(btn => {
    btn.addEventListener('click', () => toggleGundemReplyForm(wrapEl, btn.dataset.commentId));
  });
  el.querySelectorAll('.reply-submit-btn').forEach(btn => {
    initReplySubmit(btn, wrapEl, topicId);
  });
  el.querySelectorAll('.reply-cancel-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const rf = btn.closest('.comment-reply-form');
      if (rf) rf.style.display = 'none';
    });
  });
  el.querySelectorAll('.gundem-replies-toggle').forEach(t => initGundemRepliesToggle(t, wrapEl));
}

function toggleGundemReplyForm(wrapEl, commentId) {
  const allForms = wrapEl.querySelectorAll('.comment-reply-form');
  const target   = wrapEl.querySelector(`#gundemReplyForm_${commentId}`);
  const wasHidden = !target || target.style.display === 'none';
  allForms.forEach(f => f.style.display = 'none');
  if (wasHidden && target) {
    target.style.display = 'flex';
    target.querySelector('.reply-name-input')?.focus();
  }
}

function addGundemReplyToDOM(wrapEl, parentId, newComment, topicId) {
  const parentItem = wrapEl.querySelector(`.gundem-comment-item[data-comment-id="${parentId}"]`);
  if (!parentItem) return;
  const bodyEl = parentItem.querySelector('.comment-body');
  if (!bodyEl) return;

  let repliesEl = wrapEl.querySelector(`#gundemReplies_${parentId}`);
  if (!repliesEl) {
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'comment-replies-toggle gundem-replies-toggle';
    toggleBtn.dataset.commentId = parentId;
    toggleBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="18 15 12 9 6 15"></polyline></svg> 1 cavabı gizlət`;
    repliesEl = document.createElement('div');
    repliesEl.className = 'comment-replies';
    repliesEl.id = `gundemReplies_${parentId}`;
    repliesEl.style.display = 'flex';
    bodyEl.appendChild(toggleBtn);
    bodyEl.appendChild(repliesEl);
    initGundemRepliesToggle(toggleBtn, wrapEl);
  } else {
    repliesEl.style.display = 'flex';
    const tog = wrapEl.querySelector(`.gundem-replies-toggle[data-comment-id="${parentId}"]`);
    if (tog) {
      const cnt = repliesEl.querySelectorAll('.comment-reply').length + 1;
      tog.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="18 15 12 9 6 15"></polyline></svg> ${cnt} cavabı gizlət`;
    }
  }

  const replyEl = document.createElement('div');
  replyEl.className = 'comment-item comment-reply gundem-comment-item';
  replyEl.dataset.commentId = newComment.id;
  replyEl.innerHTML = buildGundemCommentBodyHTML(newComment, [], topicId);
  repliesEl.appendChild(replyEl);
  replyEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  initNewGundemCommentEvents(replyEl, wrapEl, topicId);
}

function initGundemRepliesToggle(toggle, wrapEl) {
  toggle.addEventListener('click', () => {
    const cid = toggle.dataset.commentId;
    const repliesEl = wrapEl.querySelector(`#gundemReplies_${cid}`);
    if (!repliesEl) return;
    const isVisible = repliesEl.style.display !== 'none';
    repliesEl.style.display = isVisible ? 'none' : 'flex';
    const count = repliesEl.querySelectorAll('.comment-reply').length;
    toggle.innerHTML = isVisible
      ? `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg> ${count} cavabı göstər`
      : `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="18 15 12 9 6 15"></polyline></svg> ${count} cavabı gizlət`;
  });
}

// ============================================================
// TOPIC COUNTER YENİLƏ (Firestore)
// ============================================================
async function updateTopicCounter(topicId, field, delta) {
  try {
    // Sadə increment — oxu, toplayıb yaz (transactions olmadan)
    const { doc, getDoc, updateDoc, increment } = await import(
      'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js'
    );
    const ref = doc(db, 'gundem_topics', topicId);
    await updateDoc(ref, { [field]: increment(delta) });
  } catch (e) {
    console.warn('Counter yenilənmədi:', e);
  }
}

// Ekranda görünən sayacı yenilə (topic row-da)
function updateGundemCountDisplay(topicId, delta) {
  const row = document.querySelector(`.gundem-topic-row[data-id="${topicId}"]`);
  if (!row) return;
  const statEl = row.querySelector('.gundem-stat span');
  if (statEl) {
    const current = parseInt(statEl.textContent) || 0;
    statEl.textContent = current + delta;
  }
  const countEl = document.getElementById(`gundemCommentCount_${topicId}`);
  if (countEl) {
    const txt = countEl.textContent || '';
    const num = parseInt(txt) || 0;
    countEl.innerHTML = `
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
      ${num + delta} yorum`;
  }
}

// ============================================================
// YENİ MÖVZU MODAL
// ============================================================
export function initGundemModal() {
  const modal = document.getElementById('gundemModal');
  if (!modal) return;

  document.getElementById('closeGundemModalBtn')?.addEventListener('click', closeGundemModal);
  modal.addEventListener('click', e => { if (e.target === modal) closeGundemModal(); });

  document.getElementById('gundemTopicTitle')?.addEventListener('input', function() {
    document.getElementById('gundemTitleCount').textContent = `${this.value.length}/120`;
  });

  document.getElementById('gundemPublishBtn')?.addEventListener('click', publishTopic);
}

export function openGundemModal() {
  document.getElementById('gundemModal')?.classList.add('open');
}

function closeGundemModal() {
  document.getElementById('gundemModal')?.classList.remove('open');
  document.getElementById('gundemTopicTitle').value = '';
  document.getElementById('gundemTopicBody').value = '';
  document.getElementById('gundemAuthorName').value = '';
  document.getElementById('gundemTitleCount').textContent = '0/120';
}

async function publishTopic() {
  const title  = document.getElementById('gundemTopicTitle')?.value.trim();
  const body   = document.getElementById('gundemTopicBody')?.value.trim();
  const author = document.getElementById('gundemAuthorName')?.value.trim();

  if (!title) { alert('Başlıq məcburidir!'); return; }

  const btn = document.getElementById('gundemPublishBtn');
  btn.textContent = 'AÇILIYOR…';
  btn.disabled = true;

  try {
    const data = {
      title,
      body:          body || null,
      author:        author || 'Anonim',
      commentCount:  0,
      replyCount:    0,
      createdAt:     serverTimestamp(),
    };
    await addDoc(collection(db, 'gundem_topics'), data);
    closeGundemModal();

    // Gündəm bölümünü yenilə
    const navLink = document.querySelector('.nav-link[data-section="world"]');
    if (navLink) navLink.click();
  } catch (err) {
    alert('Xəta: ' + err.message);
  } finally {
    btn.textContent = 'MÖVZUNU AÇ';
    btn.disabled = false;
  }
}
