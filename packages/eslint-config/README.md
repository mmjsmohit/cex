# @repo/eslint-config

Shared ESLint flat-config package for the CEX Turborepo. It provides reusable lint configurations for base TypeScript packages, React packages, and Next.js apps.

## Exports

- `@repo/eslint-config/base`: Base JavaScript/TypeScript config.
- `@repo/eslint-config/react-internal`: React library config used by internal UI packages.
- `@repo/eslint-config/next-js`: Next.js config used by app-router applications.

## Config files

### `base.js`

Includes:

- `@eslint/js` recommended rules.
- `typescript-eslint` recommended rules.
- `eslint-config-prettier` to disable formatting conflicts.
- `eslint-plugin-turbo` with `turbo/no-undeclared-env-vars` as a warning.
- `eslint-plugin-only-warn` to downgrade rule failures to warnings.
- Ignore pattern for `dist/**`.

### `react-internal.js`

Extends the base config and adds:

- React recommended flat config.
- Browser and service worker globals.
- React hooks recommended rules.
- React version detection.
- `react/react-in-jsx-scope` disabled for the modern JSX transform.

### `next.js`

Extends the base config and adds:

- Next.js recommended and core-web-vitals rules.
- React recommended flat config.
- React hooks recommended rules.
- Default Next.js generated-output ignores such as `.next/**`, `out/**`, `build/**`, and `next-env.d.ts`.

## Usage

Install this package as a workspace dependency and import the desired config from an app or package `eslint.config.*` file.

For a Next.js app, import `nextJsConfig` from `@repo/eslint-config/next-js`.

For a React package, import `config` from `@repo/eslint-config/react-internal`.

For a non-React TypeScript package, import `config` from `@repo/eslint-config/base`.

## Consumers

- `apps/web`
- `packages/ui`
