import tseslint from 'typescript-eslint';
import globals from 'globals';
import prettier from 'eslint-config-prettier/flat';

export default [
    { ignores: ['dist/**', 'node_modules/**'] },
    ...tseslint.configs.recommended,
    prettier,
    {
        files: ['**/*.ts'],
        languageOptions: {
            globals: {
                ...globals.node,
                ...globals.es2021,
                ...globals.jest,
            },
            parserOptions: {
                ecmaVersion: 2021,
            },
        },
        rules: {
            'no-console': 'off',
            '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
        },
    },
];
