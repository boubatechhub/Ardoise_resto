/** Espace salle : l'ecran de service. La table y est l'unite de travail, pas la commande. */

import { Fragment, useState } from 'react';
import type {
  Addition,
  AppelSalle,
  Categorie,
  Commande,
  LigneCommande,
  MoyenPaiement,
  Plat,
} from '../types';
import type { Ardoise } from '../etat/useArdoise';
import { anciennete, prixFr, pluriel } from '../lib/format';
import {
  additionDe,
  alertesTable,
  commandable,
  commandesDe,
  EN_CUISINE,
  estActive,
  etatTable,
  LIBELLE_ETAT_TABLE,
  LIBELLE_STATUT_COMMANDE,
  montantAddition,
  montantNonConfirme,
  parOrdre,
  totalLignes,
  visibleClient,
} from '../lib/regles';
import {
  libelleMoyen,
  MOTIFS_ANNULATION,
  MOTIFS_REFUS,
  MOYENS_PAIEMENT,
  NOMBRE_TABLES,
} from '../donnees/constantes';
import { InterrupteurDisponibilite, SelecteurQuantite } from '../composants/communs';

/* ---------------------------------------------------------------- plan de salle */

interface CarteTableProps {
  numero: number;
  addition: Addition | null;
  commandes: Commande[];
  appels: AppelSalle[];
  maintenant: number;
  onOuvrir: (numero: number) => void;
}

function CarteTable({ numero, addition, commandes, appels, maintenant, onOuvrir }: CarteTableProps) {
  const alertes = alertesTable(commandes, appels, addition);
  const etat = etatTable(addition, alertes);
  const montant = addition ? montantAddition(commandes, numero) : 0;
  const servies = addition ? commandesDe(commandes, numero).filter((c) => c.statut === 'servie').length : 0;

  const classePastille =
    etat === 'encaisser'
      ? 'pastille--du'
      : etat === 'reglee'
        ? 'pastille--regle'
        : etat === 'action'
          ? 'pastille--epuise'
          : etat === 'libre'
            ? 'pastille--archive'
            : 'pastille--masque';

  return (
    <button type="button" className={'table-carte table-carte--' + etat} onClick={() => onOuvrir(numero)}>
      <div className="table-carte__haut">
        <span className="table-carte__num">Table {numero}</span>
        <span className="table-carte__pastille">
          <span className={'pastille ' + classePastille}>{LIBELLE_ETAT_TABLE[etat]}</span>
        </span>
      </div>
      {addition ? (
        <Fragment>
          <span className="table-carte__meta">
            occupée depuis {anciennete(addition.ouverteA, maintenant).replace('il y a ', '')}
          </span>
          <span className="table-carte__montant">
            {prixFr(montant)}
            <span>{servies > 0 ? pluriel(servies, 'commande servie', 'commandes servies') : 'rien de servi'}</span>
          </span>
          <span className="table-carte__badges">
            {alertes.valider > 0 ? (
              <span className="badge badge--valider">
                {pluriel(alertes.valider, 'demande à valider', 'demandes à valider')}
              </span>
            ) : null}
            {alertes.prets > 0 ? (
              <span className="badge badge--pret">
                {pluriel(alertes.prets, 'commande prête', 'commandes prêtes')}
              </span>
            ) : null}
            {alertes.appels > 0 ? <span className="badge badge--appel">Appel salle</span> : null}
            {alertes.encaisser ? <span className="badge badge--addition">Addition demandée</span> : null}
          </span>
        </Fragment>
      ) : (
        <span className="table-carte__meta">Personne. À ouvrir quand des clients s'installent.</span>
      )}
    </button>
  );
}

