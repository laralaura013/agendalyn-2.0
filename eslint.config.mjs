// eslint.config.mjs

import globals from "globals";
import pluginJs from "@eslint/js";
import pluginReact from "eslint-plugin-react";
import pluginReactHooks from "eslint-plugin-react-hooks";

export default [
  {
    // Ignora pastas que não queremos analisar
    ignores: [
      "node_modules/",
      "build/",
      "dist/",
      "backend/", // Ignorando por enquanto para focar no frontend
      "to_review/", // Ignorando por enquanto para focar no frontend
      "tools/"
    ]
  },

  // Configuração para o Frontend (React)
  {
    files: ["frontend/src/**/*.jsx", "frontend/src/**/*.js"],
    plugins: {
      react: pluginReact,
      "react-hooks": pluginReactHooks,
    },
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        }
      },
      globals: {
        ...globals.browser
      }
    },
    rules: {
      ...pluginJs.configs.recommended.rules,
      ...pluginReact.configs.recommended.rules,
      ...pluginReactHooks.configs.recommended.rules,
      "react/react-in-jsx-scope": "off", // Desliga regra antiga do React
      "react/prop-types": "off", // << IMPORTANTE: Desliga os erros de prop-types
    },
    settings: {
      react: {
        version: "detect"
      }
    }
  }
];