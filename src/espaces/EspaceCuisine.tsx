/**
 * Espace cuisine : ecran pose ou accroche, lisible a deux metres, mains occupees.
 * Ce n'est pas un tableau de bord : aucune statistique, aucun chronometre.
 */

import { Fragment } from 'react';
import type { Commande } from '../types';
import type { Ardoise } from '../etat/useArdoise';
import { anciennete, pluriel } from '../lib/format';
import { estEpuise, parOrdre, visibleClient } from '../lib/regles';
import { InterrupteurDisponibilite } from '../composants/communs';

function CartePreparation({
  commande,
  maintenant,
  ajout,
  onPret,
}: {
  commande: Commande;
  maintenant: number;
  ajout: boolean;
  onPret: (id: string) => void;
}) {
  const pret = commande.statut === 'pret';
  return (
    <article className={'prep-carte' + (pret ? ' prep-carte--pret' : '')}>
      <div className="prep-carte__haut">
        <span className="prep-carte__table">Table {commande.table}</span>
        {ajout ? <span className="prep-carte__etiquette">Ajout</span> : null}
        <span className="prep-carte__age">{anciennete(commande.confirmeeA, maintenant)}</span>
      </div>
      <ul className="prep-carte__lignes">
        {commande.lignes.map((l) => (
          <li className="prep-carte__ligne" key={l.id}>
            <b>{l.qte}</b> {l.nom}
          </li>
        ))}
      </ul>
      {!pret ? (
        <button
          type="button"
          className="bouton bouton--primaire bouton--cuisine bouton--large"
          onClick={() => onPret(commande.id)}
        >
          Prêt
        </button>
      ) : null}
    </article>
  );
}

export function EspaceCuisine({ ardoise }: { ardoise: Ardoise }) {
  const { etat, cuisine, salle, maintenant } = ardoise;

  const vivantes = etat.commandes.filter((c) => !c.close);
  const aPreparer = vivantes
    .filter((c) => c.statut === 'cuisine')
    .slice()
    .sort((a, b) => (a.confirmeeA ?? 0) - (b.confirmeeA ?? 0));
  const prets = vivantes
    .filter((c) => c.statut === 'pret')
    .slice()
    .sort((a, b) => (a.confirmeeA ?? 0) - (b.confirmeeA ?? 0));

  const alaCarte = etat.plats.filter((p) => visibleClient(p, etat.categories));
  const nbEpuises = alaCarte.filter(estEpuise).length;

  /** Un ajout : la table avait deja une commande confirmee plus ancienne. */
  const estUnAjout = (c: Commande) =>
    vivantes.some((autre) => autre.table === c.table && autre.confirmeeA && c.confirmeeA && autre.confirmeeA < c.confirmeeA);

  if (etat.ecranCuisine === 'epuises') {
    return (
      <div className="colonne-cuisine">
        <div className="cuisine__corps">
          <div className="epuises">
            <div className="epuises__entete">
              <button
                type="button"
                className="retour"
                onClick={() => cuisine.ecran('file')}
                aria-label="Revenir à la file de préparation"
              >
                ←
              </button>
              <h1 className="epuises__titre">Plats épuisés</h1>
              <span className="epuises__compteur">{pluriel(nbEpuises, 'retiré', 'retirés')}</span>
            </div>
            {etat.categories
              .filter((c) => c.publiee)
              .slice()
              .sort(parOrdre)
              .flatMap((cat) =>
                alaCarte
                  .filter((p) => p.categorieId === cat.id)
                  .slice()
                  .sort(parOrdre)
                  .map((p) => (
                    <InterrupteurDisponibilite
                      key={p.id}
                      plat={p}
                      cuisine
                      onBasculer={(id) => salle.basculerEpuise(id, 'cuisine')}
                    />
                  )),
              )}
            <p className="epuises__mention">
              Effet immédiat : le plat disparaît de la carte des tables et la salle est prévenue.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="colonne-cuisine">
      <header className="cuisine__entete">
        <h1 className="cuisine__titre">
          Cuisine <span>· {pluriel(aPreparer.length, 'commande en cours', 'commandes en cours')}</span>
        </h1>
        <button type="button" className="cuisine__bouton" onClick={() => cuisine.ecran('epuises')}>
          Plats épuisés
        </button>
      </header>
      <div className="cuisine__corps">
        <div className="prep">
          <section>
            <h2 className="prep__titre">À préparer</h2>
            <div className="prep__cartes">
              {aPreparer.map((c) => (
                <CartePreparation
                  key={c.id}
                  commande={c}
                  maintenant={maintenant}
                  ajout={estUnAjout(c)}
                  onPret={cuisine.marquerPret}
                />
              ))}
              {aPreparer.length === 0 ? <div className="vide vide--cuisine">Rien à préparer.</div> : null}
            </div>
          </section>
          <section>
            <h2 className="prep__titre">Prêt — à servir</h2>
            <div className="prep__cartes">
              {prets.map((c) => (
                <Fragment key={c.id}>
                  <CartePreparation commande={c} maintenant={maintenant} ajout={false} onPret={cuisine.marquerPret} />
                </Fragment>
              ))}
              {prets.length === 0 ? <div className="vide vide--cuisine">Rien de prêt pour l'instant.</div> : null}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
