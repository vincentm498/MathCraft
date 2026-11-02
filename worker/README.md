# Serveur de synchronisation (Cloudflare, gratuit)

Permet à un enfant de retrouver sa progression sur un autre appareil grâce à un **code famille**.
Aucune donnée personnelle : pas d'e-mail, pas de mot de passe, pas de code PIN parent. Seule la progression de jeu est stockée.

## Déployer (une seule fois, ~5 minutes)

1. Créer un compte gratuit sur https://dash.cloudflare.com/sign-up (pas de carte bancaire nécessaire).
2. Dans un terminal :

```bash
cd worker
npx wrangler login
npx wrangler deploy
```

Wrangler crée le stockage `SAVES` tout seul. Si vous obtenez une erreur sur le KV :

```bash
npx wrangler kv namespace create SAVES
```

puis copiez l'`id` affiché dans `wrangler.toml` (ligne `id = "..."`) et relancez `npx wrangler deploy`.

3. Wrangler affiche l'adresse du serveur, du type `https://mathcraft-sync.VOTRE-NOM.workers.dev`.
   Copiez-la dans `game.js`, constante `SYNC_URL` (en haut du bloc « Synchronisation »), puis poussez sur `dev`.

## Sécurité et limites
- Le code famille (24 caractères tirés au hasard) est le seul secret : ne le publiez pas.
- Seuls les sites listés dans `ALLOWED_ORIGINS` (wrangler.toml) peuvent appeler le serveur depuis un navigateur.
- Une sauvegarde ne peut pas dépasser ~900 Ko. Les photos des animaux ne sont pas envoyées (elles restent sur l'appareil).
- Une sauvegarde qui n'est pas synchronisée pendant ~13 mois est effacée automatiquement.
- Le parent peut tout effacer à tout moment : Espace parent → Données → « Effacer les données en ligne ».
- Quotas gratuits Cloudflare : largement suffisants pour une famille (à vérifier sur la page des tarifs Workers/KV).
