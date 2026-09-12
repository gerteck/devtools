# devtools

Client-side developer utilities built with Svelte 5, Monaco Editor, and Mermaid.js.

## Development

### Prerequisites
- Node.js 22+
- npm 10+

### Setup
```bash
npm install
```

### Commands
```bash
# Start dev server
npm run dev

# Typecheck
npm run check

# Build for production
npm run build

# Preview production build locally
npm run preview
```

## Deployment

Deployments to GitHub Pages are handled automatically via GitHub Actions (`.github/workflows/deploy.yml`).

1. Push to `main`.
2. In repository **Settings** > **Pages**, set **Build and deployment > Source** to **GitHub Actions**.

## License

MIT
