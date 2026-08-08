const express = require('express');
const cors = require('cors');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());

app.post('/api/chat', (req, res) => {
  const body = JSON.stringify(req.body);
  const options = {
    hostname: 'openrouter.ai',
    port: 443,
    path: '/api/v1/chat/completions',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': req.headers.authorization || '',
      'HTTP-Referer': 'https://post-generator-v2.vercel.app',
      'X-Title': 'Post Generator V2'
    }
  };

  const proxyReq = https.request(options, (proxyRes) => {
    let data = '';
    proxyRes.on('data', chunk => data += chunk);
    proxyRes.on('end', () => {
      res.status(proxyRes.statusCode).send(data);
    });
  });

  proxyReq.on('error', (e) => {
    console.error('Proxy error:', e.message);
    res.status(500).json({ error: 'Proxy error' });
  });

  proxyReq.write(body);
  proxyReq.end();
});

app.listen(PORT, () => {
  console.log(`🚀 Прокси запущен на порту ${PORT}`);
});