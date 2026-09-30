/**
 * Etat de l'application et actions metier. Aucun composant ne modifie l'etat directement :
 * il appelle une action, qui applique la regle et met a jour l'etat partage par les quatre espaces.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  Addition,
  Annulation,
  AppelSalle,
  Categorie,
  Commande,
  EcranClient,
  EcranCuisine,
  Espace,
  LigneCommande,
  MoyenPaiement,
  OngletGestion,
  OngletSalle,
  Panier,
  Plat,
  StatutPlat,
} from '../types';
import { jourDeService, prixFr, pluriel } from '../lib/format';
import {
  additionDe,
  calculerAjustements,
  commandable,
  commandesDe,
  estActive,
  fusionnerLignes,
  montantAddition,
} from '../lib/regles';
import { chargerCarte, chargerService } from '../services';
import {
  DELAI_ANNULATION,
  libelleMoyen,
  prochainId,
  TABLE_DEFAUT,
} from '../donnees/constantes';

export interface EtatArdoise {
  chargement: 'en-cours' | 'pret' | 'erreur';
  erreur: string | null;

  categories: Categorie[];
  plats: Plat[];
  commandes: Commande[];
  additions: Addition[];
  appels: AppelSalle[];

  table: number;
  panier: Panier;
  ecranClient: EcranClient;
  platOuvert: string | null;
  categorieActive: string | null;
  boissonsDabord: boolean;
  cibleAjout: string | null;
  alerteClient: string | null;
  messageClient: string | null;
  feuilleAppel: boolean;
  appelClient: string | null;

  ongletSalle: OngletSalle;
  ficheTable: number | null;
  detailCommande: string | null;
  noticeSalle: string | null;

  ecranCuisine: EcranCuisine;

  ongletGestion: OngletGestion;
  filtreCategorie: string;
  filtreStatut: string;
  fichePlat: string | null;
  suppressionCategorie: string | null;
  annulation: Annulation | null;
  noticeGestion: string | null;

  espace: Espace;
}

const etatInitial: EtatArdoise = {
  chargement: 'en-cours',
  erreur: null,
  categories: [],
  plats: [],
  commandes: [],
  additions: [],
  appels: [],
  table: TABLE_DEFAUT,
  panier: {},
  ecranClient: 'table',
  platOuvert: null,
  categorieActive: null,
  boissonsDabord: false,
  cibleAjout: null,
  alerteClient: null,
  messageClient: null,
  feuilleAppel: false,
  appelClient: null,
  ongletSalle: 'plan',
  ficheTable: null,
  detailCommande: null,
  noticeSalle: null,
  ecranCuisine: 'file',
  ongletGestion: 'carte',
  filtreCategorie: '',
  filtreStatut: '',
  fichePlat: null,
  suppressionCategorie: null,
  annulation: null,
  noticeGestion: null,
  espace: 'client',
};

export function useArdoise() {
  const [etat, setEtat] = useState<EtatArdoise>(etatInitial);
  const [maintenant, setMaintenant] = useState(Date.now());

  const modifier = useCallback((partiel: Partial<EtatArdoise>) => {
    setEtat((e) => ({ ...e, ...partiel }));
  }, []);

  /* ------------------------------------------------------------ chargement */

  const charger = useCallback(async () => {
    setEtat((e) => ({ ...e, chargement: 'en-cours', erreur: null }));
    try {
      const [carte, service] = await Promise.all([chargerCarte(), chargerService()]);
      setEtat((e) => ({
        ...e,
        chargement: 'pret',
        erreur: null,
        categories: carte.categories,
        plats: carte.plats,
        commandes: service.commandes,
        additions: service.additions,
        appels: service.appels,
      }));
    } catch (erreur) {
      setEtat((e) => ({
        ...e,
        chargement: 'erreur',
        erreur: erreur instanceof Error ? erreur.message : 'Chargement impossible.',
      }));
    }
  }, []);

  useEffect(() => {
    void charger();
  }, [charger]);

  /** Horloge du service : alimente les anciennetes affichees partout. */
  useEffect(() => {
    const minuterie = window.setInterval(() => setMaintenant(Date.now()), 1000);
    return () => window.clearInterval(minuterie);
  }, []);

  useEffect(() => {
    if (!etat.noticeSalle) return;
    const t = window.setTimeout(() => modifier({ noticeSalle: null }), 6000);
    return () => window.clearTimeout(t);
  }, [etat.noticeSalle, modifier]);

  useEffect(() => {
    if (!etat.noticeGestion) return;
    const t = window.setTimeout(() => modifier({ noticeGestion: null }), 6000);
    return () => window.clearTimeout(t);
  }, [etat.noticeGestion, modifier]);

  useEffect(() => {
    if (!etat.annulation) return;
    const t = window.setTimeout(() => modifier({ annulation: null }), DELAI_ANNULATION);
    return () => window.clearTimeout(t);
  }, [etat.annulation, modifier]);

  /* ------------------------------------------------------------ outils internes */

  const platsParId = useMemo(
    () => Object.fromEntries(etat.plats.map((p) => [p.id, p])) as Record<string, Plat>,
    [etat.plats],
  );

  /** Retire un plat des paniers et signale les commandes en attente qui le contiennent. */
  const retirerDeLaCirculation = useCallback((platId: string, nom: string) => {
    setEtat((e) => {
      const panier = { ...e.panier };
      let alerteClient = e.alerteClient;
      if (panier[platId]) {
        delete panier[platId];
        alerteClient = nom;
      }
      return {
        ...e,
        panier,
        alerteClient,
        commandes: e.commandes.map((c) =>
          c.statut === 'attente' && c.lignes.some((l) => l.id === platId)
            ? { ...c, lignes: c.lignes.map((l) => (l.id === platId ? { ...l, indispo: true } : l)) }
            : c,
        ),
      };
    });
  }, []);

  const remettreEnCirculation = useCallback((platId: string) => {
    setEtat((e) => ({
      ...e,
      commandes: e.commandes.map((c) => ({
        ...c,
        lignes: c.lignes.map((l) => (l.id === platId ? { ...l, indispo: false } : l)),
      })),
    }));
  }, []);

  const ouvrirAddition = useCallback((table: number) => {
    setEtat((e) =>
      e.additions.some((a) => a.table === table && !a.close)
        ? e
        : {
            ...e,
            additions: e.additions.concat([
              {
                id: prochainId('add'),
                table,
                ouverteA: Date.now(),
                statut: 'ouverte',
                reglement: null,
                close: false,
                fermeeA: null,
              },
            ]),
          },
    );
  }, []);

  /* ------------------------------------------------------------ actions client */

  const actionsClient = useMemo(
    () => ({
      choisirTable: (numero: number) => modifier({ table: numero }),
      validerTable: () => modifier({ ecranClient: 'carte' }),
      changerTable: () => modifier({ ecranClient: 'table' }),

      naviguer: (destination: EcranClient | 'carte-boissons') => {
        if (destination === 'carte-boissons') {
          modifier({ boissonsDabord: true, ecranClient: 'carte' });
          return;
        }
        modifier({
          ecranClient: destination,
          boissonsDabord: destination === 'carte' ? false : undefined,
        } as Partial<EtatArdoise>);
      },

      ouvrirPlat: (platId: string) => modifier({ platOuvert: platId, ecranClient: 'plat' }),
      categorieActive: (categorieId: string) => modifier({ categorieActive: categorieId }),

      ajouter: (platId: string) =>
        setEtat((e) => ({ ...e, panier: { ...e.panier, [platId]: (e.panier[platId] ?? 0) + 1 } })),

      retirer: (platId: string) =>
        setEtat((e) => {
          const panier = { ...e.panier };
          panier[platId] = (panier[platId] ?? 0) - 1;
          if (panier[platId] <= 0) delete panier[platId];
          return { ...e, panier };
        }),

      envoyer: (lignes: LigneCommande[]) => {
        ouvrirAddition(etat.table);
        setEtat((e) => {
          const cible = e.cibleAjout
            ? e.commandes.find((c) => c.id === e.cibleAjout && c.statut === 'attente')
            : undefined;

          if (cible) {
            return {
              ...e,
              commandes: e.commandes.map((c) =>
                c.id === cible.id
                  ? { ...c, lignes: fusionnerLignes(c.lignes, lignes), modifieeA: Date.now() }
                  : c,
              ),
              panier: {},
              cibleAjout: null,
              ecranClient: 'statut',
              messageClient: "Ajout envoyé. Votre demande est à jour, l'équipe confirmera l'ensemble.",
            };
          }

          const messageClient = e.cibleAjout
            ? "Votre demande venait d'être confirmée : ces articles partent comme une nouvelle demande."
            : null;

          return {
            ...e,
            commandes: e.commandes.concat([
              {
                id: prochainId('cmd'),
                table: e.table,
                statut: 'attente',
                origine: 'client',
                lignes: lignes.map((l) => ({ ...l, indispo: false })),
                envoyeeA: Date.now(),
                confirmeeA: null,
                servieA: null,
                modifieeA: null,
                ajustements: null,
                motif: null,
                motifAnnulation: null,
                close: false,
              },
            ]),
            panier: {},
            cibleAjout: null,
            boissonsDabord: false,
            ecranClient: 'statut',
            messageClient,
          };
        });
      },

      ouvrirAjout: (commandeId: string) =>
        modifier({ cibleAjout: commandeId, boissonsDabord: false, messageClient: null, ecranClient: 'carte' }),

      annulerAjout: () => modifier({ cibleAjout: null, panier: {}, ecranClient: 'statut' }),

      modifierDemande: (commandeId: string) =>
        setEtat((e) => {
          const cmd = e.commandes.find((c) => c.id === commandeId);
          if (!cmd || cmd.statut !== 'attente') return e;
          const panier = { ...e.panier };
          cmd.lignes.forEach((l) => {
            const plat = e.plats.find((p) => p.id === l.id);
            if (plat && commandable(plat, e.categories)) panier[l.id] = (panier[l.id] ?? 0) + l.qte;
          });
          return {
            ...e,
            panier,
            commandes: e.commandes.filter((c) => c.id !== commandeId),
            cibleAjout: null,
            ecranClient: 'panier',
          };
        }),

      demanderAddition: (additionId: string) =>
        setEtat((e) => ({
          ...e,
          additions: e.additions.map((a) => (a.id === additionId ? { ...a, statut: 'demandee' } : a)),
          noticeSalle:
            'Table ' + (e.additions.find((a) => a.id === additionId)?.table ?? '') + ' · addition demandée.',
        })),

      ouvrirFeuilleAppel: () => modifier({ feuilleAppel: true }),
      fermerFeuilleAppel: () => modifier({ feuilleAppel: false }),

      envoyerAppel: (sujet: string) =>
        setEtat((e) => {
          const id = prochainId('app');
          return {
            ...e,
            appels: e.appels.concat([{ id, table: e.table, sujet, vu: false, a: Date.now() }]),
            appelClient: id,
            feuilleAppel: false,
          };
        }),

      accuserAppel: () => modifier({ appelClient: null }),
      fermerAlerte: () => modifier({ alerteClient: null }),
      fermerMessage: () => modifier({ messageClient: null }),
    }),
    [etat.table, modifier, ouvrirAddition],
  );

  /* ------------------------------------------------------------ actions salle */

  const actionsSalle = useMemo(
    () => ({
      onglet: (onglet: OngletSalle) => modifier({ ongletSalle: onglet }),
      ouvrirFiche: (table: number) => modifier({ ficheTable: table }),
      fermerFiche: () => modifier({ ficheTable: null }),
      ouvrirDetail: (commandeId: string) => modifier({ detailCommande: commandeId }),
      fermerDetail: () => modifier({ detailCommande: null }),

      confirmer: (commandeId: string) =>
        setEtat((e) => ({
          ...e,
          detailCommande: null,
          commandes: e.commandes.map((c) =>
            c.id === commandeId
              ? { ...c, statut: 'cuisine', confirmeeA: Date.now(), ajustements: null, modifieeA: null }
              : c,
          ),
        })),

      confirmerAvecAjustement: (commandeId: string, lignes: LigneCommande[]) =>
        setEtat((e) => {
          const origine = e.commandes.find((c) => c.id === commandeId);
          if (!origine) return e;
          const ajustements = calculerAjustements(origine.lignes, lignes);
          return {
            ...e,
            detailCommande: null,
            commandes: e.commandes.map((c) =>
              c.id === commandeId
                ? {
                    ...c,
                    statut: 'cuisine',
                    confirmeeA: Date.now(),
                    modifieeA: null,
                    lignes: lignes.map((l) => ({ ...l, indispo: false })),
                    ajustements,
                  }
                : c,
            ),
          };
        }),

      refuser: (commandeId: string, motif: string) =>
        setEtat((e) => {
          const cmd = e.commandes.find((c) => c.id === commandeId);
          return {
            ...e,
            detailCommande: null,
            commandes: e.commandes.map((c) => (c.id === commandeId ? { ...c, statut: 'refusee', motif } : c)),
            noticeSalle: cmd
              ? 'Table ' + cmd.table + ' · demande refusée. Le client est prévenu, vous passez à la table.'
              : null,
          };
        }),

      servir: (commandeId: string) =>
        setEtat((e) => ({
          ...e,
          commandes: e.commandes.map((c) =>
            c.id === commandeId ? { ...c, statut: 'servie', servieA: Date.now() } : c,
          ),
        })),

      annuler: (commandeId: string, motif: string) =>
        setEtat((e) => {
          const cmd = e.commandes.find((c) => c.id === commandeId);
          return {
            ...e,
            commandes: e.commandes.map((c) =>
              c.id === commandeId ? { ...c, statut: 'annulee', motifAnnulation: motif } : c,
            ),
            noticeSalle: cmd
              ? 'Table ' + cmd.table + ' · commande annulée (' + motif.toLowerCase() + '). Le client est prévenu.'
              : null,
          };
        }),

      marquerAppelVu: (appelId: string) =>
        setEtat((e) => ({ ...e, appels: e.appels.map((a) => (a.id === appelId ? { ...a, vu: true } : a)) })),

      ouvrirTable: (table: number) => ouvrirAddition(table),

      preparerAddition: (additionId: string) =>
        setEtat((e) => ({
          ...e,
          additions: e.additions.map((a) => (a.id === additionId ? { ...a, statut: 'demandee' } : a)),
        })),

      saisirCommande: (table: number, lignes: LigneCommande[]) => {
        ouvrirAddition(table);
        setEtat((e) => {
          const t = Date.now();
          return {
            ...e,
            commandes: e.commandes.concat([
              {
                id: prochainId('cmd'),
                table,
                statut: 'cuisine',
                origine: 'salle',
                lignes: lignes.map((l) => ({ ...l, indispo: false })),
                envoyeeA: t,
                confirmeeA: t,
                servieA: null,
                modifieeA: null,
                ajustements: null,
                motif: null,
                motifAnnulation: null,
                close: false,
              },
            ]),
            noticeSalle: 'Table ' + table + ' · commande prise en salle, envoyée en cuisine.',
          };
        });
      },

      encaisser: (additionId: string, moyen: MoyenPaiement, montant: number) =>
        setEtat((e) => {
          const add = e.additions.find((a) => a.id === additionId);
          return {
            ...e,
            additions: e.additions.map((a) =>
              a.id === additionId
                ? { ...a, statut: 'reglee', reglement: { moyen, montant, a: Date.now() } }
                : a,
            ),
            noticeSalle: add
              ? 'Table ' + add.table + ' · ' + prixFr(montant) + ' encaissés en ' + libelleMoyen(moyen).toLowerCase() + '.'
              : null,
          };
        }),

      liberer: (additionId: string, sansEncaisser: boolean) =>
        setEtat((e) => {
          const add = e.additions.find((a) => a.id === additionId);
          if (!add) return e;

          const actives = commandesDe(e.commandes, add.table).filter(estActive);
          if (actives.length > 0) {
            return {
              ...e,
              noticeSalle:
                'Table ' +
                add.table +
                ' · ' +
                pluriel(actives.length, 'commande encore en cours', 'commandes encore en cours') +
                '. Servez ou annulez avant de libérer.',
            };
          }
          if (!sansEncaisser && add.statut !== 'reglee') {
            return {
              ...e,
              noticeSalle:
                'Table ' + add.table + " · addition non réglée. Utilisez « Libérer sans encaisser » si le client est parti.",
            };
          }

          const clientConcerne = add.table === e.table;
          return {
            ...e,
            additions: e.additions.map((a) =>
              a.id === additionId
                ? { ...a, close: true, fermeeA: Date.now(), statut: a.statut === 'reglee' ? 'reglee' : 'non-reglee' }
                : a,
            ),
            commandes: e.commandes.map((c) => (c.table === add.table && !c.close ? { ...c, close: true } : c)),
            ficheTable: null,
            panier: clientConcerne ? {} : e.panier,
            cibleAjout: clientConcerne ? null : e.cibleAjout,
            messageClient: clientConcerne ? null : e.messageClient,
            ecranClient: clientConcerne ? 'table' : e.ecranClient,
            noticeSalle:
              'Table ' + add.table + ' · libérée' + (add.statut === 'reglee' ? '.' : ', addition non réglée.'),
          };
        }),

      basculerEpuise: (platId: string, origine: 'salle' | 'cuisine') => {
        const plat = platsParId[platId];
        if (!plat) return;
        const devientEpuise = plat.epuiseLe !== jourDeService();
        setEtat((e) => ({
          ...e,
          plats: e.plats.map((p) => (p.id === platId ? { ...p, epuiseLe: devientEpuise ? jourDeService() : null } : p)),
          noticeSalle:
            origine === 'cuisine'
              ? devientEpuise
                ? 'La cuisine a retiré « ' + plat.nom + ' » de la carte.'
                : 'La cuisine a remis « ' + plat.nom + ' » à la carte.'
              : e.noticeSalle,
        }));
        if (devientEpuise) retirerDeLaCirculation(platId, plat.nom);
        else remettreEnCirculation(platId);
      },
    }),
    [modifier, ouvrirAddition, platsParId, remettreEnCirculation, retirerDeLaCirculation],
  );

  /* ------------------------------------------------------------ actions cuisine */

  const actionsCuisine = useMemo(
    () => ({
      ecran: (ecran: EcranCuisine) => modifier({ ecranCuisine: ecran }),
      marquerPret: (commandeId: string) =>
        setEtat((e) => ({
          ...e,
          commandes: e.commandes.map((c) => (c.id === commandeId ? { ...c, statut: 'pret' } : c)),
        })),
    }),
    [modifier],
  );

  /* ------------------------------------------------------------ actions gestion */

  const actionsGestion = useMemo(
    () => ({
      onglet: (onglet: OngletGestion) => modifier({ ongletGestion: onglet }),
      filtreCategorie: (id: string) => modifier({ filtreCategorie: id }),
      filtreStatut: (statut: string) => modifier({ filtreStatut: statut }),
      ouvrirFiche: (id: string | null) => modifier({ fichePlat: id }),
      fermerFiche: () => modifier({ fichePlat: null }),

      enregistrer: (valeurs: Plat & { id?: string }, publier: boolean) =>
        setEtat((e) => {
          if (!valeurs.id) {
            const memeCategorie = e.plats.filter((p) => p.categorieId === valeurs.categorieId);
            const ordre = memeCategorie.reduce((max, p) => Math.max(max, p.ordre), 0) + 1;
            const nouveau: Plat = { ...valeurs, id: prochainId('plat'), ordre, epuiseLe: null };
            return {
              ...e,
              plats: e.plats.concat([nouveau]),
              fichePlat: null,
              noticeGestion: publier
                ? '« ' + valeurs.nom + ' » est en ligne sur la carte des tables.'
                : '« ' + valeurs.nom + ' » est enregistré en brouillon.',
            };
          }
          const avant = e.plats.find((p) => p.id === valeurs.id)?.statut ?? null;
          return {
            ...e,
            plats: e.plats.map((p) => (p.id === valeurs.id ? { ...p, ...valeurs } : p)),
            fichePlat: null,
            noticeGestion:
              publier && avant !== 'publie'
                ? '« ' + valeurs.nom + ' » est en ligne sur la carte des tables.'
                : publier
                  ? 'Modifications enregistrées et visibles par les tables.'
                  : 'Modifications enregistrées.',
          };
        }),

      masquer: (platId: string) => {
        const plat = platsParId[platId];
        if (!plat) return;
        const avant = plat.statut;
        setEtat((e) => ({
          ...e,
          plats: e.plats.map((p) => (p.id === platId ? { ...p, statut: 'masque' } : p)),
          fichePlat: null,
          annulation: {
            texte: '« ' + plat.nom + ' » est masqué : il a disparu de la carte des tables.',
            action: () => {
              setEtat((e2) => ({
                ...e2,
                plats: e2.plats.map((p) => (p.id === platId ? { ...p, statut: avant } : p)),
              }));
              remettreEnCirculation(platId);
            },
          },
        }));
        retirerDeLaCirculation(platId, plat.nom);
      },

      republier: (platId: string) => {
        setEtat((e) => ({
          ...e,
          plats: e.plats.map((p) => (p.id === platId ? { ...p, statut: 'publie' } : p)),
          noticeGestion: 'Plat republié : il est de nouveau sur la carte des tables.',
        }));
        remettreEnCirculation(platId);
      },

      archiver: (platId: string) => {
        const plat = platsParId[platId];
        if (!plat) return;
        const avant = plat.statut;
        setEtat((e) => {
          const bloque = e.commandes.some(
            (c) => !c.close && (c.statut === 'attente' || c.statut === 'cuisine') && c.lignes.some((l) => l.id === platId),
          );
          if (bloque) {
            return { ...e, noticeGestion: 'Archivage impossible : ce plat est dans une commande en cours.' };
          }
          return {
            ...e,
            plats: e.plats.map((p) => (p.id === platId ? { ...p, statut: 'archive' } : p)),
            fichePlat: null,
            annulation: {
              texte: '« ' + plat.nom + ' » est archivé.',
              action: () => {
                setEtat((e2) => ({
                  ...e2,
                  plats: e2.plats.map((p) => (p.id === platId ? { ...p, statut: avant } : p)),
                }));
                remettreEnCirculation(platId);
              },
            },
          };
        });
        retirerDeLaCirculation(platId, plat.nom);
      },

      restaurer: (platId: string) =>
        setEtat((e) => ({
          ...e,
          plats: e.plats.map((p) => (p.id === platId ? { ...p, statut: 'brouillon' } : p)),
          noticeGestion: "Plat restauré en brouillon : il n'est pas encore sur la carte.",
        })),

      dupliquer: (platId: string) =>
        setEtat((e) => {
          const plat = e.plats.find((p) => p.id === platId);
          if (!plat) return e;
          const memeCategorie = e.plats.filter((p) => p.categorieId === plat.categorieId);
          const ordre = memeCategorie.reduce((max, p) => Math.max(max, p.ordre), 0) + 1;
          const copie: Plat = {
            ...plat,
            id: prochainId('plat'),
            nom: plat.nom + ' (copie)',
            statut: 'brouillon',
            epuiseLe: null,
            ordre,
          };
          return { ...e, plats: e.plats.concat([copie]), fichePlat: copie.id, noticeGestion: 'Copie créée en brouillon.' };
        }),

      deplacerPlat: (platId: string, sens: number) =>
        setEtat((e) => {
          const plat = e.plats.find((p) => p.id === platId);
          if (!plat) return e;
          const freres = e.plats
            .filter((p) => p.categorieId === plat.categorieId && p.statut !== 'archive')
            .slice()
            .sort((a, b) => a.ordre - b.ordre);
          const index = freres.findIndex((p) => p.id === platId);
          const cible = freres[index + sens];
          if (!cible) return e;
          return {
            ...e,
            plats: e.plats.map((p) => {
              if (p.id === plat.id) return { ...p, ordre: cible.ordre };
              if (p.id === cible.id) return { ...p, ordre: plat.ordre };
              return p;
            }),
          };
        }),

      creerCategorie: (nom: string) =>
        setEtat((e) => ({
          ...e,
          categories: e.categories.concat([
            { id: prochainId('cat'), nom, ordre: e.categories.reduce((m, c) => Math.max(m, c.ordre), 0) + 1, publiee: true },
          ]),
          noticeGestion: 'Catégorie « ' + nom + ' » créée.',
        })),

      renommerCategorie: (id: string, nom: string) =>
        setEtat((e) => ({ ...e, categories: e.categories.map((c) => (c.id === id ? { ...c, nom } : c)) })),

      basculerCategorie: (id: string) => {
        const cat = etat.categories.find((c) => c.id === id);
        setEtat((e) => ({
          ...e,
          categories: e.categories.map((c) => (c.id === id ? { ...c, publiee: !c.publiee } : c)),
          noticeGestion: cat
            ? cat.publiee
              ? '« ' + cat.nom + ' » est masquée : toute la section a disparu de la carte des tables.'
              : '« ' + cat.nom + ' » est de nouveau visible.'
            : null,
        }));
        if (cat?.publiee) {
          etat.plats.filter((p) => p.categorieId === id).forEach((p) => retirerDeLaCirculation(p.id, p.nom));
        } else {
          etat.plats.filter((p) => p.categorieId === id).forEach((p) => remettreEnCirculation(p.id));
        }
      },

      deplacerCategorie: (id: string, sens: number) =>
        setEtat((e) => {
          const triees = e.categories.slice().sort((a, b) => a.ordre - b.ordre);
          const index = triees.findIndex((c) => c.id === id);
          const courante = triees[index];
          const cible = triees[index + sens];
          if (!courante || !cible) return e;
          return {
            ...e,
            categories: e.categories.map((c) => {
              if (c.id === courante.id) return { ...c, ordre: cible.ordre };
              if (c.id === cible.id) return { ...c, ordre: courante.ordre };
              return c;
            }),
          };
        }),

      demanderSuppressionCategorie: (id: string) =>
        setEtat((e) => {
          const cat = e.categories.find((c) => c.id === id);
          const nb = e.plats.filter((p) => p.categorieId === id && p.statut !== 'archive').length;
          if (nb === 0) {
            return {
              ...e,
              categories: e.categories.filter((c) => c.id !== id),
              noticeGestion: cat ? 'Catégorie « ' + cat.nom + ' » supprimée.' : null,
            };
          }
          return { ...e, suppressionCategorie: id };
        }),

      fermerSuppression: () => modifier({ suppressionCategorie: null }),

      deplacerPlatsEtSupprimer: (id: string, cible: string) =>
        setEtat((e) => ({
          ...e,
          plats: e.plats.map((p) => (p.categorieId === id ? { ...p, categorieId: cible } : p)),
          categories: e.categories.filter((c) => c.id !== id),
          suppressionCategorie: null,
          noticeGestion: 'Plats déplacés, catégorie supprimée.',
        })),

      masquerPlatsEtSupprimer: (id: string) => {
        etat.plats
          .filter((p) => p.categorieId === id && p.statut === 'publie')
          .forEach((p) => retirerDeLaCirculation(p.id, p.nom));
        setEtat((e) => ({
          ...e,
          plats: e.plats.map((p) =>
            p.categorieId === id
              ? { ...p, categorieId: null, statut: (p.statut === 'archive' ? 'archive' : 'masque') as StatutPlat }
              : p,
          ),
          categories: e.categories.filter((c) => c.id !== id),
          suppressionCategorie: null,
          noticeGestion: 'Plats masqués, catégorie supprimée. Ils attendent une nouvelle catégorie pour repasser en ligne.',
        }));
      },

      annulerDerniereAction: () => {
        etat.annulation?.action();
        modifier({ annulation: null });
      },
    }),
    [etat.annulation, etat.categories, etat.plats, modifier, platsParId, remettreEnCirculation, retirerDeLaCirculation],
  );

  /* ------------------------------------------------------------ demonstration */

  const rejouer = useCallback(() => {
    setEtat({ ...etatInitial });
    void charger();
  }, [charger]);

  const changerEspace = useCallback((espace: Espace) => modifier({ espace }), [modifier]);

  /* ------------------------------------------------------------ vues derivees */

  const additionCliente = useMemo(
    () => additionDe(etat.additions, etat.table),
    [etat.additions, etat.table],
  );

  const montantClient = useMemo(
    () => montantAddition(etat.commandes, etat.table),
    [etat.commandes, etat.table],
  );

  return {
    etat,
    maintenant,
    additionCliente,
    montantClient,
    charger,
    rejouer,
    changerEspace,
    client: actionsClient,
    salle: actionsSalle,
    cuisine: actionsCuisine,
    gestion: actionsGestion,
  };
}

export type Ardoise = ReturnType<typeof useArdoise>;
