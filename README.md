# Zeroclaw Music

React + TypeScript + Vite frontend with a minimal Express backend that serves the
production build and streams local audio files from one Node process.

## Frontend setup

This project uses Vite. The production build output is `dist/`, and `server.js`
serves that directory with `express.static`.

## Install dependencies

```sh
npm install
```

## Sample MP3

Place your sample MP3 at:

```text
audio/sample.mp3
```

The single sample track entry is defined in `server.js` and uses `sample.mp3`.
The audio file is not included in this repository.

## Development

Run the Express API on port 3000 and the Vite frontend on port 5173:

```sh
npm run dev:full
```

You can also run them in separate terminals:

```sh
npm run dev:backend
npm run dev:frontend
```

Vite proxies `/api` to the backend, so the frontend uses relative URLs and does
not need CORS.

## Production

Build the React frontend and start the combined Node server:

```sh
npm run build
npm start
```

Open `http://localhost:3000`.

## API

- `GET /api/tracks?q=` returns matching tracks by title or artist. The response
  includes `id`, `title`, and `artist`; it does not expose audio filenames.
- `GET /api/tracks/:id/stream` streams the matching local audio file and supports
  HTTP byte-range requests for seeking.

---

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
