import js from "@eslint/js";
import reactPlugin from "eslint-plugin-react";
import globals from "globals";
import tseslint from "typescript-eslint";

export default [
    js.configs.recommended,
    ...tseslint.configs.recommended,
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
            "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
            "@typescript-eslint/no-explicit-any": "off",
            "@typescript-eslint/ban-ts-comment": "off",
            "@typescript-eslint/no-require-imports": "off",
            "react/no-unescaped-entities": "off",
            "react/display-name": "off",
            "no-console": "off",
            "no-undef": "off",
        },
    },
    {
        files: ["e2e/**/*.spec.ts"],
        rules: {
             "react/no-unknown-property": ["error", { "ignore": ["testID"] }]
        }
    },

];
