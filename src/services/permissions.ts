import { Capacitor } from '@capacitor/core';
import { Filesystem } from '@capacitor/filesystem';

export const checkPermissions = async (): Promise<boolean> => {
    if (Capacitor.getPlatform() === 'web') return true;

    try {
        // Request public storage access to ensure we can read/write correctly 
        // especially if we move to public directories later.
        // For 'Directory.Data' it's usually automatic, but this satisfies explicit checks.
        const status = await Filesystem.checkPermissions();

        if (status.publicStorage !== 'granted') {
            const request = await Filesystem.requestPermissions();
            return request.publicStorage === 'granted';
        }

        return true;
    } catch (e) {
        console.error("Permission check failed", e);
        return false;
    }
};
