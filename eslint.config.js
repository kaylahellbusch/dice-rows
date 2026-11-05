import js from "@eslint/js";
import ts from "typescript-eslint";
export default ts.config(
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "test-results/**",
      "playwright-report/**",
    ],
  },
  js.configs.recommended,
  ...ts.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_" },
      ],
    },
    languageOptions: {
      globals: {
        console: "readonly",
        process: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        fetch: "readonly",
        document: "readonly",
        window: "readonly",
        HTMLElement: "readonly",
      },
    },
  },
);
