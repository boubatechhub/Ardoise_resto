import type { MoyenPaiement } from '../types';

export const NOM_RESTAURANT = 'Le Comptoir des Halles';
export const TABLE_DEFAUT = 4;
export const NOMBRE_TABLES = 12;

/** Taille maximale d'une photo de plat lue depuis le disque. */
export const TAILLE_PHOTO_MAX = 1.5 * 1024 * 1024;

/** Delai d'annulation d'une action destructrice, en millisecondes. */
export const DELAI_ANNULATION = 8000;

/** Motifs fermes : jamais de champ libre, sinon la file devient une messagerie. */
export const MOTIFS_REFUS = [
  {
    cle: 'indispo',
    salle: 'Plat indisponible',
    client: "Un plat de votre demande n'est plus disponible ce midi.",
  },
  {
    cle: 'table',
    salle: 'Je passe voir la table',
    client: "L'équipe préfère en parler avec vous : quelqu'un arrive à votre table.",
  },
  {
    cle: 'vive-voix',
    salle: 'Autre, je gère de vive voix',
    client: "L'équipe reprend votre commande de vive voix, à table.",
  },
];

export const MOTIFS_ANNULATION = [
  'Plat raté ou renversé',
  "Le client s'est ravisé",
  'Erreur de saisie',
];

export const SUJETS_APPEL = ["J'ai une question", 'Je veux un conseil', 'Question allergène'];

export const MOYENS_PAIEMENT: { cle: MoyenPaiement; libelle: string }[] = [
  { cle: 'carte', libelle: 'Carte' },
  { cle: 'especes', libelle: 'Espèces' },
  { cle: 'titres', libelle: 'Titres resto' },
  { cle: 'autre', libelle: 'Autre' },
];

export const libelleMoyen = (moyen: MoyenPaiement): string =>
  MOYENS_PAIEMENT.find((m) => m.cle === moyen)?.libelle ?? moyen;

/** Generateur d'identifiants. Un id n'est jamais reutilise. */
let sequence = 100;
export const prochainId = (prefixe: string): string => prefixe + ++sequence;
