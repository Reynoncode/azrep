// ==============================
// state.js — Qlobal state
// ==============================

export let news            = [];
export let releases        = [];
export let podcasts        = [];
export let currentImages   = [];
export let currentVideoFile = null;
export let currentVideoTrim = { start: 0, end: null };
export let activeMediaType  = 'image';
export let currentSection   = 'home';
export let currentPostType  = null; // 'news' | 'release' | 'podcast'

export let cropState = {
  img: null, containerW: 0, containerH: 0,
  imgW: 0, imgH: 0, boxX: 0, boxY: 0, boxW: 0, boxH: 0,
  ratio: 1, dragging: false, resizing: false,
  dragStartX: 0, dragStartY: 0, handle: null
};

// Setter-lər (ES module dəyişənlərini xaricdən dəyişmək üçün)
export function setNews(val)             { news = val; }
export function setReleases(val)         { releases = val; }
export function setPodcasts(val)         { podcasts = val; }
export function pushRelease(val)         { releases.unshift(val); }
export function pushPodcast(val)         { podcasts.unshift(val); }
export function setCurrentImages(val)    { currentImages = val; }
export function pushImage(val)           { currentImages.push(val); }
export function spliceImage(idx)         { currentImages.splice(idx, 1); }
export function setCurrentVideoFile(val) { currentVideoFile = val; }
export function setCurrentVideoTrim(val) { currentVideoTrim = val; }
export function setActiveMediaType(val)  { activeMediaType = val; }
export function setCurrentSection(val)   { currentSection = val; }
export function setCurrentPostType(val)  { currentPostType = val; }
export function setCropState(patch)      { Object.assign(cropState, patch); }
