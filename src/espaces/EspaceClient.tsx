/** Espace client : ce que voit la table depuis son telephone, apres avoir scanne le QR. */

import { Fragment, useEffect, useMemo, useRef } from 'react';
import type { Categorie, Commande, LigneCommande, Panier, Plat } from '../types';
import type { Ardoise } from '../etat/useArdoise';
import { prixFr, pluriel } from '../lib/format';
import {
  categorieDe,
  commandesDe,
  estEpuise,
  FACTURABLE,
  parOrdre,
  PALIERS_CLIENT,
  RANG_PALIER,
  totalLignes,
  visibleClient,
} from '../lib/regles';
import { MOTIFS_REFUS, NOM_RESTAURANT, NOMBRE_TABLES, SUJETS_APPEL, libelleMoyen } from '../donnees/constantes';
import { MessageRepli, SelecteurQuantite, Visuel } from '../composants/communs';

/* ---------------------------------------------------------------- ecran 0 */

interface ChoixTableProps {
  table: number;
  onChoisir: (numero: number) => void;
  onValider: () => void;
  onAppeler: () => void;
}

function EcranChoixTable({ table, onChoisir, onValider, onAppeler }: ChoixTableProps) {
  const numeros = Array.from({ length: NOMBRE_TABLES }, (_, i) => i + 1);
  return (
    <div className="accueil">
      <div>
        <h1 className="accueil__titre">Bienvenue</h1>
        <p className="accueil__question">À quelle table êtes-vous ?</p>
      </div>
      <p className="accueil__aide">Le numéro est indiqué sur le chevalet de votre table.</p>
      <div className="grille-tables" role="group" aria-label="Numéro de table">
        {numeros.map((n) => (
          <button
            type="button"
            className="table-choix"
            key={n}
            aria-pressed={table === n}
            aria-label={'Table ' + n}
            onClick={() => onChoisir(n)}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="accueil__pied">
        <button type="button" className="bouton bouton--primaire bouton--large" disabled={!table} onClick={onValider}>
          Continuer
        </button>
        <button type="button" className="lien-appel" onClick={onAppeler}>
          Je ne trouve pas mon numéro — Appeler la salle
        </button>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- en-tete */

interface EnTeteProps {
  table: number;
  nbCommandes: number;
  alerte: boolean;
  onChanger: () => void;
  onSuivi: () => void;
}

function EnTeteTable({ table, nbCommandes, alerte, onChanger, onSuivi }: EnTeteProps) {
  return (
    <header className="entete-table">
      <span className="entete-table__table">
        Table {table}
        <button type="button" className="entete-table__changer" onClick={onChanger}>
          Changer
        </button>
      </span>
      {nbCommandes > 0 ? (
        <button
          type="button"
          className={'entete-table__suivi' + (alerte ? ' entete-table__suivi--alerte' : '')}
          onClick={onSuivi}
        >
          {alerte ? "On vous l'apporte" : 'Suivi · ' + nbCommandes}
        </button>
      ) : (
        <span className="entete-table__lieu">{NOM_RESTAURANT}</span>
      )}
    </header>
  );
}

/* ---------------------------------------------------------------- la carte */

interface PlatCarteProps {
  plat: Plat;
  categories: Categorie[];
  qte: number;
  apercu?: boolean;
  onAjouter: (platId: string) => void;
  onRetirer: (platId: string) => void;
  onOuvrir: (platId: string) => void;
}

function PlatCarte({ plat, categories, qte, apercu, onAjouter, onRetirer, onOuvrir }: PlatCarteProps) {
  const disponible = !estEpuise(plat);
  return (
    <article className={'plat-carte' + (disponible ? '' : ' plat-carte--indispo')}>
      <button
        type="button"
        className="plat-carte__ouvrir"
        onClick={() => onOuvrir(plat.id)}
        aria-label={'Voir le détail de ' + plat.nom}
        disabled={apercu}
      >
        <Visuel plat={plat} categories={categories} />
        <div className="plat-carte__texte">
          <div className="plat-carte__haut">
            <span className="plat-carte__nom">{plat.nom}</span>
            <span className="plat-carte__prix">{prixFr(plat.prix)}</span>
          </div>
          {plat.description ? <p className="plat-carte__desc">{plat.description}</p> : null}
        </div>
      </button>
      <div className="plat-carte__pied">
        {disponible ? (
          <Fragment>
            <span className="sous-titre">Voir le détail</span>
            {qte > 0 ? (
              <SelecteurQuantite
                qte={qte}
                nom={plat.nom}
                onMoins={() => onRetirer(plat.id)}
                onPlus={() => onAjouter(plat.id)}
              />
            ) : (
              <button
                type="button"
                className="ajout"
                onClick={() => onAjouter(plat.id)}
                aria-label={'Ajouter ' + plat.nom + ' à ma demande'}
              >
                +
              </button>
            )}
          </Fragment>
        ) : (
          <span className="mention-indispo">Plus disponible aujourd'hui</span>
        )}
      </div>
    </article>
  );
}

interface CarteClientProps {
  categories: Categorie[];
  plats: Plat[];
  panier: Panier;
  apercu?: boolean;
  refsSections?: React.MutableRefObject<Record<string, HTMLElement | null>>;
  onAjouter: (platId: string) => void;
  onRetirer: (platId: string) => void;
  onOuvrir: (platId: string) => void;
}

/** Utilise par l'ecran client et par l'apercu de la Gestion : une seule verite d'affichage. */
export function CarteClient({
  categories,
  plats,
  panier,
  apercu,
  refsSections,
  onAjouter,
  onRetirer,
  onOuvrir,
}: CarteClientProps) {
  const sections = categories
    .filter((c) => c.publiee)
    .slice()
    .sort(parOrdre)
    .map((cat) => ({
      cat,
      plats: plats
        .filter((p) => p.categorieId === cat.id && visibleClient(p, categories))
        .slice()
        .sort(parOrdre),
    }));

  const total = sections.reduce((n, s) => n + s.plats.length, 0);

  if (total === 0) {
    return (
      <div className="vide">
        <span className="vide__titre">La carte n'est pas encore en ligne.</span>
        Appelez-nous, on vous l'apporte et on prend votre commande à table.
      </div>
    );
  }

  return (
    <Fragment>
      {sections.map((s) => (
        <section
          className="section"
          key={s.cat.id}
          id={'cat-' + s.cat.id}
          ref={(el) => {
            if (refsSections) refsSections.current[s.cat.id] = el;
          }}
        >
          <h2 className="section__titre">{s.cat.nom}</h2>
          {s.plats.length === 0 ? (
            <div className="vide">Rien dans cette catégorie ce midi.</div>
          ) : (
            <Fragment>
              {s.plats.every((p) => estEpuise(p)) ? (
                <div className="vide">Plus rien de disponible dans cette catégorie ce midi.</div>
              ) : null}
              <div className="plats">
                {s.plats.map((p) => (
                  <PlatCarte
                    key={p.id}
                    plat={p}
                    categories={categories}
                    qte={panier[p.id] ?? 0}
                    apercu={apercu}
                    onAjouter={onAjouter}
                    onRetirer={onRetirer}
                    onOuvrir={onOuvrir}
                  />
                ))}
              </div>
            </Fragment>
          )}
        </section>
      ))}
    </Fragment>
  );
}

/* ---------------------------------------------------------------- fiche plat */

interface FichePlatProps {
  plat: Plat | undefined;
  categories: Categorie[];
  qte: number;
  onAjouter: (platId: string) => void;
  onRetirer: (platId: string) => void;
  onRetour: () => void;
  onAppeler: () => void;
}

function FichePlatClient({ plat, categories, qte, onAjouter, onRetirer, onRetour, onAppeler }: FichePlatProps) {
  if (!plat || !visibleClient(plat, categories)) {
    return (
      <Fragment>
        <button type="button" className="lien-retour" onClick={onRetour}>
          ← Revenir à la carte
        </button>
        <div className="vide">
          <span className="vide__titre">Ce plat n'est plus à la carte.</span>
          Il vient d'être retiré. Revenez à la carte, ou appelez-nous et on vous conseille.
        </div>
        <button type="button" className="bouton bouton--primaire bouton--large" onClick={onAppeler}>
          Appeler la salle
        </button>
      </Fragment>
    );
  }

  const cat = categorieDe(categories, plat);
  const disponible = !estEpuise(plat);

  return (
    <div className="fiche">
      <button type="button" className="lien-retour" onClick={onRetour}>
        ← Revenir à la carte
      </button>
      <div className="fiche__visuel">
        <Visuel plat={plat} categories={categories} taille="grand" />
      </div>
      <div>
        {cat ? <p className="fiche__cat">{cat.nom}</p> : null}
        <h2 className="fiche__titre">{plat.nom}</h2>
      </div>
      {plat.description ? <p className="fiche__desc">{plat.description}</p> : null}
      <p className="fiche__prix">{prixFr(plat.prix)}</p>
      {disponible ? (
        <div className="fiche__ajout">
          {qte > 0 ? (
            <Fragment>
              <SelecteurQuantite
                qte={qte}
                nom={plat.nom}
                onMoins={() => onRetirer(plat.id)}
                onPlus={() => onAjouter(plat.id)}
              />
              <span className="sous-titre">dans votre demande</span>
            </Fragment>
          ) : (
            <button type="button" className="bouton bouton--primaire bouton--large" onClick={() => onAjouter(plat.id)}>
              Ajouter à ma demande
            </button>
          )}
        </div>
      ) : (
        <div className="encart encart--ajuste">
          <strong>Plus disponible aujourd'hui</strong>
          <p>La cuisine n'en a plus pour ce service. Appelez-nous, on vous propose autre chose.</p>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- appel salle */

function FeuilleAppelSalle({ onEnvoyer, onFermer }: { onEnvoyer: (sujet: string) => void; onFermer: () => void }) {
  return (
    <div className="voile" onClick={onFermer}>
      <div
        className="feuille"
        role="dialog"
        aria-modal="true"
        aria-label="Appeler la salle"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="feuille__titre">Appeler la salle</h2>
        <p className="sous-titre">Dites-nous en un mot de quoi il s'agit, quelqu'un passe à votre table.</p>
        {SUJETS_APPEL.map((sujet) => (
          <button type="button" className="feuille__choix" key={sujet} onClick={() => onEnvoyer(sujet)}>
            {sujet}
          </button>
        ))}
        <button type="button" className="bouton bouton--secondaire bouton--large" onClick={onFermer}>
          Annuler
        </button>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- suivi */

function IndicateurStatut({ commande }: { commande: Commande }) {
  if (commande.statut === 'refusee' || commande.statut === 'annulee') return null;
  const rang = RANG_PALIER[commande.statut] ?? 0;
  return (
    <div className="paliers4">
      {PALIERS_CLIENT.map((nom, i) => (
        <Fragment key={nom}>
          {i > 0 ? <span className={'paliers4__trait' + (i <= rang ? ' paliers4__trait--fait' : '')}></span> : null}
          <span className={'palier4' + (i < rang ? ' palier4--fait' : i === rang ? ' palier4--actif' : '')}>
            <span className="palier4__pastille"></span>
            <span className="palier4__nom">{nom}</span>
          </span>
        </Fragment>
      ))}
    </div>
  );
}

interface BlocStatutProps {
  commande: Commande;
  onModifier: (id: string) => void;
  onAjouterA: (id: string) => void;
  onAppeler: () => void;
}

function BlocStatut({ commande, onModifier, onAjouterA, onAppeler }: BlocStatutProps) {
  const ajust = commande.ajustements;
  const confirmee = ['cuisine', 'pret', 'servie'].includes(commande.statut);
  const ajustee = confirmee && ajust !== null && (ajust.retraits.length > 0 || ajust.ajouts.length > 0);
  const motif = commande.motif ? MOTIFS_REFUS.find((m) => m.cle === commande.motif) : null;

  let classe = 'statut--attente';
  let titre = 'Demande envoyée';
  let detail = "Reçue par l'équipe · en attente de confirmation.";
  if (commande.statut === 'cuisine') {
    classe = 'statut--cuisine';
    titre = ajustee ? 'Commande ajustée' : 'Commande confirmée';
    detail = ajustee ? "L'équipe a confirmé votre commande après un ajustement." : 'En préparation en cuisine.';
  } else if (commande.statut === 'pret') {
    classe = 'statut--cuisine';
    titre = "On vous l'apporte";
    detail = "C'est prêt : quelqu'un arrive à votre table.";
  } else if (commande.statut === 'servie') {
    classe = 'statut--cuisine';
    titre = 'Servie';
    detail = 'Bon appétit.';
  } else if (commande.statut === 'refusee') {
    classe = 'statut--refus';
    titre = 'Demande refusée';
    detail = "Elle n'est pas partie en cuisine.";
  } else if (commande.statut === 'annulee') {
    classe = 'statut--refus';
    titre = 'Commande annulée';
    detail = commande.motifAnnulation
      ? 'Motif : ' + commande.motifAnnulation.toLowerCase() + '.'
      : "L'équipe passe vous voir.";
  }

  return (
    <section className={'carte statut ' + classe}>
      <div className="statut__entete">
        <h2 className="statut__titre">{titre}</h2>
        <p className="sous-titre">{detail}</p>
      </div>

      <IndicateurStatut commande={commande} />

      {ajustee && ajust ? (
        <div className="encart encart--ajuste">
          {ajust.retraits.length > 0 ? (
            <Fragment>
              <strong>Retiré de votre commande</strong>
              <ul>
                {ajust.retraits.map((r, i) => (
                  <li key={i}>
                    {r.qte} × {r.nom}
                  </li>
                ))}
              </ul>
            </Fragment>
          ) : null}
          {ajust.ajouts.length > 0 ? (
            <Fragment>
              <strong>Ajouté par l'équipe</strong>
              <ul>
                {ajust.ajouts.map((r, i) => (
                  <li key={i}>
                    {r.qte} × {r.nom}
                  </li>
                ))}
              </ul>
            </Fragment>
          ) : null}
          <p>
            {ajust.retraits.length > 0
              ? "La cuisine ne l'avait plus. L'équipe passe vous voir pour vous proposer autre chose."
              : "L'équipe passe vous voir pour en parler."}
          </p>
        </div>
      ) : null}

      {motif ? (
        <div className="encart encart--refus">
          <strong>{motif.client}</strong>
          <p>Rien n'est parti en cuisine. Quelqu'un passe à votre table.</p>
        </div>
      ) : null}

      <div className="recap">
        {commande.lignes.map((l) => (
          <div className="recap__ligne" key={l.id}>
            <span>
              <span className="recap__qte">{l.qte} ×</span> {l.nom}
            </span>
            <span className="recap__prix">{prixFr((l.prix ?? 0) * l.qte)}</span>
          </div>
        ))}
        <div className="recap__total">
          <span>Total indicatif</span>
          <span>{prixFr(totalLignes(commande.lignes))}</span>
        </div>
      </div>

      {commande.statut === 'attente' ? (
        <div className="statut__actions">
          <button type="button" className="bouton bouton--primaire" onClick={() => onAjouterA(commande.id)}>
            Ajouter à cette demande
          </button>
          <button type="button" className="bouton bouton--secondaire" onClick={() => onModifier(commande.id)}>
            Modifier
          </button>
        </div>
      ) : null}
      {commande.statut === 'refusee' ? (
        <button type="button" className="bouton bouton--primaire bouton--large" onClick={onAppeler}>
          Appeler la salle
        </button>
      ) : null}
    </section>
  );
}

/* ---------------------------------------------------------------- espace */

export function EspaceClient({ ardoise }: { ardoise: Ardoise }) {
  const { etat, client, additionCliente } = ardoise;
  const defilement = useRef<HTMLDivElement | null>(null);
  const refsSections = useRef<Record<string, HTMLElement | null>>({});
  const positionCarte = useRef(0);

  const platsParId = useMemo(
    () => Object.fromEntries(etat.plats.map((p) => [p.id, p])) as Record<string, Plat>,
    [etat.plats],
  );

  const lignesPanier: (LigneCommande & { plat: Plat })[] = Object.keys(etat.panier)
    .filter((id) => etat.panier[id] > 0 && platsParId[id])
    .map((id) => ({
      id,
      nom: platsParId[id].nom,
      prix: platsParId[id].prix,
      qte: etat.panier[id],
      indispo: false,
      plat: platsParId[id],
    }));

  const nbArticles = lignesPanier.reduce((n, l) => n + l.qte, 0);
  const commandesTable = commandesDe(etat.commandes, etat.table).slice().reverse();
  const commandeEnAttente = commandesTable.find((c) => c.statut === 'attente') ?? null;
  const platArrive = commandesTable.some((c) => c.statut === 'pret');
  const facturables = commandesTable.filter((c) => FACTURABLE.includes(c.statut));

  const lignesAddition: LigneCommande[] = [];
  facturables.forEach((c) =>
    c.lignes.forEach((l) => {
      const deja = lignesAddition.find((x) => x.id === l.id);
      if (deja) deja.qte += l.qte;
      else lignesAddition.push({ ...l });
    }),
  );
  const montantTable = totalLignes(lignesAddition);

  const categoriesVisibles = useMemo(() => {
    const utiles = etat.categories
      .filter((c) => c.publiee)
      .slice()
      .sort(parOrdre)
      .filter((c) => etat.plats.some((p) => p.categorieId === c.id && visibleClient(p, etat.categories)));
    if (!etat.boissonsDabord) return utiles;
    return utiles.filter((c) => c.nom === 'Boissons').concat(utiles.filter((c) => c.nom !== 'Boissons'));
  }, [etat.categories, etat.plats, etat.boissonsDabord]);

  /** Retour a la position de lecture apres un aller-retour vers la fiche plat. */
  useEffect(() => {
    if (etat.ecranClient === 'carte' && defilement.current) {
      defilement.current.scrollTop = positionCarte.current;
    }
  }, [etat.ecranClient]);

  function ouvrirPlat(platId: string) {
    if (defilement.current) positionCarte.current = defilement.current.scrollTop;
    client.ouvrirPlat(platId);
  }

  function allerCategorie(catId: string) {
    const cible = refsSections.current[catId];
    if (cible && defilement.current) {
      defilement.current.scrollTo({ top: cible.offsetTop - 96, behavior: 'smooth' });
    }
    client.categorieActive(catId);
  }

  function surDefilement() {
    if (etat.ecranClient !== 'carte' || !defilement.current) return;
    const haut = defilement.current.scrollTop + 120;
    let courante: string | null = null;
    categoriesVisibles.forEach((c) => {
      const el = refsSections.current[c.id];
      if (el && el.offsetTop <= haut) courante = c.id;
    });
    if (courante && courante !== etat.categorieActive) client.categorieActive(courante);
  }

  const bandeauAlerte = etat.alerteClient ? (
    <div className="bandeau bandeau--info">
      <p>
        <strong>{etat.alerteClient}</strong> vient d'être retiré de la carte par l'équipe. Nous l'avons enlevé de
        votre demande.
      </p>
      <button type="button" className="bandeau__fermer" onClick={client.fermerAlerte} aria-label="Fermer">
        ×
      </button>
    </div>
  ) : null;

  const bandeauMessage = etat.messageClient ? (
    <div className="bandeau bandeau--info">
      <p>{etat.messageClient}</p>
      <button type="button" className="bandeau__fermer" onClick={client.fermerMessage} aria-label="Fermer">
        ×
      </button>
    </div>
  ) : null;

  const appelEnCours = etat.appelClient ? etat.appels.find((a) => a.id === etat.appelClient) : undefined;
  const bandeauAppel = appelEnCours ? (
    <div className="bandeau bandeau--appel">
      <p>
        {appelEnCours.vu
          ? "L'équipe a vu votre appel : quelqu'un arrive à votre table."
          : "L'équipe est prévenue, quelqu'un passe à votre table."}
        <br />
        <span style={{ opacity: 0.8 }}>{appelEnCours.sujet}</span>
      </p>
      {appelEnCours.vu ? (
        <button type="button" className="bandeau__fermer" onClick={client.accuserAppel} aria-label="Fermer">
          ×
        </button>
      ) : null}
    </div>
  ) : null;

  if (etat.ecranClient === 'table') {
    return (
      <div className="colonne-client">
        <div className="client__defilement">
          {appelEnCours ? <div className="client__corps">{bandeauAppel}</div> : null}
          <EcranChoixTable
            table={etat.table}
            onChoisir={client.choisirTable}
            onValider={client.validerTable}
            onAppeler={client.ouvrirFeuilleAppel}
          />
        </div>
        {etat.feuilleAppel ? (
          <FeuilleAppelSalle onEnvoyer={client.envoyerAppel} onFermer={client.fermerFeuilleAppel} />
        ) : null}
      </div>
    );
  }

  let contenu: React.ReactNode = null;

  if (etat.ecranClient === 'carte') {
    contenu = (
      <Fragment>
        {bandeauAppel}
        {bandeauAlerte}
        {bandeauMessage}
        <div className="cadrage">
          Choisissez vos plats, puis <strong>envoyez votre demande</strong>. L'équipe passe la confirmer à votre
          table.
        </div>
        <CarteClient
          categories={etat.categories}
          plats={etat.plats}
          panier={etat.panier}
          refsSections={refsSections}
          onAjouter={client.ajouter}
          onRetirer={client.retirer}
          onOuvrir={ouvrirPlat}
        />
        <MessageRepli onAppeler={client.ouvrirFeuilleAppel} />
      </Fragment>
    );
  }

  if (etat.ecranClient === 'plat') {
    contenu = (
      <Fragment>
        {bandeauAppel}
        {bandeauAlerte}
        <FichePlatClient
          plat={etat.platOuvert ? platsParId[etat.platOuvert] : undefined}
          categories={etat.categories}
          qte={etat.platOuvert ? (etat.panier[etat.platOuvert] ?? 0) : 0}
          onAjouter={client.ajouter}
          onRetirer={client.retirer}
          onRetour={() => client.naviguer('carte')}
          onAppeler={client.ouvrirFeuilleAppel}
        />
        <MessageRepli onAppeler={client.ouvrirFeuilleAppel} />
      </Fragment>
    );
  }

  if (etat.ecranClient === 'panier') {
    contenu = (
      <Fragment>
        {bandeauAppel}
        {bandeauAlerte}
        {bandeauMessage}
        <button type="button" className="lien-retour" onClick={() => client.naviguer('carte')}>
          ← Revenir à la carte
        </button>
        <h2 className="titre-ecran">
          {etat.cibleAjout ? 'Ajouter à ma demande' : 'Ma demande'} · table {etat.table}
        </h2>
        {lignesPanier.length === 0 ? (
          <Fragment>
            <div className="vide">
              <span className="vide__titre">Votre demande est vide.</span>
              Ajoutez des plats depuis la carte — ou appelez-nous, on prend votre commande à table.
            </div>
            <button
              type="button"
              className="bouton bouton--primaire bouton--large"
              onClick={() => client.naviguer('carte')}
            >
              Voir la carte
            </button>
          </Fragment>
        ) : (
          <Fragment>
            <div className="carte panier__lignes">
              {lignesPanier.map((l) => (
                <div className="panier__ligne" key={l.id}>
                  <div className="panier__vignette">
                    <Visuel plat={l.plat} categories={etat.categories} taille="petit" />
                  </div>
                  <div className="plat__texte">
                    <div className="plat__nom">{l.nom}</div>
                    <div className="plat__prix">{prixFr((l.prix ?? 0) * l.qte)}</div>
                  </div>
                  <SelecteurQuantite
                    qte={l.qte}
                    nom={l.nom}
                    onMoins={() => client.retirer(l.id)}
                    onPlus={() => client.ajouter(l.id)}
                  />
                </div>
              ))}
              <div className="recap__total">
                <span>Total indicatif</span>
                <span>{prixFr(totalLignes(lignesPanier))}</span>
              </div>
            </div>
            <div className="cadrage">
              {etat.cibleAjout ? (
                <Fragment>
                  Ces articles <strong>rejoindront votre demande en attente</strong> : l'équipe confirmera
                  l'ensemble d'un seul coup. Aucun paiement ici : règlement à l'addition.
                </Fragment>
              ) : (
                <Fragment>
                  Votre demande sera <strong>confirmée par l'équipe</strong> avant d'être préparée. Aucun paiement
                  ici : règlement à l'addition.
                </Fragment>
              )}
            </div>
            <button
              type="button"
              className="bouton bouton--primaire bouton--large"
              onClick={() => client.envoyer(lignesPanier)}
            >
              {etat.cibleAjout ? 'Ajouter à ma demande' : 'Envoyer la demande'}
            </button>
            {etat.cibleAjout ? (
              <button type="button" className="lien-retour" onClick={client.annulerAjout}>
                Annuler cet ajout
              </button>
            ) : null}
          </Fragment>
        )}
        <MessageRepli onAppeler={client.ouvrirFeuilleAppel} />
      </Fragment>
    );
  }

  if (etat.ecranClient === 'addition') {
    contenu = (
      <Fragment>
        {bandeauAppel}
        {bandeauAlerte}
        {bandeauMessage}
        <button type="button" className="lien-retour" onClick={() => client.naviguer('statut')}>
          ← Revenir au suivi
        </button>
        <h2 className="titre-ecran">Mon addition · table {etat.table}</h2>

        {lignesAddition.length === 0 ? (
          <div className="vide">
            <span className="vide__titre">Rien à régler pour l'instant.</span>
            Votre addition se remplit au fur et à mesure que l'équipe confirme vos commandes.
          </div>
        ) : (
          <div className="carte addition-client">
            {lignesAddition.map((l) => (
              <div className="recap__ligne" key={l.id}>
                <span>
                  <span className="recap__qte">{l.qte} ×</span> {l.nom}
                </span>
                <span className="recap__prix">{prixFr((l.prix ?? 0) * l.qte)}</span>
              </div>
            ))}
            <div className="addition-client__total">
              <span>Total</span>
              <span>{prixFr(montantTable)}</span>
            </div>
          </div>
        )}

        {additionCliente && additionCliente.statut === 'ouverte' && lignesAddition.length > 0 ? (
          <Fragment>
            <div className="cadrage">
              Aucun paiement ici : l'équipe vous apporte l'addition, et vous réglez{' '}
              <strong>à table ou à la caisse</strong>.
            </div>
            <button
              type="button"
              className="bouton bouton--primaire bouton--large"
              onClick={() => client.demanderAddition(additionCliente.id)}
            >
              Demander l'addition
            </button>
          </Fragment>
        ) : null}

        {additionCliente && additionCliente.statut === 'demandee' ? (
          <div className="encart encart--ajuste">
            <strong>Votre addition arrive</strong>
            <p>L'équipe est prévenue : quelqu'un vous l'apporte. Vous pouvez encore commander autre chose.</p>
          </div>
        ) : null}

        {additionCliente && additionCliente.statut === 'reglee' && additionCliente.reglement ? (
          <div className="bandeau bandeau--appel">
            <p>
              <strong>Addition réglée · merci</strong>
              <br />
              {prixFr(additionCliente.reglement.montant)} en{' '}
              {libelleMoyen(additionCliente.reglement.moyen).toLowerCase()}.
            </p>
          </div>
        ) : null}

        <MessageRepli onAppeler={client.ouvrirFeuilleAppel} />
      </Fragment>
    );
  }

  if (etat.ecranClient === 'statut') {
    contenu = (
      <Fragment>
        {bandeauAppel}
        {bandeauAlerte}
        {bandeauMessage}
        {commandesTable.length === 0 ? (
          <div className="vide">Vous n'avez encore envoyé aucune demande.</div>
        ) : (
          commandesTable.map((c) => (
            <BlocStatut
              key={c.id}
              commande={c}
              onModifier={client.modifierDemande}
              onAjouterA={client.ouvrirAjout}
              onAppeler={client.ouvrirFeuilleAppel}
            />
          ))
        )}
        {lignesAddition.length > 0 ? (
          <button
            type="button"
            className="bouton bouton--secondaire bouton--large"
            onClick={() => client.naviguer('addition')}
          >
            Mon addition · {prixFr(montantTable)}
          </button>
        ) : null}
        {commandeEnAttente ? (
          <button
            type="button"
            className="bouton bouton--secondaire bouton--large"
            onClick={() => client.ouvrirAjout(commandeEnAttente.id)}
          >
            Ajouter à ma demande en attente
          </button>
        ) : (
          <button
            type="button"
            className="bouton bouton--secondaire bouton--large"
            onClick={() => client.naviguer('carte-boissons')}
          >
            Ajouter quelque chose
          </button>
        )}
        <MessageRepli onAppeler={client.ouvrirFeuilleAppel} />
      </Fragment>
    );
  }

  return (
    <div className="colonne-client">
      <EnTeteTable
        table={etat.table}
        nbCommandes={commandesTable.length}
        alerte={platArrive}
        onChanger={client.changerTable}
        onSuivi={() => client.naviguer('statut')}
      />
      {etat.ecranClient === 'carte' && categoriesVisibles.length > 1 ? (
        <nav className="barre-cats" aria-label="Catégories de la carte">
          {categoriesVisibles.map((c) => (
            <button
              type="button"
              className="barre-cats__item"
              key={c.id}
              aria-current={etat.categorieActive === c.id}
              onClick={() => allerCategorie(c.id)}
            >
              {c.nom}
            </button>
          ))}
        </nav>
      ) : null}
      <div className="client__defilement" ref={defilement} onScroll={surDefilement}>
        <div className="client__corps">{contenu}</div>
      </div>
      <div className="barre-client">
        <button type="button" className="appel-salle" onClick={client.ouvrirFeuilleAppel}>
          Appeler la salle
        </button>
        {nbArticles > 0 ? (
          <button type="button" className="bouton bouton--primaire" onClick={() => client.naviguer('panier')}>
            {etat.cibleAjout ? 'Ajouter' : 'Ma demande'} · {pluriel(nbArticles, 'article', 'articles')} ·{' '}
            {prixFr(totalLignes(lignesPanier))}
          </button>
        ) : commandesTable.length > 0 ? (
          <button type="button" className="bouton bouton--primaire" onClick={() => client.naviguer('statut')}>
            {commandeEnAttente ? 'Suivre ma demande' : 'Voir ma commande'}
          </button>
        ) : (
          <button type="button" className="bouton bouton--primaire" disabled>
            Ma demande est vide
          </button>
        )}
      </div>
      {etat.feuilleAppel ? (
        <FeuilleAppelSalle onEnvoyer={client.envoyerAppel} onFermer={client.fermerFeuilleAppel} />
      ) : null}
    </div>
  );
}
