import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

// Substitua com suas credenciais do Firebase
// Você encontra isso em: Project Settings > General > Your apps
const firebaseConfig = {
    apiKey: "SUA_API_KEY_AQUI",
    authDomain: "app-curso-58cd4.firebaseapp.com", // Baseado no ID do seu DB
    databaseURL: "https://app-curso-58cd4-default-rtdb.firebaseio.com",
    projectId: "app-curso-58cd4",
    storageBucket: "app-curso-58cd4.firebasestorage.app",
    messagingSenderId: "SEU_SENDER_ID",
    appId: "SEU_APP_ID"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
