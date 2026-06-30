// https://docs.expo.dev/guides/using-eslint/
const expoConfig = require('eslint-config-expo/flat');

const SDK = '@supabase/supabase-js';
const SDK_MSG =
  "Le SDK Supabase est réservé à data/ et core/supabase/ (ADR-0007). La présentation dépend des interfaces de domain/ via le DI.";
const WRAPPER_MSG =
  "Le client Supabase configuré (core/supabase) est réservé à data/ et core/ ; la présentation passe par le DI (ADR-0007), jamais par le client directement.";

module.exports = [
  ...(Array.isArray(expoConfig) ? expoConfig : [expoConfig]),
  {
    ignores: ['dist/*', 'node_modules/*', '.expo/*', 'supabase/**'],
  },
  // 1) Global : SDK Supabase interdit, sous-chemins compris (correctif revue).
  {
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [{ group: [SDK, `${SDK}/*`], message: SDK_MSG }] },
      ],
    },
  },
  // 2) Frontière backend autorisée : data/ et core/supabase/ peuvent importer le SDK.
  {
    files: ['data/**/*.{ts,tsx}', 'core/supabase/**/*.{ts,tsx}'],
    rules: { 'no-restricted-imports': 'off' },
  },
  // 3) Présentation & domaine : ni le SDK, ni le client wrapper core/supabase.
  //    (core/di reste libre d'importer le wrapper pour câbler le DI.)
  {
    files: ['app/**/*.{ts,tsx}', 'ui/**/*.{ts,tsx}', 'domain/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: [SDK, `${SDK}/*`], message: SDK_MSG },
            { group: ['@/core/supabase', '@/core/supabase/*'], message: WRAPPER_MSG },
          ],
        },
      ],
    },
  },
];
