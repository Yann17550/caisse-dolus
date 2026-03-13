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
        SCRIPT_URL: window.ENV?.SCRIPT_URL || '',

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

        if (!typeSelected) return;

        const val = parseFloat(valInput.value);
        const qty = parseInt(qtyInput.value) || 0;
        const type = typeSelected.value;

        if (qty > 0) {
            this.state.ancv.push({ val, qty, type });
            qtyInput.value = '';
            this.refreshUI();
        }
    },

    removeAncv(idx) {
        this.state.ancv.splice(idx, 1);
        this.refreshUI();
    },

    /**
     * Ajout chèque
     */
    addCheck() {
        const amt = parseFloat(document.getElementById('check-amount').value) || 0;
        if (amt > 0) {
            this.state.checks.push(amt);
            document.getElementById('check-amount').value = '';
            this.refreshUI();
        }
    },

    removeCheck(idx) {
        this.state.checks.splice(idx, 1);
        this.refreshUI();
    },

    /**
     * Ajout MyPos
     */
    addMyPos() {
        const amt = parseFloat(document.getElementById('mypos-amount').value) || 0;
        if (amt > 0) {
            this.state.mypos.push(amt);
            document.getElementById('mypos-amount').value = '';
            this.refreshUI();
        }
    },

    removeMyPos(idx) {
        this.state.mypos.splice(idx, 1);
        this.refreshUI();
    },

    /**
     * Calculs et mise à jour de l'UI
     */
    refreshUI() {
        const getSum = (id1, id2) => {
            const v1 = parseFloat(document.getElementById(id1)?.value) || 0;
            const v2 = parseFloat(document.getElementById(id2)?.value) || 0;
            return v1 + v2;
        };

        document.getElementById('total-cb').textContent = getSum('cb-contact', 'cb-sans-contact').toFixed(2);
        document.getElementById('total-tr').textContent = getSum('tr-contact', 'tr-sans-contact').toFixed(2);
        document.getElementById('total-amex').textContent = getSum('amex-contact', 'amex-sans-contact').toFixed(2);

        let brut = 0;
        document.querySelectorAll('.cash-in').forEach(i => {
            brut += (parseFloat(i.dataset.unit) * (parseInt(i.value) || 0));
        });

        const offset = parseFloat(document.getElementById('cash-offset')?.value) || 0;
        document.getElementById('total-cash-brut').textContent = brut.toFixed(2);
        document.getElementById('total-cash-net').textContent = (brut - offset).toFixed(2);

        document.getElementById('total-ancv-paper').textContent =
            this.state.ancv.filter(i => i.type === 'paper').reduce((a, b) => a + (b.val * b.qty), 0).toFixed(2);

        document.getElementById('total-ancv-connect').textContent =
            this.state.ancv.filter(i => i.type === 'connect').reduce((a, b) => a + (b.val * b.qty), 0).toFixed(2);

        document.getElementById('total-checks').textContent =
            this.state.checks.reduce((a, b) => a + b, 0).toFixed(2);

        document.getElementById('total-mypos').textContent =
            this.state.mypos.reduce((a, b) => a + b, 0).toFixed(2);

        this.renderRecaps();
        this.saveToStorage();
    },

    renderRecaps() {
        document.getElementById('mypos-recap').innerHTML =
            this.state.mypos.map((amt, i) =>
                `<div class="recap-item"><span>Vente #${i+1}</span><strong>${amt.toFixed(2)}€</strong><button onclick="app.removeMyPos(${i})">❌</button></div>`
            ).join('');

        document.getElementById('ancv-recap').innerHTML =
            this.state.ancv.map((it, i) =>
                `<div class="recap-item"><span>${it.type==='paper'?'📄':'📱'} ${it.qty}x${it.val}€</span><strong>${(it.val*it.qty).toFixed(2)}€</strong><button onclick="app.removeAncv(${i})">❌</button></div>`
            ).join('');

        document.getElementById('checks-recap').innerHTML =
            this.state.checks.map((amt, i) =>
                `<div class="recap-item"><span>Chèque #${i+1}</span><strong>${amt.toFixed(2)}€</strong><button onclick="app.removeCheck(${i})">❌</button></div>`
            ).join('');
    },

    /**
     * Récapitulatif final + envoi vers Apps Script
     */
    openRecap() {
        const v = id => parseFloat(document.getElementById(id)?.textContent) || 0;
        const getIn = id => parseFloat(document.getElementById(id)?.value) || 0;

        const dateService = document.getElementById('service-date').value;
        if (!dateService) {
            alert("⚠️ ATTENTION : Veuillez sélectionner la date du service !");
            this.showView('view-pos');
            return;
        }

        const totalCB_Amex = v('total-cb') + v('total-amex');
        const cashCompte = v('total-cash-net');
        const posCashLogiciel = getIn('pos-cash');
        const sommePaiementsLogiciel = totalCB_Amex + v('total-tr') + v('total-ancv-paper') +
            v('total-ancv-connect') + v('total-checks') + posCashLogiciel;

        const tva5 = getIn('tva-5');
        const tva10 = getIn('tva-10');
        const tva20 = getIn('tva-20');
        const tvaTotal = tva5 + tva10 + tva20;

        const deltaCash = cashCompte - posCashLogiciel;

        // Stockage du service actuel
        this.currentData = {
            dateCustom: dateService,
            cb: totalCB_Amex,
            tr: v('total-tr'),
            mypos: v('total-mypos'),
            cashNet: cashCompte,
            ancvP: v('total-ancv-paper'),
            ancvC: v('total-ancv-connect'),
            checks: v('total-checks'),
            caTotal: sommePaiementsLogiciel,
            posCash: posCashLogiciel,
            deltaCash: deltaCash,
            tva5: tva5,
            tva10: tva10,
            tva20: tva20,
            pizzas_e: getIn('pos-pizzas'),
            timestamp: Date.now() // pour le classement dans localStorage
        };

        let html = `<div class="recap-content">
            <p style="text-align:center; background:#eee; padding:5px; border-radius:5px;"><b>📅 SERVICE DU : ${dateService.split('-').reverse().join('/')}</b></p>
            <p><b>POINTAGE RÉEL :</b></p>
            <div class="recap-row"><span>Espèces Net : </span><strong>${cashCompte.toFixed(2)} €</strong></div>
            <div class="recap-row"><span>CB Total : </span><strong>${totalCB_Amex.toFixed(2)} €</strong></div>
            <div class="recap-row"><span>ANCV : </span><strong>${(v('total-ancv-paper') + v('total-ancv-connect')).toFixed(2)} €</strong></div>
            <hr>
            <div class="recap-row" style="background:#fff3cd; padding:5px;"><span>⚠️ Écart Espèces : </span><strong>${deltaCash.toFixed(2)} €</strong></div>
            <hr>
            <p><b>LOGICIEL :</b> ${sommePaiementsLogiciel.toFixed(2)} €</p>
        </div>`;

        if (Math.abs(sommePaiementsLogiciel - tvaTotal) >= 0.1) {
            html += `<p style="color:red; text-align:center; font-weight:bold;">❌ Erreur TVA (${tvaTotal.toFixed(2)}€)<br>Vérifiez vos saisies !</p>`;
        } else {
            html += `<button id="btn-sync" class="btn-primary" style="width:100%; background:var(--success); height:50px; font-size:1.1rem;" onclick="app.sendCurrentService()">💾 ARCHIVER LE SERVICE</button>`;
        }

        document.getElementById('recap-body').innerHTML = html;
        document.getElementById('modal-recap').classList.remove('hidden');
    },

    /**
     * Envoi du service CURRENT (le service du jour OU le service en cours)
     */
    sendCurrentService() {
        const btn = document.getElementById('btn-sync');
        if (!btn) return;

        btn.disabled = true;
        btn.textContent = "🚀 Envoi en cours...";

        fetch(this.CONFIG.SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify(this.currentData)
        })
        .then(response => {
            if (response.ok) {
                btn.textContent = "✅ Envoi réussi";
                // Envoi OK → on marque le service comme envoyé et on vide LOCALSTORAGE POUR CE SERVICE
                this.markServiceAsSent(this.currentData.timestamp);
                this.resetCurrentService();
                this.closeRecap();
                this.showView('view-cards');
            } else {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }
        })
        .catch(error => {
            btn.textContent = "❌ Échec de l’envoi";
            console.error("Erreur d’envoi du service:", error);
            alert("⚠️ Échec de l’envoi du service du " +
                this.currentData.dateCustom.split('-').reverse().join('/') +
                ". Les données sont conservées en local. Reconnectez-vous et réessayez.");
        })
        .finally(() => {
            btn.disabled = false;
        });
    },

    /**
     * Réinitialise uniquement le service en cours (inputs + state temporaire)
     */
    resetCurrentService() {
        this.state = { ancv: [], checks: [], mypos: [], archived: false };
        this.currentData = null;

        document.getElementById('mypos-amount').value = '';
        document.getElementById('ancv-qty').value = '';
        document.getElementById('check-amount').value = '';
        document.getElementById('service-date').value = '';
        document.getElementById('pos-cash').value = '';
        document.getElementById('tva-5').value = '';
        document.getElementById('tva-10').value = '';
        document.getElementById('tva-20').value = '';

        this.refreshUI();
    },

    /**
     * Marque le service comme envoyé (supprime du localStorage en attente)
     */
    markServiceAsSent(timestamp) {
        let pending = JSON.parse(localStorage.getItem('dolus_pending_services')) || [];
        let updated = pending.filter(service => service.timestamp !== timestamp);
        localStorage.setItem('dolus_pending_services', JSON.stringify(updated));

        // Si plus de services en attente, on peut aussi supprimer le flag global si tu veux
    },

    /**
     * Envoi de TOUS les services en attente (un par un)
     */
    sendAllPendingServices() {
        let pending = JSON.parse(localStorage.getItem('dolus_pending_services')) || [];

        if (pending.length === 0) {
            alert("⚠️ Aucun service en attente.");
            return;
        }

        // Format de confirmation
        const dates = pending.map(s => s.dateCustom.split('-').reverse().join('/'));
        const confirmMsg = `📊 Vous allez envoyer ${pending.length} service(s) :\n${dates.join(', ')}\n\nConfirmez-vous l’envoi de TOUS les services ?`;
        if (!confirm(confirmMsg)) return;

        // Fonction récursive pour envoyer un service à la fois
        const sendNext = () => {
            if (pending.length === 0) {
                alert("✅ Tous les services ont été envoyés.");
                return;
            }

            const service = pending.shift();
            app.currentData = service;

            fetch(app.CONFIG.SCRIPT_URL, {
                method: 'POST',
                body: JSON.stringify(app.currentData)
            })
            .then(response => {
                if (response.ok) {
                    // Service OK → on le supprime de la liste en mémoire
                    app.markServiceAsSent(service.timestamp);
                    sendNext(); // passage au suivant
                } else {
                    throw new Error(`Erreur HTTP: ${response.status}`);
                }
            })
            .catch(error => {
                console.error("Erreur d’envoi d’un service:", error);
                const date = service.dateCustom.split('-').reverse().join('/');
                alert(`⚠️ Échec d’envoi du service du ${date}.`);
                // On arrête ici, l’utilisateur pourra réessayer plus tard
            });
        };

        sendNext();
    },

    /**
     * Sauvegarde dans localStorage (service en cours + pending)
     */
    saveToStorage() {
        const data = {
            state: this.state,
            cash_vals: Array.from(document.querySelectorAll('.cash-in')).map(i => i.value || 0),
            dateCustom: document.getElementById('service-date')?.value || null,
            posCash: document.getElementById('pos-cash')?.value || 0,
            tva5: document.getElementById('tva-5')?.value || 0,
            tva10: document.getElementById('tva-10')?.value || 0,
            tva20: document.getElementById('tva-20')?.value || 0,
            pizzas_e: document.getElementById('pos-pizzas')?.value || 0,
            timestamp: Date.now()
        };

        // Mettre à jour le service en cours dans localStorage
        let pending = JSON.parse(localStorage.getItem('dolus_pending_services')) || [];
        const existingIndex = pending.findIndex(s => s.timestamp === data.timestamp);
        if (existingIndex >= 0) {
            pending[existingIndex] = data;
        } else {
            pending.push(data);
        }
        localStorage.setItem('dolus_pending_services', JSON.stringify(pending));
    },

    loadFromStorage() {
        let pending = JSON.parse(localStorage.getItem('dolus_pending_services')) || [];

        // Charger le dernier service non envoyé (le plus récent)
        if (pending.length > 0) {
            const latest = pending.sort((a, b) => b.timestamp - a.timestamp)[0];

            this.state = latest.state || this.state;
            if (latest.cash_vals) {
                document.querySelectorAll('.cash-in').forEach((el, i) => {
                    if (latest.cash_vals[i]) el.value = latest.cash_vals[i];
                });
            }
            if (latest.dateCustom) document.getElementById('service-date').value = latest.dateCustom;
            if (latest.posCash) document.getElementById('pos-cash').value = latest.posCash;
            if (latest.tva5) document.getElementById('tva-5').value = latest.tva5;
            if (latest.tva10) document.getElementById('tva-10').value = latest.tva10;
            if (latest.tva20) document.getElementById('tva-20').value = latest.tva20;
            if (latest.pizzas_e) document.getElementById('pos-pizzas').value = latest.pizzas_e;
        }
    },

    bindEvents() {
        document.addEventListener('input', () => this.refreshUI());
    }
};

document.addEventListener('DOMContentLoaded', () => app.init());
