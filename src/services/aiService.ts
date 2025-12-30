

const API_KEY = 'AIzaSyBWvskcuySH3rzTM4eTNbw18_W9KfknQkM';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${API_KEY}`;

export const correctAndOrganizeNotes = async (text: string): Promise<string> => {
    if (!text || text.trim().length === 0) return '';

    const prompt = `
    Atue como um editor de texto profissional de alto nível.
    Sua tarefa é CORRIGIR gramática/pontuação e ORGANIZAR visualmente o texto abaixo de forma estruturada e elegante.
    NÃO adicione informações novas.
    
    DIRETRIZES DE FORMATAÇÃO (ESTRITAMENTE HTML):
    - Use <b> para termos chave, conceitos importantes e palavras de destaque. Use isso com frequência para facilitar o escaneamento visual.</b>
    - Use <i> para ênfases sutis ou estrangeirismos.</i>
    - Use <br><br><b><u>TÍTULO EM CAIXA ALTA</u></b><br> para separar seções distintas se o texto for longo.
    - Use <ul><li> para listas de tópicos sempre que houver enumerações.
    - Mantenha parágrafos bem espaçados com <br><br>.
    
    Objetivo: O texto deve parecer um resumo profissional e bem estruturado.
    Retorne APENAS o HTML resultante, sem texto introdutório ou conclusivo.
    
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
