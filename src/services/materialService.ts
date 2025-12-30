import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import { convertToDownloadLink } from './driveUtils';

export const isPlatformNative = () => Capacitor.getPlatform() !== 'web';

export const getLocalMaterialUrl = async (contentId: string, type: string): Promise<string | null> => {
    if (!isPlatformNative()) return null;

    try {
        const ext = type === 'pdf' ? 'pdf' : type === 'epub' ? 'epub' : type === 'mp3' ? 'mp3' : 'file';
        const path = `materials/${contentId}.${ext}`;

        try {
            await Filesystem.stat({ path, directory: Directory.Data });
        } catch {
            return null;
        }

        const uri = await Filesystem.getUri({ path, directory: Directory.Data });
        return Capacitor.convertFileSrc(uri.uri);
    } catch (e) {
        return null;
    }
};

export const downloadMaterial = async (contentId: string, url: string, type: string): Promise<void> => {
    if (!isPlatformNative()) return;

    const downloadLink = convertToDownloadLink(url);
    const ext = type === 'pdf' ? 'pdf' : type === 'epub' ? 'epub' : type === 'mp3' ? 'mp3' : 'file';
    const path = `materials/${contentId}.${ext}`;

    try {
        await Filesystem.mkdir({ path: 'materials', directory: Directory.Data, recursive: true });
    } catch { }

    await Filesystem.downloadFile({
        path,
        url: downloadLink,
        directory: Directory.Data,
    });
};

export const deleteMaterial = async (contentId: string, type: string): Promise<void> => {
    if (!isPlatformNative()) return;
    try {
        const ext = type === 'pdf' ? 'pdf' : type === 'epub' ? 'epub' : type === 'mp3' ? 'mp3' : 'file';
        await Filesystem.deleteFile({
            path: `materials/${contentId}.${ext}`,
            directory: Directory.Data
        });
    } catch (e) { }
};
