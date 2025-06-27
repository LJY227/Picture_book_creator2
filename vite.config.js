import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'esbuild'
  },
  define: {
    // 确保环境变量在构建时被正确替换
    'import.meta.env.VITE_API_BASE_URL': JSON.stringify(
      process.env.VITE_API_BASE_URL || 'http://localhost:3005'
    )
  }
})
