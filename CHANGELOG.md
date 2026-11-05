# Historique des versions

Toutes les évolutions de MathCraft, version par version : ce qui est **ajouté**, **modifié**, **supprimé** ou **corrigé**.
Le même résumé, à destination des enfants, est visible dans le jeu (bouton **🆕 Nouveautés** du menu).
Chaque version a son étiquette Git (`v1.6`…) et sa page dans les [Releases](https://github.com/vincentm498/MathCraft/releases).

## [1.16] - 2026-11-05 · Pouvoirs, enclos et mondes en boucle

### Ajouté
- **Animal rare unique par monde, avec un pouvoir secret** que l'enfant découvre seul : licorne (fait repousser l'herbe), panda roux (déterre les trouvailles), éléphant sacré (boit et recrache l'eau), tortue dorée (pont de nénuphars), yéti (gèle l'eau), slime cristal (révèle les cristaux), cheval doré (super saut quand on le monte), aigle royal (plane en tombant de haut). Trois nouveaux animaux : éléphant sacré (Savane), tortue dorée (Océan), aigle royal (Montagnes).
- **Énergie ⚡** (jauge dans l'en-tête) : chaque usage d'un pouvoir en consomme, chaque bonne réponse en rend.
- **Carnet « Pouvoirs mystères »** (Pause → Compagnons) : une devinette, puis des indices de plus en plus précis avec le temps passé et les essais ratés, sans jamais donner la solution.
- **Enclos dans chaque monde** pour les compagnons qui ne sont pas sortis : 2 places au départ, agrandissement par parcelles chez le marchand (somme exacte à payer, prix croissant jusqu'à 32 places). Toucher un animal de l'enclos le fait sortir.
- **Blocs de construction propres à chaque monde** (neige, glace, sapin, sable rouge, cactus, cristaux, gravier…).
- **Mondes en boucle** : en sortant par un bord, on réapparaît du côté opposé.
- Les **nouveautés** s'affichent dès la connexion d'un joueur qui revient.

### Modifié
- Les rares ne se répètent plus d'un monde à l'autre : la licorne reste à la Ferme, le yéti à la Neige ; la baleine (non adoptable) est remplacée par la tortue dorée.
- Les compagnons rangés vont dans l'enclos au lieu de disparaître.

## [1.15] - 2026-11-02 · Eau, TV et marchand

### Ajouté
- **Bloc d'eau** en 10e emplacement de la barre d'objets (touche **0**), 30 blocs au départ, avec les mêmes gains que les autres blocs.
- **Explication de chaque achat** chez le marchand (liste et comptoir).
- **Adresse courte `tv.html`** pour lancer le mode TV, et bouton du menu « 📺 Jouer sur la TV » (« 🎮 Téléphone = manette » sur téléphone).

### Modifié
- **Compagnons rares** : le jeu indique, après la photo et chez le marchand habituel, qu'ils ne s'achètent que chez le marchand ambulant.
- **Mode TV** : le bouton de l'Espace parent dépend de l'appareil (manette sur téléphone, affichage du jeu sur la télé).
- Barre d'objets : cases un peu plus étroites sur petit écran.

### Corrigé
- **Calculs à trous** : un calcul raté revenait parfois à trous alors que l'option était désactivée.

## [1.14.1] - 2026-11-02 · Jeu plus économe

### Corrigé
- **Processeur trop sollicité au lancement du jeu** : l'affichage 3D redessinait la scène à chaque image proposée par l'écran, sans limite (jusqu'à 120 ou 144 fois par seconde sur un écran rapide), y compris derrière le menu. Il est maintenant plafonné à 60 images par seconde en jeu et à 30 derrière un menu, une pause, une question ou la carte. Rien ne change à l'écran, mais l'ordinateur chauffe moins et la batterie dure plus longtemps.

## [1.14] - 2026-11-02 · Retrouver sa progression partout

### Ajouté
- **Synchronisation entre appareils** par un *code famille* de 24 caractères (Espace parent → Données → « Activer la synchronisation ») : l'enfant retrouve sa progression sur un autre appareil (écran de bienvenue → « J'ai déjà une progression sur un autre appareil »). Pas de compte, d'e-mail ni de mot de passe ; le code PIN parent et les photos des animaux ne sont jamais envoyés. Pour chaque joueur la sauvegarde la plus avancée est gardée, rien n'est remplacé en pleine partie, et supprimer un joueur sur un appareil le supprime aussi sur les autres. Le parent peut tout effacer en ligne. Serveur : Cloudflare Workers + KV gratuit (dossier `worker/`).
- **Identifiants de joueur aléatoires** pour les nouveaux joueurs (les anciennes sauvegardes gardent `p1`).
- **Tests automatiques** (Playwright, 18 tests lancés aussi sur GitHub à chaque push) et **deux versions** du jeu : production (`main`) et test (`dev`, adresse `/dev/`, sauvegardes séparées, tout débloqué).

### Modifié
- **Menu** : le bouton « JOUER » disparaît, on choisit un monde et la partie démarre (cliquer sur le monde en cours reprend la partie).
- **Compagnons rares uniques** : une fois obtenu, un compagnon rare ne réapparaît plus dans les mondes et ne peut plus être acheté ni apprivoisé une seconde fois.
- **Nouveautés** : la fenêtre n'affiche que les versions pas encore vues (au minimum la dernière) ; l'historique complet reste dans ce fichier.

### Corrigé
- **Tutoriel sur mobile** : le bandeau d'explication ne cache plus le joystick ni les boutons saut/mode.

## [1.13] - 2026-11-02 · Tutoriel et grande carte

### Ajouté
- **Tutoriel interactif** en 8 étapes (avancer, regarder, sauter, casser, poser, photographier, répondre à une question, ouvrir la pause) : un bandeau guide l'enfant et chaque étape se valide quand il fait vraiment l'action. Sur écran tactile, le bouton à utiliser clignote. Les textes s'adaptent au clavier/souris ou au tactile (et à la manette du téléphone).
- Il se lance **automatiquement la première fois** (pas pour un joueur qui a déjà répondu à des questions), se saute à tout moment, et se rejoue avec **« 🎓 Comment jouer ? »** dans le menu. Pas de question surprise pendant le tutoriel ; la question d'entraînement (2 + 3) est sans enjeu : on peut réessayer, rien n'entre dans les statistiques. Récompense : 10 🪙 et le succès « Tutoriel terminé ».
- **Grande carte** : un clic ou un toucher sur la mini-carte (ou la touche N, ou le bouton carte de la manette) ouvre la carte du monde entier avec le joueur (qui tourne avec lui), les coffres, le marchand, les compagnons, les animaux rares et les trésors à ramasser. Elle se met à jour en direct ; Échap, N ou « Fermer » la referment.

### Corrigé
- **Animaux coincés** dans des blocs posés par le joueur, des tranchées d'un bloc ou des enclos : un animal enfermé dans un bloc est replacé sur le sol libre le plus proche ; un animal qui veut avancer mais reste dans moins d'un bloc pendant 4 secondes se dégage de la même façon (un compagnon vers son joueur). Un animal libre n'est jamais déplacé.

## [1.12] - 2026-11-02 · Boutons et icônes refaits

### Modifié
- **Un seul système de boutons** : même relief (contour, reflet, arête dure), même comportement à l'appui, au survol, au focus clavier et en état désactivé. La couleur porte le rôle : vert = action principale, bleu = action, ambre = cadeau / casser, rouge = danger, ardoise = commande discrète. Les règles dupliquées ont été regroupées dans des variables CSS.
- **Boutons tactiles du jeu** : ils passent de disques plats translucides au même relief que le menu (le saut est vert, casser/poser ambre, la question bleue).
- **Menu** : « Cadeau du jour » passe en ambre pour se distinguer de « Nouveau terrain » et « Révision du jour » ; les petits liens (plein écran, espace parent…) sont plus lisibles et ont une zone tactile de 44 px.
- **Manette du téléphone** : mêmes boutons, mêmes couleurs, icônes plus grandes sur les gros boutons ; texte d'aide plus contrasté.

### Ajouté
- **Jeu d'icônes dessinées** (`icons.svg`, 14 icônes : pause, plein écran, question, photo, cheval, pic, bloc, flèches…) utilisé par la télé, le jeu et la manette à la place des emoji système, dont l'aspect changeait selon l'appareil.
- Contour jaune visible pour la navigation au clavier ; respect de « réduire les animations ».
- Noms accessibles (`aria-label`) sur tous les boutons à icône.

### Supprimé
- Les boutons de rotation ↺ ↻ du jeu tactile (on tourne en glissant le doigt ; les flèches du clavier restent).
- L'aide « ↺ ↻ pour tourner sur place » dans le menu tactile.

## [1.11.1] - 2026-11-02

### Corrigé
- **La touche Échap n'ouvrait pas la pause** quand la souris n'était pas verrouillée par le navigateur (le jeu ne réagissait qu'à ce verrouillage, ou à la touche P). Échap ouvre maintenant la pause et la referme. Le bouton « 🏠 Menu » de la pause ramène au menu principal.

## [1.11] - 2026-11-02 · S'entraîner quand c'est dur

### Ajouté
- **Rythme adaptatif** : selon la réussite du premier coup sur les 20 dernières réponses (au moins 6), l'intervalle entre deux questions est multiplié par 0,75 (moins de 80 % de réussite), 0,55 (moins de 60 %) ou 0,4 (moins de 40 %), avec un plancher de 15 secondes. Un message prévient l'enfant quand le jeu passe en « entraînement » puis quand il revient au rythme normal.
- **Les mêmes calculs reviennent** : un calcul raté est reposé à l'identique (mêmes nombres, même forme, y compris les calculs à trous). En difficulté, un calcul raté pas encore « dû » est aussi ressorti une fois sur deux.
- **Réglage parent** « 🧠 Plus de questions quand il se trompe » (activé par défaut), dans Réglages du jeu, et un conseil dans le suivi quand la réussite récente est sous 60 %.

### Modifié
- Un calcul à mémoriser revient maintenant sous la même forme que celle qui a été ratée (avant, la forme à trous pouvait changer après une première réussite).

## [1.10] - 2026-11-02 · Un menu plus simple

### Modifié
- **Le niveau scolaire n'est plus choisi par l'enfant** : il se règle uniquement dans l'Espace parent (protégé par le code). Tant qu'aucun niveau n'a été choisi, le menu invite le parent à le faire.
- **Les réglages des questions** (tables, types de calculs, à trous, rythme, QCM ou saisie) quittent le menu de l'enfant pour l'Espace parent.
- **Espace parent en 4 onglets** : Suivi, Réglages du jeu, Sécurité (temps de jeu, code), Données (prénom, export/import, suppression). Un réglage modifié garde la page et la position à l'écran.
- **Pause en 4 groupes** au lieu de 9 onglets : Mon aventure (Progrès, Succès, Quêtes, Défis), Collections (Album, Trouvailles, Compagnons), Marchand, Sons.
- Le **mode TV** se lance depuis Espace parent → Réglages du jeu.
- Le bouton « Réglages » de la pause devient « Menu » (il ramenait déjà au menu).

### Supprimé
- Du menu de l'enfant : le choix du niveau, le bloc « Régler les questions » et le bouton « Mode TV ».

## [1.9] - 2026-11-02 · Le jeu sur la TV

### Ajouté
- **Mode TV** (`index.html?tv`, bouton « 📺 Mode TV » du menu) : le jeu s'affiche sur la télé et le téléphone devient la **manette**. La TV peut être un ordinateur branché en HDMI, un Chromecast (cast de l'onglet), l'AirPlay ou le navigateur de la télé.
- **Page manette** (`manette.html`) : joystick, zone pour regarder, saut, casser, poser, photo, monter à cheval, question, pause, choix du bloc, course.
- **Questions sur le téléphone** : la question reste sur la télé, les 4 gros boutons de réponse (ou le clavier numérique) s'affichent sur le téléphone, avec une vibration à chaque question.
- **Menus sur le téléphone** : « Jouer », choix du monde, reprise après pause.
- **Jumelage** par QR code ou par code à 4 caractères ; reconnexion automatique du téléphone ; la TV arrête de bouger si elle n'a plus de nouvelles de la manette.

### À savoir
- La connexion téléphone ↔ télé est directe (WebRTC, via PeerJS). Seul le code de jumelage passe par le serveur de mise en relation public de PeerJS : aucun nom, aucune progression, aucune réponse n'y transitent. Le mode TV demande donc Internet des deux côtés ; le jeu normal reste entièrement hors ligne.
- Les bibliothèques PeerJS (MIT) et qrcode-generator (MIT) sont incluses dans `lib/` et ne sont chargées qu'en mode TV.

## [1.8.1] - 2026-11-02

### Corrigé
- La fête d'Halloween (citrouilles cachées) durait jusqu'au 2 novembre : elle s'arrête maintenant le 1er novembre (Toussaint).

## [1.8] - 2026-11-02 · À cheval !

### Ajouté
- **Monter son compagnon** (touche R ou bouton 🐴) : chevaux (dont pie, noir et doré), licornes, lions, zèbres, girafes, éléphants, vaches, moutons, cochons, chèvres, ours polaires. Monté, il va 1,7 fois plus vite et saute plus haut ; la vue se place sur son dos.
- **Dressage** : la première fois, il faut réussir 3 questions d'affilée **sans se précipiter** (une réponse trop rapide fait échouer le dressage).
- **Humeur du compagnon** : +4 pour une bonne réponse du premier coup, -2 pour une erreur, -5 pour une réponse trop rapide. Des cœurs flottent au-dessus d'un compagnon heureux (+20 % de vitesse monté), des gouttes au-dessus d'un compagnon triste, qui refuse alors de porter son cavalier. Jauge visible dans Pause → Compagnons.

### Modifié
- Les petits compagnons (chat, chien, hibou, poussin, lapin…) ne se montent pas ; le jeu l'explique.

## [1.7] - 2026-11-02 · Réfléchis avant de répondre

### Ajouté
- **Détection des réponses trop rapides** : en dessous d'environ 1,5 s (2 s en CP et CE1, un peu plus pour les calculs longs), la réponse est acceptée mais ne rapporte ni pépites, ni étoiles, ni série, et ne compte pas dans la maîtrise. Dans les défis (coffre, éclair, révision) elle reste acceptée : seul le parent en est informé.
- **Mini-correction** après deux questions ratées d'affilée : la bonne réponse et une astuce s'affichent, l'enfant la **recopie**, puis **respire 10 secondes** avant de continuer. Des astuces existent maintenant pour les additions et soustractions.
- **Espace parent** : indicateur « réponses trop rapides » (7 jours), liste des dernières réponses trop rapides avec leur temps, conseil automatique, suivi des séries de 3 erreurs.
- **Monde du Far West** : canyons de sable rouge, cactus, chevaux (cheval, cheval pie, étalon noir) et un **cheval doré rare** à apprivoiser ; 5 trouvailles, musique et météo propres.
- **Il se mérite** : 50 réponses réfléchies (réussies du premier coup, sans se précipiter) et au moins 80 % de réussite sur les 20 dernières. La progression est visible sur la carte du monde et dans l'espace parent.
- Accessoires **chapeau de cow-boy** et **foulard de cow-boy** chez le marchand ; achat des chevaux du Far West une fois photographiés.

### Modifié
- Les mondes se débloquent soit avec des étoiles, soit (Far West) avec la qualité des réponses.

## [1.6] - 2026-10-30 · Trouvailles

### Ajouté
- **35 trouvailles** (5 par monde) cachées dans les 7 mondes, en 4 raretés : commun, peu commun, rare, légendaire.
- Plus un objet est rare, plus il est difficile à trouver : les communs se voient de loin, les rares ne se voient que de près et sont placés tout en haut, les légendaires sont loin et **enterrés à 2 blocs** (il faut creuser).
- Jeu du **chaud / froid** (tiède, chaud, brûlant) pour retrouver les objets rares et légendaires cachés.
- Récompenses selon la rareté (10 à 300 🪙, jusqu'à 3 💎) et une médaille avec 5 💎 quand toutes les trouvailles d'un monde sont réunies.
- Onglet **🔎 Trouvailles** dans la pause, et 3 nouveaux succès.
- **Objet offert au compagnon** : chaque compagnon peut porter une trouvaille, qui flotte à côté de lui.

### Modifié
- La mini-carte n'affiche que les trouvailles communes (les autres doivent se chercher).

## [1.5] - 2026-10-30 · Photos et compagnons

### Ajouté
- **Photos** des animaux (touche C ou bouton 📷) : l'animal visé entre dans l'album avec son portrait, et une polaroïd s'affiche.
- Les animaux photographiés sont **en vente chez le marchand** (le chien et le chat y sont toujours).
- Compagnons rangés « à la maison » et **échangeables** à tout moment (Pause → Compagnons).
- **Accessoires cumulables** : un par emplacement (tête, yeux, cou, dos), et chaque compagnon garde les siens.
- Bouton **🆕 Nouveautés** dans le menu, avec l'historique des versions.
- Aperçu de partage (Open Graph) et captures d'écran dans le README.

### Modifié
- **Un seul compagnon** te suit à la fois (avant : tous en même temps).
- Récompense d'un nouvel animal dans l'album : 5 🪙 (avant : 2 🪙).
- La quête du jour « Rencontre N animaux » devient « Photographie N animaux ».
- Les messages d'information restent plus longtemps à l'écran (de 4 à 9 secondes, avant 2,6 secondes).

### Supprimé
- L'ajout automatique à l'album quand on s'approche d'un animal (il faut maintenant le photographier).
- La liste fixe de 7 compagnons du marchand (remplacée par les animaux photographiés).
- La répulsion entre compagnons, devenue inutile avec un seul compagnon.

### Corrigé
- La barre « Prochaine question » ne recouvre plus le badge de niveau sur les écrans moyens.

## [1.4] - 2026-10-30 · Un monde qui vit

### Ajouté
- **Événements surprise** : trésor flash, marchand ambulant (objets rares à -30 %), étoiles filantes, arc-en-ciel, dauphins, lucioles, aurore boréale, marée basse.
- **Animaux rares** à apprivoiser (licorne, panda roux, baleine, yéti, slime cristal), animaux de nuit et de pluie.
- **Album des animaux** avec une médaille par monde complété.
- **Chaque jour** : monde du jour (étoiles ×2), cadeau du jour, 3 quêtes, petites surprises, cadeau de retour après 3 jours d'absence.
- **Fêtes selon la vraie date** (Pâques, Halloween, Noël, été) et défi éclair ×2 le week-end.
- La ferme produit des œufs, du lait et des fruits.

### Modifié
- La monnaie du jeu est la **pépite 🪙** ; les anciens soldes sont convertis automatiquement.
- Les compagnons ne se superposent plus, traversent l'eau mais ne grimpent pas là où le joueur doit sauter.

### Supprimé
- Les euros comme monnaie du jeu.

## [1.3] - 2026-10-30 · Mieux retenir

### Ajouté
- **Répétition espacée** : une opération ratée revient vite, puis de plus en plus espacée, jusqu'à ce qu'elle soit retenue.
- **Plein écran** sur mobile, jeu installable sur l'écran d'accueil et utilisable hors ligne.
- Bouton **« Plus tard »** pour quitter un défi sans pénalité.

### Corrigé
- L'écran se figeait après une bonne réponse (une fonction de gain de pépites manquait).

## [1.2] - 2026-10-30 · Marchand, océan, neige et grotte

### Ajouté
- **Le marchand** : il faut lui donner la somme exacte pour recevoir son produit.
- Compagnons avec nom et accessoires.
- Mondes de **l'Océan**, de **la Neige** et de **la Grotte**.
- Météo, sons d'ambiance et musique.
- **Mode debug** (`?debug`) : tous les mondes, aucune question, crédits et blocs illimités, achats gratuits, vol.

### Supprimé
- Le **vol** en jeu normal : il n'existe plus que dans le mode debug.

## [1.1] - 2026-10-30 · Pour les parents

### Ajouté
- **Espace parent** protégé par un code : progrès, erreurs, temps de jeu, limite quotidienne, export et import.
- **Plusieurs enfants** sur le même appareil.
- Niveaux scolaires **CP, CE1, CE2, CM1, CM2** et révision du jour.

## [1.0] - 2026-10-30 · Le début de l'aventure

### Ajouté
- Un monde de blocs en 3D à explorer et à construire, sur ordinateur et mobile.
- Des questions de maths pour gagner étoiles, diamants et coffres.
- Les mondes de la Ferme, de la Jungle, de la Savane et des Montagnes.

> Les versions 1.0 et 1.1 ont été publiées avec le premier commit, en même temps que le contenu de la 1.2.

## Pour ajouter une version

1. Ajouter une section en haut de ce fichier (Ajouté / Modifié / Supprimé / Corrigé) et la même entrée dans `CHANGELOG` de `game.js`.
2. Valider, puis créer l'étiquette : `git tag v1.7 && git push origin v1.7`.
3. Publier la release avec le texte de la section : `gh release create v1.7 --title "1.7 · Titre" --notes-file notes.md`.
