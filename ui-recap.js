/**
 * COMPOSANT : RecapUI
 */
const RecapUI = {
    render(calc, dateService) {
        const d = calc.details;
        const dateFmt = dateService.split('-').reverse().join('/');
        
        return `
            <div class="recap-content">
                <p style="text-align:center; background:#eee; padding:5px; border-radius:5px;"><b>📅 SERVICE DU : ${dateFmt}</b></p>
                
                <div class="recap-section">
                    <div class="recap-row"><span>Espèces Totales (Réel) :</span><strong>${d.especesReel.toFixed(2)}€</strong></div>
                    <div class="recap-row"><span>Espèces Logiciel :</span><strong>${d.especesLogiciel.toFixed(2)}€</strong></div>
                    <div class="recap-row"><span>CB (Classique + Amex) :</span><strong>${d.cbTotal.toFixed(2)}€</strong></div>
                    <div class="recap-row"><span>CB - TR :</span><strong>${d.cbTR.toFixed(2)}€</strong></div>
                    <div class="recap-row"><span>CB - ANCV :</span><strong>${d.ancvConnect.toFixed(2)}€</strong></div>
                    <div class="recap-row"><span>ANCV Papier :</span><strong>${d.ancvPapier.toFixed(2)}€</strong></div>
                    <div class="recap-row"><span>Chèques :</span><strong>${d.checks.toFixed(2)}€</strong></div>
                </div>

                <hr>
                <div class="recap-row" style="background:#f8f9fa;"><span>🔹 Delta Espèces :</span><strong style="color:${d.deltaEspeces < 0 ? 'red' : 'green'}">${d.deltaEspeces.toFixed(2)}€</strong></div>
                <div class="recap-row"><span>🔹 Total MyPos :</span><strong>${d.mypos.toFixed(2)}€</strong></div>
                <hr>

                <div class="recap-section">
                    <div class="recap-row"><span>TTC TVA 5,5% :</span><strong>${d.tva5.toFixed(2)}€</strong></div>
                    <div class="recap-row"><span>TTC TVA 10% :</span><strong>${d.tva10.toFixed(2)}€</strong></div>
                    <div class="recap-row"><span>TTC TVA 20% :</span><strong>${d.tva20.toFixed(2)}€</strong></div>
                </div>

                <div class="recap-total-box" style="margin-top:15px; padding:10px; background:var(--primary); color:white; border-radius:8px; text-align:center;">
                    <div style="font-size:0.9rem;">SOMME GLOBALE LOGICIEL</div>
                    <div style="font-size:1.4rem; font-weight:bold;">${calc.sommeGlobaleLogiciel.toFixed(2)}€</div>
                </div>

                ${this.getFooter(calc)}
            </div>`;
    },

    getFooter(calc) {
        const ecart = Math.abs(calc.sommeGlobaleLogiciel - calc.details.totalTTC_TVA);
        if (ecart >= 0.1) {
            return `<p style="color:red; text-align:center; font-weight:bold; margin-top:10px;">❌ ERREUR TVA (${calc.details.totalTTC_TVA.toFixed(2)}€)<br>Vérifiez vos saisies !</p>`;
        }
        return `<button id="btn-sync" class="btn-primary" style="width:100%; background:var(--success); height:50px; margin-top:15px;" onclick="app.sendToGoogleSheet()">💾 ARCHIVER LE SERVICE</button>`;
    }
};
