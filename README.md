# Servr Mobile — App restaurateur & tablette de cuisine

> La **tablette de cuisine** de la plateforme Servr : l'app où le restaurateur reçoit les commandes
> en temps réel, les accepte, les imprime sur l'imprimante thermique et pilote son service.
> Application **Expo / React Native** (optimisée tablette / iPad).

---

## 🌐 L'écosystème Servr

Servr est une plateforme de commande en ligne pour restaurants, composée de **trois projets
complémentaires** qui partagent **une seule base de données Supabase (PostgreSQL)** et **une seule
authentification (Supabase Auth)**.

| Projet | Rôle | Stack | Public |
| --- | --- | --- | --- |
| **servr-api** | Backend / cerveau, base de données, paiements | Node.js · Express · Prisma · Stripe Connect · Socket.IO | — |
| **servr-web** | App client (boutique) + back-office restaurateur/plateforme | Next.js 15 · React 19 · Tailwind v4 | Clients & restaurateurs (bureau) |
| **[servr-mobile](.)** | App restaurateur / tablette de cuisine | Expo · React Native · NativeWind | Restaurateurs (tablette) |

```
        Clients (navigateur)                 Restaurateurs (tablette / cuisine)
                │                                          │
                ▼                                          ▼
        ┌───────────────┐                         ┌──────────────────┐
        │   servr-web   │   commande + paiement   │   servr-mobile   │  réception + impression
        │   (Next.js)   │                         │   (Expo / RN)    │
        └──────┬────────┘                         └────────┬─────────┘
               │       REST /api/v1  + JWT Supabase        │
               └──────────────────┬───────────────────────┘
                                  ▼
                          ┌────────────────┐     Stripe Connect (paiement)
                          │   servr-api    │───────────────┐
                          │(Express/Prisma)│               ▼
                          └────────────────┘         comptes connectés
```

**Où se place servr-mobile :** c'est l'app **côté cuisine**. Quand un client commande sur
`servr-web` et paie, `servr-api` notifie cette app en **temps réel**. Le restaurateur **accepte** la
commande (ce qui déclenche la capture du paiement Stripe), le ticket est **imprimé**, et le statut
remonte au client. C'est aussi ici qu'on ouvre/ferme le service, règle le niveau d'affluence et la
disponibilité des produits.

---

## 📖 Présentation

Pensée pour une **tablette posée en cuisine ou au comptoir**, l'app permet au restaurateur de :

1. **Recevoir & gérer les commandes** en temps réel (accepter / refuser, prêt, livré).
2. **Imprimer les tickets** sur une imprimante thermique Bluetooth (ESC/POS).
3. **Piloter le service** : ouvrir/fermer, régler le niveau d'affluence (temps de préparation),
   activer l'ouverture / la validation automatique.
4. **Gérer la disponibilité du menu** (activer/désactiver des produits à la volée).
5. **Consulter l'historique** des commandes.

Multi-restaurant : à la connexion, l'utilisateur choisit le restaurant à piloter (passe directement
si un seul).

## 🧱 Stack technique

- **Framework** : Expo SDK 55 · React Native 0.83 · React 19 · TypeScript
- **Navigation** : Expo Router (file-based, `typedRoutes`) · React Navigation (bottom tabs)
- **Style** : NativeWind 4 (Tailwind pour RN) · `class-variance-authority` · primitives `@rn-primitives`
- **Auth & data** : `@supabase/supabase-js` (session persistée via AsyncStorage / SecureStore)
- **Temps réel** : Supabase Realtime (canal `orders:{restaurantId}`)
- **Notifications** : `expo-notifications` (push Expo)
- **Impression** : `react-native-esc-pos-printer` (imprimante thermique Bluetooth ESC/POS)
- **Animations / natif** : Reanimated 4 · Gesture Handler · Haptics · vibration · orientation écran
- **Dates** : `date-fns` · `date-fns-tz` (fuseau par restaurant)
- **Polices** : DM Sans · Archivo Black

**Identité app** (`app.json`) : nom « My spots », slug `servr-app`, bundle `com.vlntnwest.servrapp`
(iOS & Android), owner `vlntnwest`.

## 🚀 Démarrage

```bash
git clone <repo-url>
cd servr-mobile

npm install
npx expo start          # puis : i (iOS), a (Android), w (web)
```

> L'app utilise des modules natifs (Bluetooth, push) : un **development build** est recommandé
> (`expo-dev-client`) plutôt qu'Expo Go.

```bash
npx expo run:ios        # build & lance sur simulateur / device iOS
npx expo run:android    # build & lance sur émulateur / device Android
npm run lint            # ESLint (config Expo)
```

## 🔐 Configuration & environnement

Les valeurs publiques sont injectées via les variables `EXPO_PUBLIC_*` (définies dans `eas.json`
pour les builds, et lisibles via `process.env` / `expo-constants`) :

| Variable | Rôle |
| --- | --- |
| `EXPO_PUBLIC_API_URL` | URL de base de `servr-api` (ex. `https://backend.my-spots.fr`) |
| `EXPO_PUBLIC_SUPABASE_URL` | URL du projet Supabase |
| `EXPO_PUBLIC_SUPABASE_KEY` | Clé publishable / anon Supabase |
| `EXPO_PUBLIC_DEV_HOST` | (dev) hôte du backend local, pour pointer vers `http://<host>:5001` |

