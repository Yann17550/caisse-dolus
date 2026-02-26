/**
 * APPLICATION : Caisse Dolus
 * MISSION : Production-grade, modularité, et archivage TVA détaillée
 */

const app = {
    state: {
        ancv: [],
        checks: [],
        mypos: []
    },

    // URL de ton Google Apps Script
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

    // --- LOGIQUE DES LISTES (N'oubliez pas de cliquer sur Ajouter) ---
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

    // --- MISE À JOUR INTERFACE ---
    refreshUI() {
        const getSum = (id1, id2) => (parseFloat(document.getElementById(id1).value) || 0) + (parseFloat(document.getElementById(id2).value) || 0);
        
        document.getElementById('total-cb').textContent = getSum('cb-contact', 'cb-sans-contact').toFixed(2);
        document.getElementById('total-tr').textContent = getSum('tr-contact', 'tr-sans-contact').toFixed(2);
        document.getElementById('total-amex').textContent = getSum('amex-contact', 'amex-sans-contact').toFixed(2);

        let brut = 0;
        document.querySelectorAll('.cash-in').forEach(i => brut += (parseFloat(i.dataset.unit) * (parseInt(i.value) || 0)));
        const offset = parseFloat(document.getElementById('cash-offset').value) || 0;
        document.getElementById('total-cash-brut').textContent = brut.toFixed(2);
        document.getElementById('total-cash-net').textContent = (brut - offset).toFixed(2);

        const tPaper = this.state.ancv.filter(i => i.type==='paper').reduce((a, b) => a + (b.val * b.qty), 0);
        const tConnect = this.state.ancv.filter(i => i.type==='connect').reduce((a, b) => a + (b.val * b.qty), 0);
        const tChecks = this.state.checks.reduce((a, b) => a + b, 0);
        const tMyPos = this.state.mypos.reduce((a, b) => a + b, 0);

        document.getElementById('total-ancv-paper').textContent = tPaper.toFixed(2);
        document.getElementById('total-ancv-connect').textContent = tConnect.toFixed(2);
        document.getElementById('total-checks').textContent = tChecks.toFixed(2);
        document.getElementById('total-mypos').textContent = tMyPos.toFixed(2);

        this.renderRecaps();
        this.saveToStorage();
    },

    renderRecaps() {
        document.getElementById('mypos-recap').innerHTML = this.state.mypos.map((amt, idx) => `
            <div class="recap-item"><span>Vente MyPOS #${idx+1}</span><strong>${amt.toFixed(2)}€</strong><button onclick="app.removeMyPos(${idx})">❌</button></div>
        `).join('');
        document.getElementById('ancv-recap').innerHTML = this.state.ancv.map((item, idx) => `
            <div class="recap-item"><span>${item.type==='paper'?'📄':'📱'} ${item.qty}x${item.val}€</span><strong>${(item.val*item.qty).toFixed(2)}€</strong><button onclick="app.removeAncv(${idx})">❌</button></div>
        `).join('');
        document.getElementById('checks-recap').innerHTML = this.state.checks.map((amt, idx) => `
            <div class="recap-item"><span>Chèque #${idx+1}</span><strong>${amt.toFixed(2)}€</strong><button onclick="app.removeCheck(${idx})">❌</button></div>
        `).join('');
    },

    // --- VALIDATION ET RÉCAPITULATIF FINAL ---
    openRecap() {
        const v = id => parseFloat(document.getElementById(id).textContent) || 0;
        const getIn = id => parseFloat(document.getElementById(id).value) || 0;

        // On inclut bien MyPOS dans le total physique
        const totalPhysique = v('total-cb') + v('total-tr') + v('total-mypos') + v('total-amex') + 
                             v('total-cash-net') + v('total-ancv-paper') + v('total-ancv-connect') + v('total-checks');
        
        const posCash = getIn('pos-cash');
        const tva5 = getIn('tva-5');
        const tva10 = getIn('tva-10');
        const tva20 = getIn('tva-20');
        const tvaTotal = tva5 + tva10 + tva20;
        const pizzas = getIn('pos-pizzas');

        this.currentData = {
            cb: v('total-cb'), tr: v('total-tr'), mypos: v('total-mypos'), amex: v('total-amex'),
            cashNet: v('total-cash-net'), ancvP: v('total-ancv-paper'), ancvC: v('total-ancv-connect'),
            checks: v('total-checks'), totalReal: totalPhysique, posCash: posCash,
            deltaCash: v('total-cash-net') - posCash, pizzas: pizzas,
            tva5: tva5, tva10: tva10, tva20: tva20
        };

        // Affichage détaillé dans le récapitulatif
        let html = `
            <div style="border-bottom:1px solid #ddd; margin-bottom:10px; padding-bottom:10px; font-size:0.9rem;">
                <div class="recap-row"><span>CB Classique :</span><span>${v('total-cb').toFixed(2)} €</span></div>
                <div class="recap-row"><span>MyPOS :</span><span>${v('total-mypos').toFixed(2)} €</span></div>
                <div class="recap-row"><span>Espèces :</span><span>${v('total-cash-net').toFixed(2)} €</span></div>
                <div class="recap-row"><span>ANCV :</span><span>${(v('total-ancv-paper')+v('total-ancv-connect')).toFixed(2)} €</span></div>
                <div class="recap-row"><span>Chèques :</span><span>${v('total-checks').toFixed(2)} €</span></div>
            </div>
            <div class="recap-row" style="font-weight:bold; color:#2c3e50;"><span>💰 TOTAL RÉEL :</span><span>${totalPhysique.toFixed(2)} €</span></div>
            <div class="recap-row" style="font-weight:bold; color:#2c3e50;"><span>🧾 TOTAL LOGICIEL :</span><span>${tvaTotal.toFixed(2)} €</span></div>
        `;

        const diffTVA = Math.abs(totalPhysique - tvaTotal);
        const estValide = diffTVA < 0.05; 

        if (!estValide) {
            html += `
                <div style="background:#fff3cd; color:#856404; padding:10px; border-radius:8px; margin-top:10px; font-size:0.8rem; border:1px solid #ffeeba;">
                    ⚠️ Écart de <strong>${(totalPhysique - tvaTotal).toFixed(2)}€</strong>. Vérifie tes saisies avant d'enregistrer.
                </div>
                <button class="btn-primary" style="width:100%; margin-top:15px; background:#ccc;" disabled>ÉCART TROP IMPORTANT</button>
            `;
        } else {
            html += `
                <div style="background:#d4edda; color:#155724; padding:10px; border-radius:8px; margin-top:10px; font-size:0.85rem;">
                    ✅ Équilibre parfait. Les données peuvent être archivées.
                </div>
                <button id="btn-sync" class="btn-primary" style="width:100%; margin-top:15px;" onclick="app.sendToGoogleSheet()">💾 ENREGISTRER SUR GOOGLE</button>
            `;
        }

        html += `<p id="sync-status" style="text-align:center; font-size:0.8rem; margin-top:5px;"></p>`;
        document.getElementById('recap-body').innerHTML = html;
        document.getElementById('modal-recap').classList.remove('hidden');
    },

    sendToGoogleSheet() {
        const btn = document.getElementById('btn-sync');
        const status = document.getElementById('sync-status');
        
        btn.disabled = true;
        btn.textContent = "🚀 Envoi en cours...";

        fetch(this.CONFIG.SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify(this.currentData)
        })
        .then(() => {
            status.textContent = "✅ Données transmises avec succès !";
            status.style.color = "green";
            btn.textContent = "✅ ARCHIVÉ";
            btn.style.background = "#27ae60";
            // Optionnel : vider le stockage local après succès
            // localStorage.removeItem('dolus_v_final'); 
        })
        .catch(() => {
            status.textContent = "❌ Erreur lors de l'envoi";
            btn.disabled = false;
            btn.textContent = "Réessayer";
        });
    },

    closeRecap() { document.getElementById('modal-recap').classList.add('hidden'); },

    saveToStorage() {
        const data = {
            state: this.state,
            dom: {
                cb: [document.getElementById('cb-contact').value, document.getElementById('cb-sans-contact').value],
                tr: [document.getElementById('tr-contact').value, document.getElementById('tr-sans-contact').value],
                amex: [document.getElementById('amex-contact').value, document.getElementById('amex-sans-contact').value],
                cash_offset: document.getElementById('cash-offset').value,
                cash_vals: Array.from(document.querySelectorAll('.cash-in')).map(i => i.value),
                pos: { c: document.getElementById('pos-cash').value, p: document.getElementById('pos-pizzas').value },
                tva: [document.getElementById('tva-5').value, document.getElementById('tva-10').value, document.getElementById('tva-20').value]
            }
        };
        localStorage.setItem('dolus_v_final', JSON.stringify(data));
    },

    loadFromStorage() {
        const s = JSON.parse(localStorage.getItem('dolus_v_final'));
        if (!s) return;
        this.state = s.state || { ancv: [], checks: [], mypos: [] };
        const d = s.dom;
        document.getElementById('cb-contact').value = d.cb[0]; document.getElementById('cb-sans-contact').value = d.cb[1];
        document.getElementById('tr-contact').value = d.tr[0]; document.getElementById('tr-sans-contact').value = d.tr[1];
        document.getElementById('amex-contact').value = d.amex[0]; document.getElementById('amex-sans-contact').value = d.amex[1];
        document.getElementById('cash-offset').value = d.cash_offset;
        document.getElementById('pos-cash').value = d.pos.c; document.getElementById('pos-pizzas').value = d.pos.p;
        document.getElementById('tva-5').value = d.tva[0]; document.getElementById('tva-10').value = d.tva[1]; document.getElementById('tva-20').value = d.tva[2];
        const inputs = document.querySelectorAll('.cash-in');
        d.cash_vals.forEach((v, i) => { if(inputs[i]) inputs[i].value = v; });
    },

    bindEvents() { document.addEventListener('input', () => this.refreshUI()); }
};

document.addEventListener('DOMContentLoaded', () => app.init());
