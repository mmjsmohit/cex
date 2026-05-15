# @repo/typescript-config

Shared TypeScript configuration package for the CEX Turborepo. It centralizes compiler defaults so apps and packages can extend consistent settings.

## Config files

### `base.json`

Base configuration for TypeScript packages. Notable options include:

- `strict: true`
- `target: ES2022`
- `module: NodeNext`
- `moduleResolution: NodeNext`
- `lib: ES2022`, `DOM`, and `DOM.Iterable`
- `declaration` and `declarationMap` enabled
- `isolatedModules: true`
- `noUncheckedIndexedAccess: true`
- `skipLibCheck: true`

### `react-library.json`

Extends `base.json` and sets `jsx` to `react-jsx`. Use this for reusable React component packages such as `@repo/ui`.

### `nextjs.json`

Extends `base.json` and adapts TypeScript for Next.js apps:

- Enables the Next.js TypeScript plugin.
- Uses `module: ESNext`.
- Uses `moduleResolution: Bundler`.
- Enables `allowJs`.
- Sets `jsx: preserve`.
- Sets `noEmit: true`.

## Usage

Reference the config from a package `tsconfig.json` with `extends`.

Typical consumers:

- `apps/web` extends the Next.js config.
- `packages/ui` extends the React library config.
- Bun/Node services can extend the base config when they need shared compiler defaults.

## Notes

This package is private to the workspace and does not export JavaScript. It exists to share JSON configuration files across the monorepo.
