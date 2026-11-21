/// <reference types="vitest/config" />
import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig(() => {
  const plugins = [react()]

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
              '@radix-ui/react-dialog',
              '@radix-ui/react-dropdown-menu',
              '@radix-ui/react-scroll-area',
              '@radix-ui/react-slot',
              '@radix-ui/react-tooltip',
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
