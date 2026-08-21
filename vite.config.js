import { defineConfig } from 'vite'

export default defineConfig({
  // itch.io hosts HTML games from a subdirectory, so every built asset must be relative.
  base: './',
  build: {
    rolldownOptions: {
      output: {
        manualChunks(id) {
          return id.includes('node_modules/three/') ? 'three' : undefined
        },
      },
    },
  },
})
