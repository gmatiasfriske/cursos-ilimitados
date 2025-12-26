import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import { convertToDownloadLink } from './driveUtils';

export const isPlatformNative = () => Capacitor.getPlatform() !== 'web';

export const getLocalVideoUrl = async (lessonId: string): Promise<string | null> => {
    if (!isPlatformNative()) return null;

    try {
        const path = `videos/${lessonId}.mp4`;
        // Check if exists
        try {
            await Filesystem.stat({ path, directory: Directory.Data });
        } catch {
            return null; // Not found
        }

        const uri = await Filesystem.getUri({ path, directory: Directory.Data });
        return Capacitor.convertFileSrc(uri.uri);
    } catch (e) {
        console.error("Error getting local video", e);
        return null;
    }
};

export const downloadVideo = async (lessonId: string, driveUrl: string): Promise<void> => {
    if (!isPlatformNative()) {
        alert("Download disponível apenas no App.");
        throw new Error("Web not supported");
    }

    const downloadLink = convertToDownloadLink(driveUrl);

    // Ensure 'videos' directory exists
    try {
        await Filesystem.mkdir({ path: 'videos', directory: Directory.Data, recursive: true });
    } catch { }

    const path = `videos/${lessonId}.mp4`;

    try {
        await Filesystem.downloadFile({
            path,
            url: downloadLink,
            directory: Directory.Data,
        });
    } catch (error) {
        console.error("Download failed:", error);
        throw error;
    }
};

export const deleteVideo = async (lessonId: string): Promise<void> => {
    if (!isPlatformNative()) return;
    try {
        await Filesystem.deleteFile({
            path: `videos/${lessonId}.mp4`,
            directory: Directory.Data
        });
    } catch (e) {
        console.error("Error deleting", e);
    }
};
