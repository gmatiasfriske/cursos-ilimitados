import { ref, get, set, child } from 'firebase/database';
import { db } from './firebase';
import type { Course } from '../types';

export interface AppData {
    courses: Course[];
}

const initialData: AppData = {
    courses: []
};

const DATA_KEY = 'app_data_v1';

export const getData = async (): Promise<AppData> => {
    // 1. Try fetching from Firebase (Online)
    try {
        const dbRef = ref(db);
        const snapshot = await get(child(dbRef, '/'));

        if (snapshot.exists()) {
            const data = snapshot.val() as AppData;
            // Sync to local
            localStorage.setItem(DATA_KEY, JSON.stringify(data));
            return data;
        }
    } catch (error) {
        console.warn("Offline or Firebase error, using local data.", error);
    }

    // 2. Fallback to LocalStorage (Offline)
    const local = localStorage.getItem(DATA_KEY);
    if (local) {
        try {
            return JSON.parse(local) as AppData;
        } catch (e) {
            console.error("Local data corrupted", e);
        }
    }

    return initialData;
};

export const saveData = async (data: AppData): Promise<void> => {
    if (!navigator.onLine) {
        alert("Você está offline. Alterações no modo admin não podem ser salvas sem internet.");
        return;
    }

    try {
        await set(ref(db, '/'), data);
        // Sync local
        localStorage.setItem(DATA_KEY, JSON.stringify(data));
    } catch (error) {
        console.error("Error saving data to Firebase:", error);
        alert("Erro ao salvar no servidor. Verifique sua conexão ou permissões.");
    }
};

export const resetData = async (): Promise<void> => {
    // Optional: Clear DB or reset to initial
    await saveData(initialData);
};

// --- Notes System ---

export interface PublicNote {
    user: string;
    content: string;
    timestamp: number;
}

export const savePublicNote = async (lessonId: string, userName: string, content: string): Promise<void> => {
    if (!userName.trim()) return;
    const sanitizedUser = userName.replace(/[.#$/[\]]/g, '_'); // Firebase keys can't have these
    const path = `public_notes/${lessonId}/${sanitizedUser}`;

    try {
        await set(ref(db, path), {
            content,
            timestamp: Date.now()
        });
    } catch (error) {
        console.error("Error sharing note:", error);
        throw error;
    }
};

export const getPublicNotes = async (lessonId: string): Promise<PublicNote[]> => {
    try {
        const snapshot = await get(child(ref(db), `public_notes/${lessonId}`));
        if (snapshot.exists()) {
            const data = snapshot.val();
            return Object.keys(data).map(key => ({
                user: key.replace(/_/g, ' '), // Simple un-sanitize for display (approximate) or just use the key
                content: data[key].content,
                timestamp: data[key].timestamp
            }));
        }
        return [];
    } catch (error) {
        console.error("Error fetching notes:", error);
        return [];
    }
};

export const deletePublicNote = async (lessonId: string, userName: string): Promise<void> => {
    if (!userName.trim()) return;
    const sanitizedUser = userName.replace(/[.#$/[\]]/g, '_');
    const path = `public_notes/${lessonId}/${sanitizedUser}`;

    // Import 'remove' dynamically or assume it is in the imports. 
    // Wait, need to add 'remove' to imports at top of file first? 
    // Simpler: Just use set(null).
    try {
        await set(ref(db, path), null);
    } catch (error) {
        console.error("Error deleting note:", error);
        throw error;
    }
};
