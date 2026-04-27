// ==============================
// youtube.js — YouTube link-dən məlumat çəkmə
// ==============================

export function extractYouTubeId(url) {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /[?&]v=([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

export function getYouTubeThumbnail(videoId) {
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
}

// YouTube məlumatlarını çək: başlıq, kanal adı, açıqlama, thumbnail
export async function fetchYouTubeData(url) {
  const videoId = extractYouTubeId(url);
  if (!videoId) throw new Error('Düzgün YouTube linki deyil.');

  // oEmbed → başlıq + kanal adı (CORS var, etibarlı)
  const oRes = await fetch(
    `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
  );
  if (!oRes.ok) throw new Error('YouTube məlumatı alınmadı. Linki yoxlayın.');
  const oData = await oRes.json();

  // Açıqlama üçün youtube-description.vercel.app proxy istifadə edirik
  // Bu servis CORS header göndərir və description qaytarır
  let description = '';
  try {
    const dRes = await fetch(
      `https://youtube-description.vercel.app/api?videoId=${videoId}`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (dRes.ok) {
      const dData = await dRes.json();
      description = dData.description || '';
    }
  } catch { /* proxy işləməsə boş burax */ }

  // Əgər yuxarıdakı proxy işləməsə — ytdl-info.vercel.app cəhd et
  if (!description) {
    try {
      const d2Res = await fetch(
        `https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`,
        { signal: AbortSignal.timeout(4000) }
      );
      if (d2Res.ok) {
        const d2Data = await d2Res.json();
        description = d2Data.description || '';
      }
    } catch { /* boş burax */ }
  }

  return {
    videoId,
    title:             oData.title       || '',
    author:            oData.author_name || '',
    description,
    thumbnail:         `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
    thumbnailFallback: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    embedUrl:          `https://www.youtube.com/embed/${videoId}`,
    watchUrl:          `https://www.youtube.com/watch?v=${videoId}`,
  };
}

// Thumbnail URL-ni base64-ə çevir
// img.youtube.com CORS header göndərmir → canvas.toDataURL xəta verir
// Buna görə fetch + blob yolu ilə cəhd edirik
export async function thumbnailToBase64(thumbnailUrl, fallbackUrl) {
  const tryUrl = async (url) => {
    // fetch ilə yükləyib blob-a çeviririk — bu CORS-u keçir
    const res = await fetch(url, { mode: 'no-cors' });
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  try {
    const result = await tryUrl(thumbnailUrl);
    // no-cors blob boş gəlir — null qaytar
    if (!result || result === 'data:application/octet-stream;base64,') return null;
    return result;
  } catch {
    if (fallbackUrl) {
      try { return await tryUrl(fallbackUrl); } catch {}
    }
    return null;
  }
}
