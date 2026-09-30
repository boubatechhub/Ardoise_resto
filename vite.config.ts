import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * La racine est deduite de l'emplacement de ce fichier : le serveur de dev peut donc etre
 * lance depuis n'importe quel repertoire, y compris par un outil externe.
 */
const racine = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  root: racine,
  plugins: [react()],
  server: { port: 5180, fs: { allow: [racine] } },
  // chemins relatifs : le build fonctionne aussi bien a la racine d'un domaine que dans un sous-repertoire
  base: './',
  build: { outDir: 'dist', emptyOutDir: true },
});
