// env.js - Charge les variables depuis .env (pour repo privé)
async function loadEnv() {
    try {
        const response = await fetch('./.env');
        const text = await response.text();
        const lines = text.split('\n');
        
        const env = {};
        lines.forEach(line => {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('#')) {
                const [key, value] = trimmed.split('=');
                if (key && value) {
                    env[key.trim()] = value.trim();
                }
            }
        });
        
        window.ENV = env;
    } catch (error) {
        console.error('Erreur chargement .env:', error);
        // Fallback avec ton lien actuel
        window.ENV = { 
            SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbz7Xvhqd98MGNXI0kUzrNNYJpV7RmDPs18
