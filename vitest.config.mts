import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  resolve: {
    alias: {
      // "server-only" throws at import time in non-Next.js environments (Vite/jsdom).
      // Map it to a no-op so server-side modules can be tested.
      'server-only': path.resolve(__dirname, 'src/lib/__mocks__/server-only.ts'),
    },
  },
  test: {
    environment: 'jsdom',
  },
})