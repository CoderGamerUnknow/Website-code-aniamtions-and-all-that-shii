import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // `dist` is build output; watching it made the dev server crash on Windows
    // (EBUSY while watching an image that the browser/preview had locked).
    watch: {
      ignored: ["**/dist/**"],
    },
  },
})
