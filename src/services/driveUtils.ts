const getFileId = (url: string) => {
    if (!url) return '';
    const cleanUrl = url.trim();
    const patterns = [
        /\/file\/d\/([a-zA-Z0-9_-]+)/,
        /id=([a-zA-Z0-9_-]+)/
    ];
    for (const pattern of patterns) {
        const match = cleanUrl.match(pattern);
        if (match && match[1]) return match[1];
    }
    return '';
};

const getYouTubeId = (url: string) => {
    if (!url) return '';
    const patterns = [
        /(?:v=|\/v\/|embed\/|youtu\.be\/|shorts\/)([a-zA-Z0-9_-]{11})/,
        /^([a-zA-Z0-9_-]{11})$/
    ];
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) return match[1];
    }
    return '';
};

export const convertToEmbedLink = (url: string): string => {
    const fileId = getFileId(url);
    if (fileId) return `https://drive.google.com/file/d/${fileId}/preview`;

    const ytId = getYouTubeId(url);
    if (ytId) return `https://www.youtube.com/embed/${ytId}?autoplay=1&mute=1&rel=0`;

    return url;
};

// Generic "direct" link (iframe default)
export const convertToDirectLink = convertToEmbedLink;

export const convertToImageLink = (url: string): string => {
    const fileId = getFileId(url);
    // Using lh3.googleusercontent.com format which is more reliable for native apps/CORS
    return fileId ? `https://lh3.googleusercontent.com/d/${fileId}` : url;
};

export const convertToDownloadLink = (url: string): string => {
    const fileId = getFileId(url);
    return fileId ? `https://drive.google.com/uc?export=download&id=${fileId}` : url;
};

export const convertToVideoStreamLink = (url: string): string => {
    const fileId = getFileId(url);
    // Use lh3 domain with =m18 (360p stream). Direct stream often bypasses interstitials.
    return fileId ? `https://lh3.googleusercontent.com/d/${fileId}=m18` : url;
};

export const getThumbnailLink = (url: string): string => {
    const fileId = getFileId(url);
    return fileId ? `https://drive.google.com/thumbnail?id=${fileId}&sz=w500` : '';
};
