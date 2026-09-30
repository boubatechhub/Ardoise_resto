/** Formatage pur : pas de DOM, pas d'etat. */

export function prixFr(montant: number | null | undefined): string {
  if (montant === null || montant === undefined) return '—';
  return montant.toFixed(2).replace('.', ',') + ' €';
}

export function anciennete(depuis: number | null, maintenant: number): string {
  if (!depuis) return '—';
  const secondes = Math.max(0, Math.round((maintenant - depuis) / 1000));
  if (secondes < 60) return 'il y a ' + secondes + ' s';
  return 'il y a ' + Math.floor(secondes / 60) + ' min';
}

export function pluriel(nombre: number, singulier: string, pluriels: string): string {
  return nombre + ' ' + (nombre > 1 ? pluriels : singulier);
}

/** Initiales affichees a la place d'une photo absente. */
export function initiales(nom: string): string {
  const mots = (nom || '').replace(/[,'’·]/g, ' ').split(/\s+/).filter((m) => m.length > 2);
  const source = mots.length > 0 ? mots : (nom || '?').split(/\s+/);
  return source
    .slice(0, 2)
    .map((m) => m.charAt(0))
    .join('')
    .toUpperCase();
}

/** Jour de service courant, au format ISO court. Sert a dater les plats epuises. */
export const jourDeService = (): string => new Date().toISOString().slice(0, 10);
