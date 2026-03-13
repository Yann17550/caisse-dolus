/**
 * LOGIQUE DE CALCUL - Pizza Oléron
 */
const LogicRecap = {
    calculate(getIn, getV) {
        const cbClassic = getV('total-cb');
        const cbAmex = getV('total-amex');
        const cbTotal = cbClassic + cbAmex;

        const results = {
            especesReel: getV('total-cash-net'),
            especesLogiciel: getIn('pos-cash'),
            cbTotal: cbTotal,
            cbTR: getV('total-tr'),
            cbAncv: getV('total-ancv-connect'),
            ancvPapier: getV('total-ancv-paper'),
            cheques: getV('total-checks'),
            mypos: getV('total-mypos'),
            tva5: getIn('tva-5'),
            tva10: getIn('tva-10'),
            tva20: getIn('tva-20')
        };

        // Delta Espèces
        results.deltaEspeces = results.especesReel - results.especesLogiciel;

        // Somme Globale Logiciel (Demandée spécifiquement)
        results.sommeGlobale = results.especesLogiciel + 
                               results.cbTotal + 
                               results.cbTR + 
                               results.cbAncv + 
                               results.ancvPapier + 
                               results.cheques;

        results.totalTVA = results.tva5 + results.tva10 + results.tva20;

        return results;
    }
};
