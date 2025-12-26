

const API_KEY = 'AIzaSyBWvskcuySH3rzTM4eTNbw18_W9KfknQkM';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${API_KEY}`;

export const correctAndOrganizeNotes = async (text: string): Promise<string> => {
    if (!text || text.trim().length === 0) return '';

    const prompt = `
    Atue como um editor de texto profissional.
    Sua tarefa é APENAS CORRIGIR gramática/pontuação e ORGANIZAR visualmente o texto abaixo.
    NÃO adicione informações novas. NÃO resuma demais. Mantenha todo o conteúdo original, apenas deixando-o mais legível.
    
    Use ESTRITAMENTE tags HTML para a formatação:
    - <b>título/importante</b>
    - <i>ênfase</i>
    - <ul><li>lista</li></ul> para tópicos
    - <br> para quebras de linha
    
    Retorne APENAS o HTML resultante, sem texto introdutório.
    
    Texto: "${text}"
    `;

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }]
            })
        });

        if (!response.ok) {
            throw new Error(`AI API Error: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.candidates && data.candidates.length > 0 && data.candidates[0].content) {
            return data.candidates[0].content.parts[0].text;
        }

        return text; // Fallback to original if no result
    } catch (error) {
        console.error("AI Service Error:", error);
        return text; // Return original on error
    }
};
