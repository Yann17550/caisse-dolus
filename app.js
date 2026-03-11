/**
 * APPLICATION : Caisse Dolus (Pizza Oléron)
 * MISSION : Production-grade, Fond de caisse 134€, Mapping Dynamique
 */

const app = {
    state: { ancv: [], checks: [], mypos: [] },

    CONFIG: {
        SCRIPT_URL: "https://script.google.com/macros/s/AKfycbz7Xvhqd98MGNXI0kUzrNNYJpV7RmDPs18brYPJsmg1t4-Hww3XrUzk79mcg6jQdbP6EA/exec",
        DEFAULT_CASH_OFFSET: 134.00,
        IDEAL_CASH: {
            20: 2, 10: 4, 5: 4,     // Billets
            2: 10, 1: 10, 0.5: 5,   // Pièces
            0.2: 5, 0.1: 5          // Pièces
        }
    },

    init() {
        this.renderCashGrid();
        this.loadFromStorage();
        const offsetInput = document.getElementById('cash-offset');
        if (offsetInput && !offsetInput.value) offsetInput.value = this.CONFIG.DEFAULT_CASH_OFFSET;
        
        this.bindEvents();
        this.refreshUI();
    },

    // Génération de la grille avec valeurs par défaut (Vesuvio Style)
renderCashGrid() {
    // Listes séparées pour la structure
    const bills = [100, 50, 20, 10, 5];
    const coins = [2, 1, 0.5, 0.2, 0.1];
    
    const container = document.getElementById('cash-grid');
    if (!container) return;

    // Sous-fonction interne : On garde TOUTES les fonctionnalités (onfocus, onblur, inputmode)
    const generateItemHTML = (u) => {
        let def = this.CONFIG.IDEAL_CASH[u] || "";
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

    // Injection du HTML avec titres et colonnes
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
}

    // --- GESTION DES VUES ---
    showView(viewId) {
        document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
        const target = document.getElementById(viewId);
        if (target) target.classList.remove('hidden');
        window.scrollTo(0,0);
    },

    // --- LOGIQUE DES LISTES (ANCV, Chèques, MyPos) ---
    addAncv() {
        const val = parseFloat(document.getElementById('ancv-val').value);
        const qty = parseInt(document.getElementById('ancv-qty').value) || 0;
        const type = document.querySelector('input[name="ancv-type"]:checked').value;
        if (qty > 0) { 
            this.state.ancv.push({ val, qty, type }); 
            document.getElementById('ancv-qty').value = ''; 
            this.refreshUI(); 
        }
    },
    removeAncv(idx) { this.state.ancv.splice(idx, 1); this.refreshUI(); },

    addCheck() {
        const amt = parseFloat(document.getElementById('check-amount').value) || 0;
        if (amt > 0) { this.state.checks.push(amt); document.getElementById('check-amount').value = ''; this.refreshUI(); }
    },
    removeCheck(idx) { this.state.checks.splice(idx, 1); this.refreshUI(); },

    addMyPos() {
        const amt = parseFloat(document.getElementById('mypos-amount').value) || 0;
        if (amt > 0) { this.state.mypos.push(amt); document.getElementById('mypos-amount').value = ''; this.refreshUI(); }
    },
    removeMyPos(idx) { this.state.mypos.splice(idx, 1); this.refreshUI(); },

    // --- CALCULS ET MISE À JOUR UI ---
    refreshUI() {
        const getSum = (id1, id2) => (parseFloat(document.getElementById(id1)?.value) || 0) + (parseFloat(document.getElementById(id2)?.value) || 0);
        
        // Cartes & TR
        document.getElementById('total-cb').textContent = getSum('cb-contact', 'cb-sans-contact').toFixed(2);
        document.getElementById('total-tr').textContent = getSum('tr-contact', 'tr-sans-contact').toFixed(2);
        document.getElementById('total-amex').textContent = getSum('amex-contact', 'amex-sans-contact').toFixed(2);

        // Espèces
        let brut = 0;
        document.querySelectorAll('.cash-in').forEach(i => {
            brut += (parseFloat(i.dataset.unit) * (parseInt(i.value) || 0));
        });

        const offset = parseFloat(document.getElementById('cash-offset')?.value) || 0;
        document.getElementById('total-cash-brut').textContent = brut.toFixed(2);
        document.getElementById('total-cash-net').textContent = (brut - offset).toFixed(2);

        // Totaux Listes
        document.getElementById('total-ancv-paper').textContent = this.state.ancv.filter(i=>i.type==='paper').reduce((a,b)=>a+(b.val*b.qty),0).toFixed(2);
        document.getElementById('total-ancv-connect').textContent = this.state.ancv.filter(i=>i.type==='connect').reduce((a,b)=>a+(b.val*b.qty),0).toFixed(2);
        document.getElementById('total-checks').textContent = this.state.checks.reduce((a, b) => a + b, 0).toFixed(2);
        document.getElementById('total-mypos').textContent = this.state.mypos.reduce((a, b) => a + b, 0).toFixed(2);

        this.renderRecaps();
        this.saveToStorage();
    },

    renderRecaps() {
        document.getElementById('mypos-recap').innerHTML = this.state.mypos.map((amt, i) => `<div class="recap-item"><span>Vente #${i+1}</span><strong>${amt.toFixed(2)}€</strong><button onclick="app.removeMyPos(${i})">❌</button></div>`).join('');
        document.getElementById('ancv-recap').innerHTML = this.state.ancv.map((it, i) => `<div class="recap-item"><span>${it.type==='paper'?'📄':'📱'} ${it.qty}x${it.val}€</span><strong>${(it.val*it.qty).toFixed(2)}€</strong><button onclick="app.removeAncv(${i})">❌</button></div>`).join('');
        document.getElementById('checks-recap').innerHTML = this.state.checks.map((amt, i) => `<div class="recap-item"><span>Chèque #${i+1}</span><strong>${amt.toFixed(2)}€</strong><button onclick="app.removeCheck(${i})">❌</button></div>`).join('');
    },

    // --- RÉCAPITULATIF FINAL ---
    openRecap() {
        const v = id => parseFloat(document.getElementById(id).textContent) || 0;
        const getIn = id => parseFloat(document.getElementById(id).value) || 0;

        const totalCB_Amex = v('total-cb') + v('total-amex');
        const cashCompte = v('total-cash-net');
        const posCashLogiciel = getIn('pos-cash');
        const sommePaiementsLogiciel = totalCB_Amex + v('total-tr') + v('total-ancv-paper') + v('total-ancv-connect') + v('total-checks') + posCashLogiciel;
        
        const tvaTotal = getIn('tva-5') + getIn('tva-10') + getIn('tva-20');
        const deltaCash = cashCompte - posCashLogiciel;

        this.currentData = {
            cb: totalCB_Amex, tr: v('total-tr'), mypos: v('total-mypos'),
            cashNet: cashCompte, ancvP: v('total-ancv-paper'), ancvC: v('total-ancv-connect'),
            checks: v('total-checks'), caTotal: sommePaiementsLogiciel + v('total-mypos'),
            posCashLogiciel: posCashLogiciel, deltaCash: deltaCash,
            tva5: getIn('tva-5'), tva10: getIn('tva-10'), tva20: getIn('tva-20'),
            pizzas_e: getIn('pos-pizzas')
        };

        let html = `<div class="recap-content">
            <p><b>POINTAGE RÉEL :</b></p>
            <div class="recap-row"><span>Espèces Net :</span><strong>${cashCompte.toFixed(2)} €</strong></div>
            <div class="recap-row"><span>CB Total :</span><strong>${totalCB_Amex.toFixed(2)} €</strong></div>
            <div class="recap-row" style="background:#fff3cd; padding:5px;"><span>⚠️ Écart Espèces :</span><strong>${deltaCash.toFixed(2)} €</strong></div>
            <hr>
            <p><b>LOGICIEL :</b> ${sommePaiementsLogiciel.toFixed(2)} €</p>
        </div>`;

        if (Math.abs(sommePaiementsLogiciel - tvaTotal) >= 0.05) {
            html += `<p style="color:red;">❌ Erreur TVA (${tvaTotal.toFixed(2)}€)</p>`;
        } else {
            html += `<button id="btn-sync" class="btn-primary" onclick="app.sendToGoogleSheet()">💾 ARCHIVER</button>`;
        }

        document.getElementById('recap-body').innerHTML = html;
        document.getElementById('modal-recap').classList.remove('hidden');
    },

    sendToGoogleSheet() {
        const btn = document.getElementById('btn-sync');
        btn.disabled = true; btn.textContent = "🚀 Envoi...";
        const instructions = this.calculateCashShortage();

        fetch(this.CONFIG.SCRIPT_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(this.currentData) })
        .then(() => {
            btn.textContent = "✅ FAIT";
            setTimeout(() => {
                this.closeRecap();
                this.resetAllData();
                this.showShortageModal(instructions);
                this.showView('view-cards');
            }, 800);
        });
    },

    calculateCashShortage() {
        let h = "";
        document.querySelectorAll('.cash-in').forEach(i => {
            const u = parseFloat(i.dataset.unit);
            const m = (this.CONFIG.IDEAL_CASH[u] || 0) - (parseInt(i.value) || 0);
            if (m > 0) h += `<div>${u}€ : <b>+${m}</b></div>`;
        });
        return h || "Caisse OK !";
    },

    showShortageModal(c) {
        const m = document.createElement('div');
        m.id = "modal-fond"; m.className = "modal-overlay";
        m.innerHTML = `<div class="modal-card"><h3>Fond de caisse (134€)</h3><div class="shortage-list">${c}</div><button onclick="document.getElementById('modal-fond').remove()">OK</button></div>`;
        document.body.appendChild(m);
    },

    resetAllData() {
        this.state = { ancv: [], checks: [], mypos: [] };
        localStorage.removeItem('dolus_v_final');
        location.reload(); // Moyen le plus sûr de tout réinitialiser proprement
    },

    closeRecap() { document.getElementById('modal-recap').classList.add('hidden'); },

    saveToStorage() {
        const data = { state: this.state, cash_vals: Array.from(document.querySelectorAll('.cash-in')).map(i => i.value) };
        localStorage.setItem('dolus_v_final', JSON.stringify(data));
    },

    loadFromStorage() {
        const s = JSON.parse(localStorage.getItem('dolus_v_final'));
        if (!s) return;
        this.state = s.state || this.state;
        if (s.cash_vals) document.querySelectorAll('.cash-in').forEach((el, i) => { if(s.cash_vals[i]) el.value = s.cash_vals[i]; });
    },

    bindEvents() { document.addEventListener('input', () => this.refreshUI()); }
};

// Initialisation au chargement
document.addEventListener('DOMContentLoaded', () => app.init());
