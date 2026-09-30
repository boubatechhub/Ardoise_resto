/** Primitives partagees par les quatre espaces. */

import type { Categorie, Plat, StatutPlat } from '../types';
import { initiales } from '../lib/format';
import { estEpuise, teinteCategorie } from '../lib/regles';

/* ---------------------------------------------------------------- visuel */

interface VisuelProps {
  plat: Pick<Plat, 'nom' | 'image' | 'categorieId'>;
  categories: Categorie[];
  taille?: 'petit' | 'grand';
}

/** Photo si elle existe, sinon monogramme sur la teinte de la categorie. */
export function Visuel({ plat, categories, taille }: VisuelProps) {
  if (plat.image) {
    return (
      <div className="visuel visuel--photo">
        <img src={plat.image} alt={plat.nom} />
      </div>
    );
  }
  const classes = ['visuel', teinteCategorie(categories, plat.categorieId)];
  if (taille) classes.push('visuel--' + taille);
  return (
    <div className={classes.join(' ')}>
      <span className="visuel__initiales" aria-hidden="true">
        {initiales(plat.nom)}
      </span>
    </div>
  );
}

/* ---------------------------------------------------------------- quantite */

interface SelecteurQuantiteProps {
  qte: number;
  nom: string;
  onMoins: () => void;
  onPlus: () => void;
}

export function SelecteurQuantite({ qte, nom, onMoins, onPlus }: SelecteurQuantiteProps) {
  return (
    <div className="quantite">
      <button type="button" className="quantite__bouton" onClick={onMoins} aria-label={'Retirer un ' + nom}>
        −
      </button>
      <span className="quantite__valeur" aria-live="polite">
        {qte}
      </span>
      <button type="button" className="quantite__bouton" onClick={onPlus} aria-label={'Ajouter un ' + nom}>
        +
      </button>
    </div>
  );
}

/* ---------------------------------------------------------------- replis */

/** Aucun cul-de-sac : chaque ecran client renvoie vers un humain. */
export function MessageRepli({ onAppeler }: { onAppeler: () => void }) {
  return (
    <p className="repli">
      Un souci avec cet écran, ou une question qui ne rentre pas dans la carte ?{' '}
      <button type="button" onClick={onAppeler}>
        Appelez-nous
      </button>
      , on prend votre commande à table, comme d'habitude.
    </p>
  );
}

/* ---------------------------------------------------------------- disponibilite */

interface InterrupteurProps {
  plat: Plat;
  onBasculer: (platId: string) => void;
  cuisine?: boolean;
}

export function InterrupteurDisponibilite({ plat, onBasculer, cuisine }: InterrupteurProps) {
  const disponible = !estEpuise(plat);
  return (
    <button
      type="button"
      className={'interrupteur' + (cuisine ? ' interrupteur--cuisine' : '')}
      aria-pressed={disponible}
      onClick={() => onBasculer(plat.id)}
    >
      <span className="piste">
        <span className="piste__pouce"></span>
      </span>
      <span className="interrupteur__nom">{plat.nom}</span>
      <span className="interrupteur__etat">
        {disponible ? 'Disponible' : cuisine ? 'Épuisé' : "Épuisé aujourd'hui"}
      </span>
    </button>
  );
}

/* ---------------------------------------------------------------- pastilles */

const CLASSE_PASTILLE: Record<StatutPlat, string> = {
  brouillon: 'pastille--brouillon',
  publie: 'pastille--publie',
  masque: 'pastille--masque',
  archive: 'pastille--archive',
};

export function PastilleStatutPlat({ plat }: { plat: Plat }) {
  if (plat.statut === 'publie' && estEpuise(plat)) {
    return <span className="pastille pastille--epuise">Épuisé aujourd'hui</span>;
  }
  const libelle =
    plat.statut === 'brouillon'
      ? 'Brouillon'
      : plat.statut === 'masque'
        ? 'Masqué'
        : plat.statut === 'archive'
          ? 'Archivé'
          : 'En ligne';
  return <span className={'pastille ' + CLASSE_PASTILLE[plat.statut]}>{libelle}</span>;
}

/* ---------------------------------------------------------------- etats d'ecran */

export function EcranChargement() {
  return (
    <div className="chargement" role="status" aria-live="polite">
      <span className="chargement__titre">Ouverture du service…</span>
      <span className="chargement__detail">La carte et les tables arrivent.</span>
    </div>
  );
}

export function EcranErreur({ message, onReessayer }: { message: string; onReessayer: () => void }) {
  return (
    <div className="chargement">
      <span className="chargement__titre">{message}</span>
      <span className="chargement__detail">
        Le carnet papier fonctionne toujours : prenez les commandes à la main, on rattrapera après.
      </span>
      <button type="button" className="bouton bouton--primaire" onClick={onReessayer}>
        Réessayer
      </button>
    </div>
  );
}
