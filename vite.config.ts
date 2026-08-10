/// <reference types="vitest/config" />
import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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
          'vendor-ui-core': [
            '@radix-ui/react-slot', '@radix-ui/react-tooltip',
            '@radix-ui/react-separator', '@radix-ui/react-label',
            'class-variance-authority', 'clsx', 'tailwind-merge', 'next-themes',
          ],
          'vendor-ui-extended': [
            '@radix-ui/react-accordion', '@radix-ui/react-alert-dialog',
            '@radix-ui/react-checkbox', '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu', '@radix-ui/react-popover',
            '@radix-ui/react-progress', '@radix-ui/react-scroll-area',
            '@radix-ui/react-select', '@radix-ui/react-slider',
            '@radix-ui/react-switch', '@radix-ui/react-tabs',
            'sonner', 'cmdk',
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
});
