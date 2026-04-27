// ==============================
// adminpanel.js — İstifadəçi idarəetmə paneli
// ==============================

import { fetchAllUsers, setUserRole, isAdmin, getInitials } from './auth.js';

let panelOpen = false;

// ─── Panel HTML-i yarat ───────────────────────────────────────
function createPanelHTML() {
  const panel = document.createElement('div');
  panel.id = 'adminPanel';
  panel.innerHTML = `
    <div id="adminPanelOverlay"></div>
    <div id="adminPanelDrawer">
      <div class="ap-header">
        <span class="ap-title">İSTİFADƏÇİLƏR</span>
        <button class="ap-close" id="adminPanelClose">✕</button>
      </div>
      <div class="ap-body" id="adminPanelBody">
        <div class="ap-loading">Yüklənir…</div>
      </div>
    </div>
  `;
  document.body.appendChild(panel);

  document.getElementById('adminPanelOverlay').addEventListener('click', closeAdminPanel);
  document.getElementById('adminPanelClose').addEventListener('click', closeAdminPanel);
}

// ─── İstifadəçi cədvəlini render et ──────────────────────────
async function renderUsers() {
  const body = document.getElementById('adminPanelBody');
  if (!body) return;
  body.innerHTML = '<div class="ap-loading">Yüklənir…</div>';

  const users = await fetchAllUsers();

  if (!users.length) {
    body.innerHTML = '<div class="ap-loading">İstifadəçi tapılmadı.</div>';
    return;
  }

  // Adminlər üstdə
  users.sort((a, b) => {
    if (a.role === 'admin' && b.role !== 'admin') return -1;
    if (b.role === 'admin' && a.role !== 'admin') return 1;
    return (a.displayName || '').localeCompare(b.displayName || '');
  });

  body.innerHTML = `
    <div class="ap-count">${users.length} istifadəçi</div>
    <div class="ap-list" id="apUserList"></div>
  `;

  const list = document.getElementById('apUserList');

  users.forEach(user => {
    const item = document.createElement('div');
    item.className = 'ap-item';
    item.dataset.uid = user.uid;

    const isAdminUser = user.role === 'admin';
    const initials    = getInitials(user.displayName || user.email || '?');

    item.innerHTML = `
      <div class="ap-avatar ${isAdminUser ? 'ap-avatar-admin' : ''}">${initials}</div>
      <div class="ap-info">
        <div class="ap-name">${user.displayName || '—'}</div>
        <div class="ap-email">${user.email || '—'}</div>
      </div>
      <div class="ap-actions">
        <span class="ap-badge ${isAdminUser ? 'ap-badge-admin' : 'ap-badge-user'}">
          ${isAdminUser ? 'Admin' : 'User'}
        </span>
        <button class="ap-toggle-btn" data-uid="${user.uid}" data-role="${user.role}">
          ${isAdminUser ? 'Sil' : 'Admin et'}
        </button>
      </div>
    `;

    list.appendChild(item);
  });

  // Toggle düymələrinə event listener
  list.querySelectorAll('.ap-toggle-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const uid     = btn.dataset.uid;
      const curRole = btn.dataset.role;
      const newRole = curRole === 'admin' ? 'user' : 'admin';

      btn.disabled    = true;
      btn.textContent = '…';

      try {
        await setUserRole(uid, newRole);
        // Refresh
        await renderUsers();
      } catch (e) {
        btn.disabled    = false;
        btn.textContent = curRole === 'admin' ? 'Sil' : 'Admin et';
        alert('Xəta: ' + (e.message || e));
      }
    });
  });
}

// ─── Paneli aç ────────────────────────────────────────────────
export function openAdminPanel() {
  if (!isAdmin()) return;
  if (!document.getElementById('adminPanel')) createPanelHTML();
  document.getElementById('adminPanel').classList.add('open');
  panelOpen = true;
  renderUsers();
}

// ─── Paneli bağla ─────────────────────────────────────────────
export function closeAdminPanel() {
  document.getElementById('adminPanel')?.classList.remove('open');
  panelOpen = false;
}

// ─── Düymə initi (drawer-daki "İstifadəçilər" düyməsi) ───────
export function initAdminPanelBtn() {
  const btn = document.getElementById('adminUsersBtn');
  if (btn) {
    btn.addEventListener('click', () => {
      // Drawer-ı bağla
      document.getElementById('sideDrawer')?.classList.remove('open');
      document.getElementById('drawerOverlay')?.classList.remove('open');
      document.body.style.overflow = '';
      openAdminPanel();
    });
  }
}
