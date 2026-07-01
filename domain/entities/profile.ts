/** Profil applicatif (ADR-0005). isAdult = age-gating requis par la nutrition (ADR-0008). */
export interface Profile {
  id: string;
  pseudo: string;
  avatarUrl?: string;
  isAdult: boolean;
  /** Bio libre affichée sur le profil (optionnelle). */
  bio?: string;
}

export interface ProfileInput {
  pseudo: string;
  avatarUrl?: string;
  isAdult: boolean;
  bio?: string;
}
