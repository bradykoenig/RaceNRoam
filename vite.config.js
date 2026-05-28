import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // During local dev, proxy /api calls to wrangler pages dev (port 8788)
      // Run: npm run build && npm run pages:dev  in a separate terminal
      '/api': {
        target: 'http://localhost:8788',
        changeOrigin: true,
        configure(proxy) {
          proxy.on('error', (_err, _req, res) => {
            // wrangler isn't running – return a JSON 503 so the API client
            // can catch it and use local fallback data silently
            if (!res.headersSent) {
              res.writeHead(503, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({
                ok: false,
                source: 'dev-unavailable',
                error: 'Cloudflare Functions not running locally. Using fallback data.',
                hint: 'To run with live functions: npm run build && npm run pages:dev',
              }))
            }
          })
        },
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router')) {
            return 'react'
          }
        },
      },
    },
  },
})
