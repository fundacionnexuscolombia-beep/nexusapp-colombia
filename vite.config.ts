import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      base: './',
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        tailwindcss(),
        {
          name: 'supabase-admin-proxy',
          configureServer(server) {
            server.middlewares.use(async (req, res, next) => {
              if (req.url && req.url.startsWith('/api/admin/supabase')) {
                if (req.method !== 'POST') {
                  res.statusCode = 405;
                  res.end(JSON.stringify({ error: 'Method Not Allowed' }));
                  return;
                }

                let body = '';
                req.on('data', chunk => { body += chunk; });
                req.on('end', async () => {
                  try {
                    const { urlPath, method = 'GET', data = null } = JSON.parse(body);
                    const supabaseUrl = env.VITE_SUPABASE_URL;
                    const serviceKey = env.VITE_SUPABASE_SERVICE_KEY;

                    const fetchUrl = `${supabaseUrl}/rest/v1/${urlPath}`;
                    const headers: Record<string, string> = {
                      'apikey': serviceKey,
                      'Authorization': `Bearer ${serviceKey}`,
                      'Content-Type': 'application/json'
                    };

                    const fetchOptions: RequestInit = {
                      method,
                      headers
                    };

                    if (data && (method === 'POST' || method === 'PATCH' || method === 'PUT')) {
                      fetchOptions.body = JSON.stringify(data);
                    }

                    const supabaseRes = await fetch(fetchUrl, fetchOptions);
                    const responseText = await supabaseRes.text();

                    res.statusCode = supabaseRes.status;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(responseText);
                  } catch (err: any) {
                    res.statusCode = 500;
                    res.end(JSON.stringify({ error: err.message }));
                  }
                });
              } else {
                next();
              }
            });
          }
        }
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
