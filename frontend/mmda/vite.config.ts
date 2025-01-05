import path from 'path'
import { defineConfig } from 'vite'
import { TanStackRouterVite } from '@tanstack/router-vite-plugin'
import react from '@vitejs/plugin-react'

const ReactCompilerConfig = {
  target: '18',
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler', ReactCompilerConfig]],
      },
    }),
    TanStackRouterVite(),
  ],
  resolve: {
    alias: {
      '@cads/shared': path.resolve(__dirname, '../shared'),
      '@': path.resolve(__dirname, './src'),
    },
  },
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/tests/vitest.setup.ts',
  },
  optimizeDeps: {
    exclude: ['idb-keyval'],
  },
  server: {
    proxy: {
      '/api': {
        target: 'https://corpora.linguistik.uni-erlangen.de/cwb-cads-dev',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        followRedirects: true,
      },
    },
  },
})
