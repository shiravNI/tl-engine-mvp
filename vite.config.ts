import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

// GitHub Pages serves the site from https://<user>.github.io/<repo>/, so
// asset URLs need that repo-name prefix in production. Locally the base
// stays `/` so nothing else has to change.
const isGithubPagesBuild = process.env.GITHUB_PAGES === 'true'

export default defineConfig({
  base: isGithubPagesBuild ? '/tl-engine-mvp/' : '/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5190,
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
})
