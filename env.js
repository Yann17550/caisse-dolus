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
        window.ENV = { SCRIPT_URL: '' };
    }
}

// Charge env au démarrage
loadEnv();