/** Les tables qui reclament quelque chose remontent en tete. */
function PlanDeSalle({
  commandes,
  additions,
  appels,
  maintenant,
  onOuvrirTable,
}: {
  commandes: Commande[];
  additions: Addition[];
  appels: AppelSalle[];
  maintenant: number;
  onOuvrirTable: (numero: number) => void;
}) {
  const rang = (numero: number) => {
    const addition = additionDe(additions, numero);
    const etat = etatTable(addition, alertesTable(commandes, appels, addition));
    return { encaisser: 0, action: 1, reglee: 2, occupee: 3, libre: 4 }[etat];
  };
  const numeros = Array.from({ length: NOMBRE_TABLES }, (_, i) => i + 1).sort(
    (a, b) => rang(a) - rang(b) || a - b,
  );

  return (
    <div className="plan">
      {numeros.map((numero) => (
        <CarteTable
          key={numero}
          numero={numero}
          addition={additionDe(additions, numero)}
          commandes={commandes}
          appels={appels}
          maintenant={maintenant}
          onOuvrir={onOuvrirTable}
        />
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------- saisie orale */

/** Le parcours papier reste entier : sans cette saisie, l'addition d'une table orale est fausse. */
function SaisieSalle({
  categories,
  plats,
  onEnvoyer,
  onFermer,
}: {
  categories: Categorie[];
  plats: Plat[];
  onEnvoyer: (lignes: LigneCommande[]) => void;
  onFermer: () => void;
}) {
  const [choix, setChoix] = useState<Record<string, number>>({});

  const disponibles = plats.filter((p) => commandable(p, categories));
  const lignes: LigneCommande[] = Object.keys(choix)
    .filter((id) => choix[id] > 0)
    .map((id) => {
      const plat = plats.find((p) => p.id === id)!;
      return { id, nom: plat.nom, prix: plat.prix, qte: choix[id], indispo: false };
    });

  const bouger = (id: string, delta: number) =>
    setChoix((c) => {
      const suivant = { ...c };
      suivant[id] = (suivant[id] ?? 0) + delta;
      if (suivant[id] <= 0) delete suivant[id];
      return suivant;
    });

  return (
    <div className="champ">
      <div className="bloc-titre">Commande prise de vive voix</div>
      <div className="saisie__liste">
        {categories
          .filter((c) => c.publiee)
          .slice()
          .sort(parOrdre)
          .flatMap((cat) =>
            disponibles
              .filter((p) => p.categorieId === cat.id)
              .slice()
              .sort(parOrdre)
              .map((p) => (
                <div className="saisie__ligne" key={p.id}>
                  <span className="saisie__nom">{p.nom}</span>
                  <span className="saisie__prix">{prixFr(p.prix)}</span>
                  <SelecteurQuantite
                    qte={choix[p.id] ?? 0}
                    nom={p.nom}
                    onMoins={() => bouger(p.id, -1)}
                    onPlus={() => bouger(p.id, 1)}
                  />
                </div>
              )),
          )}
      </div>
      <div className="detail__actions">
        <button type="button" className="bouton bouton--secondaire bouton--admin" onClick={onFermer}>
          Annuler
        </button>
        <button
          type="button"
          className="bouton bouton--primaire bouton--admin"
          disabled={lignes.length === 0}
          onClick={() => onEnvoyer(lignes)}
        >
          Envoyer en cuisine · {prixFr(totalLignes(lignes))}
        </button>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- fiche table */

function FicheTable({ ardoise, numero }: { ardoise: Ardoise; numero: number }) {
  const { etat, salle, maintenant } = ardoise;
  const [saisieOuverte, setSaisieOuverte] = useState(false);
  const [annulationId, setAnnulationId] = useState<string | null>(null);
  const [moyen, setMoyen] = useState<MoyenPaiement>('carte');

  const addition = additionDe(etat.additions, numero);
  const cmds = commandesDe(etat.commandes, numero);
  const actives = cmds.filter(estActive);
  const servies = cmds.filter((c) => c.statut === 'servie');
  const mortes = cmds.filter((c) => c.statut === 'refusee' || c.statut === 'annulee');
  const appelsTable = etat.appels.filter((a) => a.table === numero && !a.vu);
  const aValider = actives.filter((c) => c.statut === 'attente').length;
  const enCuisine = actives.filter((c) => EN_CUISINE.includes(c.statut)).length;
  const montant = montantAddition(etat.commandes, numero);
  const nonConfirme = montantNonConfirme(etat.commandes, numero);
  const etatDeLaTable = etatTable(addition, alertesTable(etat.commandes, etat.appels, addition));

  const classePastilleCommande = (statut: Commande['statut']) =>
    statut === 'attente'
      ? 'pastille--brouillon'
      : statut === 'cuisine'
        ? 'pastille--prepa'
        : statut === 'pret'
          ? 'pastille--prete'
          : statut === 'servie'
            ? 'pastille--servie'
            : 'pastille--archive';

  function carteCommande(c: Commande) {
    const morte = c.statut === 'refusee' || c.statut === 'annulee';
    return (
      <article className={'cmd cmd--' + c.statut + (morte ? ' cmd--morte' : '')} key={c.id}>
        <div className="cmd__haut">
          <span className={'pastille ' + classePastilleCommande(c.statut)}>
            {LIBELLE_STATUT_COMMANDE[c.statut]}
          </span>
          {c.origine === 'salle' ? <span className="cmd__origine">prise en salle</span> : null}
          <span className="cmd__age">{anciennete(c.envoyeeA, maintenant)}</span>
        </div>
        <ul className="cmd__lignes">
          {c.lignes.map((l) => (
            <li key={l.id} className={l.indispo ? 'demande__ligne--indispo' : ''}>
              <b>{l.qte} ×</b> {l.nom}
            </li>
          ))}
        </ul>
        {annulationId === c.id ? (
          <div className="motifs">
            <span className="motifs__titre">Pourquoi annuler ?</span>
            {MOTIFS_ANNULATION.map((m) => (
              <button
                type="button"
                className="bouton bouton--secondaire bouton--petit"
                key={m}
                onClick={() => {
                  salle.annuler(c.id, m);
                  setAnnulationId(null);
                }}
              >
                {m}
              </button>
            ))}
            <button type="button" className="lien-retour" onClick={() => setAnnulationId(null)}>
              Ne rien annuler
            </button>
          </div>
        ) : (
          <div className="cmd__actions">
            {c.statut === 'attente' ? (
              <Fragment>
                <button
                  type="button"
                  className="bouton bouton--secondaire bouton--petit"
                  onClick={() => salle.ouvrirDetail(c.id)}
                >
                  Ouvrir
                </button>
                {!c.lignes.some((l) => l.indispo) ? (
                  <button
                    type="button"
                    className="bouton bouton--primaire bouton--petit"
                    onClick={() => salle.confirmer(c.id)}
                  >
                    Confirmer
                  </button>
                ) : null}
              </Fragment>
            ) : null}
            {c.statut === 'pret' ? (
              <button type="button" className="bouton bouton--primaire bouton--petit" onClick={() => salle.servir(c.id)}>
                Servi
              </button>
            ) : null}
            {EN_CUISINE.includes(c.statut) ? (
              <button
                type="button"
                className="bouton bouton--refus bouton--petit"
                onClick={() => setAnnulationId(c.id)}
              >
                Annuler
              </button>
            ) : null}
            {c.motifAnnulation ? <span className="cmd__origine">{c.motifAnnulation}</span> : null}
          </div>
        )}
      </article>
    );
  }

  return (
    <div className="voile voile--centre" onClick={salle.fermerFiche}>
      <div
        className="fiche-table"
        role="dialog"
        aria-modal="true"
        aria-label={'Table ' + numero}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="fiche-table__entete">
          <span className="fiche-table__num">Table {numero}</span>
          <span
            className={
              'pastille ' +
              (etatDeLaTable === 'encaisser'
                ? 'pastille--du'
                : etatDeLaTable === 'reglee'
                  ? 'pastille--regle'
                  : etatDeLaTable === 'action'
                    ? 'pastille--epuise'
                    : etatDeLaTable === 'libre'
                      ? 'pastille--archive'
                      : 'pastille--masque')
            }
          >
            {LIBELLE_ETAT_TABLE[etatDeLaTable]}
          </span>
          {addition ? (
            <span className="fiche-table__meta">ouverte {anciennete(addition.ouverteA, maintenant)}</span>
          ) : null}
        </div>

        {!addition ? (
          <Fragment>
            <div className="vide">
              Cette table est libre. Ouvrez-la pour y saisir une commande prise de vive voix, ou laissez les clients
              scanner le QR : elle s'ouvrira toute seule.
            </div>
            <button
              type="button"
              className="bouton bouton--primaire bouton--admin bouton--large"
              onClick={() => salle.ouvrirTable(numero)}
            >
              Ouvrir la table
            </button>
          </Fragment>
        ) : (
          <Fragment>
            {appelsTable.length > 0 ? (
              <div className="encart encart--ajuste">
                <strong>Appel salle · {appelsTable[0].sujet}</strong>
                <button
                  type="button"
                  className="bouton bouton--secondaire bouton--petit"
                  onClick={() => salle.marquerAppelVu(appelsTable[0].id)}
                >
                  Vu, j'y vais
                </button>
              </div>
            ) : null}

            {actives.length > 0 ? (
              <div>
                <div className="bloc-titre">
                  En cours <span className="colonne__nombre">{actives.length}</span>
                </div>
                {actives.map(carteCommande)}
              </div>
            ) : null}

            {servies.length > 0 ? (
              <div>
                <div className="bloc-titre">
                  Servi <span className="colonne__nombre">{servies.length}</span>
                </div>
                {servies.map(carteCommande)}
              </div>
            ) : null}

            {mortes.length > 0 ? (
              <div>
                <div className="bloc-titre">Refusé ou annulé</div>
                {mortes.map(carteCommande)}
              </div>
            ) : null}

            {cmds.length === 0 ? <div className="vide">Aucune commande sur cette table pour l'instant.</div> : null}

            {nonConfirme > 0 ? (
              <div className="sous-total">
                <span>Non confirmé — pas encore facturé</span>
                <span>{prixFr(nonConfirme)}</span>
              </div>
            ) : null}

            <div className="total-ligne">
              <span>
                Addition{' '}
                <small>
                  {addition.statut === 'reglee' ? 'réglée' : addition.statut === 'demandee' ? 'demandée' : 'en cours'}
                </small>
              </span>
              <span>{prixFr(montant)}</span>
            </div>

            {addition.statut === 'reglee' && addition.reglement ? (
              <div className="encart encart--ajuste">
                <strong>
                  Réglée · {prixFr(addition.reglement.montant)} en {libelleMoyen(addition.reglement.moyen).toLowerCase()}
                </strong>
                <p>{anciennete(addition.reglement.a, maintenant)}. Il reste à libérer la table.</p>
              </div>
            ) : null}

            {saisieOuverte ? (
              <SaisieSalle
                categories={etat.categories}
                plats={etat.plats}
                onFermer={() => setSaisieOuverte(false)}
                onEnvoyer={(lignes) => {
                  salle.saisirCommande(numero, lignes);
                  setSaisieOuverte(false);
                }}
              />
            ) : (
              <button
                type="button"
                className="bouton bouton--secondaire bouton--admin bouton--large"
                onClick={() => setSaisieOuverte(true)}
              >
                Ajouter une commande prise de vive voix
              </button>
            )}

            {addition.statut === 'ouverte' ? (
              <button
                type="button"
                className="bouton bouton--secondaire bouton--admin bouton--large"
                onClick={() => salle.preparerAddition(addition.id)}
              >
                Préparer l'addition
              </button>
            ) : null}

            {addition.statut === 'demandee' ? (
              <div className="champ">
                <div className="bloc-titre">Encaisser</div>
                {aValider > 0 ? (
                  <div className="encart encart--refus">
                    <strong>{pluriel(aValider, 'demande en attente', 'demandes en attente')} sur cette table.</strong>
                    <p>Validez-la ou refusez-la avant d'encaisser : sinon le client règle sans savoir ce qu'il obtient.</p>
                  </div>
                ) : null}
                {enCuisine > 0 ? (
                  <p className="champ__aide">
                    {pluriel(enCuisine, 'commande encore en cuisine', 'commandes encore en cuisine')} — vous pouvez
                    encaisser quand même.
                  </p>
                ) : null}
                <div className="moyens">
                  {MOYENS_PAIEMENT.map((m) => (
                    <button
                      type="button"
                      className="moyen"
                      key={m.cle}
                      aria-pressed={moyen === m.cle}
                      onClick={() => setMoyen(m.cle)}
                    >
                      {m.libelle}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className="bouton bouton--primaire bouton--admin bouton--large"
                  disabled={aValider > 0}
                  onClick={() => salle.encaisser(addition.id, moyen, montant)}
                >
                  Encaisser {prixFr(montant)}
                </button>
              </div>
            ) : null}

            <div className="fiche-gestion__secondaires">
              <button
                type="button"
                className="bouton bouton--secondaire bouton--petit"
                onClick={() => salle.liberer(addition.id, false)}
              >
                Libérer la table
              </button>
              {addition.statut !== 'reglee' ? (
                <button
                  type="button"
                  className="bouton bouton--refus bouton--petit"
                  onClick={() => salle.liberer(addition.id, true)}
                >
                  Libérer sans encaisser
                </button>
              ) : null}
            </div>
          </Fragment>
        )}

        <button type="button" className="lien-retour" onClick={salle.fermerFiche}>
          Fermer
        </button>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- file de validation */

function CarteDemandeSalle({
  commande,
  maintenant,
  onConfirmer,
  onOuvrir,
  onServir,
}: {
  commande: Commande;
  maintenant: number;
  onConfirmer: (id: string) => void;
  onOuvrir: (id: string) => void;
  onServir: (id: string) => void;
}) {
  const bloquee = commande.lignes.some((l) => l.indispo);
  const enAttente = commande.statut === 'attente';
  return (
    <article className={'demande demande--' + (enAttente ? 'attente' : 'cuisine')}>
      <div className="demande__haut">
        <span className="demande__table">Table {commande.table}</span>
        {enAttente && commande.modifieeA ? (
          <span className="demande__etiquette">Modifiée {anciennete(commande.modifieeA, maintenant)}</span>
        ) : null}
        <span className="demande__age">
          {anciennete(enAttente ? commande.envoyeeA : commande.confirmeeA, maintenant)}
        </span>
      </div>
      <ul className="demande__lignes">
        {commande.lignes.map((l) => (
          <li className={'demande__ligne' + (l.indispo ? ' demande__ligne--indispo' : '')} key={l.id}>
            <b>{l.qte} ×</b> {l.nom}
          </li>
        ))}
      </ul>
      {bloquee ? <p className="demande__alerte">Un plat n'est plus disponible : ouvrez pour ajuster.</p> : null}
      {commande.statut === 'pret' ? (
        <div className="demande__actions">
          <span className="pastille pastille--prete">Prête</span>
          <button
            type="button"
            className="bouton bouton--primaire bouton--admin"
            onClick={() => onServir(commande.id)}
          >
            Servi
          </button>
        </div>
      ) : null}
      {enAttente ? (
        <div className="demande__actions">
          <button
            type="button"
            className="bouton bouton--secondaire bouton--admin"
            onClick={() => onOuvrir(commande.id)}
          >
            Ouvrir
          </button>
          {!bloquee ? (
            <button
              type="button"
              className="bouton bouton--primaire bouton--admin"
              onClick={() => onConfirmer(commande.id)}
            >
              Confirmer
            </button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function CarteAppel({
  appel,
  maintenant,
  onVu,
}: {
  appel: AppelSalle;
  maintenant: number;
  onVu: (id: string) => void;
}) {
  return (
    <article className="demande demande--appel">
      <div className="demande__haut">
        <span className="demande__etiquette">Appel salle</span>
        <span className="demande__age">{anciennete(appel.a, maintenant)}</span>
      </div>
      <div className="demande__haut">
        <span className="demande__table">{appel.table ? 'Table ' + appel.table : 'Table inconnue'}</span>
      </div>
      <p className="demande__sujet">{appel.sujet}</p>
      <div className="demande__actions">
        <button type="button" className="bouton bouton--secondaire bouton--admin" onClick={() => onVu(appel.id)}>
          Vu
        </button>
      </div>
    </article>
  );
}

/** Ajustement avant transmission : c'est le seul endroit ou la salle change une demande. */
function DetailDemande({ ardoise, commande }: { ardoise: Ardoise; commande: Commande }) {
  const { etat, salle, maintenant } = ardoise;
  const [lignes, setLignes] = useState<LigneCommande[]>(commande.lignes);
  const [motifOuvert, setMotifOuvert] = useState(false);
  const [ajout, setAjout] = useState('');

  const disponibles = etat.plats
    .filter((p) => commandable(p, etat.categories) && !lignes.some((l) => l.id === p.id))
    .slice()
    .sort(parOrdre);

  const changerQte = (id: string, delta: number) =>
    setLignes((ls) => ls.map((l) => (l.id === id ? { ...l, qte: l.qte + delta } : l)).filter((l) => l.qte > 0));

  function ajouterArticle() {
    const plat = etat.plats.find((p) => p.id === ajout);
    if (!plat) return;
    setLignes((ls) => ls.concat([{ id: plat.id, nom: plat.nom, prix: plat.prix, qte: 1, indispo: false }]));
    setAjout('');
  }

  return (
    <div className="voile voile--centre" onClick={salle.fermerDetail}>
      <div
        className="detail"
        role="dialog"
        aria-modal="true"
        aria-label={'Demande de la table ' + commande.table}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="detail__entete">
          <span className="demande__table">Table {commande.table}</span>
          <span className="demande__age">{anciennete(commande.envoyeeA, maintenant)}</span>
        </div>

        <div className="panier__lignes">
          {lignes.map((l) => (
            <div className="panier__ligne" key={l.id}>
              <div className="plat__texte">
                <div className="plat__nom" style={l.indispo ? { color: 'var(--indispo)' } : undefined}>
                  {l.nom}
                </div>
                <div className="plat__prix">
                  {l.indispo ? 'Plus disponible — à retirer' : prixFr((l.prix ?? 0) * l.qte)}
                </div>
              </div>
              <SelecteurQuantite
                qte={l.qte}
                nom={l.nom}
                onMoins={() => changerQte(l.id, -1)}
                onPlus={() => changerQte(l.id, 1)}
              />
            </div>
          ))}
          {lignes.length === 0 ? (
            <div className="vide">Plus aucun article : refusez la demande et passez à la table.</div>
          ) : null}
        </div>

        <div className="detail__ajout">
          <label className="sous-titre" htmlFor="ajout-article" style={{ position: 'absolute', left: '-9999px' }}>
            Ajouter un article
          </label>
          <select id="ajout-article" value={ajout} onChange={(e) => setAjout(e.target.value)}>
            <option value="">Ajouter un article…</option>
            {disponibles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nom} — {prixFr(p.prix)}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="bouton bouton--secondaire bouton--admin"
            onClick={ajouterArticle}
            disabled={!ajout}
          >
            Ajouter
          </button>
        </div>

        {motifOuvert ? (
          <div className="motifs">
            <span className="motifs__titre">Motif du refus</span>
            {MOTIFS_REFUS.map((m) => (
              <button
                type="button"
                className="bouton bouton--secondaire bouton--admin bouton--large"
                key={m.cle}
                onClick={() => salle.refuser(commande.id, m.cle)}
              >
                {m.salle}
              </button>
            ))}
            <button type="button" className="lien-retour" onClick={() => setMotifOuvert(false)}>
              Annuler
            </button>
          </div>
        ) : (
          <div className="detail__actions">
            <button type="button" className="bouton bouton--refus bouton--admin" onClick={() => setMotifOuvert(true)}>
              Refuser
            </button>
            <button
              type="button"
              className="bouton bouton--primaire bouton--admin"
              onClick={() => salle.confirmerAvecAjustement(commande.id, lignes)}
              disabled={lignes.length === 0 || lignes.some((l) => l.indispo)}
            >
              Confirmer et envoyer en cuisine
            </button>
          </div>
        )}
        <button type="button" className="lien-retour" onClick={salle.fermerDetail}>
          Fermer sans rien changer
        </button>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- espace */

export function EspaceSalle({ ardoise }: { ardoise: Ardoise }) {
  const { etat, salle, maintenant } = ardoise;

  const vivantes = etat.commandes.filter((c) => !c.close);
  const enAttente = vivantes.filter((c) => c.statut === 'attente');
  const parties = vivantes.filter((c) => c.statut === 'cuisine' || c.statut === 'pret');
  const prets = vivantes.filter((c) => c.statut === 'pret');
  const appelsOuverts = etat.appels.filter((a) => !a.vu);
  const ouvertes = etat.additions.filter((a) => !a.close);
  const aEncaisser = ouvertes.filter((a) => a.statut === 'demandee');
  const detail = etat.detailCommande ? etat.commandes.find((c) => c.id === etat.detailCommande) : undefined;

  return (
    <div className="colonne-admin">
      <header className="admin__entete">
        <h1 className="admin__titre">Service en salle</h1>
        <p className="salle__compteurs" aria-live="polite">
          <span>
            <b>{ouvertes.length}</b> tables occupées
          </span>
          <span className={enAttente.length > 0 ? 'urgent' : ''}>
            <b>{enAttente.length}</b> à valider
          </span>
          <span>
            <b>{prets.length}</b> prêts à servir
          </span>
          <span className={aEncaisser.length > 0 ? 'urgent' : ''}>
            <b>{aEncaisser.length}</b> à encaisser
          </span>
        </p>
        <div className="admin__onglets">
          <button
            type="button"
            className="admin__onglet"
            aria-pressed={etat.ongletSalle === 'plan'}
            onClick={() => salle.onglet('plan')}
          >
            Plan de salle
          </button>
          <button
            type="button"
            className="admin__onglet"
            aria-pressed={etat.ongletSalle === 'file'}
            onClick={() => salle.onglet('file')}
          >
            File {enAttente.length + appelsOuverts.length > 0 ? '· ' + (enAttente.length + appelsOuverts.length) : ''}
          </button>
          <button
            type="button"
            className="admin__onglet"
            aria-pressed={etat.ongletSalle === 'dispo'}
            onClick={() => salle.onglet('dispo')}
          >
            Disponibilités
          </button>
        </div>
      </header>

      <div className="admin__corps">
        {etat.noticeSalle ? (
          <div className="notice" role="status">
            {etat.noticeSalle}
          </div>
        ) : null}

        {etat.ongletSalle === 'plan' ? (
          <PlanDeSalle
            commandes={etat.commandes}
            additions={etat.additions}
            appels={etat.appels}
            maintenant={maintenant}
            onOuvrirTable={salle.ouvrirFiche}
          />
        ) : null}

        {etat.ongletSalle === 'file' ? (
          <div className="file">
            <section>
              <h2 className="colonne__titre">
                En attente de validation{' '}
                <span className="colonne__nombre">{enAttente.length + appelsOuverts.length}</span>
              </h2>
              <div className="colonne__cartes">
                {appelsOuverts.map((a) => (
                  <CarteAppel key={a.id} appel={a} maintenant={maintenant} onVu={salle.marquerAppelVu} />
                ))}
                {enAttente.map((c) => (
                  <CarteDemandeSalle
                    key={c.id}
                    commande={c}
                    maintenant={maintenant}
                    onConfirmer={salle.confirmer}
                    onOuvrir={salle.ouvrirDetail}
                    onServir={salle.servir}
                  />
                ))}
                {enAttente.length + appelsOuverts.length === 0 ? (
                  <div className="vide">
                    Rien n'attend. Les tables qui ne passent pas par l'écran commandent comme avant, de vive voix.
                  </div>
                ) : null}
              </div>
            </section>
            <section>
              <h2 className="colonne__titre">
                Parti en cuisine <span className="colonne__nombre">{parties.length}</span>
              </h2>
              <div className="colonne__cartes">
                {parties
                  .slice()
                  .sort((a, b) => (b.confirmeeA ?? 0) - (a.confirmeeA ?? 0))
                  .map((c) => (
                    <CarteDemandeSalle
                      key={c.id}
                      commande={c}
                      maintenant={maintenant}
                      onConfirmer={salle.confirmer}
                      onOuvrir={salle.ouvrirDetail}
                      onServir={salle.servir}
                    />
                  ))}
                {parties.length === 0 ? <div className="vide">Rien n'est encore parti.</div> : null}
              </div>
            </section>
          </div>
        ) : null}

        {etat.ongletSalle === 'dispo' ? (
          <div className="disponibilites">
            <p className="dispo__mention">
              Effet immédiat sur la carte de toutes les tables. Remis à zéro au service suivant.
            </p>
            {etat.categories
              .filter((c) => c.publiee)
              .slice()
              .sort(parOrdre)
              .map((cat) => {
                const liste = etat.plats
                  .filter((p) => p.categorieId === cat.id && visibleClient(p, etat.categories))
                  .slice()
                  .sort(parOrdre);
                if (liste.length === 0) return null;
                return (
                  <Fragment key={cat.id}>
                    <h2 className="dispo__section">{cat.nom}</h2>
                    {liste.map((p) => (
                      <InterrupteurDisponibilite
                        key={p.id}
                        plat={p}
                        onBasculer={(id) => salle.basculerEpuise(id, 'salle')}
                      />
                    ))}
                  </Fragment>
                );
              })}
          </div>
        ) : null}
      </div>

      {etat.ficheTable !== null ? <FicheTable ardoise={ardoise} numero={etat.ficheTable} /> : null}
      {detail ? <DetailDemande key={detail.id} ardoise={ardoise} commande={detail} /> : null}
    </div>
  );
}
