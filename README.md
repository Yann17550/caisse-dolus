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
## 🔗 Cartographie des Interactions par Section

L'application est découpée en modules logiques. Chaque modification dans l'interface déclenche `app.refreshUI()`.

### 1. Section Cartes (CB, TR, AMEX)
* **Champs de saisie** : Utilise des IDs doubles (ex: `cb-contact` et `cb-sans-contact`).
* **Affichage des totaux** : Les IDs `total-cb`, `total-tr` et `total-amex` sont mis à jour par la sous-fonction `getSum`.
* **Liaison JS** : `getSum` additionne les deux IDs et injecte le résultat dans le `<span>` correspondant.

### 2. Section ANCV & Chèques (Listes dynamiques)
* **Saisie** : Les valeurs sont récupérées via les IDs `ancv-val`, `ancv-qty` et `check-amount`.
* **Stockage** : Les données ne restent pas dans les cases mais sont poussées dans des tableaux : `state.ancv` et `state.checks`.
* **Affichage** : La fonction `renderRecaps()` reconstruit visuellement la liste dans les div `ancv-recap` et `checks-recap` à chaque ajout/suppression.

### 3. Section Espèces (Le Coeur)
* **Conteneur** : `id="cash-grid"` (Généré dynamiquement au démarrage).
* **Calcul** : Utilise l'attribut `data-unit` (ex: 20, 10, 5) pour multiplier la quantité saisie par la valeur du billet.
* **Fond de Caisse** : L'ID `cash-offset` (par défaut 134) est soustrait du total brut pour obtenir le `total-cash-net`.

### 4. Section Logiciel (POS) & TVA
* **Comparaison** : L'ID `pos-cash` est crucial. Il sert de point de comparaison avec le "Réel" pour calculer l'écart (Delta) dans le récapitulatif.
* **Validation TVA** : Les IDs `tva-5`, `tva-10` et `tva-20` sont additionnés. 
* **Sécurité** : Si la somme `(TVA 5 + 10 + 20)` est différente de la somme des paiements déclarés, le bouton "Archiver" reste bloqué pour éviter les erreurs comptables.

### 5. Barre de Navigation (Nav-Bar)
* **Action** : Chaque bouton possède un `onclick="app.showView('ID')"`.
* **Comportement** : La fonction `showView` ajoute la classe CSS `.hidden` à toutes les sections sauf celle demandée.

## 🪟 Gestion des Fenêtres Modales (Pop-ups)

L'application utilise deux types de fenêtres surgissantes pour sécuriser l'archivage.

### 1. Le Récapitulatif Final (`id="modal-recap"`)
* **Déclenchement** : Bouton "📋 RÉCAP" dans la barre de navigation via `app.openRecap()`.
* **Rôle** : C'est le dernier filtre. Elle affiche :
    * Le calcul du **Réel physique** (ce que tu as en main).
    * Le calcul du **Logiciel** (ce que la caisse dit).
    * L'**Écart (Delta)** entre les deux.
* **Sécurité TVA** : La fonction vérifie si la somme des TVA saisies correspond au total des paiements.
    * *Si OK* : Affiche le bouton `💾 ARCHIVER`.
    * *Si Erreur* : Affiche un message d'alerte rouge et bloque l'envoi.

### 2. L'Assistant Fond de Caisse (`id="modal-fond"`)
* **Déclenchement** : Automatique après un envoi réussi vers Google Sheets.
* **Construction** : Cette modale est "éphémère". Elle est créée dynamiquement en JavaScript après la réponse du serveur.
* **Rôle** : Elle affiche la liste précise des pièces et billets à ajouter pour reconstituer exactement le **fond de caisse de 134€** pour le lendemain.
* **Action** : Le bouton "C'EST FAIT !" ferme la modale et réinitialise l'application pour le jour suivant (`resetAllData`).

## 🎨 Guide de l'Interface (Design System)

L'aspect visuel de l'application est géré par `style.css` et repose sur des variables pour une maintenance facile.

### 🛡️ Couleurs de référence
* **Identité principale** : Bleu nuit (`--primary`) utilisé pour les titres et la navigation.
* **Alertes** : Rouge (`--danger`) pour les suppressions et vert (`--success`) pour l'archivage réussi.
* **Marque** : Un bleu spécifique (`--amex`) identifie visuellement la section American Express.

### 📐 Mise en page (Layout)
* **Mode Mobile First** : L'interface est optimisée pour l'usage à une main sur smartphone.
* **Système de "Cartes"** : Chaque bloc de saisie est isolé dans une `.card-section` blanche avec une légère ombre pour une meilleure lisibilité.
* **Grille d'Espèces** : Utilise un `display: grid` en 2 colonnes pour maximiser l'espace vertical sur les petits écrans.

### 👁️ Retours Visuels (États)
* **Mode Sombre (Modale)** : Les récapitulatifs utilisent un overlay de `0.85` d'opacité pour détacher les chiffres du reste de l'application.
* **Navigation Active** : La barre de navigation est fixée en bas (`position: fixed`) pour être accessible en permanence avec le pouce.
* **Mise en évidence** : La classe `.highlight` passe le fond en vert clair pour signaler que le calcul du "Total Net" est prêt.
