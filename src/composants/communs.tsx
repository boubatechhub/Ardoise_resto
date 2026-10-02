import type { Categorie, Plat, StatutPlat } from "../types";
import { initiales } from "../lib/format";
import { estEpuise, teinteCategorie } from "../lib/regles";

/* ---------------------------------------------------------------- visuel */

interface VisuelProps {
  plat: Pick<Plat, "nom" | "image" | "categorieId">;
  categories: Categorie[];
  taille?: "petit" | "grand";
}

/**
 * Visuel du plat :
 * - image si disponible
 * - monogramme sinon
 */
export function Visuel({ plat, categories, taille = "grand" }: VisuelProps) {
  const classeTaille = `visuel--${taille}`;

  if (plat.image) {
    return (
      <div className={`visuel visuel--photo ${classeTaille}`}>
        <img src={plat.image} alt="" loading="lazy" className="visuel__image" />

        <div className="visuel__overlay" aria-hidden="true" />
      </div>
    );
  }

  const teinte = teinteCategorie(categories, plat.categorieId);

  return (
    <div
      className={`visuel ${teinte} ${classeTaille}`}
      aria-label={`Plat : ${plat.nom}`}
    >
      <span className="visuel__initiales" aria-hidden="true">
        {initiales(plat.nom)}
      </span>
    </div>
  );
}

/* ---------------------------------------------------------------- quantité */

interface SelecteurQuantiteProps {
  qte: number;
  nom: string;
  onMoins: () => void;
  onPlus: () => void;
  min?: number;
  max?: number;
}

export function SelecteurQuantite({
  qte,
  nom,
  onMoins,
  onPlus,
  min = 0,
  max,
}: SelecteurQuantiteProps) {
  const peutRetirer = qte > min;
  const peutAjouter = max === undefined || qte < max;

  return (
    <div className="quantite" role="group" aria-label={`Quantité de ${nom}`}>
      <button
        type="button"
        className="quantite__bouton"
        onClick={onMoins}
        disabled={!peutRetirer}
        aria-label={`Retirer un ${nom}`}
      >
        <span aria-hidden="true">−</span>
      </button>

      <span className="quantite__valeur" aria-live="polite" aria-atomic="true">
        {qte}
      </span>

      <button
        type="button"
        className="quantite__bouton quantite__bouton--plus"
        onClick={onPlus}
        disabled={!peutAjouter}
        aria-label={`Ajouter un ${nom}`}
      >
        <span aria-hidden="true">+</span>
      </button>
    </div>
  );
}

/* ---------------------------------------------------------------- repli */

/**
 * Aucun cul-de-sac :
 * chaque écran client doit permettre de revenir vers un humain.
 */
export function MessageRepli({ onAppeler }: { onAppeler: () => void }) {
  return (
    <aside className="repli" aria-label="Besoin d'aide">
      <div className="repli__icone" aria-hidden="true">
        ?
      </div>

      <div className="repli__contenu">
        <strong className="repli__titre">Besoin d'aide ?</strong>

        <p className="repli__texte">
          Une question ou un problème avec la carte ?
        </p>
      </div>

      <button type="button" className="repli__action" onClick={onAppeler}>
        Appelez-nous
        <span aria-hidden="true">→</span>
      </button>
    </aside>
  );
}

/* ---------------------------------------------------------------- disponibilité */

interface InterrupteurProps {
  plat: Plat;
  onBasculer: (platId: string) => void;
  cuisine?: boolean;
}

export function InterrupteurDisponibilite({
  plat,
  onBasculer,
  cuisine = false,
}: InterrupteurProps) {
  const disponible = !estEpuise(plat);

  const etat = disponible
    ? "Disponible"
    : cuisine
      ? "Épuisé"
      : "Épuisé aujourd'hui";

  return (
    <button
      type="button"
      className={[
        "interrupteur",
        disponible && "interrupteur--actif",
        !disponible && "interrupteur--inactif",
        cuisine && "interrupteur--cuisine",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-pressed={disponible}
      aria-label={`${plat.nom} : ${etat}. Cliquer pour modifier.`}
      onClick={() => onBasculer(plat.id)}
    >
      <span className="piste" aria-hidden="true">
        <span className="piste__pouce" />
      </span>

      <span className="interrupteur__infos">
        <span className="interrupteur__nom">{plat.nom}</span>

        <span className="interrupteur__etat">
          <span className="interrupteur__point" />
          {etat}
        </span>
      </span>
    </button>
  );
}

/* ---------------------------------------------------------------- pastilles */

const CLASSE_PASTILLE: Record<StatutPlat, string> = {
  brouillon: "pastille--brouillon",
  publie: "pastille--publie",
  masque: "pastille--masque",
  archive: "pastille--archive",
};

const LIBELLE_STATUT: Record<StatutPlat, string> = {
  brouillon: "Brouillon",
  publie: "En ligne",
  masque: "Masqué",
  archive: "Archivé",
};

export function PastilleStatutPlat({ plat }: { plat: Plat }) {
  if (plat.statut === "publie" && estEpuise(plat)) {
    return (
      <span className="pastille pastille--epuise">
        <span className="pastille__point" aria-hidden="true" />
        Épuisé aujourd'hui
      </span>
    );
  }

  return (
    <span className={`pastille ${CLASSE_PASTILLE[plat.statut]}`}>
      <span className="pastille__point" aria-hidden="true" />
      {LIBELLE_STATUT[plat.statut]}
    </span>
  );
}

/* ---------------------------------------------------------------- états d'écran */

export function EcranChargement() {
  return (
    <div
      className="etat-ecran etat-ecran--chargement"
      role="status"
      aria-live="polite"
    >
      <div className="etat-ecran__icone" aria-hidden="true">
        <span className="spinner" />
      </div>

      <div className="etat-ecran__contenu">
        <h2 className="etat-ecran__titre">Ouverture du service</h2>

        <p className="etat-ecran__detail">La carte et les tables arrivent…</p>
      </div>
    </div>
  );
}

interface EcranErreurProps {
  message: string;
  onReessayer: () => void;
}

export function EcranErreur({ message, onReessayer }: EcranErreurProps) {
  return (
    <div className="etat-ecran etat-ecran--erreur" role="alert">
      <div
        className="etat-ecran__icone etat-ecran__icone--erreur"
        aria-hidden="true"
      >
        !
      </div>

      <div className="etat-ecran__contenu">
        <h2 className="etat-ecran__titre">Impossible de charger la carte</h2>

        <p className="etat-ecran__detail">{message}</p>

        <p className="etat-ecran__secours">
          Le carnet papier fonctionne toujours. Vous pouvez prendre les
          commandes à la main et nous rattraperons les données ensuite.
        </p>

        <button
          type="button"
          className="bouton bouton--primaire"
          onClick={onReessayer}
        >
          Réessayer
        </button>
      </div>
    </div>
  );
}
