import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    // In development, forward API calls to the Express server.
    proxy: { '/api': 'http://localhost:3000' },
  },
  css: {
    preprocessorOptions: {
      scss: {
        // Bootstrap 5 still uses @import; silence the Sass deprecation noise.
        quietDeps: true,
        silenceDeprecations: ['import', 'global-builtin', 'color-functions', 'if-function'],
      },
    },
  },
  test: { environment: 'node', include: ['tests/**/*.test.js'] },
});
