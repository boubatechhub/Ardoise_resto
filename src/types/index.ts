/**
 * Modele metier. Source de verite des types : toute nouvelle propriete commence ici,
 * puis se propage aux donnees, aux regles et aux composants.
 */

/* ---------------------------------------------------------------- la carte */

export type StatutPlat = 'brouillon' | 'publie' | 'masque' | 'archive';

export interface Categorie {
  id: string;
  nom: string;
  ordre: number;
  publiee: boolean;
}

export interface Plat {
  id: string;
  categorieId: string | null;
  nom: string;
  description: string;
  /** null tant que le gerant n'a pas saisi de prix : un brouillon peut etre incomplet. */
  prix: number | null;
  /** data URI de la photo, ou null : la carte affiche alors les initiales sur la teinte. */
  image: string | null;
  /** Decide par la Gestion. Durable, survit au service. */
  statut: StatutPlat;
  /** Decide par la salle ou la cuisine. Ephemere : compare au jour du service. */
  epuiseLe: string | null;
  ordre: number;
}

/* ---------------------------------------------------------------- le service */

/**
 * attente  : demande envoyee par le client, rien n'est engage ni facture
 * cuisine  : confirmee par la salle, en preparation, entre dans l'addition
 * pret     : la cuisine a fini, la salle doit porter
 * servie   : posee sur la table — c'est cela, "terminee"
 */
export type StatutCommande = 'attente' | 'cuisine' | 'pret' | 'servie' | 'refusee' | 'annulee';

export type OrigineCommande = 'client' | 'salle';

export interface LigneCommande {
  /** id du plat au moment de l'envoi */
  id: string;
  /** nom et prix figes a l'envoi : une modification de la carte ne rejuge jamais le passe */
  nom: string;
  prix: number | null;
  qte: number;
  /** le plat est passe indisponible depuis l'envoi */
  indispo: boolean;
}

export interface Ajustements {
  retraits: { nom: string; qte: number }[];
  ajouts: { nom: string; qte: number }[];
}

export interface Commande {
  id: string;
  table: number;
  statut: StatutCommande;
  origine: OrigineCommande;
  lignes: LigneCommande[];
  envoyeeA: number;
  confirmeeA: number | null;
  servieA: number | null;
  modifieeA: number | null;
  ajustements: Ajustements | null;
  /** cle d'un MOTIFS_REFUS */
  motif: string | null;
  motifAnnulation: string | null;
  /** la table a ete liberee : la commande quitte tous les ecrans */
  close: boolean;
}

export type StatutAddition = 'ouverte' | 'demandee' | 'reglee' | 'non-reglee';
export type MoyenPaiement = 'carte' | 'especes' | 'titres' | 'autre';

export interface Reglement {
  moyen: MoyenPaiement;
  montant: number;
  a: number;
}

export interface Addition {
  id: string;
  table: number;
  ouverteA: number;
  statut: StatutAddition;
  reglement: Reglement | null;
  /** addition close = table liberee */
  close: boolean;
  fermeeA: number | null;
}

export interface AppelSalle {
  id: string;
  table: number | null;
  sujet: string;
  vu: boolean;
  a: number;
}

/* ---------------------------------------------------------------- vues derivees */

export type EtatTable = 'libre' | 'occupee' | 'action' | 'encaisser' | 'reglee';

export interface AlertesTable {
  valider: number;
  prets: number;
  appels: number;
  encaisser: boolean;
}

/* ---------------------------------------------------------------- etat applicatif */

export type Espace = 'client' | 'salle' | 'cuisine' | 'gestion' | 'deux' | 'tout';
export type EcranClient = 'table' | 'carte' | 'plat' | 'panier' | 'statut' | 'addition';
export type OngletSalle = 'plan' | 'file' | 'dispo';
export type EcranCuisine = 'file' | 'epuises';
export type OngletGestion = 'carte' | 'categories' | 'apercu' | 'archives';

/** panier local d'une table : { idPlat: quantite } */
export type Panier = Record<string, number>;

export interface Annulation {
  texte: string;
  /** rejoue l'etat precedent */
  action: () => void;
}
