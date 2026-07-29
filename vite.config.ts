import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/exam-helper/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
})
