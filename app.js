/**
 * APPLICATION : Caisse Dolus
 * MISSION : Production-grade, validation sur CA Logiciel vs TVA
 * https://script.google.com/macros/s/AKfycbz7Xvhqd98MGNXI0kUzrNNYJpV7RmDPs18brYPJsmg1t4-Hww3XrUzk79mcg6jQdbP6EA/exec
 */

const app = {
    state: { ancv: [], checks: [], mypos: [] },

    // Remplace par ton URL Google Script
    CONFIG: {
        SCRIPT_URL:"https://script.google.com/macros/s/AKfycbz7Xvhqd98MGNXI0kUzrNNYJpV7RmDPs18brYPJsmg1t4-Hww3XrUzk79mcg6jQdbP6EA/exec" 
    },

    init() {
        this.renderCashGrid();
        this.loadFromStorage();
        this.bindEvents();
        this.refreshUI();
    },

    showView(viewId) {
        document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
        document.getElementById(viewId).classList.remove('hidden');
        window.scrollTo(0,0);
        this.saveToStorage();
    },

    renderCashGrid() {
        const units = [100, 50, 20, 10, 5, 2, 1, 0.5, 0.2, 0.1];
        const container = document.getElementById('cash-container');
        container.innerHTML = units.map(u => `
            <div class="cash-item">
                <label>${u >= 5 ? 'Billet' : 'Pièce'} ${u}€</label>
                <input type="number" data-unit="${u}" class="cash-in" inputmode="numeric" placeholder="0">
            </div>
        `).join('');
    },

    // --- GESTION DES LISTES ---
    addAncv() {
        const val = parseFloat(document.getElementById('ancv-val').value);
        const qty = parseInt(document.getElementById('ancv-qty').value) || 0;
        const type = document.querySelector('input[name="ancv-type"]:checked').value;
        if (qty > 0) { this.state.ancv.push({ val, qty, type }); document.getElementById('ancv-qty').value = ''; this.refreshUI(); }
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

    // --- CALCULS ET INTERFACE ---
    refreshUI() {
        const getSum = (id1, id2) => (parseFloat(document.getElementById(id1).value) || 0) + (parseFloat(document.getElementById(id2).value) || 0);
        document.getElementById('total-cb').textContent = getSum('cb-contact', 'cb-sans-contact').toFixed(2);
        document.getElementById('total-tr').textContent = getSum('tr-contact', 'tr-sans-contact').toFixed(2);
        document.getElementById('total-amex').textContent = getSum('amex-contact', 'amex-sans-contact').toFixed(2);

        let brut = 0;
        document.querySelectorAll('.cash-in').forEach(i => brut += (parseFloat(i.dataset.unit) * (parseInt(i.value) || 0)));
        const offset = parseFloat(document.getElementById('cash-offset').value) || 0;
        document.getElementById('total-cash-net').textContent = (brut - offset).toFixed(2);

        document.getElementById('total-ancv-paper').textContent = this.state.ancv.filter(i=>i.type==='paper').reduce((a,b)=>a+(b.val*b.qty),0).toFixed(2);
        document.getElementById('total-ancv-connect').textContent = this.state.ancv.filter(i=>i.type==='connect').reduce((a,b)=>a+(b.val*b.qty),0).toFixed(2);
        document.getElementById('total-checks').textContent = this.state.checks.reduce((a, b) => a + b, 0).toFixed(2);
        document.getElementById('total-mypos').textContent = this.state.mypos.reduce((a, b) => a + b, 0).toFixed(2);

        this.renderRecaps();
        this.saveToStorage();
    },

    renderRecaps() {
        document.getElementById('mypos-recap').innerHTML = this.state.mypos.map((amt, idx) => `<div class="recap-item"><span>Vente #${idx+1}</span><strong>${amt.toFixed(2)}€</strong><button onclick="app.removeMyPos(${idx})">❌</button></div>`).join('');
        document.getElementById('ancv-recap').innerHTML = this.state.ancv.map((item, idx) => `<div class="recap-item"><span>${item.type==='paper'?'📄':'📱'} ${item.qty}x${item.val}€</span><strong>${(item.val*item.qty).toFixed(2)}€</strong><button onclick="app.removeAncv(${idx})">❌</button></div>`).join('');
        document.getElementById('checks-recap').innerHTML = this.state.checks.map((amt, idx) => `<div class="recap-item"><span>Chèque #${idx+1}</span><strong>${amt.toFixed(2)}€</strong><button onclick="app.removeCheck(${idx})">❌</button></div>`).join('');
    },

    // --- RÉCAPITULATIF ET VALIDATION ---
    openRecap() {
        const v = id => parseFloat(document.getElementById(id).textContent) || 0;
        const getIn = id => parseFloat(document.getElementById(id).value) || 0;

        const totalCB_Amex = v('total-cb') + v('total-amex');
        const cashCompte = v('total-cash-net');
        const totalANCV = v('total-ancv-paper') + v('total-ancv-connect');
        const totalChecks = v('total-checks');
        const totalTR = v('total-tr');
        const myPosTotal = v('total-mypos');
        
        const posCashLogiciel = getIn('pos-cash');
        const sommePaiementsLogiciel = totalCB_Amex + totalTR + totalANCV + totalChecks + posCashLogiciel;
        
        const tvaTotal = getIn('tva-5') + getIn('tva-10') + getIn('tva-20');
        const deltaCash = cashCompte - posCashLogiciel;

        this.currentData = {
            cb: totalCB_Amex, tr: totalTR, mypos: myPosTotal,
            cashNet: cashCompte, ancvP: v('total-ancv-paper'), ancvC: v('total-ancv-connect'),
            checks: totalChecks, totalReal: sommePaiementsLogiciel + myPosTotal,
            posCash: posCashLogiciel, deltaCash: deltaCash,
            tva5: getIn('tva-5'), tva10: getIn('tva-10'), tva20: getIn('tva-20'),
            pizzas: getIn('pos-pizzas')
        };

        let html = `
            <div style="font-size:0.9rem; border-bottom:1px solid #ddd; padding-bottom:10px; margin-bottom:10px;">
                <p style="font-weight:bold; color:#2c3e50; margin-bottom:5px; text-decoration:underline;">POINTAGE PHYSIQUE (RÉEL)</p>
                <div class="recap-row"><span>CB (Banque + Amex) :</span><strong>${totalCB_Amex.toFixed(2)} €</strong></div>
                <div class="recap-row"><span>Espèces Comptées :</span><strong>${cashCompte.toFixed(2)} €</strong></div>
                <div class="recap-row"><span>CB Ticket Resto :</span><strong>${totalTR.toFixed(2)} €</strong></div>
                <div class="recap-row"><span>Total ANCV :</span><strong>${totalANCV.toFixed(2)} €</strong></div>
                <div class="recap-row"><span>Total Chèques :</span><strong>${totalChecks.toFixed(2)} €</strong></div>
            </div>

            <div style="background:#fff3cd; color:#856404; padding:10px; border-radius:8px; margin-bottom:10px; font-size:0.85rem; border:1px solid #ffeeba;">
                <div class="recap-row"><span>⚠️ Écart Espèces :</span><strong>${deltaCash.toFixed(2)} €</strong></div>
                <div class="recap-row"><span>💳 Total MyPOS :</span><strong>${myPosTotal.toFixed(2)} €</strong></div>
            </div>

            <div style="font-size:0.85rem; border-bottom:1px solid #ddd; padding-bottom:10px; margin-bottom:10px;">
                <p style="font-weight:bold; color:#2c3e50; margin-bottom:5px; text-decoration:underline;">VENTILATION TVA (LOGICIEL)</p>
                <div class="recap-row"><span>TVA 5.5% :</span><span>${getIn('tva-5').toFixed(2)} €</span></div>
                <div class="recap-row"><span>TVA 10% :</span><span>${getIn('tva-10').toFixed(2)} €</span></div>
                <div class="recap-row"><span>TVA 20% :</span><span>${getIn('tva-20').toFixed(2)} €</span></div>
            </div>

            <div class="recap-row" style="font-weight:bold; margin-top:5px;"><span>SOMME PAIEMENTS (LOGICIEL) :</span><span>${sommePaiementsLogiciel.toFixed(2)} €</span></div>
            <div class="recap-row" style="font-weight:bold;"><span>SOMME TVA :</span><span>${tvaTotal.toFixed(2)} €</span></div>
        `;

        const diffTVA = Math.abs(sommePaiementsLogiciel - tvaTotal);
        if (diffTVA >= 0.05) {
            html += `<div style="background:#f8d7da; color:#721c24; padding:8px; border-radius:5px; margin-top:10px; font-size:0.8rem;">❌ Écart TVA de ${diffTVA.toFixed(2)}€ detecté.</div>
                     <button class="btn-primary" style="width:100%; margin-top:10px; background:#ccc;" disabled>CORRIGER POUR VALIDER</button>`;
        } else {
            html += `<button id="btn-sync" class="btn-primary" style="width:100%; margin-top:15px;" onclick="app.sendToGoogleSheet()">💾 VALIDER ET ARCHIVER</button>`;
        }

        document.getElementById('recap-body').innerHTML = html;
        document.getElementById('modal-recap').classList.remove('hidden');
    },

    // --- ENVOI ET REMISE À ZÉRO ---
    sendToGoogleSheet() {
        const btn = document.getElementById('btn-sync');
        btn.disabled = true; btn.textContent = "🚀 Archivage en cours...";
        
        fetch(this.CONFIG.SCRIPT_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(this.currentData) })
        .then(() => { 
            btn.textContent = "✅ ENREGISTRÉ"; 
            btn.style.background = "#27ae60";
            // Petit délai pour laisser l'utilisateur voir le succès avant d'effacer
            setTimeout(() => {
                this.resetAllData();
                this.closeRecap();
                alert("Clôture réussie ! Les données ont été effacées pour le prochain service.");
                this.showView('view-home');
            }, 1500);
        })
        .catch(() => { 
            alert("Erreur de connexion. Les données n'ont pas été effacées.");
            btn.disabled = false; 
            btn.textContent = "Réessayer"; 
        });
    },

    resetAllData() {
        // 1. Vider le state (listes)
        this.state = { ancv: [], checks: [], mypos: [] };
        
        // 2. Vider tous les inputs (nombre et texte)
        document.querySelectorAll('input').forEach(input => {
            if (input.type === 'number' || input.type === 'text') {
                input.value = '';
            }
        });

        // 3. Vider le localStorage
        localStorage.removeItem('dolus_v_final');

        // 4. Rafraîchir l'interface
        this.refreshUI();
    },

    closeRecap() { document.getElementById('modal-recap').classList.add('hidden'); },

    saveToStorage() {
        const data = { state: this.state, dom: {
            cb: [document.getElementById('cb-contact').value, document.getElementById('cb-sans-contact').value],
            tr: [document.getElementById('tr-contact').value, document.getElementById('tr-sans-contact').value],
            amex: [document.getElementById('amex-contact').value, document.getElementById('amex-sans-contact').value],
            cash_offset: document.getElementById('cash-offset').value,
            cash_vals: Array.from(document.querySelectorAll('.cash-in')).map(i => i.value),
            pos: { c: document.getElementById('pos-cash').value, p: document.getElementById('pos-pizzas').value },
            tva: [document.getElementById('tva-5').value, document.getElementById('tva-10').value, document.getElementById('tva-20').value]
        }};
        localStorage.setItem('dolus_v_final', JSON.stringify(data));
    },

    loadFromStorage() {
        const s = JSON.parse(localStorage.getItem('dolus_v_final')); if (!s) return;
        this.state = s.state || { ancv: [], checks: [], mypos: [] };
        const d = s.dom;
        document.getElementById('cb-contact').value = d.cb[0]; document.getElementById('cb-sans-contact').value = d.cb[1];
        document.getElementById('tr-contact').value = d.tr[0]; document.getElementById('tr-sans-contact').value = d.tr[1];
        document.getElementById('amex-contact').value = d.amex[0]; document.getElementById('amex-sans-contact').value = d.amex[1];
        document.getElementById('cash-offset').value = d.cash_offset;
        document.getElementById('pos-cash').value = d.pos.c; document.getElementById('pos-pizzas').value = d.pos.p;
        document.getElementById('tva-5').value = d.tva[0]; document.getElementById('tva-10').value = d.tva[1]; document.getElementById('tva-20').value = d.tva[2];
        const inputs = document.querySelectorAll('.cash-in'); d.cash_vals.forEach((v, i) => { if(inputs[i]) inputs[i].value = v; });
    },

    bindEvents() { document.addEventListener('input', () => this.refreshUI()); }
};

document.addEventListener('DOMContentLoaded', () => app.init());
