/**
 * Regles metier pures. C'est ici que vivent les deux principes du produit :
 * la Gestion decide ce qui existe, le service decide ce qui est encore la aujourd'hui ;
 * une commande n'est facturee que si elle est confirmee et non annulee.
 */

import type {
  Addition,
  AlertesTable,
  AppelSalle,
  Categorie,
  Commande,
  EtatTable,
  LigneCommande,
  Plat,
  StatutCommande,
} from '../types';
import { jourDeService } from './format';

export const EN_CUISINE: StatutCommande[] = ['cuisine', 'pret'];
export const FACTURABLE: StatutCommande[] = ['cuisine', 'pret', 'servie'];

export const parOrdre = <T extends { ordre: number }>(a: T, b: T): number => a.ordre - b.ordre;

/* ---------------------------------------------------------------- la carte */

export const estEpuise = (plat: Plat): boolean => plat.epuiseLe === jourDeService();

export const categorieDe = (categories: Categorie[], plat: Plat): Categorie | null =>
  categories.find((c) => c.id === plat.categorieId) ?? null;

/** Le plat apparait sur la carte des tables. */
export function visibleClient(plat: Plat, categories: Categorie[]): boolean {
  const cat = categorieDe(categories, plat);
  return plat.statut === 'publie' && cat !== null && cat.publiee;
}

/** Le plat peut etre ajoute a une demande. */
export function commandable(plat: Plat, categories: Categorie[]): boolean {
  return visibleClient(plat, categories) && !estEpuise(plat);
}

/** Classe de teinte du visuel de remplacement, derivee du rang de la categorie. */
export function teinteCategorie(categories: Categorie[], categorieId: string | null): string {
  const index = categories.findIndex((c) => c.id === categorieId);
  return 'visuel--c' + ((index < 0 ? 0 : index % 4) + 1);
}

/* ---------------------------------------------------------------- le service */

export const totalLignes = (lignes: LigneCommande[]): number =>
  lignes.reduce((somme, l) => somme + (l.prix ?? 0) * l.qte, 0);

export const estActive = (c: Commande): boolean =>
  c.statut === 'attente' || EN_CUISINE.includes(c.statut);

export const commandesDe = (commandes: Commande[], table: number): Commande[] =>
  commandes.filter((c) => c.table === table && !c.close);

/** Ce que la table doit : tout ce qui est confirme et non annule, cuisine comprise. */
export function montantAddition(commandes: Commande[], table: number): number {
  return commandesDe(commandes, table)
    .filter((c) => FACTURABLE.includes(c.statut))
    .reduce((somme, c) => somme + totalLignes(c.lignes), 0);
}

/** Ce qui est demande mais pas encore valide : affiche a part, jamais facture. */
export function montantNonConfirme(commandes: Commande[], table: number): number {
  return commandesDe(commandes, table)
    .filter((c) => c.statut === 'attente')
    .reduce((somme, c) => somme + totalLignes(c.lignes), 0);
}

export const additionDe = (additions: Addition[], table: number): Addition | null =>
  additions.find((a) => a.table === table && !a.close) ?? null;

export function alertesTable(
  commandes: Commande[],
  appels: AppelSalle[],
  addition: Addition | null,
): AlertesTable {
  if (!addition) return { valider: 0, prets: 0, appels: 0, encaisser: false };
  const cmds = commandesDe(commandes, addition.table);
  return {
    valider: cmds.filter((c) => c.statut === 'attente').length,
    prets: cmds.filter((c) => c.statut === 'pret').length,
    appels: appels.filter((a) => a.table === addition.table && !a.vu).length,
    encaisser: addition.statut === 'demandee',
  };
}

export function etatTable(addition: Addition | null, alertes: AlertesTable): EtatTable {
  if (!addition) return 'libre';
  if (addition.statut === 'reglee') return 'reglee';
  if (alertes.encaisser) return 'encaisser';
  if (alertes.valider > 0 || alertes.prets > 0 || alertes.appels > 0) return 'action';
  return 'occupee';
}

/** Fusionne des articles dans une demande deja envoyee : les quantites s'additionnent. */
export function fusionnerLignes(
  existantes: LigneCommande[],
  ajouts: LigneCommande[],
): LigneCommande[] {
  const fusion = existantes.map((l) => ({ ...l }));
  ajouts.forEach((ajout) => {
    const dejaLa = fusion.find((l) => l.id === ajout.id);
    if (dejaLa) dejaLa.qte += ajout.qte;
    else fusion.push({ ...ajout });
  });
  return fusion;
}

/** Compare deux etats d'une demande pour dire au client ce que la salle a change. */
export function calculerAjustements(avant: LigneCommande[], apres: LigneCommande[]) {
  const retraits: { nom: string; qte: number }[] = [];
  const ajouts: { nom: string; qte: number }[] = [];
  avant.forEach((l) => {
    const ligneApres = apres.find((x) => x.id === l.id);
    const perdu = l.qte - (ligneApres ? ligneApres.qte : 0);
    if (perdu > 0) retraits.push({ nom: l.nom, qte: perdu });
  });
  apres.forEach((l) => {
    const ligneAvant = avant.find((x) => x.id === l.id);
    const gagne = l.qte - (ligneAvant ? ligneAvant.qte : 0);
    if (gagne > 0) ajouts.push({ nom: l.nom, qte: gagne });
  });
  return { retraits, ajouts };
}

/* ---------------------------------------------------------------- libelles */

export const LIBELLE_ETAT_TABLE: Record<EtatTable, string> = {
  libre: 'Libre',
  occupee: 'Occupée',
  action: 'Action requise',
  encaisser: 'À encaisser',
  reglee: 'Réglée · à libérer',
};

export const LIBELLE_STATUT_COMMANDE: Record<StatutCommande, string> = {
  attente: 'À valider',
  cuisine: 'En préparation',
  pret: 'Prête',
  servie: 'Servie',
  refusee: 'Refusée',
  annulee: 'Annulée',
};

export const PALIERS_CLIENT = ['Demande envoyée', 'Confirmée', 'Prête', 'Servie'];

export const RANG_PALIER: Partial<Record<StatutCommande, number>> = {
  attente: 0,
  cuisine: 1,
  pret: 2,
  servie: 3,
};
