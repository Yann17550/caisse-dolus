/**
 * APPLICATION : Caisse Dolus (Pizza Oléron)
 * MISSION : Production-grade, validation CA vs TVA, Fond de caisse 134€
 * OPTIMISATION : Assistant de complétion de caisse & Redirection automatique
 */

const app = {
    state: { 
        ancv: [], 
        checks: [], 
        mypos: [] 
    },

    CONFIG: {
        SCRIPT_URL: "https://script.google.com/macros/s/AKfycbz7Xvhqd98MGNXI0kUzrNNYJpV7RmDPs18brYPJsmg1t4-Hww3XrUzk79mcg6jQdbP6EA/exec",
        DEFAULT_CASH_OFFSET: 134.00,
        // Configuration cible pour le fond de caisse de 134€
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
        if (offsetInput && !offsetInput.value) {
            offsetInput.value = this.CONFIG.DEFAULT_CASH_OFFSET;
        }
        
        this.bindEvents();
        this.refreshUI();
    },

    showView(viewId) {
        document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
        const targetView = document.getElementById(viewId);
        if (targetView) {
            targetView.classList.remove('hidden');
        } else {
            const defaultView = document.getElementById('view-cards');
            if (defaultView) defaultView.classList.remove('hidden');
        }
        window.scrollTo(0,0);
        this.saveToStorage();
    },

    renderCashGrid() {
        const units = [100, 50, 20, 10, 5, 2, 1, 0.5, 0.2, 0.1];
        const container = document.getElementById('cash-grid');
        if (!container) return;

        container.innerHTML = units.map(u => {
            // Valeurs par défaut calquées sur Le Vesuvio via CONFIG
            let defaultValue = this.CONFIG.IDEAL_CASH[u] || "";
            
            return `
                <div class="cash-item">
                    <label>${u}€</label>
                    <input type="number" 
                           class="cash-in" 
                           data-unit="${u}" 
                           value="${defaultValue}"
                           inputmode="numeric"
                           onfocus="if(this.value=='${defaultValue}') this.value='';" 
                           onblur="if(this.value=='') this.value='${defaultValue}'; app.refreshUI();">
                </div>`;
        }).join('');
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
        const getSum = (id1, id2) => {
            const e1 = document.getElementById(id1);
            const e2 = document.getElementById(id2);
            return (e1 ? parseFloat(e1.value) || 0 : 0) + (e2 ? parseFloat(e2.value) || 0 : 0);
        };
        
        // Totaux Cartes
        const totalCB = document.getElementById('total-cb');
        if(totalCB) totalCB.textContent = getSum('cb-contact', 'cb-sans-contact').toFixed(2);
        
        const totalTR = document.getElementById('total-tr');
        if(totalTR) totalTR.textContent = getSum('tr-contact', 'tr-sans-contact').toFixed(2);
        
        const totalAmex = document.getElementById('total-amex');
        if(totalAmex) totalAmex.textContent = getSum('amex-contact', 'amex-sans-contact').toFixed(2);

        // Espèces
        let brut = 0;
        document.querySelectorAll('.cash-in').forEach(i => {
            const qty = parseInt(i.value) || 0;
            brut += (parseFloat(i.dataset.unit) * qty);
        });

        const offsetInput = document.getElementById('cash-offset');
        const offset = offsetInput ? parseFloat(offsetInput.value) || 0 : 0;
        const net = brut - offset;

        const brutDisplay = document.getElementById('total-cash-brut');
        const netDisplay = document.getElementById('total-cash-net');
        if(brutDisplay) brutDisplay.textContent = brut.toFixed(2);
        if(netDisplay) netDisplay.textContent = net.toFixed(2);

        // Autres
        const ancvPDisplay = document.getElementById('total-ancv-paper');
        if(ancvPDisplay) ancvPDisplay.textContent = this.state.ancv.filter(i=>i.type==='paper').reduce((a,b)=>a+(b.val*b.qty),0).toFixed(2);
        
        const ancvCDisplay = document.getElementById('total-ancv-connect');
        if(ancvCDisplay) ancvCDisplay.textContent = this.state.ancv.filter(i=>i.type==='connect').reduce((a,b)=>a+(b.val*b.qty),0).toFixed(2);
        
        const checkDisplay = document.getElementById('total-checks');
        if(checkDisplay) checkDisplay.textContent = this.state.checks.reduce((a, b) => a + b, 0).toFixed(2);
        
        const myposDisplay = document.getElementById('total-mypos');
        if(myposDisplay) myposDisplay.textContent = this.state.mypos.reduce((a, b) => a + b, 0).toFixed(2);

        this.renderRecaps();
        this.saveToStorage();
    },

    renderRecaps() {
        const myposRecap = document.getElementById('mypos-recap');
        if(myposRecap) myposRecap.innerHTML = this.state.mypos.map((amt, idx) => `<div class="recap-item"><span>Vente #${idx+1}</span><strong>${amt.toFixed(2)}€</strong><button onclick="app.removeMyPos(${idx})">❌</button></div>`).join('');
        
        const ancvRecap = document.getElementById('ancv-recap');
        if(ancvRecap) ancvRecap.innerHTML = this.state.ancv.map((item, idx) => `<div class="recap-item"><span>${item.type==='paper'?'📄':'📱'} ${item.qty}x${item.val}€</span><strong>${(item.val*item.qty).toFixed(2)}€</strong><button onclick="app.removeAncv(${idx})">❌</button></div>`).join('');
        
        const checksRecap = document.getElementById('checks-recap');
        if(checksRecap) checksRecap.innerHTML = this.state.checks.map((amt, idx) => `<div class="recap-item"><span>Chèque #${idx+1}</span><strong>${amt.toFixed(2)}€</strong><button onclick="app.removeCheck(${idx})">❌</button></div>`).join('');
    },

    openRecap() {
        const v = id => {
            const el = document.getElementById(id);
            return el ? parseFloat(el.textContent) || 0 : 0;
        };
        const getIn = id => {
            const el = document.getElementById(id);
            return el ? parseFloat(el.value) || 0 : 0;
        };

        const totalCB_Amex = v('total-cb') + v('total-amex');
        const cashCompte = v('total-cash-net'); 
        const totalANCV_P = v('total-ancv-paper');
        const totalANCV_C = v('total-ancv-connect');
        const totalChecks = v('total-checks');
        const totalTR = v('total-tr');
        const myPosTotal = v('total-mypos');
        
        const posCashLogiciel = getIn('pos-cash');
        const sommePaiementsLogiciel = totalCB_Amex + totalTR + totalANCV_P + totalANCV_C + totalChecks + posCashLogiciel;
        
        const tvaTotal = getIn('tva-5') + getIn('tva-10') + getIn('tva-20');
        const deltaCash = cashCompte - posCashLogiciel;

        this.currentData = {
            cb: totalCB_Amex, tr: totalTR, mypos: myPosTotal,
            cashNet: cashCompte, ancvP: totalANCV_P, ancvC: totalANCV_C,
            checks: totalChecks, caTotal: sommePaiementsLogiciel + myPosTotal, // Changé totalReal en caTotal pour PO
            posCashLogiciel: posCashLogiciel, deltaCash: deltaCash,
            tva5: getIn('tva-5'), tva10: getIn('tva-10'), tva20: getIn('tva-20'),
            pizzas_e: getIn('pos-pizzas') // Alignement nommage Pizzas
        };

        let html = `
            <div style="font-size:0.9rem; border-bottom:1px solid #ddd; padding-bottom:10px; margin-bottom:10px;">
                <p style="font-weight:bold; color:#2c3e50; margin-bottom:5px; text-decoration:underline;">POINTAGE PHYSIQUE (RÉEL)</p>`;

        if (totalCB_Amex > 0) html += `<div class="recap-row"><span>CB (Banque + Amex) :</span><strong>${totalCB_Amex.toFixed(2)} €</strong></div>`;
        if (cashCompte !== 0) html += `<div class="recap-row"><span>Espèces Net :</span><strong>${cashCompte.toFixed(2)} €</strong></div>`;
        if (totalTR > 0) html += `<div class="recap-row"><span>CB Ticket Resto :</span><strong>${totalTR.toFixed(2)} €</strong></div>`;
        if (totalANCV_P > 0) html += `<div class="recap-row"><span>ANCV Papier :</span><strong>${totalANCV_P.toFixed(2)} €</strong></div>`;
        if (totalANCV_C > 0) html += `<div class="recap-row"><span>ANCV Connect :</span><strong>${totalANCV_C.toFixed(2)} €</strong></div>`;
        if (totalChecks > 0) html += `<div class="recap-row"><span>Total Chèques :</span><strong>${totalChecks.toFixed(2)} €</strong></div>`;
        if (myPosTotal > 0) html += `<div class="recap-row"><span>Ventes MyPos :</span><strong>${myPosTotal.toFixed(2)} €</strong></div>`;

        html += `</div>
            <div style="background:#fff3cd; color:#856404; padding:10px; border-radius:8px; margin-bottom:10px; font-size:0.85rem; border:1px solid #ffeeba;">
                <div class="recap-row"><span>⚠️ Écart Espèces :</span><strong>${deltaCash.toFixed(2)} €</strong></div>
            </div>
            <div class="recap-row" style="font-weight:bold; margin-top:5px;"><span>SOMME LOGICIEL :</span><span>${sommePaiementsLogiciel.toFixed(2)} €</span></div>
        `;

        const diffTVA = Math.abs(sommePaiementsLogiciel - tvaTotal);
        if (diffTVA >= 0.05) {
            html += `<div style="background:#f8d7da; color:#721c24; padding:8px; border-radius:5px; margin-top:10px; font-size:0.8rem;">❌ Écart TVA détecté (${sommePaiementsLogiciel.toFixed(2)}€ vs ${tvaTotal.toFixed(2)}€)</div>`;
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
                this.showShortageModal(instructionsAjout);
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
            currentIn[input.dataset.unit] = parseInt(input.value) || 0;
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
            </div>`;
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
        // Régénérer la grille pour remettre les valeurs par défaut
        this.renderCashGrid();
        this.refreshUI();
    },

    closeRecap() { document.getElementById('modal-recap').classList.add('hidden'); },

    saveToStorage() {
        const getVal = id => {
            const el = document.getElementById(id);
            return el ? el.value : '';
        };
        const data = { 
            state: this.state, 
            dom: {
                cb: [getVal('cb-contact'), getVal('cb-sans-contact')],
                tr: [getVal('tr-contact'), getVal('tr-sans-contact')],
                amex: [getVal('amex-contact'), getVal('amex-sans-contact')],
                cash_offset: getVal('cash-offset'),
                cash_vals: Array.from(document.querySelectorAll('.cash-in')).map(i => i.value),
                pos: { c: getVal('pos-cash'), p: getVal('pos-pizzas') },
                tva: [getVal('tva-5'), getVal('tva-10'), getVal('tva-20')]
            }
        };
        localStorage.setItem('dolus_v_final', JSON.stringify(data));
    },

    loadFromStorage() {
        const s = JSON.parse(localStorage.getItem('dolus_v_final')); 
        if (!s) return;
        this.state = s.state || { ancv: [], checks: [], mypos: [] };
        const d = s.dom;
        const setVal = (id, val) => { 
            const el = document.getElementById(id);
            if(el) el.value = val; 
        };
        
        setVal('cb-contact', d.cb[0]); setVal('cb-sans-contact', d.cb[1]);
        setVal('tr-contact', d.tr[0]); setVal('tr-sans-contact', d.tr[1]);
        setVal('amex-contact', d.amex[0]); setVal('amex-sans-contact', d.amex[1]);
        setVal('cash-offset', d.cash_offset);
        setVal('pos-cash', d.pos.c); setVal('pos-pizzas', d.pos.p);
        setVal('tva-5', d.tva[0]); setVal('tva-10', d.tva[1]); setVal('tva-20', d.tva[2]);
        
        const inputs = document.querySelectorAll('.cash-in');
        if (d.cash_vals) {
            d.cash_vals.forEach((v, i) => { if(inputs[i]) inputs[i].value = v; });
        }
    },

    bindEvents() { 
        document.addEventListener('input', (e) => {
            if(e.target.classList.contains('cash-in') || e.target.tagName === 'INPUT') {
                this.refreshUI();
            }
        }); 
    }
};

document.addEventListener('DOMContentLoaded', () => app.init());
