/**
 * Scenario de pic de service : un vendredi 12 h 47, sept tables occupees.
 * Sert a ouvrir l'application sur un service vivant plutot que sur des ecrans vides.
 */

import type { Addition, AppelSalle, Commande, LigneCommande, StatutCommande } from '../types';
import { PLATS_DEPART } from './carte';
import { prochainId } from './constantes';

export interface EtatService {
  commandes: Commande[];
  additions: Addition[];
  appels: AppelSalle[];
}

export function scenarioDeService(): EtatService {
  const t = Date.now();
  const min = (n: number) => t - n * 60000;

  const ligne = (idPlat: string, qte: number): LigneCommande => {
    const p = PLATS_DEPART.find((x) => x.id === idPlat)!;
    return { id: p.id, nom: p.nom, prix: p.prix, qte, indispo: false };
  };

  const commande = (
    table: number,
    statut: StatutCommande,
    envoyeeA: number,
    confirmeeA: number | null,
    lignes: LigneCommande[],
    extra: Partial<Commande> = {},
  ): Commande => ({
    id: prochainId('cmd'),
    table,
    statut,
    origine: 'client',
    lignes,
    envoyeeA,
    confirmeeA,
    servieA: null,
    modifieeA: null,
    ajustements: null,
    motif: null,
    motifAnnulation: null,
    close: false,
    ...extra,
  });

  const addition = (table: number, ouverteA: number, statut: Addition['statut'] = 'ouverte'): Addition => ({
    id: prochainId('add'),
    table,
    ouverteA,
    statut,
    reglement: null,
    close: false,
    fermeeA: null,
  });

  return {
    commandes: [
      commande(6, 'servie', min(46), min(44), [ligne('p1', 1), ligne('p4', 1)], { servieA: min(38) }),
      commande(8, 'servie', min(38), min(36), [ligne('e3', 1), ligne('b1', 1)], { servieA: min(30) }),
      commande(6, 'pret', min(24), min(22), [ligne('d2', 1), ligne('d3', 1)]),
      commande(5, 'cuisine', min(7), min(6), [ligne('e2', 1), ligne('p3', 2), ligne('d1', 1)]),
      commande(3, 'cuisine', min(4), min(3.5), [ligne('e1', 1), ligne('p1', 2)], { origine: 'salle' }),
      commande(6, 'cuisine', t - 80000, t - 60000, [ligne('b4', 2)]),
      commande(2, 'attente', t - 48000, null, [ligne('e1', 2), ligne('p1', 1), ligne('p3', 1)]),
      commande(7, 'attente', t - 132000, null, [ligne('e3', 1), ligne('p4', 2), ligne('b1', 2)]),
    ],
    additions: [
      addition(2, min(12)),
      addition(3, min(9)),
      addition(5, min(14)),
      addition(6, min(52)),
      addition(7, min(6)),
      addition(8, min(44), 'demandee'),
      addition(9, min(3)),
    ],
    appels: [
      { id: prochainId('app'), table: 9, sujet: 'Question allergène', vu: false, a: t - 22000 },
    ],
  };
}
