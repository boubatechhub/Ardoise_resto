/**
 * Frontiere avec la provenance des donnees. Asynchrone et faillible des aujourd'hui,
 * alors qu'elle ne lit qu'un tableau en memoire : le jour ou ces fonctions feront un fetch,
 * aucun composant ne change et les etats chargement / erreur sont deja cables.
 */

import type { Categorie, Plat } from '../types';
import { CATEGORIES_DEPART, PLATS_DEPART } from '../donnees/carte';
import { scenarioDeService, type EtatService } from '../donnees/scenario';

/** Latence simulee : garde les etats de chargement honnetes pendant le developpement. */
const LATENCE_MS = 420;

/** Bascule a true pour eprouver l'ecran d'erreur. */
const SIMULER_UNE_PANNE = false;

const attendre = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface Carte {
  categories: Categorie[];
  plats: Plat[];
}

export async function chargerCarte(): Promise<Carte> {
  await attendre(LATENCE_MS);
  if (SIMULER_UNE_PANNE) throw new Error('La carte est injoignable.');
  return {
    categories: CATEGORIES_DEPART.map((c) => ({ ...c })),
    plats: PLATS_DEPART.map((p) => ({ ...p })),
  };
}

export async function chargerService(): Promise<EtatService> {
  await attendre(LATENCE_MS);
  if (SIMULER_UNE_PANNE) throw new Error('Le service est injoignable.');
  return scenarioDeService();
}
