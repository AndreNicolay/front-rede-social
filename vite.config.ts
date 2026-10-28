import { fileURLToPath, URL } from 'node:url';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  // Pré-empacota tudo na subida, para o Vite não recarregar a página no meio de um teste
  optimizeDeps: {
    include: ['vue', 'vue-router', 'axios', 'socket.io-client'],
  },
});
