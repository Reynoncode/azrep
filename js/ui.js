// ==============================
// ui.js — Nav, Drawer, Modal, Ticker
// ==============================

import { currentSection, setCurrentSection } from './state.js';
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

export function initModal() {
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

export function closeNewsModal() {
  document.getElementById('newsModal').classList.remove('open');
  resetForm();
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
