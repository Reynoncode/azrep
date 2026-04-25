// ==============================
// authui.js — Auth UI idarəsi
// ==============================

import {
  initAuth,
  registerUser,
  loginUser,
  logoutUser,
  isAdmin,
  getInitials,
  validateDisplayName,
} from './auth.js';

// ─── Firebase error mesajlarını Azərbaycan dilinə çevir ───────
function authErrMsg(code) {
  const map = {
    'auth/email-already-in-use':   'Bu e-mail artıq istifadə olunur.',
    'auth/invalid-email':          'E-mail ünvanı düzgün deyil.',
    'auth/weak-password':          'Şifrə ən azı 6 hərf olmalıdır.',
    'auth/user-not-found':         'Bu e-mail ilə hesab tapılmadı.',
    'auth/wrong-password':         'Şifrə yanlışdır.',
    'auth/invalid-credential':     'E-mail və ya şifrə yanlışdır.',
    'auth/too-many-requests':      'Çox sayda cəhd. Bir az gözləyin.',
    'auth/network-request-failed': 'Şəbəkə xətası. İnternet bağlantısını yoxlayın.',
    'auth/user-disabled':          'Bu hesab bloklanıb.',
  };
  return map[code] || 'Xəta baş verdi. Yenidən cəhd edin.';
}

// ─── Modal aç/bağla ───────────────────────────────────────────
function openAuthModal() {
  document.getElementById('authModal')?.classList.add('open');
}
function closeAuthModal() {
  document.getElementById('authModal')?.classList.remove('open');
  clearAuthErrors();
}
function clearAuthErrors() {
  ['loginError', 'registerError', 'registerSuccess'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.textContent = ''; el.classList.remove('visible'); }
  });
  ['loginEmail','loginPassword','registerName','registerEmail','registerPassword']
    .forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
}

// ─── Tab keçid ────────────────────────────────────────────────
function initAuthTabs() {
  document.querySelectorAll('[data-auth-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.authTab;
      document.querySelectorAll('[data-auth-tab]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.auth-panel').forEach(p => p.classList.remove('active'));
      document.getElementById(tab === 'login' ? 'authLoginPanel' : 'authRegisterPanel')
        ?.classList.add('active');
    });
  });
}

