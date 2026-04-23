// ==============================
// main.js — Entry point
// ==============================

import { setCurrentDate, initNav, initTicker, initModal, initDrawer } from './ui.js';
import { initImageUpload, initVideoUpload, initMediaTabs, initLinkInput } from './media.js';
import { initPublish, loadNews } from './news.js';
import { initArtistModal } from './artists.js';
import { initGundemModal } from './gundem.js';
import { initSearch } from './search.js';

document.addEventListener('DOMContentLoaded', () => {
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
  loadNews();
});
