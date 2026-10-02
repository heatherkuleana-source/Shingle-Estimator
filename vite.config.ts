import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative base so the built app works from GitHub Pages or any sub-folder.
export default defineConfig({
  base: './',
  plugins: [react()],
});
