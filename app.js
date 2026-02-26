/**
 * APPLICATION : Caisse Dolus
 * MISSION : Production-grade, validation CA vs TVA, Fond de caisse 134€
 * OPTIMISATION : Assistant de complétion de caisse & Redirection automatique
 */

const app = {
    state: { ancv: [], checks: [], mypos: [] },

    CONFIG: {
        SCRIPT_URL: "https://script.google.com/macros/s/AKfycbz7Xvhqd98MGNXI0kUzrNNYJpV7RmDPs18brYPJsmg1t4-Hww3XrUzk79mcg6jQdbP6EA/exec",
        DEFAULT_CASH_OFFSET: 134.00,
        // Ta configuration cible pour le fond de caisse de 134€
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

    showView(viewId) {
        // Cache toutes les sections avec la classe .view
        document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
        
        // Affiche la vue cible
        const targetView = document.getElementById(viewId);
        if (targetView) {
            targetView.classList.remove('hidden');
        } else {
            // Sécurité : si l'ID n'existe pas, on affiche la première vue par défaut
            const defaultView = document.getElementById('view-cards');
            if (defaultView) defaultView.classList.remove('hidden');
        }
        
        window.scrollTo(0,0);
        this.saveToStorage();
    },

    renderCashGrid() {
        const units = [100, 50, 20, 10, 5, 2, 1, 0.5, 0.2, 0.1];
        const container = document.getElementById('cash-container');
        if (!container) return;

        container.innerHTML = units.map(u => `
            <div class="cash-item">
                <label>${u >= 5 ? 'Billet' : 'Pièce'} ${u}€</label>
                <input type="number" data-unit="${u}" class="cash-in" inputmode="numeric" placeholder="0">
            </div>
        `).join('');
    },

    // --- LOGIQUE DES LISTES ---
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
    resetAncvInputs() { document.getElementById('ancv-qty').value = ''; },

    addCheck() {
        const amt = parseFloat(document.getElementById('check-amount').value) || 0;
        if (amt > 0) { 
            this.state.checks.push(amt); 
            document.getElementById('check-amount').value = ''; 
            this.refreshUI(); 
        }
    },
    removeCheck(idx) { this.state.checks.splice(idx, 1); this.refreshUI(); },

    addMyPos() {
        const amt = parseFloat(document.getElementById('mypos-amount').value) || 0;
        if (amt > 0) { 
            this.state.mypos.push(amt); 
            document.getElementById('mypos-amount').value = ''; 
            this.refreshUI(); 
        }
    },
    removeMyPos(idx) { this.state.mypos.splice(idx, 1); this.refreshUI(); },

    // --- CALCULS ET INTERFACE ---
    refreshUI() {
        const getSum = (id1, id2) => (parseFloat(document.getElementById(id1).value) || 0) + (parseFloat(document.getElementById(id2).value) || 0);
        
        // Totaux Cartes
        document.getElementById('total-cb').textContent = getSum('cb-contact', 'cb-sans-contact').toFixed(2);
        document.getElementById('total-tr').textContent = getSum('tr-contact', 'tr-sans-contact').toFixed(2);
        document.getElementById('total-amex').textContent = getSum('amex-contact', 'amex-sans-contact').toFixed(2);

        // Espèces
        let brut = 0;
        let hasInputCash = false;
        document.querySelectorAll('.cash-in').forEach(i => {
            const qty = parseInt(i.value) || 0;
            if (qty > 0) hasInputCash = true;
            brut += (parseFloat(i.dataset.unit) * qty);
        });

        const offset = parseFloat(document.getElementById('cash-offset').value) || 0;
        const net = hasInputCash ? (brut - offset) : 0;

        document.getElementById('total-cash-brut').textContent = brut.toFixed(2);
        document.getElementById('total-cash-net').textContent = net.toFixed(2);

        // Autres
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
                <div class="recap-row"><span>Espèces Net :</span><strong>${cashCompte.toFixed(2)} €</strong></div>
                <div class="recap-row"><span>CB Ticket Resto :</span><strong>${totalTR.toFixed(2)} €</strong></div>
                <div class="recap-row"><span>Total Chèques :</span><strong>${totalChecks.toFixed(2)} €</strong></div>
            </div>
            <div style="background:#fff3cd; color:#856404; padding:10px; border-radius:8px; margin-bottom:10px; font-size:0.85rem; border:1px solid #ffeeba;">
                <div class="recap-row"><span>⚠️ Écart Espèces :</span><strong>${deltaCash.toFixed(2)} €</strong></div>
            </div>
            <div class="recap-row" style="font-weight:bold; margin-top:5px;"><span>SOMME LOGICIEL :</span><span>${sommePaiementsLogiciel.toFixed(2)} €</span></div>
        `;

        const diffTVA = Math.abs(sommePaiementsLogiciel - tvaTotal);
        if (diffTVA >= 0.05) {
            html += `<div style="background:#f8d7da; color:#721c24; padding:8px; border-radius:5px; margin-top:10px; font-size:0.8rem;">❌ Écart TVA détecté.</div>`;
        } else {
            html += `<button id="btn-sync" class="btn-primary" style="width:100%; margin-top:15px;" onclick="app.sendToGoogleSheet()">💾 VALIDER ET ARCHIVER</button>`;
        }

        document.getElementById('recap-body').innerHTML = html;
        document.getElementById('modal-recap').classList.remove('hidden');
    },

    sendToGoogleSheet() {
        const btn = document.getElementById('btn-sync');
        if (!btn) return;

        btn.disabled = true; 
        btn.textContent = "🚀 Archivage...";

        // 1. Calcul des besoins AVANT réinitialisation
        const instructionsAjout = this.calculateCashShortage();

        fetch(this.CONFIG.SCRIPT_URL, { 
            method: 'POST', 
            mode: 'no-cors', 
            body: JSON.stringify(this.currentData) 
        })
        .then(() => { 
            btn.textContent = "✅ ENREGISTRÉ"; 
            
            setTimeout(() => {
                this.closeRecap();
                this.resetAllData();
                
                // 2. Affichage des manques pour le fond de caisse
                this.showShortageModal(instructionsAjout);
                
                // 3. REDIRECTION VERS L'ÉCRAN CARTES (ID: view-cards)
                this.showView('view-cards'); 
            }, 800);
        })
        .catch(() => { 
            alert("Erreur de connexion."); 
            btn.disabled = false; 
            btn.textContent = "Réessayer"; 
        });
    },

    calculateCashShortage() {
        const currentIn = {};
        document.querySelectorAll('.cash-in').forEach(input => {
            const unit = input.dataset.unit;
            currentIn[unit] = parseInt(input.value) || 0;
        });

        let html = "";
        const units = [20, 10, 5, 2, 1, 0.5, 0.2, 0.1];

        units.forEach(u => {
            const dispo = currentIn[u] || 0;
            const cible = this.CONFIG.IDEAL_CASH[u];
            const manque = cible - dispo;
            if (manque > 0) {
                html += `<div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #eee;">
                        <span>${u >= 5 ? 'Billet' : 'Pièce'} <b>${u}€</b></span>
                        <span style="color:#d32f2f; font-weight:bold;">+ ${manque}</span>
                    </div>`;
            }
        });
        return html || "<p style='text-align:center;'>Caisse déjà prête !</p>";
    },

    showShortageModal(content) {
        const modalHtml = `
            <div id="modal-fond" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); display:flex; align-items:center; justify-content:center; z-index:10000; padding:20px;">
                <div style="background:white; padding:20px; border-radius:15px; width:100%; max-width:340px; box-shadow:0 10px 25px rgba(0,0,0,0.5);">
                    <h3 style="margin-top:0; color:#27ae60;">✔️ Archivage terminé</h3>
                    <p style="font-size:0.85rem; color:#666;">Préparez le fond de caisse (134€) en ajoutant :</p>
                    <div style="margin:15px 0; max-height:250px; overflow-y:auto;">${content}</div>
                    <button class="btn-primary" onclick="this.closest('#modal-fond').remove()" style="width:100%; padding:15px; border-radius:10px;">C'EST FAIT !</button>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    },

    resetAllData() {
        this.state = { ancv: [], checks: [], mypos: [] };
        document.querySelectorAll('input').forEach(input => {
            if (input.id === 'cash-offset') {
                input.value = this.CONFIG.DEFAULT_CASH_OFFSET;
            } else if (input.type === 'number' || input.type === 'text') {
                input.value = '';
            }
        });
        localStorage.removeItem('dolus_v_final');
        this.refreshUI();
    },

    closeRecap() { document.getElementById('modal-recap').classList.add('hidden'); },

    saveToStorage() {
        const getVal = id => document.getElementById(id) ? document.getElementById(id).value : '';
        const data = { state: this.state, dom: {
            cb: [getVal('cb-contact'), getVal('cb-sans-contact')],
            tr: [getVal('tr-contact'), getVal('tr-sans-contact')],
            amex: [getVal('amex-contact'), getVal('amex-sans-contact')],
            cash_offset: getVal('cash-offset'),
            cash_vals: Array.from(document.querySelectorAll('.cash-in')).map(i => i.value),
            pos: { c: getVal('pos-cash'), p: getVal('pos-pizzas') },
            tva: [getVal('tva-5'), getVal('tva-10'), getVal('tva-20')]
        }};
        localStorage.setItem('dolus_v_final', JSON.stringify(data));
    },

    loadFromStorage() {
        const s = JSON.parse(localStorage.getItem('dolus_v_final')); if (!s) return;
        this.state = s.state || { ancv: [], checks: [], mypos: [] };
        const d = s.dom;
        const setVal = (id, val) => { if(document.getElementById(id)) document.getElementById(id).value = val; };
        
        setVal('cb-contact', d.cb[0]); setVal('cb-sans-contact', d.cb[1]);
        setVal('tr-contact', d.tr[0]); setVal('tr-sans-contact', d.tr[1]);
        setVal('amex-contact', d.amex[0]); setVal('amex-sans-contact', d.amex[1]);
        setVal('cash-offset', d.cash_offset);
        setVal('pos-cash', d.pos.c); setVal('pos-pizzas', d.pos.p);
        setVal('tva-5', d.tva[0]); setVal('tva-10', d.tva[1]); setVal('tva-20', d.tva[2]);
        
        const inputs = document.querySelectorAll('.cash-in');
        if (d.cash_vals) d.cash_vals.forEach((v, i) => { if(inputs[i]) inputs[i].value = v; });
    },

    bindEvents() { document.addEventListener('input', () => this.refreshUI()); }
};

document.addEventListener('DOMContentLoaded', () => app.init());
