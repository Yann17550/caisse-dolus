/**
 * APPLICATION : Caisse Dolus (Pizza Oléron)
 * MISSION : Caisse robuste avec localStorage, gestion des erreurs
 * et envoi propre vers Apps Script (1 ligne / service).
 */

const app = {
    state: {
        ancv: [],        // ANCV (papier / connect)
        checks: [],      // chèques
        mypos: [],       // transactions MyPos
        archived: false  // marque si l'archive a été envoyée
    },

    CONFIG: {
        SCRIPT_URL: "https://script.google.com/macros/s/AKfycbz7Xvhqd98MGNXI0kUzrNNYJpV7RmDPs18brYPJsmg1t4-Hww3XrUzk79mcg6jQdbP6EA/exec",
        DEFAULT_CASH_OFFSET: 134.00,
        IDEAL_CASH: {
            20: 2, 10: 4, 5: 4,
            2: 10, 1: 10, 0.5: 5,
            0.2: 5, 0.1: 5
        }
    },

    /**
     * Initialisation complète de l'appli
     */
    init() {
        this.renderCashGrid();
        this.loadFromStorage();
        this.refreshUI();

        // Valeur par défaut du fond de caisse
        const offsetInput = document.getElementById('cash-offset');
        if (offsetInput && !offsetInput.value) {
            offsetInput.value = this.CONFIG.DEFAULT_CASH_OFFSET;
        }

        // Date par défaut = aujourd'hui
        const dateInput = document.getElementById('service-date');
        if (dateInput && !dateInput.value) {
            dateInput.value = new Date().toISOString().split('T')[0];
        }

        this.bindEvents();
        this.showView('view-pos');
    },

    /**
     * Génère la grille de caisse (billets + pièces)
     */
    renderCashGrid() {
        const bills = [100, 50, 20, 10, 5];
        const coins = [2, 1, 0.5, 0.2, 0.1];

        const container = document.getElementById('cash-grid');
        if (!container) return;

        const generateItemHTML = (u) => {
            let def = this.CONFIG.IDEAL_CASH[u] || 0;
            def = def || "";
            return `
                <div class="cash-item">
                    <label>${u}€</label>
                    <input type="number"
                           class="cash-in"
                           data-unit="${u}"
                           value="${def}"
                           inputmode="numeric"
                           onfocus="if(this.value=='${def}') this.value='';"
                           onblur="if(this.value=='') this.value='${def}'; app.refreshUI();">
                </div>`;
        };

        container.innerHTML = `
            <div class="cash-column">
                <h3 style="font-size: 0.75rem; text-transform: uppercase; text-align: center; color: var(--primary); margin-bottom: 8px;">Billets</h3>
                ${bills.map(u => generateItemHTML(u)).join('')}
            </div>
            <div class="cash-column">
                <h3 style="font-size: 0.75rem; text-transform: uppercase; text-align: center; color: var(--primary); margin-bottom: 8px;">Pièces</h3>
                ${coins.map(u => generateItemHTML(u)).join('')}
            </div>
        `;
    },

    /**
     * Gestion des vues (affichage / masquage)
     */
    showView(viewId) {
        document.querySelectorAll('.view').forEach(v => {
            v.classList.add('hidden');
            v.style.display = 'none';
        });

        const target = document.getElementById(viewId);
        if (target) {
            target.classList.remove('hidden');
            target.style.display = 'block';
            window.scrollTo(0, 0);
        }
    },

    /**
     * Ajout ANCV
     */
    addAncv() {
        const valInput = document.getElementById('ancv-val');
        const qtyInput = document.getElementById('ancv-qty');
        const typeSelected = document.querySelector('input[name="ancv-type"]:checked');

        if
