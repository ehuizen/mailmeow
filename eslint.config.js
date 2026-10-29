// ESLint flat config: TypeScript rules + React hooks rules for our own code. Generated Untitled UI components are skipped (we don't edit them).
import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
    {
        ignores: ["dist", "legacy", "_scaffold", ".verify", "src/components/base", "src/components/application", "src/components/foundations", "src/utils/cx.ts", "src/utils/is-react-component.ts"],
    },
    {
        files: ["**/*.{ts,tsx}"],
        extends: [js.configs.recommended, ...tseslint.configs.recommended],
        languageOptions: {
            ecmaVersion: 2022,
            globals: { ...globals.browser, ...globals.node },
        },
        plugins: { "react-hooks": reactHooks },
        rules: {
            ...reactHooks.configs.recommended.rules,
            "@typescript-eslint/no-explicit-any": "error",
        },
    },
);