// ─── Nav profil düyməsini yenilə ─────────────────────────────
function updateNavProfile(user, userData) {
  const btn = document.getElementById('navProfileBtn');
  if (!btn) return;

  if (user) {
    const displayName = userData?.displayName || user.displayName || user.email?.split('@')[0] || 'İstifadəçi';
    const role        = userData?.role || 'user';
    const initials    = getInitials(displayName);
    const adminCls    = role === 'admin' ? 'admin-avatar' : '';
    const title       = role === 'admin' ? `${displayName} — Admin` : displayName;
    btn.innerHTML     = `<div class="nav-avatar ${adminCls}" title="${title}">${initials}</div>`;
  } else {
    btn.innerHTML   = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="22" height="22">
      <circle cx="12" cy="8" r="4" stroke="currentColor" stroke-width="1.8"/>
      <path d="M4 20c0-4 3.582-7 8-7s8 3 8 7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
    </svg>`;
    btn.title = 'Giriş et / Qeydiyyat';
  }
}

// ─── Drawer profil blokunu yenilə ─────────────────────────────
function updateDrawer(user, userData) {
  const profileEl   = document.getElementById('drawerProfile');
  const innerEl     = document.getElementById('drawerProfileInner');
  const adminBtns   = document.getElementById('drawerAdminBtns');

  if (user) {
    const displayName = userData?.displayName || user.displayName || user.email?.split('@')[0] || 'İstifadəçi';
    const role        = userData?.role || 'user';
    const initials    = getInitials(displayName);
    const adminCls    = role === 'admin' ? 'admin-avatar' : '';
    const roleLabel   = role === 'admin' ? 'Admin' : 'İstifadəçi';
    const roleCls     = role === 'admin' ? '' : 'user-role';

    if (profileEl) profileEl.style.display = '';
    if (innerEl) {
      innerEl.innerHTML = `
        <div class="drawer-profile-avatar ${adminCls}">${initials}</div>
        <div class="drawer-profile-info">
          <div class="drawer-profile-name">${displayName}</div>
          <div class="drawer-profile-role ${roleCls}">${roleLabel}</div>
        </div>`;
    }
    // Admin olarsa əlavə et düymələrini göstər
    if (adminBtns) {
      adminBtns.classList.toggle('admin-visible', role === 'admin');
    }
  } else {
    if (profileEl) profileEl.style.display = 'none';
    if (adminBtns) adminBtns.classList.remove('admin-visible');
  }
}

// ─── Modal içi — profil görünüşünü yenilə ─────────────────────
function updateAuthModalContent(user, userData) {
  const formArea    = document.getElementById('authFormArea');
  const profileArea = document.getElementById('authProfileArea');
  const titleEl     = document.getElementById('authModalTitle');

  if (user) {
    // Profil görünüşü — userData olmasa belə user varsa profili göstər
    if (formArea)    formArea.style.display    = 'none';
    if (profileArea) profileArea.style.display = '';
    if (titleEl)     titleEl.textContent       = 'PROFİL';

    // userData Firestore-dan gəlməyibsə Firebase Auth məlumatlarını istifadə et
    const displayName = userData?.displayName || user.displayName || user.email?.split('@')[0] || 'İstifadəçi';
    const role        = userData?.role || 'user';

    const initials  = getInitials(displayName);
    const adminCls  = role === 'admin' ? 'admin-avatar' : '';
    const roleLabel = role === 'admin' ? 'Admin' : 'İstifadəçi';
    const roleCls   = role === 'admin' ? 'admin' : 'user';

    const content = document.getElementById('profilePanelContent');
    if (content) {
      content.innerHTML = `
        <div class="profile-header">
          <div class="profile-avatar-lg ${adminCls}">${initials}</div>
          <div class="profile-info">
            <div class="profile-name">${displayName}</div>
            <div class="profile-email">${user.email}</div>
            <span class="profile-role-badge ${roleCls}">${roleLabel}</span>
          </div>
        </div>
        ${role !== 'admin' ? `
        <div style="padding:12px 0 20px;">
          <p style="font-family:'Inter',sans-serif;font-size:12px;color:#888;line-height:1.6;">
            Admin səlahiyyəti sayt rəhbərliyi tərəfindən verilir. 
            Məzmun əlavə etmək üçün admin statusu lazımdır.
          </p>
        </div>` : `
        <div style="padding:12px 0 20px;">
          <p style="font-family:'IBM Plex Mono',monospace;font-size:11px;color:#FF3C00;letter-spacing:1px;">
            ✓ ADMIN — MƏZMUN ƏLAVƏ EDƏ BİLƏRSİNİZ
          </p>
        </div>`}
        <button class="profile-logout-btn" id="profileLogoutBtn">ÇIXIŞ ET</button>`;

      document.getElementById('profileLogoutBtn')?.addEventListener('click', async () => {
        await logoutUser();
        closeAuthModal();
      });
    }
  } else {
    // Giriş/qeydiyyat görünüşü
    if (formArea)    formArea.style.display    = '';
    if (profileArea) profileArea.style.display = 'none';
    if (titleEl)     titleEl.textContent       = 'HESAB';
  }
}

// ─── Giriş formu ──────────────────────────────────────────────
function initLoginForm() {
  const btn      = document.getElementById('loginSubmitBtn');
  const errEl    = document.getElementById('loginError');

  // Enter ilə submit
  ['loginEmail','loginPassword'].forEach(id => {
    document.getElementById(id)?.addEventListener('keydown', e => {
      if (e.key === 'Enter') btn?.click();
    });
  });

  btn?.addEventListener('click', async () => {
    const email    = document.getElementById('loginEmail')?.value.trim();
    const password = document.getElementById('loginPassword')?.value;
    errEl.textContent = '';
    errEl.classList.remove('visible');

    if (!email || !password) {
      errEl.textContent = 'E-mail və şifrəni daxil edin.';
      errEl.classList.add('visible');
      return;
    }

    btn.disabled    = true;
    btn.textContent = 'YÜKLƏNİR…';
    try {
      await loginUser(email, password);
      closeAuthModal();
    } catch (err) {
      errEl.textContent = authErrMsg(err.code);
      errEl.classList.add('visible');
    } finally {
      btn.disabled    = false;
      btn.textContent = 'GİRİŞ ET';
    }
  });
}

// ─── Qeydiyyat formu ──────────────────────────────────────────
function initRegisterForm() {
  const btn     = document.getElementById('registerSubmitBtn');
  const errEl   = document.getElementById('registerError');
  const succEl  = document.getElementById('registerSuccess');

  ['registerName','registerEmail','registerPassword'].forEach(id => {
    document.getElementById(id)?.addEventListener('keydown', e => {
      if (e.key === 'Enter') btn?.click();
    });
  });

  btn?.addEventListener('click', async () => {
    const name     = document.getElementById('registerName')?.value.trim();
    const email    = document.getElementById('registerEmail')?.value.trim();
    const password = document.getElementById('registerPassword')?.value;

    errEl.textContent  = '';  errEl.classList.remove('visible');
    succEl.textContent = ''; succEl.classList.remove('visible');

    if (!name) {
      errEl.textContent = 'Adınızı daxil edin.';
      errEl.classList.add('visible'); return;
    }
    const nameErr = validateDisplayName(name);
    if (nameErr) {
      errEl.textContent = nameErr;
      errEl.classList.add('visible'); return;
    }
    if (!email) {
      errEl.textContent = 'E-mail daxil edin.';
      errEl.classList.add('visible'); return;
    }
    if (!password || password.length < 6) {
      errEl.textContent = 'Şifrə ən azı 6 hərf olmalıdır.';
      errEl.classList.add('visible'); return;
    }

    btn.disabled    = true;
    btn.textContent = 'YÜKLƏNİR…';

    try {
      const result = await registerUser(name, email, password);
      const assigned = result.assignedName || name;
      closeAuthModal();
      if (assigned !== name) {
        setTimeout(() => {
          const toast = document.createElement('div');
          toast.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#FF3C00;color:#fff;font-family:IBM Plex Mono,monospace;font-size:12px;letter-spacing:1px;padding:10px 20px;border-radius:4px;z-index:9999;';
          toast.textContent = `Adınız "${assigned}" olaraq təyin edildi.`;
          document.body.appendChild(toast);
          setTimeout(() => toast.remove(), 4000);
        }, 300);
      }
    } catch (err) {
      errEl.textContent = authErrMsg(err.code);
      errEl.classList.add('visible');
    } finally {
      btn.disabled    = false;
      btn.textContent = 'HESAB YARAT';
    }
  });
}

// ─── ANA İNİT ─────────────────────────────────────────────────
export function initAuthUI() {
  // Modal aç/bağla
  document.getElementById('navProfileBtn')?.addEventListener('click', openAuthModal);
  document.getElementById('closeAuthModalBtn')?.addEventListener('click', closeAuthModal);
  document.getElementById('authModal')?.addEventListener('click', e => {
    if (e.target === document.getElementById('authModal')) closeAuthModal();
  });

  // Drawer profil linki — auth modal-ı açır, drawer-ı bağlayır
  document.getElementById('drawerProfileLink')?.addEventListener('click', e => {
    e.preventDefault();
    // Drawer-ı bağla
    document.getElementById('sideDrawer')?.classList.remove('open');
    document.getElementById('drawerOverlay')?.classList.remove('open');
    document.body.style.overflow = '';
    // Auth modal-ı aç
    openAuthModal();
  });

  initAuthTabs();
  initLoginForm();
  initRegisterForm();

  // Auth state dəyişikliyini dinlə
  initAuth((user, userData) => {
    updateNavProfile(user, userData);
    updateDrawer(user, userData);
    updateAuthModalContent(user, userData);
    // Drawer profil linkinin mətnini güncəllə
    const drawerProfileLink = document.getElementById('drawerProfileLink');
    if (drawerProfileLink) {
      drawerProfileLink.textContent = user ? 'PROFİL' : 'GİRİŞ / QEYDİYYAT';
    }
  });
}
