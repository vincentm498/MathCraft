# ⛏️ MathCraft

Un petit jeu de blocs en 3D, façon Minecraft, pour **réviser les maths en jouant** (CP → CM2).
Il tourne directement dans le navigateur, sur **ordinateur, tablette et téléphone**, sans installation.

👉 **Jouer : https://vincentm498.github.io/MathCraft/**

## Le principe

L'enfant explore, construit et casse des blocs. À intervalles réguliers (ou en ouvrant des coffres, en cassant des blocs « ? »…),
une **question de maths** apparaît. Les bonnes réponses rapportent des étoiles, de l'argent, des blocs et des diamants.

- **Niveaux scolaires** : CP, CE1, CE2, CM1, CM2 (ou réglage libre des tables et des opérations)
- **Types de questions** : multiplications, divisions, additions, soustractions, questions à trous, grands nombres
- **Révision du jour** : 10 questions choisies sur les points faibles de l'enfant, avec un cadeau quotidien
- **Coffres au trésor** à code (3 questions), **défi éclair**, missions de construction
- **Le marchand** : on achète des blocs, des compagnons et des accessoires, mais il faut donner **la somme exacte** (pièces et billets) !
- **Compagnons** animaux (chien, chat, cochon, singe, lion…) avec nom et accessoires (chapeau, couronne, lunettes…)
- **7 mondes** : la Ferme, la Jungle, la Savane, les Montagnes, l'Océan et ses îles, la Neige, la Grotte
- **Météo** (pluie, orage, neige, brouillard), cycle jour/nuit, **sons d'ambiance et musique** générés par monde
- Les **constructions sont sauvegardées** (par enfant et par monde)

## Pour les parents

Le bouton **👨‍👩‍👧 Espace parent** (protégé par un code à 4 chiffres) donne :
temps de jeu, questions, réussite au premier essai, temps de réponse, maîtrise de chaque table,
dernières erreurs (y compris au marchand), conseils, **limite de temps par jour**, niveau scolaire, export/import de sauvegarde.

Plusieurs enfants peuvent jouer sur le même appareil : chacun a sa progression et son profil.

> Les données sont enregistrées **dans le navigateur** (`localStorage`) de l'appareil. Aucun compte, aucun serveur, aucune donnée envoyée.
> Utiliser « Exporter » dans l'espace parent pour sauvegarder ou changer d'appareil.

## Commandes

| | Ordinateur | Mobile |
|---|---|---|
| Se déplacer | Z Q S D / W A S D | joystick |
| Regarder | souris (ou glisser) | glisser le doigt |
| Tourner sur place | ← → ↑ ↓ | boutons ↺ ↻ |
| Sauter / nager | Espace | ⬆️ |
| Casser / poser | clic gauche / clic droit | toucher, bouton ⛏️/🧱 |
| Question tout de suite | M | ❓ |
| Pause | Échap | ⏸ |

## Jouer en plein écran sur mobile

- **Android (Chrome)** : le bouton **⛶** du jeu passe en plein écran. Pour une vraie appli : menu ⋮ → *Installer l'application*.
- **iPhone / iPad (Safari)** : Safari n'autorise pas le plein écran dans une page. Toucher **Partager ⬆️ → « Sur l'écran d'accueil »**, puis ouvrir MathCraft depuis la nouvelle icône : le jeu s'ouvre sans barre de navigateur.
- **Ordinateur** : F11 ou le bouton ⛶.

Une fois installé, le jeu fonctionne aussi **hors ligne**.

## Lancer en local

Les fichiers sont statiques. Ouvrir `index.html`, ou lancer un petit serveur :

```bash
python3 -m http.server 8080
```

puis ouvrir http://localhost:8080. Ajouter `?debug` à l'adresse (`index.html?debug`) active le **mode debug**, réservé aux tests :
tous les mondes sont débloqués, **aucune question** ni calcul, crédits, diamants et blocs **illimités** (∞), achats gratuits chez le marchand,
coffres ouverts directement, pas de limite de temps, et le **vol** (touche F, bouton 🕊️) n'existe **que** dans ce mode. Rien n'est ajouté à la progression de l'enfant.

## Technique

- JavaScript sans framework + [Three.js](https://threejs.org/) r160 (`three.min.js`, licence MIT)
- Textures, sons et musique **générés par code** : aucun fichier image ou audio
- `index.html`, `style.css`, `game.js`
