/**
 * Carte de depart. Jamais importee par un composant : tout passe par services/carte.ts,
 * pour que le jour ou elle vient d'une API, aucun ecran ne change.
 */

import type { Categorie, Plat } from '../types';
import { jourDeService } from '../lib/format';

export const CATEGORIES_DEPART: Categorie[] = [
  { id: 'c1', nom: 'Entrées', ordre: 1, publiee: true },
  { id: 'c2', nom: 'Plats', ordre: 2, publiee: true },
  { id: 'c3', nom: 'Desserts', ordre: 3, publiee: true },
  { id: 'c4', nom: 'Boissons', ordre: 4, publiee: true },
];

const plat = (
  id: string,
  categorieId: string,
  nom: string,
  prix: number | null,
  ordre: number,
  description: string,
  statut: Plat['statut'] = 'publie',
  epuiseLe: string | null = null,
): Plat => ({ id, categorieId, nom, prix, ordre, description, statut, epuiseLe, image: null });

export const PLATS_DEPART: Plat[] = [
  plat('e1', 'c1', 'Velouté de courge, noisettes torréfiées', 9, 1,
    "Courges rôties au four, crème d'Isigny, noisettes concassées à la minute."),
  plat('e2', 'c1', 'Œuf parfait, crème de champignons', 11, 2,
    'Œuf fermier cuit 63 minutes à 63 °C, mousseline de champignons de Paris.'),
  plat('e3', 'c1', 'Terrine de campagne, cornichons maison', 8.5, 3,
    "Terrine du chef, cochon fermier, cornichons au vinaigre d'estragon."),
  plat('e4', 'c1', 'Soupe de poisson, rouille et croûtons', 10, 4,
    'Rascasse et congre, rouille maison. Revient à la carte en novembre.', 'masque'),
  plat('p1', 'c2', "Épaule d'agneau confite, haricots blancs", 24, 1,
    'Sept heures de cuisson douce, haricots tarbais, jus corsé au romarin.'),
  plat('p2', 'c2', 'Filet de lieu jaune, beurre blanc', 22, 2,
    "Lieu de ligne débarqué du jour, beurre blanc à l'échalote grise.", 'publie', jourDeService()),
  plat('p3', 'c2', 'Risotto de courge, vieux parmesan', 18, 3,
    'Riz carnaroli, courge butternut, parmesan affiné trente mois. Végétarien.'),
  plat('p4', 'c2', 'Entrecôte, frites maison', 26, 4,
    'Race normande maturée quatre semaines, frites coupées et cuites deux fois.'),
  plat('p5', 'c2', "Blanquette de veau à l'ancienne", 21, 5,
    'Sortie de la carte au printemps.', 'archive'),
  plat('d1', 'c3', 'Tarte fine aux pommes, crème crue', 8, 1,
    'Pommes reinettes, feuilletage maison, crème crue de Normandie.'),
  plat('d2', 'c3', 'Mousse au chocolat noir', 7, 2,
    'Couverture 70 %, une pointe de fleur de sel.'),
  plat('d3', 'c3', 'Faisselle, miel de châtaignier', 6.5, 3,
    'Faisselle de la ferme voisine, miel récolté à vingt kilomètres.'),
  plat('d4', 'c3', 'Baba au rhum', null, 4, '', 'brouillon'),
  plat('b1', 'c4', 'Côtes-du-rhône, le verre', 6, 1,
    "Grenache-syrah d'un domaine de Vinsobres, servi frais."),
  plat('b2', 'c4', 'Bière artisanale, pression 25 cl', 5.5, 2,
    'Blonde de la brasserie du quartier, houblons français.'),
  plat('b3', 'c4', 'Limonade artisanale', 4, 3, 'Citrons de Menton, sucre de canne, bulles fines.'),
  plat('b4', 'c4', 'Café', 2.5, 4, 'Torréfaction artisanale, arabica du Honduras.'),
];
