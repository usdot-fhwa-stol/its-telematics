import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The packaged renderer loads only its own files. Development skips this
// policy because the React dev server injects inline scripts.
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ');

function contentSecurityPolicy() {
  return {
    name: 'content-security-policy',
    apply: 'build',
    transformIndexHtml: () => [{
      tag: 'meta',
      attrs: { 'http-equiv': 'Content-Security-Policy', content: CONTENT_SECURITY_POLICY },
      injectTo: 'head-prepend',
    }],
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), contentSecurityPolicy()],
  build: { outDir: 'dist', emptyOutDir: true },
  server: { port: 5173, strictPort: false },
});
