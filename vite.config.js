import { defineConfig } from 'vite';
import { executionApi } from './server/api.js';

export default defineConfig({
  plugins: [{ name: 'local-cpp-runner',
    configureServer(server) { server.middlewares.use(executionApi); },
    configurePreviewServer(server) { server.middlewares.use(executionApi); },
  }],
});
