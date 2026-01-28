import js from "@eslint/js";
import reactPlugin from "eslint-plugin-react";
import globals from "globals";

export default [
    js.configs.recommended,
    reactPlugin.configs.flat.recommended,
    {
        ignores: ["src/types/**/*.ts", "src/dataconnect-generated/**/*", "src/dataconnect-admin-generated/**/*"],
    },
    {
        files: ["**/*.js", "**/*.jsx", "**/*.ts", "**/*.tsx"],
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "module",
            globals: {
                ...globals.browser,
                ...globals.node,
                ...globals.es2021,
                __DEV__: "readonly"
            },
            parserOptions: {
                ecmaFeatures: {
                    jsx: true
                }
            }
        },
        settings: {
            react: {
                version: "detect"
            }
        },
        rules: {
            "react/prop-types": "off",
            "react/react-in-jsx-scope": "off", // Not needed in Expo/React Native usually
            "no-unused-vars": "warn",
            "no-console": "off",
        },
    },
];
