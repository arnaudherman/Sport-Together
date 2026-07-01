/** Groupe fermé (ADR-0004). inviteCode n'est présent qu'à la création (à partager). */
export interface Group {
  id: string;
  name: string;
  inviteCode?: string;
}

/** Membre d'un groupe (vue légère pour l'écran groupe / présence). */
export interface GroupMember {
  id: string;
  pseudo: string;
}
