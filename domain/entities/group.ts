/** Groupe fermé (ADR-0004). inviteCode est présent à la création ; ensuite via getInvite. */
export interface Group {
  id: string;
  name: string;
  inviteCode?: string;
  /** Id du créateur (droits de gestion : renommer, régénérer le code, supprimer). */
  createdBy?: string;
}

/** Membre d'un groupe (vue légère pour l'écran groupe / présence). */
export interface GroupMember {
  id: string;
  pseudo: string;
}