En **dev**, `lib/api.ts` déduit automatiquement l'URL du backend local (port 5001) depuis le
`hostUri` Expo ; sinon il utilise `EXPO_PUBLIC_API_URL`.

### Profils de build EAS (`eas.json`)

| Profil | Usage |
| --- | --- |
| `development` | Development client, distribution interne |
| `preview` | Distribution interne (variables d'env définies) |
| `testflight` | App Store / TestFlight (auto-increment, auto-submit iOS) |
| `production` | Build de production (auto-increment) |

```bash
eas build --platform ios --profile preview
eas build --platform android --profile production
```

## 🗂️ Structure (Expo Router)

```
servr-mobile/
├── app/
│   ├── _layout.tsx              # Providers : Theme → Auth → Restaurant → Printer ; init push ; routage
│   ├── (auth)/                  # login.tsx (email/mot de passe Supabase), error.tsx (reconnexion)
│   ├── (select)/                # restaurant.tsx — sélection du restaurant à piloter
│   └── (app)/
│       ├── index.tsx            # redirige vers /orders
│       ├── order/[id].tsx       # détail de commande (modal formSheet)
│       └── (tabs)/
│           ├── orders/          # 🧾 file des commandes (cartes live, affluence, détail, actions)
│           ├── menu/            # 🍔 disponibilité des produits (toggle par produit)
│           └── settings/        # ⚙️ general · printer · history
├── components/ui/               # primitives (button, card, badge, dialog, switch, text, countdown…)
├── context/                     # auth.tsx · restaurant.tsx · printer.tsx
├── hooks/                       # use-orders · use-affluence · use-menu · use-push-notifications …
├── lib/                         # api.ts (client backend) · supabase.ts · opening-hours
├── types/api.ts                 # types du domaine (Order, Product, Restaurant, Printer…)
├── plugins/                     # config plugins Android (permissions, drawables d'onglets)
└── constants/ · assets/
```

### Écrans clés

- **`(auth)/login`** — connexion email / mot de passe (Supabase).
- **`(select)/restaurant`** — choix du restaurant (auto-avance si un seul).
- **Onglet `orders`** — bandeau **affluence** (ouvert/fermé + niveau de préparation EASY/MEDIUM/BUSY),
  cartes de commandes en direct, ouverture d'un détail avec actions de statut et bouton **imprimer**.
- **Onglet `menu`** — active/désactive la disponibilité d'un produit (`PUT …/products/:id`).
- **Onglet `settings`** — **general** (auto-ouverture, auto-validation), **printer** (scan/connexion
  imprimante Bluetooth, test & impression), **history** (commandes livrées/annulées, paginé).

## 🧠 État global (context)

| Context | Gère |
| --- | --- |
| `auth` | Session Supabase, `onAuthStateChange`, sync de l'auth Realtime |
| `restaurant` | Liste des restaurants (`/user/me`), restaurant sélectionné, `selectRestaurant()`, `refresh()` |
| `printer` | Imprimante thermique : `scan()`, `connect()`, `printTest()`, `printOrder()`, statut, imprimante sauvegardée (AsyncStorage) |

## 📡 Temps réel, push & impression

- **Temps réel** — `use-orders` s'abonne au canal **Supabase Realtime** `orders:{restaurantId}` et
  réagit aux `UPDATE` de commandes : vibration sur nouvelle commande, **auto-validation** optionnelle
  (DRAFT → AWAITING_ACCEPTANCE), **auto-impression** quand la commande passe en préparation, et
  rafraîchissement de la liste. (Le backend diffuse aussi en Socket.IO + push Expo.)
- **Push** — `use-push-notifications` demande la permission, récupère le token Expo (device physique
  uniquement) et l'envoie au backend via `PATCH /user/me/push-token` → stocké dans `users.push_token`.
- **Impression** — `context/printer` formate et imprime le ticket (n° de commande, nom client,
  horodatage, lignes produit + options, total €, coupe) via `react-native-esc-pos-printer`.
  L'imprimante choisie est mémorisée dans AsyncStorage et reconnectée au lancement.

## 🔌 Communication avec le backend

`lib/api.ts` cible `${EXPO_PUBLIC_API_URL}/api/v1`, joint le JWT Supabase
(`Authorization: Bearer …`) et rafraîchit la session sur `401`. Endpoints principaux :

- `GET /user/me` — utilisateur + restaurants · `PATCH /user/me/push-token`
- `GET /restaurants/:id/orders` (par statut) · `GET …/orders/:id` · `PATCH …/orders/:id/status`
- `GET /menu/restaurants/:id/menu` · `PUT …/products/:id` (disponibilité)
- `PATCH /restaurants/:id/preparation-level` · `PATCH …/open-state` · `PATCH …/opening-settings`

## 🎨 Design system

Palette « crème / orange » (fond `#F5EFE0`, accent `#E8521C`, encre `#1A1A1A`…), typographies
**DM Sans** (texte) et **Archivo Black** (titres). UI tablette : mises en page multi-colonnes,
seuils responsive à 768px, barre d'onglets native qui se réduit au défilement. Interface en français.

## 📄 Licence

Projet privé — tous droits réservés.
