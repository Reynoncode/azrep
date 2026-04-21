# Firestore İndeksləri

Yorumlar sisteminin düzgün işləməsi üçün Firebase Console-da aşağıdakı composite index yaradılmalıdır:

**Collection:** `comments`  
**Fields:**
1. `newsId` — Ascending
2. `createdAt` — Ascending

**Firebase Console-da addımlar:**
1. Firebase Console → Firestore Database → Indexes → Composite
2. "Add index" düyməsinə bas
3. Collection: `comments`
4. Field 1: `newsId` (Ascending)
5. Field 2: `createdAt` (Ascending)
6. "Create" düyməsinə bas

Bu olmadan Firestore `where` + `orderBy` sorğusu xəta verəcək.
