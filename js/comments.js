// ==============================
// comments.js — Şərh sistemi (YouTube-vari, Firestore)
// ==============================

import { db, collection, getDocs, addDoc, orderBy, query, where, serverTimestamp } from './firebase.js';
import { escHtml, formatDate } from './utils.js';
import { currentUser, currentUserData } from './auth.js';

export async function loadComments(newsId, row) {
  const container = row.querySelector(`#expComments_${newsId}`);
  if (!container) return;

  let allComments = [];
  try {
    const q    = query(collection(db, 'comments'), where('newsId', '==', newsId), orderBy('createdAt', 'asc'));
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
      <button class="comments-toggle-btn" data-open="false" data-news-id="${newsId}">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
        ${total > 0 ? `${total} yorumu göstər` : 'Yorum əlavə et'}
      </button>
    </div>

    <div class="comments-collapsible" id="commentsCollapsible_${newsId}" style="display:none;">
      <div class="comment-add-form">
        <div class="comment-form-avatar">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
        </div>
        <div class="comment-form-fields">
          ${currentUser && currentUserData
            ? `<div class="comment-auth-name" style="font-family:'IBM Plex Mono',monospace;font-size:11px;color:#FF3C00;letter-spacing:1px;padding:4px 0 6px;text-transform:uppercase;">${escHtml(currentUserData.displayName || currentUser.displayName || 'İstifadəçi')}</div>`
            : `<input type="text" class="comment-name-input main-name-input" placeholder="Adınız (min. 4 hərf)" maxlength="20" autocomplete="off" />`
          }
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

      <div class="comment-list" id="commentList_${newsId}">
        ${topLevel.length === 0
          ? '<div class="comment-empty">Hələ yorum yoxdur. İlk yorumu sən yaz!</div>'
          : topLevel.map(c => buildCommentItemHTML(c, replies, newsId)).join('')}
      </div>
    </div>
  `;

  // Ana textarea focus/blur
  const mainTextarea = container.querySelector('.main-text-input');
  const mainActions  = container.querySelector('.main-form-actions');
  const mainCancel   = container.querySelector('.main-cancel-btn');
  const mainName     = container.querySelector('.main-name-input');

  mainTextarea.addEventListener('focus', () => { mainActions.style.display = 'flex'; mainTextarea.rows = 3; });
  mainCancel.addEventListener('click', () => {
    mainTextarea.value = ''; mainTextarea.rows = 1;
    mainActions.style.display = 'none';
    if (mainName) { mainName.value = ''; mainName.classList.remove('error'); }
  });

  // Yorumlar toggle — bütün collapsible bölməni açır/bağlayır
  const toggleBtn    = container.querySelector('.comments-toggle-btn');
  const collapsible  = container.querySelector(`#commentsCollapsible_${newsId}`);
  if (toggleBtn && collapsible) {
    toggleBtn.addEventListener('click', () => {
      const isOpen = toggleBtn.dataset.open === 'true';
      collapsible.style.display  = isOpen ? 'none' : 'flex';
      toggleBtn.dataset.open = isOpen ? 'false' : 'true';
      const cnt = parseInt(container.querySelector('.comment-count-badge')?.textContent || '0');
      toggleBtn.innerHTML = isOpen
        ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg> ${cnt > 0 ? cnt + ' yorumu göstər' : 'Yorum əlavə et'}`
        : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="18 15 12 9 6 15"></polyline></svg> Yorumları gizlət`;
    });
  }

  container.querySelectorAll('.comment-replies-toggle').forEach(t => initRepliesToggle(t, container));
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
    const formEl    = submitBtn.closest('.comment-add-form') || submitBtn.closest('.comment-reply-form');
    if (!formEl) return;
    const nameInput = formEl.querySelector('.comment-name-input');
    const textInput = formEl.querySelector('.comment-text-input');
    const errorMsg  = formEl.querySelector('.comment-error-msg');
    const parentId  = submitBtn.dataset.parentId || null;
    const nId       = submitBtn.dataset.newsId || newsId;

    // Ad: auth istifadəçisi isə öz adı, deyilsə input-dan
    let author;
    if (currentUser && currentUserData) {
      author = currentUserData.displayName || currentUser.displayName || 'İstifadəçi';
    } else {
      author = (nameInput?.value || '').trim();
    }

    const text      = (textInput?.value  || '').trim();

    if (!currentUser && !author) {
      if (nameInput) { nameInput.classList.add('error'); nameInput.focus(); }
      if (errorMsg)  { errorMsg.textContent = 'Ad yazmaq məcburidir'; errorMsg.classList.add('visible'); }
      return;
    }
    if (!currentUser && author && author.length < 4) {
      if (nameInput) { nameInput.classList.add('error'); nameInput.focus(); }
      if (errorMsg)  { errorMsg.textContent = 'Ad minimum 4 hərf olmalıdır'; errorMsg.classList.add('visible'); }
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
      const docRef      = await addDoc(collection(db, 'comments'), commentData);
      const newComment  = { id: docRef.id, ...commentData };
      if (textInput) { textInput.value = ''; textInput.rows = 1; }

      if (parentId) {
        const replyForm = container.querySelector(`#replyForm_${parentId}`);
        if (replyForm) replyForm.style.display = 'none';
        addReplyToDOM(container, parentId, newComment, nId);
      } else {
        const listEl2 = container.querySelector(`#commentList_${nId}`);
        const collapsible2 = container.querySelector(`#commentsCollapsible_${nId}`);
        if (collapsible2) collapsible2.style.display = 'flex';
        const toggleBtn2 = container.querySelector('.comments-toggle-btn');
        if (toggleBtn2) { toggleBtn2.dataset.open = 'true'; }
        if (listEl2) {
          listEl2.style.display = 'flex';
          const emptyEl = listEl2.querySelector('.comment-empty');
          if (emptyEl) emptyEl.remove();
          const el = document.createElement('div');
          el.className          = 'comment-item';
          el.dataset.commentId  = docRef.id;
          el.innerHTML          = buildCommentBodyHTML(newComment, [], nId);
          listEl2.appendChild(el);
          el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          initNewCommentEvents(el, container, nId);
          updateCommentsToggle(container, nId, 1);
        }
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

// ---- HTML builders ----
function buildCommentItemHTML(comment, allReplies, newsId) {
  const myReplies = allReplies.filter(r => r.parentId === comment.id);
  return `<div class="comment-item" data-comment-id="${comment.id}">${buildCommentBodyHTML(comment, myReplies, newsId)}</div>`;
}

function buildCommentBodyHTML(comment, myReplies, newsId) {
  const dateStr   = formatDate(comment.createdAt);
  const replyForm = `
    <div class="comment-reply-form" id="replyForm_${comment.id}" style="display:none;">
      <input type="text" class="comment-name-input reply-name-input" placeholder="Adınız (min. 4 hərf)" maxlength="20" autocomplete="off" />
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
        <button class="comment-reply-btn" data-comment-id="${comment.id}" data-author="${escHtml(comment.author || 'Anonim')}">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 17 4 12 9 7"></polyline><path d="M20 18v-2a4 4 0 0 0-4-4H4"></path></svg>
          Cavab ver
        </button>
      </div>
      ${replyForm}
      ${repliesHTML}
    </div>
  `;
}

// ---- Toggle helpers ----
function initRepliesToggle(toggle, container) {
  toggle.addEventListener('click', () => {
    const cid       = toggle.dataset.commentId;
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
  const target   = container.querySelector(`#replyForm_${commentId}`);
  const wasHidden = !target || target.style.display === 'none';
  allForms.forEach(f => f.style.display = 'none');
  if (wasHidden && target) { target.style.display = 'flex'; target.querySelector('.reply-name-input')?.focus(); }
}

function addReplyToDOM(container, parentId, newComment, newsId) {
  const parentItem = container.querySelector(`.comment-item[data-comment-id="${parentId}"]`);
  if (!parentItem) return;
  const bodyEl = parentItem.querySelector('.comment-body');
  if (!bodyEl) return;

  let repliesEl = container.querySelector(`#replies_${parentId}`);
  if (!repliesEl) {
    const toggleBtn = document.createElement('button');
    toggleBtn.className          = 'comment-replies-toggle';
    toggleBtn.dataset.commentId  = parentId;
    toggleBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="18 15 12 9 6 15"></polyline></svg> 1 cavabı gizlət`;
    repliesEl           = document.createElement('div');
    repliesEl.className = 'comment-replies';
    repliesEl.id        = `replies_${parentId}`;
    repliesEl.style.display = 'flex';
    bodyEl.appendChild(toggleBtn);
    bodyEl.appendChild(repliesEl);
    initRepliesToggle(toggleBtn, container);
  } else {
    repliesEl.style.display = 'flex';
    const tog = container.querySelector(`.comment-replies-toggle[data-comment-id="${parentId}"]`);
    if (tog) {
      const cnt = repliesEl.querySelectorAll('.comment-reply').length + 1;
      tog.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="18 15 12 9 6 15"></polyline></svg> ${cnt} cavabı gizlət`;
    }
  }

  const replyEl = document.createElement('div');
  replyEl.className         = 'comment-item comment-reply';
  replyEl.dataset.commentId = newComment.id;
  replyEl.innerHTML         = buildCommentBodyHTML(newComment, [], newsId);
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
  const badge   = container.querySelector('.comment-count-badge');
  const titleEl = container.querySelector('.exp-comments-title');
  const collapsible = container.querySelector(`#commentsCollapsible_${newsId}`);
  const currentCount = parseInt(badge?.textContent || '0') + delta;

  if (badge) {
    badge.textContent = currentCount;
  } else if (titleEl) {
    const b = document.createElement('span');
    b.className   = 'comment-count-badge';
    b.textContent = currentCount;
    titleEl.appendChild(b);
  }

  const toggleBtn = container.querySelector('.comments-toggle-btn');
  if (toggleBtn) {
    const isOpen = toggleBtn.dataset.open === 'true';
    // Açıqdırsa gizlət yazısını güncəllə
    if (isOpen) {
      toggleBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="18 15 12 9 6 15"></polyline></svg> Yorumları gizlət`;
    } else {
      toggleBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg> ${currentCount} yorumu göstər`;
    }
    // Collapsible açıq deyilsə aç
    if (collapsible && collapsible.style.display === 'none') {
      collapsible.style.display = 'flex';
      toggleBtn.dataset.open = 'true';
      toggleBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="18 15 12 9 6 15"></polyline></svg> Yorumları gizlət`;
    }
  }
}
