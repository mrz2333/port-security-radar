import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    host: '127.0.0.1',
    port: 9188,
    proxy: {
      '/api': 'http://127.0.0.1:9189'
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  }
})
