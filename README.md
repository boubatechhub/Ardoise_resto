# Ardoise

Prise de commande à table et pilotage du service, pour un restaurant indépendant de 35 couverts.
Quatre espaces dans une seule application : **client** (à table, ouvert par QR), **salle**,
**cuisine**, **gestion de la carte**.

Le code vient de la maquette `../ardoise-prototype.html`, qui reste la démo partageable.

## Démarrer

```bash
npm install
npm run dev        # http://localhost:5180
```

Lancez les commandes **depuis ce dossier**. Le chemin du projet contient un espace
(« product design ») : certains outils qui démarrent Vite depuis un autre répertoire, avec un
chemin court 8.3, provoquent une incohérence de racine. La configuration fixe déjà `root` et
`server.fs.allow`, mais le plus simple reste de rester dans le dossier.

| Commande            | Effet                                     |
| ------------------- | ----------------------------------------- |
| `npm run dev`       | serveur de développement, port 5180       |
| `npm run typecheck` | vérification des types seule              |
| `npm run build`     | `tsc --noEmit` puis build dans `dist/`     |
| `npm run preview`   | sert le build de `dist/`                   |

## Architecture

```text
src/
  types/index.ts        modèle métier — source de vérité des types
  donnees/
    carte.ts            carte de départ (jamais importée par un composant)
    scenario.ts         scénario de service : sept tables occupées
    constantes.ts       tables, motifs fermés, moyens de paiement, identifiants
  services/index.ts     frontière avec la provenance des données — asynchrone et faillible
  lib/
    format.ts           prix, ancienneté, pluriels, initiales
    regles.ts           règles métier pures : visibilité, montants, états de table
  etat/useArdoise.ts    état unique et actions métier, partagés par les quatre espaces
  composants/communs.tsx  primitives : visuel, quantité, interrupteur, pastilles, états d'écran
  espaces/
    EspaceClient.tsx    table, carte, fiche plat, panier, suivi, addition
    EspaceSalle.tsx     plan de salle, fiche table, file de validation, disponibilités
    EspaceCuisine.tsx   file de préparation, plats épuisés
    EspaceGestion.tsx   carte, fiche plat, catégories, aperçu, archives
  styles/               jetons, base, et une feuille par espace
```

### Le seam de données

`services/index.ts` est **asynchrone et faillible dès aujourd'hui**, alors qu'il ne lit que des
tableaux en mémoire. Le jour où ces fonctions feront un `fetch`, aucun composant ne change : les
états chargement et erreur sont déjà câblés, et `LATENCE_MS` garde ces états honnêtes pendant le
développement. `SIMULER_UNE_PANNE` bascule l'application sur son écran d'erreur.

### L'état

Un seul `useArdoise()` détient l'état et expose des actions par rôle (`client`, `salle`,
`cuisine`, `gestion`). Aucun composant ne modifie l'état directement : il appelle une action, qui
applique la règle. C'est ce qui garantit qu'une validation en salle est visible côté client dans la
seconde.

## Les principes que le code protège

- Une demande client n'est **jamais** une commande ferme : rien ne part en cuisine sans validation
  de la salle.
- **Aucun paiement dans l'application.** Le client demande son addition, la salle l'encaisse et
  l'enregistre. Le paiement ne conditionne jamais la préparation.
- La **Gestion décide ce qui existe** (`statut`, durable) ; le **service décide ce qui est encore là
  aujourd'hui** (`epuiseLe`, remis à zéro au service suivant).
- Une commande n'est facturée qu'une fois **confirmée** ; ce qui est en attente de validation
  s'affiche à part et n'entre pas dans l'addition.
- Une ligne de commande fige **nom et prix à l'envoi** : modifier la carte ne rejuge jamais le passé.
- « Appeler la salle » reste accessible depuis chaque écran client, et aucun état vide ou en erreur
  n'est un cul-de-sac.
- Le parcours papier reste entier : la salle peut saisir une commande prise de vive voix, sinon
  l'addition d'une table orale serait fausse.

## Vocabulaire

**Demande** côté client, **confirmer** côté salle, **servi** quand l'assiette est posée. Jamais
« commander », jamais « payer en ligne ».

## Ce qui reste à faire

Voir la cartographie du parcours (`../flux-ardoise.html`), section « Ce qui manque » : correction
d'un encaissement au-delà du délai d'annulation, historique de fin de service, couverts par table.
