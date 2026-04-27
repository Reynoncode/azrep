// ==============================
// auth.js — Giriş / Qeydiyyat sistemi
// ==============================

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';

const firebaseConfig = {
  apiKey: 'AIzaSyDzCQsF10gofC5sdwIXK2wlX0QKRxY4vE4',
  authDomain: 'hiprhyme-2587e.firebaseapp.com',
  projectId: 'hiprhyme-2587e',
  storageBucket: 'hiprhyme-2587e.firebasestorage.app',
  messagingSenderId: '401645996625',
  appId: '1:401645996625:web:a168b32f7121b9fb95c670',
};

const app  = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

// ─── Cari istifadəçi state-i ──────────────────────────────────
export let currentUser     = null;
export let currentUserData = null;

// ─── Auth state dəyişikliyi ───────────────────────────────────
export function initAuth(onUserChange) {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      currentUser = user;
      currentUserData = await fetchUserData(user.uid);
    } else {
      currentUser     = null;
      currentUserData = null;
    }
    onUserChange(currentUser, currentUserData);
  });
}

// ─── Firestore-dan istifadəçi məlumatını çək ─────────────────
async function fetchUserData(uid) {
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.exists() ? snap.data() : null;
  } catch (e) {
    console.error('User data fetch error:', e);
    return null;
  }
}

// ─── Bütün istifadəçiləri çək (yalnız admin üçün) ────────────
export async function fetchAllUsers() {
  try {
    const snap = await getDocs(collection(db, 'users'));
    return snap.docs.map(d => ({ uid: d.id, ...d.data() }));
  } catch (e) {
    console.error('fetchAllUsers error:', e);
    return [];
  }
}

// ─── İstifadəçinin rolunu dəyişdir (yalnız admin üçün) ────────
export async function setUserRole(uid, role) {
  await updateDoc(doc(db, 'users', uid), { role });
}

// ─── Ad validasiyası ──────────────────────────────────────────
export function validateDisplayName(name) {
  const trimmed = name.trim();
  if (trimmed.length < 4)  return 'Ad minimum 4 hərf olmalıdır.';
  if (trimmed.length > 20) return 'Ad maximum 20 hərf ola bilər.';
  return null;
}

// ─── Ad unikallığını yoxla ────────────────────────────────────
async function isNameTaken(name, excludeUid) {
  try {
    const q    = query(collection(db, 'users'), where('displayNameLower', '==', name.toLowerCase()));
    const snap = await getDocs(q);
    return snap.docs.some(d => d.id !== excludeUid);
  } catch (e) {
    console.warn('Name check skipped (permission):', e.code);
    return false;
  }
}

async function findUniqueName(base, uid) {
  let candidate = base.trim();
  if (!(await isNameTaken(candidate, uid))) return candidate;
  for (let i = 1; i <= 99; i++) {
    const alt = `${candidate}${i}`;
    if (!(await isNameTaken(alt, uid))) return alt;
  }
  return `${candidate}_${Date.now()}`;
}

// ─── QEYDİYYAT ───────────────────────────────────────────────
export async function registerUser(displayName, email, password) {
  const baseName = displayName.trim();

  // 1. Firebase Auth hesabı yarat
  const cred = await createUserWithEmailAndPassword(auth, email, password);

  // 2. Unikal ad tap
  const uniqueName = await findUniqueName(baseName, cred.user.uid);

  // 3. Auth profil adını yenilə
  await updateProfile(cred.user, { displayName: uniqueName });

  // 4. Firestore-da user doc yarat (role: 'user')
  await setDoc(doc(db, 'users', cred.user.uid), {
    displayName:      uniqueName,
    displayNameLower: uniqueName.toLowerCase(),
    email,
    role:      'user',
    createdAt: serverTimestamp(),
    photoURL:  null,
  });

  currentUser     = cred.user;
  currentUserData = { displayName: uniqueName, email, role: 'user', photoURL: null };
  return { user: cred.user, assignedName: uniqueName };
}

// ─── GİRİŞ ────────────────────────────────────────────────────
export async function loginUser(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  currentUser     = cred.user;
  currentUserData = await fetchUserData(cred.user.uid);
  return cred.user;
}

// ─── ÇIXIŞ ────────────────────────────────────────────────────
export async function logoutUser() {
  await signOut(auth);
  currentUser     = null;
  currentUserData = null;
}

// ─── Admin yoxlaması ──────────────────────────────────────────
export function isAdmin() {
  return currentUserData?.role === 'admin';
}

// ─── Avatar hərfi ─────────────────────────────────────────────
export function getInitials(name) {
  if (!name) return '?';
  return name.trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2);
}
