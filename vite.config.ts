/// <reference types="vitest/config" />
import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv } from "vite"

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const plugins = [react()]

  if (env.BUILD_ANALYZE === 'true') {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { visualizer } = require('rollup-plugin-visualizer')
      plugins.push(visualizer({
        open: true,
        filename: 'dist/bundle-analysis.html',
        gzipSize: true,
      }))
    } catch {
      // rollup-plugin-visualizer not installed — skip
    }
  }

  return {
    plugins,
    server: {
      port: 3000,
      proxy: {
        '/api': 'http://localhost:3001',
      },
    },
    build: {
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'react-router'],
            'vendor-supabase': ['@supabase/supabase-js'],
            'vendor-ui': [
              '@radix-ui/react-accordion', '@radix-ui/react-alert-dialog',
              '@radix-ui/react-checkbox', '@radix-ui/react-dialog',
              '@radix-ui/react-dropdown-menu', '@radix-ui/react-label',
              '@radix-ui/react-popover', '@radix-ui/react-progress',
              '@radix-ui/react-scroll-area', '@radix-ui/react-select',
              '@radix-ui/react-separator', '@radix-ui/react-slider',
              '@radix-ui/react-slot', '@radix-ui/react-switch',
              '@radix-ui/react-tabs', '@radix-ui/react-tooltip',
              'class-variance-authority', 'clsx', 'tailwind-merge', 'sonner', 'next-themes', 'cmdk',
            ],
            'vendor-charts': ['recharts'],
            'vendor-motion': ['framer-motion'],
          },
        },
      },
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/test/setup.ts',
      css: true,
      include: ['src/**/*.test.{ts,tsx}'],
    },
  }
});
