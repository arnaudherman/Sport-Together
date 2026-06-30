/** Groupe fermé (ADR-0004). inviteCode n'est présent qu'à la création (à partager). */
export interface Group {
  id: string;
  name: string;
  inviteCode?: string;
}
