# Projet TikTok E-Commerce — Fer à lisser / Bénin
> Système de vente en feed vertical + IA WhatsApp + Agence de livraison  
> Auteur : Sommin Berenger SANNI BAYER  
> Démarrage : Mai 2026

---

## Table des matières

1. [Vision du projet](#1-vision-du-projet)
2. [Architecture globale](#2-architecture-globale)
3. [Stack technique](#3-stack-technique)
4. [Produit principal](#4-produit-principal--fer-à-lisser-2-en-1)
5. [Sourcing & stock](#5-sourcing--stock)
6. [Stratégie de prix](#6-stratégie-de-prix)
7. [Structure du site](#7-structure-du-site)
8. [Workflow WhatsApp + IA](#8-workflow-whatsapp--ia)
9. [Stratégie Facebook Ads](#9-stratégie-facebook-ads)
10. [Accroches vidéo](#10-accroches-vidéo)
11. [Intégration agence de livraison](#11-intégration-agence-de-livraison)
12. [Modèle financier](#12-modèle-financier)
13. [Plan de lancement 4 semaines](#13-plan-de-lancement-4-semaines)
14. [Structure du projet (dossiers)](#14-structure-du-projet-dossiers)
15. [Variables d'environnement](#15-variables-denvironnement)
16. [Roadmap fonctionnalités](#16-roadmap-fonctionnalités)

---

## 1. Vision du projet

Un **feed vertical façon TikTok** où chaque article défile en plein écran (vidéo ou photo). Le client clique sur "Commander", est redirigé vers **WhatsApp Business**, et une **IA (Claude API)** gère toute la conversation jusqu'à la confirmation de commande. L'agence de livraison partenaire reçoit automatiquement les ordres et gère le stock physique.

### Proposition de valeur
- **Pour le client** : découverte immersive des produits, commande en 2 clics via WhatsApp, livraison rapide au Bénin.
- **Pour le vendeur** : zéro prise de commande manuelle, stock externalisé, pub Facebook → ventes automatisées.

---

## 2. Architecture globale

```
Client mobile (Feed TikTok-style)
        │
        ▼ swipe / scroll
  Fiche produit plein écran
        │
        ▼ clic "Commander"
  WhatsApp Business API (lien wa.me pré-rempli)
        │
        ▼
  Webhook n8n (réception message)
        │
        ▼
  Claude API (Haiku) ← collecte infos client
  [Nom → Quartier → Téléphone → Confirmation]
        │
        ├─▶ Firestore (enregistrement commande)
        │
        ├─▶ Agence de livraison (email / webhook / WhatsApp auto)
        │
        └─▶ Client (message confirmation + délai livraison)
```

---

## 3. Stack technique

### Frontend
| Brique | Technologie | Notes |
|---|---|---|
| Framework | Next.js 14 (App Router) | SSR + SEO + API Routes intégrées |
| Feed vertical | CSS Scroll Snap natif | Pas de dépendance externe, fluide |
| Vidéos | `<video>` HTML5 + lazy load | Léger, auto-play muted |
| UI | Tailwind CSS | Développement rapide |
| Déploiement | Vercel | Gratuit, CI/CD automatique |

### Backend / Base de données
| Brique | Technologie | Notes |
|---|---|---|
| API Routes | Next.js API Routes | Unifié avec le front |
| Base de données | Firebase Firestore | Temps réel, gratuit Spark plan |
| Auth admin | Firebase Auth | Dashboard sécurisé |
| Médias | Firebase Storage | Vidéos et images produits |

### Automatisation & IA
| Brique | Technologie | Notes |
|---|---|---|
| Orchestration | n8n (self-hosted VPS) | Workflow WhatsApp complet |
| WhatsApp | WhatsApp Business Cloud API | Gratuit jusqu'à 1 000 conv/mois |
| IA conversationnelle | Claude API (Haiku) | ~$0.25 / 1M tokens |
| Fallback MVP | Lien `wa.me` avec message pré-rempli | Si WhatsApp API non encore activée |

### Paiement (Phase 2)
| Brique | Technologie | Notes |
|---|---|---|
| Mobile Money | FedaPay | MTN + Moov Bénin, déjà connu |
| Commission | ~2-3% par transaction | À inclure dans le modèle financier |

---

## 4. Produit principal — Fer à lisser 2-en-1

**Pourquoi ce produit :**
- Démo avant/après = contenu TikTok viral par excellence
- Marché cible : femmes 18-45 ans = 60% des acheteurs en ligne au Bénin
- Léger, pas fragile → livraison sans casse
- Marge brute >50% à prix de vente 4 500 FCFA

**Modèle recommandé :**  
Fer à lisser 2-en-1 avec câble pivotant 360°, température réglable, plaques en céramique. Le câble pivotant est visuellement impactant dans les vidéos courtes.

**Produit upsell (à activer semaine 4) :**  
Épilateur électrique portable — même audience, commande complémentaire proposée en fin de conversation WhatsApp.

---

## 5. Sourcing & stock

### Approvisionnement initial
- **Lieu** : Dantokpa, Cotonou (grossistes électroménager)
- **Quantité test** : 30 unités
- **Prix d'achat estimé** : 1 200 – 1 800 FCFA / unité
- **Critère de sélection** : câble 360°, température réglable, emballage résistant

### Réapprovisionnement
- Déclencher une commande quand le stock descend à **≤ 10 unités**
- Délai Dantokpa : 24-48h
- Option Lagos/Lomé si volume > 50 unités (prix d'achat -15%)

### Gestion stock via Firestore
```js
// Structure document Firestore : /produits/{id}
{
  nom: "Fer à lisser 2-en-1",
  prixVente: 4500,
  prixAchat: 1500,
  stock: 30,
  stockAlerte: 10,
  actif: true,
  medias: ["url_video1", "url_photo1", "url_photo2"]
}
```

---

## 6. Stratégie de prix

| Offre | Prix | Marge brute | Positionnement |
|---|---|---|---|
| Entrée de gamme | 3 500 FCFA | ~1 100 FCFA | Test marché, volume rapide |
| **Optimal (recommandé)** | **4 500 FCFA** | **~2 100 FCFA** | Meilleur équilibre marge/conversion |
| Pack (fer + épilateur) | 7 500 FCFA | ~3 500 FCFA | Upsell, augmente panier moyen |

**Règle** : ne jamais afficher un prix rond supérieur à 5 000 FCFA sur le premier contact. "Moins de 5 000 FCFA" est une barrière psychologique forte au Bénin.

---

## 7. Structure du site

### Pages
```
/                     → Feed TikTok-style (liste produits en scroll vertical)
/produit/[slug]       → Fiche produit détaillée (optionnel)
/admin                → Dashboard (ajout/modif produits, suivi commandes)
```

### Composant Feed (logique principale)
```jsx
// components/ProductFeed.jsx
'use client'
import { useEffect, useRef, useState } from 'react'

export default function ProductFeed({ produits }) {
  const [actif, setActif] = useState(0)
  const refs = useRef([])

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            const idx = refs.current.indexOf(e.target)
            setActif(idx)
            // Auto-play vidéo visible, pause les autres
            refs.current.forEach((el, i) => {
              const video = el?.querySelector('video')
              if (video) i === idx ? video.play() : video.pause()
            })
          }
        })
      },
      { threshold: 0.6 }
    )
    refs.current.forEach(el => el && observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return (
    <div className="h-screen overflow-y-scroll snap-y snap-mandatory">
      {produits.map((p, i) => (
        <div
          key={p.id}
          ref={el => refs.current[i] = el}
          className="h-screen w-full snap-start relative flex flex-col"
        >
          {/* Vidéo / Image plein écran */}
          <video
            src={p.videoUrl}
            className="absolute inset-0 w-full h-full object-cover"
            loop muted playsInline
          />

          {/* Overlay infos produit */}
          <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent text-white">
            <h2 className="text-xl font-semibold">{p.nom}</h2>
            <p className="text-sm opacity-80 mb-3">{p.description}</p>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{p.prixVente.toLocaleString()} FCFA</span>
              <a
                href={`https://wa.me/22901000000?text=Bonjour, je suis intéressé(e) par ${p.nom} à ${p.prixVente} FCFA`}
                className="bg-green-500 text-white px-6 py-3 rounded-full font-semibold"
                target="_blank"
              >
                Commander via WhatsApp
              </a>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
```

### Données produit depuis Firestore
```js
// app/page.js
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import ProductFeed from '@/components/ProductFeed'

export default async function Home() {
  const q = query(collection(db, 'produits'), where('actif', '==', true))
  const snap = await getDocs(q)
  const produits = snap.docs.map(d => ({ id: d.id, ...d.data() }))
  return <ProductFeed produits={produits} />
}
```

---

## 8. Workflow WhatsApp + IA

### Flow de conversation (n8n + Claude API)

```
1. Client envoie message WhatsApp
        ↓
2. Webhook n8n reçoit le message
        ↓
3. n8n → Claude API (Haiku)
   Prompt système :
   "Tu es l'assistant commercial de [Boutique]. 
    Collecte dans l'ordre : prénom, quartier de livraison, numéro de téléphone.
    Confirme la commande avec un récapitulatif.
    Propose ensuite l'upsell épilateur à 2 500 FCFA supplémentaires.
    Réponds uniquement en français, sois chaleureux et concis."
        ↓
4. Claude génère la réponse → n8n renvoie via WhatsApp API
        ↓
5. Quand commande confirmée → n8n :
   ├── Enregistre dans Firestore (/commandes/{id})
   ├── Notifie l'agence de livraison (email ou webhook)
   └── Envoie confirmation au client
```

### Structure commande Firestore
```js
// /commandes/{id}
{
  produitId: "fer-lisser-2en1",
  produitNom: "Fer à lisser 2-en-1",
  prixVente: 4500,
  client: {
    prenom: "Aïcha",
    telephone: "+22961000000",
    quartier: "Akpakpa",
    ville: "Cotonou"
  },
  statut: "confirmée", // confirmée | en_livraison | livrée | retour
  upsell: false,
  modePaiement: "livraison", // livraison | mobile_money
  dateCommande: Timestamp,
  dateModif: Timestamp
}
```

### Prompt système Claude (à coller dans n8n)
```
Tu es l'assistant commercial d'une boutique en ligne au Bénin.
Tu dois convertir les prospects en acheteurs de manière chaleureuse et efficace.

ÉTAPES À SUIVRE DANS L'ORDRE :
1. Accueillir le client et confirmer le produit souhaité + son prix (4 500 FCFA)
2. Demander le prénom
3. Demander le quartier/ville de livraison
4. Demander le numéro de téléphone de livraison
5. Récapituler la commande et demander le mode de paiement (livraison ou Mobile Money)
6. Confirmer la commande et indiquer le délai (24h)
7. Proposer l'upsell : "Souhaitez-vous ajouter notre épilateur électrique pour seulement 2 500 FCFA de plus ?"

RÈGLES :
- Réponds toujours en français
- Maximum 3 phrases par réponse
- Ne pose qu'une seule question à la fois
- Si le client hésite, rassure-le avec la politique de remboursement
- Si le client demande le prix de livraison, dis que c'est GRATUIT et inclus

CONTEXTE ACTUEL :
{historique_conversation}
```

---

## 9. Stratégie Facebook Ads

### Audiences

**Audience 1 — Test initial (semaine 1-2)**
- Genre : Femmes
- Âge : 18-35 ans
- Localisation : Cotonou, Abomey-Calavi, Porto-Novo
- Centres d'intérêt : coiffure, beauté, mode, soin des cheveux
- Comportement : acheteurs en ligne engagés
- Budget : 3 000 FCFA/jour

**Audience 2 — Lookalike (semaine 3+)**
- Source : liste des premiers clients WhatsApp
- Similarité : 1-2%
- Localisation : Bénin entier + Lomé (Togo)
- Budget : 5 000 – 8 000 FCFA/jour

**Audience 3 — Retargeting (en continu)**
- Visiteurs du site (pixel Facebook) sans commande
- Interactions avec les vidéos Facebook/Instagram
- Budget : 1 500 FCFA/jour

### Format d'annonce recommandé
- Format : Vidéo 9:16 (Reels / Stories)
- Durée : 15-30 secondes
- Sous-titres : obligatoires (80% des vues sans son)
- CTA bouton : "Envoyer un message" → redirige WhatsApp
- Langue : français

### KPIs à surveiller
| Métrique | Objectif |
|---|---|
| CPC (coût par clic) | < 100 FCFA |
| CPM | < 1 500 FCFA |
| Taux de clic | > 2% |
| CPA (coût par commande) | < 800 FCFA |
| ROAS (retour sur pub) | > 3x |

---

## 10. Accroches vidéo

### Top 5 scripts (15-30 secondes)

**Accroche 01 — Transformation (PRIORITÉ 1)**
```
[0-3s]  Gros plan cheveux défrisés, ternes
[3-10s] Main qui prend le fer, geste rapide sur une mèche
[10-20s] Résultat : cheveux brillants, lissés ou bouclés
[20-25s] Texte en overlay : "Fer à lisser 2-en-1 — 4 500 FCFA"
[25-30s] "Commande via WhatsApp — Livraison au Bénin en 24h"
```

**Accroche 02 — Douleur (frustration salon)**
```
[0-5s]  "Tu dépenses 2 000 F à chaque salon..."
[5-15s] Démo rapide du fer en action chez soi
[15-25s] "...alors que tu peux avoir le même résultat chez toi pour 4 500 FCFA"
[25-30s] CTA WhatsApp
```

**Accroche 03 — Curiosité**
```
[0-5s]  "Le truc que toutes les filles qui ont de beaux cheveux utilisent..."
[5-20s] Démo + transformation
[20-30s] Prix + CTA
```

**Accroche 04 — Urgence**
```
[0-5s]  "⚠️ Il reste seulement 8 pièces en stock"
[5-20s] Démo rapide
[20-30s] "Commande maintenant — Livraison partout au Bénin"
```

**Accroche 05 — Témoignage**
```
[0-5s]  "Ma cliente Faridath a reçu son colis hier..."
[5-20s] Vidéo/photo client avec le produit
[20-30s] Prix + CTA
```

---

## 11. Intégration agence de livraison

### Cas 1 — L'agence a une API
```js
// Appel API agence depuis n8n (HTTP Request node)
POST https://api.agence-livraison.com/commandes
Authorization: Bearer {API_KEY}
Content-Type: application/json

{
  "reference": "CMD-2026-001",
  "produit": "Fer à lisser 2-en-1",
  "quantite": 1,
  "client": {
    "nom": "Aïcha Kossou",
    "telephone": "+22961000000",
    "adresse": "Akpakpa, Cotonou"
  },
  "montant_cod": 4500,
  "notes": "Livraison contre remboursement"
}
```

### Cas 2 — L'agence n'a pas d'API (email auto)
```
Objet : Nouvelle commande #CMD-{id}

Bonjour,

Nouvelle commande à livrer :

Produit : Fer à lisser 2-en-1
Montant à collecter : 4 500 FCFA (contre remboursement)

Client :
  Prénom   : {prenom}
  Téléphone : {telephone}
  Quartier  : {quartier}
  Ville     : {ville}

Référence commande : {id}
Date         : {date}

Merci de confirmer la prise en charge.
```

### Cas 3 — Notification WhatsApp à l'agence
- Numéro dédié de l'agence dans n8n
- Message texte formaté automatiquement après chaque confirmation

---

## 12. Modèle financier

### Paramètres de base
| Paramètre | Valeur |
|---|---|
| Prix de vente | 4 500 FCFA |
| Prix d'achat | 1 500 FCFA |
| Livraison agence | 600 FCFA / colis |
| Marge brute / vente | 2 400 FCFA |
| Taux retour / litige | 8% |
| Marge brute nette (après retours) | ~2 208 FCFA |

### Charges fixes mensuelles
| Poste | Montant |
|---|---|
| n8n Cloud | ~13 000 FCFA (~20$) |
| Claude API (Haiku) | ~500 FCFA |
| VPS (si self-hosted n8n) | ~3 300 FCFA (~5$) |
| WhatsApp Business API | 0 FCFA (< 1 000 conv) |
| Vercel + Firebase | 0 FCFA (plans gratuits) |
| **Total charges fixes** | **~17 000 FCFA** |

### Seuil de rentabilité
```
Seuil = Charges fixes / Marge brute nette par vente
Seuil = 17 000 + Budget pub / 2 208
→ Avec 15 000 FCFA de pub : seuil = ~15 ventes/mois
```

### Projection 6 mois
| Mois | Ventes | Revenu net | Charges | Bénéfice net |
|---|---|---|---|---|
| Mois 1 | 15 | 62 100 F | 57 000 F | ~5 000 F |
| Mois 2 | 22 | 91 080 F | 67 600 F | ~23 000 F |
| Mois 3 | 30 | 124 200 F | 79 000 F | ~45 000 F |
| Mois 4 | 38 | 157 300 F | 89 800 F | ~67 000 F |
| Mois 5 | 45 | 186 300 F | 99 500 F | ~87 000 F |
| Mois 6 | 55 | 227 700 F | 114 300 F | ~113 000 F |

*Hypothèses : 8% retours, pub croissante de 15k à 28k FCFA/mois*

---

## 13. Plan de lancement 4 semaines

### Semaine 1 — Setup
- [ ] Sourcer 30 unités du fer à lisser 2-en-1 à Dantokpa
- [ ] Filmer 3 vidéos démo (transformation + douleur + curiosité)
- [ ] Créer le projet Next.js + configurer Firebase
- [ ] Déployer une version V0 sur Vercel
- [ ] Configurer le compte WhatsApp Business

### Semaine 2 — Lancement
- [ ] Intégrer le workflow n8n (webhook WhatsApp → Claude → Firestore)
- [ ] Lancer la première campagne Facebook (3 000 FCFA/jour)
- [ ] Tester 2 accroches vidéo différentes (A/B test)
- [ ] Traiter les premières commandes manuellement si besoin
- [ ] Récolter 3 avis clients + photos

### Semaine 3 — Optimisation
- [ ] Analyser le CPA réel (coût par commande)
- [ ] Couper l'accroche la moins performante
- [ ] Ajouter une vidéo témoignage client
- [ ] Monter le budget pub à 5 000 FCFA/jour
- [ ] Activer le retargeting

### Semaine 4 — Scaling
- [ ] Réapprovisionner si stock < 10 unités
- [ ] Activer l'audience lookalike
- [ ] Lancer le produit upsell (épilateur) dans le flow WhatsApp
- [ ] Calculer le ROI réel et ajuster le budget pub
- [ ] Documenter les optimisations

---

## 14. Structure du projet (dossiers)

```
tiktok-ecommerce-benin/
├── app/
│   ├── page.js                  ← Feed principal
│   ├── admin/
│   │   └── page.js              ← Dashboard admin
│   ├── api/
│   │   ├── commandes/
│   │   │   └── route.js         ← Création commande
│   │   └── webhook/
│   │       └── whatsapp/
│   │           └── route.js     ← Réception messages WhatsApp
│   └── layout.js
├── components/
│   ├── ProductFeed.jsx          ← Feed TikTok vertical
│   ├── ProductCard.jsx          ← Carte produit plein écran
│   ├── CommandButton.jsx        ← Bouton WhatsApp
│   └── AdminTable.jsx           ← Tableau commandes
├── lib/
│   ├── firebase.js              ← Config Firebase
│   ├── whatsapp.js              ← Envoi messages WhatsApp API
│   └── claude.js                ← Appels Claude API
├── public/
│   └── medias/                  ← Vidéos et images locales
├── n8n/
│   └── workflow_whatsapp.json   ← Export workflow n8n
├── .env.local                   ← Variables d'environnement
├── next.config.js
├── tailwind.config.js
└── package.json
```

---

## 15. Variables d'environnement

```env
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# WhatsApp Business Cloud API
WHATSAPP_API_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_WEBHOOK_VERIFY_TOKEN=
WHATSAPP_NUMERO_BOUTIQUE=

# Claude API
ANTHROPIC_API_KEY=

# Agence de livraison (si API disponible)
AGENCE_API_KEY=
AGENCE_API_URL=

# FedaPay (Phase 2)
FEDAPAY_SECRET_KEY=
FEDAPAY_PUBLIC_KEY=

# n8n Webhook
N8N_WEBHOOK_URL=
```

---

## 16. Roadmap fonctionnalités

### MVP (Semaine 1-2)
- [x] Feed vertical TikTok-style
- [x] Bouton "Commander via WhatsApp" (lien wa.me)
- [x] Dashboard admin basique
- [x] Intégration Firebase (produits + commandes)

### V1 (Semaine 3-4)
- [ ] WhatsApp Business Cloud API (webhooks)
- [ ] Workflow n8n + Claude API complet
- [ ] Notification automatique agence de livraison
- [ ] Confirmation automatique client

### V2 (Mois 2-3)
- [ ] Paiement Mobile Money via FedaPay
- [ ] Suivi commande en temps réel (lien tracking)
- [ ] Système d'avis clients sur les fiches produits
- [ ] Multi-produits (ajout épilateur + autres)

### V3 (Mois 4-6)
- [ ] Application mobile (PWA ou React Native)
- [ ] Programme de parrainage (client → partage → réduction)
- [ ] Analytics avancés (taux de conversion par vidéo)
- [ ] Expansion Togo + Côte d'Ivoire

---

*Dernière mise à jour : Mai 2026*  
*Contact : Sommin Berenger SANNI BAYER — Abomey-Calavi, Bénin*
