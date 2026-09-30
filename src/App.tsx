/**
 * Coquille de l'application : la barre de demonstration et la mise en scene des espaces.
 * L'etat est unique et partage : une action de la salle est visible cote client dans la seconde.
 */

import type { Espace } from './types';
import { useArdoise } from './etat/useArdoise';
import { EcranChargement, EcranErreur } from './composants/communs';
import { EspaceClient } from './espaces/EspaceClient';
import { EspaceSalle } from './espaces/EspaceSalle';
import { EspaceCuisine } from './espaces/EspaceCuisine';
import { EspaceGestion } from './espaces/EspaceGestion';

const ESPACES: { cle: Espace; libelle: string }[] = [
  { cle: 'client', libelle: 'Client' },
  { cle: 'salle', libelle: 'Salle' },
  { cle: 'cuisine', libelle: 'Cuisine' },
  { cle: 'gestion', libelle: 'Gestion' },
  { cle: 'deux', libelle: 'Client + salle' },
  { cle: 'tout', libelle: 'Les trois' },
];

export function App() {
  const ardoise = useArdoise();
  const { etat } = ardoise;

  const montreClient = etat.espace === 'client' || etat.espace === 'deux' || etat.espace === 'tout';
  const montreSalle = etat.espace === 'salle' || etat.espace === 'deux' || etat.espace === 'tout';
  const montreCuisine = etat.espace === 'cuisine' || etat.espace === 'tout';
  const montreGestion = etat.espace === 'gestion';
  const classeScene =
    etat.espace === 'tout' ? 'scene--trois' : etat.espace === 'deux' ? 'scene--deux' : 'scene--simple';

  return (
    <>
      <div className="demo">
        <span className="demo__marque">
          Ardoise <span>· prototype</span>
        </span>
        <div className="demo__groupe" role="group" aria-label="Espace affiché">
          {ESPACES.map((e) => (
            <button
              type="button"
              className="demo__onglet"
              key={e.cle}
              aria-pressed={etat.espace === e.cle}
              onClick={() => ardoise.changerEspace(e.cle)}
            >
              {e.libelle}
            </button>
          ))}
        </div>
        <button type="button" className="demo__rejouer" onClick={ardoise.rejouer}>
          Rejouer le scénario
        </button>
      </div>

      {etat.chargement === 'en-cours' ? <EcranChargement /> : null}

      {etat.chargement === 'erreur' ? (
        <EcranErreur message={etat.erreur ?? 'Chargement impossible.'} onReessayer={() => void ardoise.charger()} />
      ) : null}

      {etat.chargement === 'pret' ? (
        <div className={'scene ' + classeScene}>
          {montreClient ? <EspaceClient ardoise={ardoise} /> : null}
          {montreSalle ? <EspaceSalle ardoise={ardoise} /> : null}
          {montreCuisine ? <EspaceCuisine ardoise={ardoise} /> : null}
          {montreGestion ? <EspaceGestion ardoise={ardoise} /> : null}
        </div>
      ) : null}
    </>
  );
}
