# caisse-dolus
Gestion Caisse
# 🍕 Documentation Technique - Application Caisse (Oléron)

Ce document répertorie l'ensemble des fonctions et sous-fonctions utilisées dans le moteur `app.js`.

## 🛠️ Initialisation & Structure
* **`init()`** : Point d'entrée de l'application. Lance la génération de l'interface et restaure les données.
* **`renderCashGrid()`** : Construit dynamiquement la grille des billets et pièces.
    * *Logique* : Injecte le fond de caisse par défaut (134€).
* **`showView(viewId)`** : Gère la navigation entre les différents onglets (Cartes, Espèces, Divers, Logiciel).

## 📊 Gestion des Paiements (Listes)
* **`addAncv()`** / **`removeAncv(idx)`** : Ajout et suppression des chèques vacances (Papier ou Connect).
* **`addCheck()`** / **`removeCheck(idx)`** : Gestion de la liste des chèques bancaires.
* **`addMyPos()`** / **`removeMyPos(idx)`** : Gestion des encaissements via terminal MyPos.

## 🧮 Moteur de Calcul (`refreshUI`)
* **`refreshUI()`** : Fonction centrale appelée à chaque modification pour recalculer les totaux.
    * **`getSum(id1, id2)`** : *[Sous-fonction]* Additionne deux champs d'entrée (ex: CB contact + sans contact).
    * **Calcul Espèces** : Somme pondérée des quantités par unité monétaire.
    * **Calcul Net** : Déduction automatique du fond de caisse (offset) du total brut.
* **`renderRecaps()`** : Met à jour l'affichage visuel des listes (ANCV, Chèques, MyPos) avec boutons de suppression.

## 🏁 Validation & Archivage (`openRecap`)
* **`openRecap()`** : Prépare le bilan final et compare le Réel vs Logiciel.
    * **`v(id)`** : *[Sous-fonction]* Récupère le texte d'un élément (total calculé).
    * **`getIn(id)`** : *[Sous-fonction]* Récupère la valeur d'une saisie (input).
* **`sendToGoogleSheet()`** : Envoie le paquet de données JSON vers Google Apps Script.
    * **`calculateCashShortage()`** : *[Sous-fonction]* Calcule les pièces/billets manquants pour constituer le fond de caisse du lendemain.
* **`showShortageModal(content)`** : Affiche les instructions de préparation du fond de caisse après succès de l'envoi.

## 💾 Persistance & Maintenance
* **`saveToStorage()`** : Sauvegarde l'état actuel dans le `localStorage` du navigateur.
* **`loadFromStorage()`** : Restaure les données sauvegardées au chargement.
* **`resetAllData()`** : Réinitialise l'application (vidage de la mémoire et rechargement de la page).
* **`bindEvents()`** : Lie les écouteurs d'événements (input) au moteur de calcul.
