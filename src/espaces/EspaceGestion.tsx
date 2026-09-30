/** Espace gestion : la carte, hors service. Le gerant decide ce qui existe. */

import { useRef, useState } from 'react';
import type { Categorie, Plat } from '../types';
import type { Ardoise } from '../etat/useArdoise';
import { prixFr, pluriel } from '../lib/format';
import { estEpuise, parOrdre } from '../lib/regles';
import { TAILLE_PHOTO_MAX } from '../donnees/constantes';
import { PastilleStatutPlat, Visuel } from '../composants/communs';
import { CarteClient } from './EspaceClient';

/* ---------------------------------------------------------------- fiche plat */

interface FichePlatProps {
  plat: Plat;
  categories: Categorie[];
  nbTablesConcernees: number;
  archivageBloque: boolean;
  estNouveau: boolean;
  onFermer: () => void;
  onEnregistrer: (valeurs: Plat, publier: boolean) => void;
  onMasquer: (id: string) => void;
  onArchiver: (id: string) => void;
  onDupliquer: (id: string) => void;
}

function FichePlatGestion({
  plat,
  categories,
  nbTablesConcernees,
  archivageBloque,
  estNouveau,
  onFermer,
  onEnregistrer,
  onMasquer,
  onArchiver,
  onDupliquer,
}: FichePlatProps) {
  const [nom, setNom] = useState(plat.nom);
  const [categorieId, setCategorieId] = useState(plat.categorieId ?? '');
  const [description, setDescription] = useState(plat.description);
  const [prix, setPrix] = useState(plat.prix === null ? '' : String(plat.prix));
  const [image, setImage] = useState<string | null>(plat.image);
  const [chargementPhoto, setChargementPhoto] = useState(false);
  const [erreurPhoto, setErreurPhoto] = useState<string | null>(null);
  const [erreurs, setErreurs] = useState<Record<string, string>>({});
  const champFichier = useRef<HTMLInputElement | null>(null);

  const prixNombre = prix === '' ? null : Number(prix.replace(',', '.'));
  const prixChange = !estNouveau && prixNombre !== plat.prix;

  function valider(pourPublier: boolean): boolean {
    const e: Record<string, string> = {};
    if (!nom.trim()) e.nom = 'Le nom est obligatoire.';
    if (pourPublier) {
      if (!categorieId) e.categorie = 'Choisissez une catégorie pour publier ce plat.';
      if (prixNombre === null || Number.isNaN(prixNombre) || prixNombre <= 0) {
        e.prix = 'Un prix supérieur à 0 est obligatoire pour publier.';
      }
    } else if (prix !== '' && (Number.isNaN(prixNombre) || (prixNombre ?? 0) < 0)) {
      e.prix = 'Prix invalide.';
    }
    setErreurs(e);
    return Object.keys(e).length === 0;
  }

  function enregistrer(publier: boolean) {
    if (!valider(publier)) return;
    onEnregistrer(
      {
        ...plat,
        nom: nom.trim(),
        categorieId: categorieId || null,
        description: description.trim(),
        prix: prixNombre !== null && !Number.isNaN(prixNombre) ? prixNombre : null,
        image,
        statut: publier ? 'publie' : plat.statut === 'publie' ? 'publie' : plat.statut,
      },
      publier,
    );
  }

  function choisirPhoto(evenement: React.ChangeEvent<HTMLInputElement>) {
    const fichier = evenement.target.files?.[0];
    if (!fichier) return;
    setErreurPhoto(null);
    if (!fichier.type.startsWith('image/')) {
      setErreurPhoto("Ce fichier n'est pas une image.");
      return;
    }
    if (fichier.size > TAILLE_PHOTO_MAX) {
      setErreurPhoto('Photo trop lourde (1,5 Mo maximum). Le plat reste enregistré sans photo.');
      return;
    }
    setChargementPhoto(true);
    const lecteur = new FileReader();
    lecteur.onload = () => {
      setImage(typeof lecteur.result === 'string' ? lecteur.result : null);
      setChargementPhoto(false);
    };
    lecteur.onerror = () => {
      setErreurPhoto("La photo n'a pas pu être lue. Le plat reste enregistré sans photo.");
      setChargementPhoto(false);
    };
    lecteur.readAsDataURL(fichier);
  }

  const apercu = { nom: nom || 'Nouveau plat', categorieId: categorieId || null, image };

  return (
    <div className="voile voile--centre" onClick={onFermer}>
      <div
        className="fiche-gestion"
        role="dialog"
        aria-modal="true"
        aria-label={estNouveau ? 'Nouveau plat' : 'Modifier ' + plat.nom}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="detail__entete">
          <h2 className="fiche-gestion__titre">{estNouveau ? 'Nouveau plat' : 'Modifier le plat'}</h2>
          {!estNouveau ? <PastilleStatutPlat plat={plat} /> : null}
        </div>

        <div className="champ">
          <label>Photo</label>
          <div className="photo-champ">
            <div className="photo-apercu">
              <Visuel plat={apercu} categories={categories} />
            </div>
            <div className="photo-actions">
              <input
                type="file"
                accept="image/*"
                ref={champFichier}
                onChange={choisirPhoto}
                style={{ display: 'none' }}
              />
              <button
                type="button"
                className="bouton bouton--secondaire bouton--petit"
                onClick={() => champFichier.current?.click()}
              >
                {image ? 'Remplacer la photo' : 'Choisir une photo'}
              </button>
              {image ? (
                <button type="button" className="bouton bouton--secondaire bouton--petit" onClick={() => setImage(null)}>
                  Retirer la photo
                </button>
              ) : null}
              {chargementPhoto ? <span>Lecture de la photo…</span> : null}
              {erreurPhoto ? <span className="champ__erreur">{erreurPhoto}</span> : null}
              {!image && !chargementPhoto && !erreurPhoto ? (
                <span>Sans photo, la carte affiche les initiales du plat sur la teinte de sa catégorie.</span>
              ) : null}
            </div>
          </div>
        </div>

        <div className={'champ' + (erreurs.nom ? ' champ--erreur' : '')}>
          <label htmlFor="g-nom">Nom du plat</label>
          <input
            id="g-nom"
            className="champ-input"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            placeholder="Velouté de courge…"
          />
          {erreurs.nom ? <span className="champ__erreur">{erreurs.nom}</span> : null}
        </div>

        <div className="duo">
          <div className={'champ' + (erreurs.categorie ? ' champ--erreur' : '')}>
            <label htmlFor="g-cat">Catégorie</label>
            <select
              id="g-cat"
              className="champ-select"
              value={categorieId}
              onChange={(e) => setCategorieId(e.target.value)}
            >
              <option value="">Choisir…</option>
              {categories
                .slice()
                .sort(parOrdre)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nom}
                    {c.publiee ? '' : ' (masquée)'}
                  </option>
                ))}
            </select>
            {erreurs.categorie ? <span className="champ__erreur">{erreurs.categorie}</span> : null}
          </div>
          <div className={'champ' + (erreurs.prix ? ' champ--erreur' : '')}>
            <label htmlFor="g-prix">Prix (€)</label>
            <input
              id="g-prix"
              className="champ-input"
              inputMode="decimal"
              value={prix}
              onChange={(e) => setPrix(e.target.value)}
              placeholder="12,50"
            />
            {erreurs.prix ? <span className="champ__erreur">{erreurs.prix}</span> : null}
          </div>
        </div>

        {prixChange && nbTablesConcernees > 0 ? (
          <div className="encart encart--ajuste">
            <strong>{pluriel(nbTablesConcernees, 'table a', 'tables ont')} ce plat dans une demande en attente.</strong>
            <p>
              Le nouveau prix ne s'appliquera qu'aux prochaines demandes : celles en cours gardent le prix affiché au
              client.
            </p>
          </div>
        ) : null}

        <div className="champ">
          <label htmlFor="g-desc">Description</label>
          <textarea
            id="g-desc"
            className="champ-zone"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Deux lignes qui donnent envie. Visible sur la fiche du plat."
          />
          <span className="champ__aide">
            Facultative. Elle n'apparaît que sur la fiche détaillée, pas dans la liste.
          </span>
        </div>

        <div className="fiche-gestion__actions">
          <button type="button" className="bouton bouton--primaire" onClick={() => enregistrer(true)}>
            {plat.statut === 'publie' ? 'Enregistrer les modifications' : 'Publier sur la carte'}
          </button>
          <button type="button" className="bouton bouton--secondaire" onClick={() => enregistrer(false)}>
            Enregistrer en brouillon
          </button>
        </div>

        {!estNouveau ? (
          <div className="fiche-gestion__secondaires">
            {plat.statut === 'publie' ? (
              <button
                type="button"
                className="bouton bouton--secondaire bouton--petit"
                onClick={() => onMasquer(plat.id)}
              >
                Masquer
              </button>
            ) : null}
            <button
              type="button"
              className="bouton bouton--secondaire bouton--petit"
              onClick={() => onDupliquer(plat.id)}
            >
              Dupliquer
            </button>
            {plat.statut !== 'archive' ? (
              <button
                type="button"
                className="bouton bouton--secondaire bouton--petit"
                onClick={() => onArchiver(plat.id)}
                disabled={archivageBloque}
              >
                Archiver
              </button>
            ) : null}
            {archivageBloque ? (
              <span className="champ__aide">Archivage impossible : ce plat est dans une commande en cours.</span>
            ) : null}
          </div>
        ) : null}

        <button type="button" className="lien-retour" onClick={onFermer}>
          Fermer sans enregistrer
        </button>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- suppression de categorie */

