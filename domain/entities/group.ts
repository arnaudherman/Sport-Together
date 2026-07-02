/** Groupe fermé (ADR-0004). inviteCode est présent à la création ; ensuite via getInvite. */
export interface Group {
  id: string;
  name: string;
  inviteCode?: string;
  /** Id du créateur (droits de gestion : renommer, régénérer le code, supprimer). */
  createdBy?: string;
  /** Visibilité : `private` (code requis) ou `public` (rejoignable via l'annuaire). */
  visibility?: 'private' | 'public';
}

/** Entrée de l'annuaire des groupes publics. */
export interface PublicGroup {
  id: string;
  name: string;
  memberCount: number;
}

/** Membre d'un groupe (vue légère pour l'écran groupe / présence). */
export interface GroupMember {
  id: string;
  pseudo: string;
  avatarUrl?: string;
}
