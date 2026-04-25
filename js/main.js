// ==============================
// main.js — Entry point
// ==============================

import { setCurrentDate, initNav, initTicker, initModal, initDrawer } from './ui.js';
import { initImageUpload, initVideoUpload, initMediaTabs, initLinkInput } from './media.js';
import { initPublish, loadNews } from './news.js';
import { initArtistModal, closeArtistProfile } from './artists.js';
import { initGundemModal } from './gundem.js';
import { initSearch } from './search.js';
import { initAuthUI } from './authui.js';

document.addEventListener('DOMContentLoaded', () => {
  // Logo click üçün closeArtistProfile-i qlobal et
  window.__artistModule = { closeArtistProfile };

  setCurrentDate();
  initNav();
  initTicker();
  initModal();
  initDrawer();
  initImageUpload();
  initVideoUpload();
  initMediaTabs();
  initLinkInput();
  initPublish();
  initArtistModal();
  initGundemModal();
  initSearch();
  initAuthUI();   // Auth UI — ən sonda, digər sistemlər hazır olandan sonra
  loadNews();
});
