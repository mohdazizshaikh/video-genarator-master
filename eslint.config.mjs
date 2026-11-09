import { config } from "@remotion/eslint-config-flat";

export default [
  ...config,
  {
    files: ["scripts/migrations/*.mjs", "scripts/backup.mjs", "scripts/restore.mjs", "scripts/full-backup-integrity.mjs", "scripts/full-backup-auth.mjs"],
    languageOptions: { globals: { process: "readonly", console: "readonly", Buffer: "readonly" } },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/components/**"],
    // These rules constrain video compositions, not HTTP services or the SPA.
    rules: {
      "@remotion/deterministic-randomness": "off",
      "@remotion/non-pure-animation": "off",
      "@remotion/warn-native-media-tag": "off",
    },
  },
];
