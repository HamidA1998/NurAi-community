// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");
const eslintPluginPrettierRecommended = require("eslint-plugin-prettier/recommended");

module.exports = defineConfig([
  {
    ignores: [
      ".expo/**",
      "android/**",
      "dist/**",
      "ios/**",
      "server_dist/**",
      "static-build/**",
      "web-build/**",
    ],
  },
  expoConfig,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        Buffer: "readonly",
      },
    },
    rules: {
      "react/no-unescaped-entities": "off",
    },
  },
]);