function DialogueSuppressionCat({
  categorie,
  categories,
  nbPlats,
  onFermer,
  onDeplacer,
  onMasquerPlats,
}: {
  categorie: Categorie;
  categories: Categorie[];
  nbPlats: number;
  onFermer: () => void;
  onDeplacer: (id: string, cible: string) => void;
  onMasquerPlats: (id: string) => void;
}) {
  const autres = categories.filter((c) => c.id !== categorie.id);
  const [cible, setCible] = useState(autres[0]?.id ?? '');
  return (
    <div className="voile voile--centre" onClick={onFermer}>
      <div
        className="fiche-gestion"
        role="dialog"
        aria-modal="true"
        aria-label="Supprimer la catégorie"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="fiche-gestion__titre">Supprimer « {categorie.nom} »</h2>
        <p className="sous-titre">
          {pluriel(nbPlats, 'plat utilise', 'plats utilisent')} cette catégorie. Elle ne peut pas être supprimée telle
          quelle : choisissez ce qu'il advient de ces plats.
        </p>
        {autres.length > 0 ? (
          <div className="champ">
            <label htmlFor="cat-cible">Déplacer les plats vers</label>
            <select id="cat-cible" className="champ-select" value={cible} onChange={(e) => setCible(e.target.value)}>
              {autres.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nom}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <p className="champ__aide">Aucune autre catégorie où déplacer ces plats.</p>
        )}
        <div className="fiche-gestion__actions">
          {autres.length > 0 ? (
            <button type="button" className="bouton bouton--primaire" onClick={() => onDeplacer(categorie.id, cible)}>
              Déplacer et supprimer
            </button>
          ) : null}
          <button type="button" className="bouton bouton--refus" onClick={() => onMasquerPlats(categorie.id)}>
            Masquer ces plats et supprimer
          </button>
        </div>
        <button type="button" className="lien-retour" onClick={onFermer}>
          Annuler
        </button>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- espace */

export function EspaceGestion({ ardoise }: { ardoise: Ardoise }) {
  const { etat, gestion } = ardoise;
  const [nouvelleCat, setNouvelleCat] = useState('');

  const cats = etat.categories.slice().sort(parOrdre);
  const actifs = etat.plats.filter((p) => p.statut !== 'archive');
  const archives = etat.plats.filter((p) => p.statut === 'archive');
  const enAttente = etat.commandes.filter((c) => c.statut === 'attente' && !c.close);

  const compteurs = {
    enLigne: actifs.filter((p) => p.statut === 'publie' && !estEpuise(p)).length,
    epuises: actifs.filter((p) => p.statut === 'publie' && estEpuise(p)).length,
    masques: actifs.filter((p) => p.statut === 'masque').length,
    brouillons: actifs.filter((p) => p.statut === 'brouillon').length,
    sansPhoto: actifs.filter((p) => p.statut === 'publie' && !p.image).length,
  };

  function correspond(p: Plat): boolean {
    if (etat.filtreCategorie && p.categorieId !== etat.filtreCategorie) return false;
    if (etat.filtreStatut === 'publie') return p.statut === 'publie' && !estEpuise(p);
    if (etat.filtreStatut === 'epuise') return p.statut === 'publie' && estEpuise(p);
    if (etat.filtreStatut === 'masque') return p.statut === 'masque';
    if (etat.filtreStatut === 'brouillon') return p.statut === 'brouillon';
    if (etat.filtreStatut === 'sans-photo') return !p.image;
    return true;
  }

  const platEnFiche: Plat | null =
    etat.fichePlat === 'nouveau'
      ? {
          id: '',
          categorieId: etat.filtreCategorie || cats[0]?.id || null,
          nom: '',
          description: '',
          prix: null,
          image: null,
          statut: 'brouillon',
          epuiseLe: null,
          ordre: 0,
        }
      : etat.fichePlat
        ? (etat.plats.find((p) => p.id === etat.fichePlat) ?? null)
        : null;

  const categorieASupprimer = etat.suppressionCategorie
    ? (etat.categories.find((c) => c.id === etat.suppressionCategorie) ?? null)
    : null;

  return (
    <div className="colonne-gestion">
      <header className="gestion__entete">
        <h1 className="gestion__titre">Gestion de la carte</h1>
        {enAttente.length > 0 ? (
          <span className="gestion__service">
            Service en cours · {pluriel(enAttente.length, 'demande en attente', 'demandes en attente')}
          </span>
        ) : null}
        <div className="gestion__onglets">
          <button
            type="button"
            className="admin__onglet"
            aria-pressed={etat.ongletGestion === 'carte'}
            onClick={() => gestion.onglet('carte')}
          >
            La carte
          </button>
          <button
            type="button"
            className="admin__onglet"
            aria-pressed={etat.ongletGestion === 'categories'}
            onClick={() => gestion.onglet('categories')}
          >
            Catégories
          </button>
          <button
            type="button"
            className="admin__onglet"
            aria-pressed={etat.ongletGestion === 'apercu'}
            onClick={() => gestion.onglet('apercu')}
          >
            Aperçu client
          </button>
          <button
            type="button"
            className="admin__onglet"
            aria-pressed={etat.ongletGestion === 'archives'}
            onClick={() => gestion.onglet('archives')}
          >
            Archives {archives.length > 0 ? '· ' + archives.length : ''}
          </button>
        </div>
      </header>

      <div className="gestion__corps">
        {etat.noticeGestion ? (
          <div className="notice" role="status">
            {etat.noticeGestion}
          </div>
        ) : null}

        {etat.ongletGestion === 'carte' ? (
          <div className="gestion__bloc">
            <div className="compteurs">
              <div className="compteur">
                <b>{compteurs.enLigne}</b>
                <span>en ligne</span>
              </div>
              <div className={'compteur' + (compteurs.epuises > 0 ? ' compteur--attention' : '')}>
                <b>{compteurs.epuises}</b>
                <span>épuisés aujourd'hui</span>
              </div>
              <div className="compteur">
                <b>{compteurs.masques}</b>
                <span>masqués</span>
              </div>
              <div className="compteur">
                <b>{compteurs.brouillons}</b>
                <span>brouillons</span>
              </div>
              <div className="compteur">
                <b>{compteurs.sansPhoto}</b>
                <span>sans photo</span>
              </div>
            </div>

            <div className="barre-outils">
              <select
                className="champ-select"
                value={etat.filtreCategorie}
                onChange={(e) => gestion.filtreCategorie(e.target.value)}
                aria-label="Filtrer par catégorie"
              >
                <option value="">Toutes les catégories</option>
                {cats.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nom}
                  </option>
                ))}
              </select>
              <select
                className="champ-select"
                value={etat.filtreStatut}
                onChange={(e) => gestion.filtreStatut(e.target.value)}
                aria-label="Filtrer par statut"
              >
                <option value="">Tous les statuts</option>
                <option value="publie">En ligne</option>
                <option value="epuise">Épuisés aujourd'hui</option>
                <option value="masque">Masqués</option>
                <option value="brouillon">Brouillons</option>
                <option value="sans-photo">Sans photo</option>
              </select>
              <button type="button" className="bouton bouton--primaire" onClick={() => gestion.ouvrirFiche('nouveau')}>
                Nouveau plat
              </button>
            </div>

            {cats.length === 0 ? (
              <div className="vide">
                <span className="vide__titre">Votre carte est vide.</span>
                Commencez par créer une catégorie dans l'onglet « Catégories ».
              </div>
            ) : null}

            {cats.map((cat) => {
              const liste = actifs
                .filter((p) => p.categorieId === cat.id && correspond(p))
                .slice()
                .sort(parOrdre);
              if (liste.length === 0 && (etat.filtreCategorie || etat.filtreStatut)) return null;
              return (
                <section className="groupe-cat" key={cat.id}>
                  <h2 className="groupe-cat__titre">
                    {cat.nom}
                    <span className="groupe-cat__nombre">{liste.length}</span>
                    {!cat.publiee ? (
                      <span className="groupe-cat__masquee">
                        catégorie masquée : rien de cette section n'est visible
                      </span>
                    ) : null}
                  </h2>
                  {liste.length === 0 ? (
                    <div className="vide">Aucun plat dans cette catégorie.</div>
                  ) : (
                    liste.map((p, i) => (
                      <article
                        className={'ligne-plat' + (p.statut === 'publie' ? '' : ' ligne-plat--inactif')}
                        key={p.id}
                      >
                        <div className="rang">
                          <button
                            type="button"
                            onClick={() => gestion.deplacerPlat(p.id, -1)}
                            disabled={i === 0}
                            aria-label="Monter"
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            onClick={() => gestion.deplacerPlat(p.id, 1)}
                            disabled={i === liste.length - 1}
                            aria-label="Descendre"
                          >
                            ▼
                          </button>
                        </div>
                        <div className="ligne-plat__vignette">
                          <Visuel plat={p} categories={etat.categories} taille="petit" />
                        </div>
                        <div className="ligne-plat__texte">
                          <span className="ligne-plat__nom">{p.nom}</span>
                          <span className="ligne-plat__meta">
                            <span>{prixFr(p.prix)}</span>
                            {!p.image ? <span>sans photo</span> : null}
                            {!p.description ? <span>sans description</span> : null}
                          </span>
                        </div>
                        <PastilleStatutPlat plat={p} />
                        <div className="ligne-plat__actions">
                          {p.statut === 'masque' ? (
                            <button
                              type="button"
                              className="bouton bouton--secondaire bouton--petit"
                              onClick={() => gestion.republier(p.id)}
                            >
                              Republier
                            </button>
                          ) : p.statut === 'publie' ? (
                            <button
                              type="button"
                              className="bouton bouton--secondaire bouton--petit"
                              onClick={() => gestion.masquer(p.id)}
                            >
                              Masquer
                            </button>
                          ) : null}
                          <button
                            type="button"
                            className="bouton bouton--secondaire bouton--petit"
                            onClick={() => gestion.ouvrirFiche(p.id)}
                          >
                            Modifier
                          </button>
                        </div>
                      </article>
                    ))
                  )}
                </section>
              );
            })}
          </div>
        ) : null}

        {etat.ongletGestion === 'categories' ? (
          <div className="gestion__bloc">
            <p className="sous-titre">
              L'ordre des catégories est celui de la carte client. Masquer une catégorie retire toute sa section sans
              toucher au statut de ses plats.
            </p>
            <div className="barre-outils">
              <input
                className="champ-input"
                style={{ flex: 1 }}
                value={nouvelleCat}
                onChange={(e) => setNouvelleCat(e.target.value)}
                placeholder="Nom de la nouvelle catégorie"
                aria-label="Nom de la nouvelle catégorie"
              />
              <button
                type="button"
                className="bouton bouton--primaire"
                onClick={() => {
                  if (nouvelleCat.trim()) {
                    gestion.creerCategorie(nouvelleCat.trim());
                    setNouvelleCat('');
                  }
                }}
                disabled={!nouvelleCat.trim()}
              >
                Créer
              </button>
            </div>
            {cats.length === 0 ? (
              <div className="vide">
                <span className="vide__titre">Aucune catégorie.</span>
                Entrées, Plats, Desserts, Boissons ? Créez la première ci-dessus.
              </div>
            ) : null}
            {cats.map((cat, i) => {
              const nb = etat.plats.filter((p) => p.categorieId === cat.id && p.statut !== 'archive').length;
              return (
                <article className="cat-ligne" key={cat.id}>
                  <div className="rang">
                    <button
                      type="button"
                      onClick={() => gestion.deplacerCategorie(cat.id, -1)}
                      disabled={i === 0}
                      aria-label="Monter"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      onClick={() => gestion.deplacerCategorie(cat.id, 1)}
                      disabled={i === cats.length - 1}
                      aria-label="Descendre"
                    >
                      ▼
                    </button>
                  </div>
                  <input
                    className="champ-input cat-ligne__nom"
                    value={cat.nom}
                    onChange={(e) => gestion.renommerCategorie(cat.id, e.target.value)}
                    aria-label={'Nom de la catégorie ' + cat.nom}
                  />
                  <span className="cat-ligne__nombre">{pluriel(nb, 'plat', 'plats')}</span>
                  <button
                    type="button"
                    className="bouton bouton--secondaire bouton--petit"
                    onClick={() => gestion.basculerCategorie(cat.id)}
                  >
                    {cat.publiee ? 'Masquer' : 'Afficher'}
                  </button>
                  <button
                    type="button"
                    className="bouton bouton--refus bouton--petit"
                    onClick={() => gestion.demanderSuppressionCategorie(cat.id)}
                  >
                    Supprimer
                  </button>
                </article>
              );
            })}
          </div>
        ) : null}

        {etat.ongletGestion === 'apercu' ? (
          <div className="gestion__bloc">
            <p className="sous-titre">
              La carte telle que les tables la voient en ce moment. Les plats masqués, en brouillon ou archivés n'y sont
              pas.
            </p>
            <div className="apercu-cadre">
              <div className="apercu-corps">
                <CarteClient
                  categories={etat.categories}
                  plats={etat.plats}
                  panier={{}}
                  apercu
                  onAjouter={() => undefined}
                  onRetirer={() => undefined}
                  onOuvrir={() => undefined}
                />
              </div>
            </div>
          </div>
        ) : null}

        {etat.ongletGestion === 'archives' ? (
          <div className="gestion__bloc">
            <p className="sous-titre">
              Les plats archivés sortent de la carte et des listes, mais restent lisibles pour l'historique des
              commandes.
            </p>
            {archives.length === 0 ? (
              <div className="vide">Aucun plat archivé.</div>
            ) : (
              archives.map((p) => (
                <article className="ligne-plat ligne-plat--inactif" key={p.id}>
                  <div className="ligne-plat__vignette">
                    <Visuel plat={p} categories={etat.categories} taille="petit" />
                  </div>
                  <div className="ligne-plat__texte">
                    <span className="ligne-plat__nom">{p.nom}</span>
                    <span className="ligne-plat__meta">
                      <span>{prixFr(p.prix)}</span>
                    </span>
                  </div>
                  <PastilleStatutPlat plat={p} />
                  <div className="ligne-plat__actions">
                    <button
                      type="button"
                      className="bouton bouton--secondaire bouton--petit"
                      onClick={() => gestion.restaurer(p.id)}
                    >
                      Restaurer en brouillon
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        ) : null}
      </div>

      {etat.annulation ? (
        <div className="annulation" role="status">
          <span>{etat.annulation.texte}</span>
          <button type="button" onClick={gestion.annulerDerniereAction}>
            Annuler
          </button>
        </div>
      ) : null}

      {platEnFiche ? (
        <FichePlatGestion
          key={platEnFiche.id || 'nouveau'}
          plat={platEnFiche}
          categories={etat.categories}
          estNouveau={etat.fichePlat === 'nouveau'}
          nbTablesConcernees={enAttente.filter((c) => c.lignes.some((l) => l.id === platEnFiche.id)).length}
          archivageBloque={etat.commandes.some(
            (c) =>
              !c.close &&
              (c.statut === 'attente' || c.statut === 'cuisine') &&
              c.lignes.some((l) => l.id === platEnFiche.id),
          )}
          onFermer={gestion.fermerFiche}
          onEnregistrer={gestion.enregistrer}
          onMasquer={gestion.masquer}
          onArchiver={gestion.archiver}
          onDupliquer={gestion.dupliquer}
        />
      ) : null}

      {categorieASupprimer ? (
        <DialogueSuppressionCat
          categorie={categorieASupprimer}
          categories={cats}
          nbPlats={
            etat.plats.filter((p) => p.categorieId === categorieASupprimer.id && p.statut !== 'archive').length
          }
          onFermer={gestion.fermerSuppression}
          onDeplacer={gestion.deplacerPlatsEtSupprimer}
          onMasquerPlats={gestion.masquerPlatsEtSupprimer}
        />
      ) : null}
    </div>
  );
}
