# @repo/ui

Shared React component package for the CEX Turborepo. Components are exported directly from `src` through package subpath exports.

## Responsibilities

- Provide reusable React UI primitives for apps in the workspace.
- Share component source without a separate build step.
- Use the repository's shared ESLint and TypeScript configurations.

## Runtime

- React: 19
- TypeScript: 5.9
- Lint config: `@repo/eslint-config/react-internal`
- TypeScript config: `@repo/typescript-config/react-library`

## Exports

The package uses the following export pattern:

- `@repo/ui/*` maps to `./src/*.tsx`

Current components:

- `@repo/ui/button`: Client button component that shows an alert including the supplied app name.
- `@repo/ui/card`: Link-style card component with a title and body.
- `@repo/ui/code`: Inline code wrapper component.

## Development

Install dependencies from the repository root with `bun install`.

Useful commands:

- `bun --filter @repo/ui lint`: Run ESLint.
- `bun --filter @repo/ui check-types`: Run TypeScript without emitting files.
- `bun --filter @repo/ui generate:component`: Run the Turborepo React component generator.

## Adding components

Add new components under `src` as `.tsx` files. They become importable by filename through the subpath export pattern. For example, a component at `src/badge.tsx` can be imported as `@repo/ui/badge`.

## Consumers

- `apps/web`
