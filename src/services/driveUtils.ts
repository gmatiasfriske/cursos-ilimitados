// Basic ID extraction reuse
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

export const convertToEmbedLink = (url: string): string => {
    const fileId = getFileId(url);
    return fileId ? `https://drive.google.com/file/d/${fileId}/preview` : url;
};

// Generic "direct" link (iframe default)
export const convertToDirectLink = convertToEmbedLink;

export const convertToImageLink = (url: string): string => {
    const fileId = getFileId(url);
    // Use thumbnail link with large size (w1000) for better reliability/CORS handling than uc?export=view
    return fileId ? `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000` : url;
};

export const convertToDownloadLink = (url: string): string => {
    const fileId = getFileId(url);
    return fileId ? `https://drive.google.com/uc?export=download&id=${fileId}` : url;
};

export const convertToVideoStreamLink = (url: string): string => {
    const fileId = getFileId(url);
    // 'download' export is often needed for <video src="...">, though bandwidth limits apply
    return fileId ? `https://drive.google.com/uc?export=download&id=${fileId}` : url;
};

export const getThumbnailLink = (url: string): string => {
    const fileId = getFileId(url);
    return fileId ? `https://drive.google.com/thumbnail?id=${fileId}&sz=w500` : '';
};
