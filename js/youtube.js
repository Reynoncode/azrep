// ==============================
// youtube.js — YouTube link-dən məlumat çəkmə
// ==============================

// YouTube video ID-sini linkdən çıxar
export function extractYouTubeId(url) {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /[?&]v=([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// YouTube thumbnail URL-i
export function getYouTubeThumbnail(videoId) {
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
}

// YouTube oEmbed + noembed API ilə başlıq, kanal adı, açıqlama çək
export async function fetchYouTubeData(url) {
  const videoId = extractYouTubeId(url);
  if (!videoId) throw new Error('Düzgün YouTube linki deyil.');

  // oEmbed — başlıq + kanal adı qaytarır, CORS icazəsi var
  const oEmbedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
  const res = await fetch(oEmbedUrl);
  if (!res.ok) throw new Error('YouTube məlumatı alınmadı. Linki yoxlayın.');
  const data = await res.json();

  // noembed.com — açıqlama da qaytarır, CORS var
  let description = '';
  try {
    const noRes = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);
    if (noRes.ok) {
      const noData = await noRes.json();
      description = noData.description || '';
    }
  } catch { /* açıqlama alınmasa da davam et */ }

  return {
    videoId,
    title:             data.title       || '',
    author:            data.author_name || '',
    description,
    thumbnail:         getYouTubeThumbnail(videoId),
    thumbnailFallback: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    embedUrl:          `https://www.youtube.com/embed/${videoId}`,
    watchUrl:          `https://www.youtube.com/watch?v=${videoId}`,
  };
}

// Thumbnail-i CORS-suz img elementi kimi göstər (base64 çevirmə yox)
// img.youtube.com CORS header göndərmir — canvas.toDataURL xəta verir
// Buna görə thumbnail-i birbaşa <img src> ilə göstəririk, Firestore-a URL olaraq saxlayırıq
export function getThumbnailDisplayUrl(videoId) {
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
}

// Thumbnail base64-ə çevirmə cəhdi (yalnız CORS icazəsi olan hallarda işləyir)
export async function thumbnailToBase64(thumbnailUrl, fallbackUrl) {
  const tryFetch = async (url) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width  = img.naturalWidth  || img.width;
        canvas.height = img.naturalHeight || img.height;
        canvas.getContext('2d').drawImage(img, 0, 0);
        try {
          resolve(canvas.toDataURL('image/jpeg', 0.85));
        } catch (e) {
          reject(e);
        }
      };
      img.onerror = () => reject(new Error('Thumbnail yüklənmədi'));
      img.src = url;
    });
  };

  try {
    return await tryFetch(thumbnailUrl);
  } catch {
    if (fallbackUrl) {
      try { return await tryFetch(fallbackUrl); } catch {}
    }
    // CORS xətası — null qaytar, URL ilə göstərəcəyik
    return null;
  }
}
