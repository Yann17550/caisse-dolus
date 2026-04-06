/**
 * LOGIQUE DE CALCUL - Pizza Oléron 
 */
const LogicRecap = {
    calculate(getIn, getV) {
        const cbClassic = getV('total-cb');
        const cbAmex = getV('total-amex');
        const cbTotal = cbClassic + cbAmex;

        // On crée une structure plate et claire
        const calc = {
            details: {
                especesReel: getV('total-cash-net'),
                especesLogiciel: getIn('pos-cash'),
                cbTotal: cbTotal,
                cbTR: getV('total-tr'),
                ancvConnect: getV('total-ancv-connect'), // CB-ANCV
                ancvPapier: getV('total-ancv-paper'),
                checks: getV('total-checks'),
                mypos: getV('total-mypos'),
                tva5: getIn('tva-5'),
                tva10: getIn('tva-10'),
                tva20: getIn('tva-20'),
                totalTTC_TVA: 0,
                deltaEspeces: 0
            },
            sommeGlobaleLogiciel: 0
        };

        // Calculs dérivés
        calc.details.deltaEspeces = calc.details.especesReel - calc.details.especesLogiciel;
        calc.details.totalTTC_TVA = calc.details.tva5 + calc.details.tva10 + calc.details.tva20;

        // Somme Globale (Espèces Logiciel + CB + CB-TR + CB-ANCV + ANCV Papier + Chèques)
        calc.sommeGlobaleLogiciel = 
            calc.details.especesLogiciel + 
            calc.details.cbTotal + 
            calc.details.cbTR + 
            calc.details.ancvConnect + 
            calc.details.ancvPapier + 
            calc.details.checks;

        return calc;
    }
};
