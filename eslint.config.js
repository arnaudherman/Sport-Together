// https://docs.expo.dev/guides/using-eslint/
const expoConfig = require('eslint-config-expo/flat');

const SUPABASE_RESTRICTION = {
  paths: [
    {
      name: '@supabase/supabase-js',
      message:
        "Le SDK Supabase est réservé à data/ et core/supabase/ (ADR-0007). La présentation dépend des interfaces de domain/, jamais de Supabase.",
    },
  ],
};

module.exports = [
  ...(Array.isArray(expoConfig) ? expoConfig : [expoConfig]),
  {
    ignores: ['dist/*', 'node_modules/*', '.expo/*'],
  },
  {
    // ADR-0007 : la présentation ne parle jamais à Supabase directement.
    rules: {
      'no-restricted-imports': ['error', SUPABASE_RESTRICTION],
    },
  },
  {
    // Exception : data/ et core/supabase/ SONT la frontière backend autorisée.
    files: ['data/**/*.{ts,tsx}', 'core/supabase/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
];
