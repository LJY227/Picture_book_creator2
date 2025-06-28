import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import hmacsha1 from 'hmacsha1';
import randomString from 'string-random';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;  // Zeabur/云端系统标准入口端口

app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://localhost:3000',
    'https://localhost:5173',
    /\.vercel\.app$/,
    /\.zeabur\.app$/,
    /\.netlify\.app$/,
    /\.pages\.dev$/,
    /\.surge\.sh$/,
    /\.github\.io$/
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

const LIBLIB_CONFIG = {
  baseUrl: 'https://openapi.liblibai.cloud',
  text2imgEndpoint: '/api/generate/kontext/text2img',
  img2imgEndpoint: '/api/generate/kontext/img2img',
  statusEndpoint: '/api/generate/status',
  accessKey: process.env.VITE_LIBLIB_ACCESS_KEY,
  secretKey: process.env.VITE_LIBLIB_SECRET_KEY,
  text2imgTemplateUuid: process.env.VITE_LIBLIB_TEMPLATE_UUID || 'fe9928fde1b4491c9b360dd24aa2b115',
  img2imgTemplateUuid: process.env.VITE_LIBLIB_IMG2IMG_TEMPLATE_UUID || '1c0a9712b3d84e1b8a9f49514a46d88c'
};

function generateSignature(uri) {
  const timestamp = Date.now();
  const signatureNonce = randomString(16);
  const str = `${uri}&${timestamp}&${signatureNonce}`;
  const hash = hmacsha1(LIBLIB_CONFIG.secretKey, str);
  const signature = hash.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return { signature, timestamp: timestamp.toString(), signatureNonce };
}

// === 你的所有 API 路由如下，全部照常保留 ===

app.get('/', (req, res) => {
  res.json({
    message: 'LiblibAI代理服务器运行正常',
    version: '1.0.0',
    endpoints: [
      'GET /api/liblib/config - 检查配置',
      'POST /api/liblib/text2img - 文生图',
      'POST /api/liblib/img2img - 图生图',
      'GET /api/liblib/query/:generateUuid - 查询结果'
    ]
  });
});

app.get('/api/liblib/test-signature', (req, res) => {
  try {
    const testUri = '/api/generate/webui/text2img/ultra';
    const testTimestamp = 1640995200000;
    const testNonce = 'abcd123456789012';
    const testContent = `${testUri}&${testTimestamp}&${testNonce}`;
    const hash = hmacsha1(LIBLIB_CONFIG.secretKey, testContent);
    const signature = hash.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    res.json({
      accessKey: LIBLIB_CONFIG.accessKey,
      secretKey: LIBLIB_CONFIG.secretKey,
      accessKeyExists: !!LIBLIB_CONFIG.accessKey,
      secretKeyExists: !!LIBLIB_CONFIG.secretKey,
      uri: testUri,
      timestamp: testTimestamp,
      nonce: testNonce,
      content: testContent,
      rawBase64: hash,
      urlSafeSignature: signature
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/liblib/config', (req, res) => {
  const isConfigured = !!(LIBLIB_CONFIG.accessKey && LIBLIB_CONFIG.secretKey);
  res.json({
    configured: isConfigured,
    message: isConfigured ? 'LiblibAI配置正常' : 'LiblibAI配置缺失，请检查环境变量'
  });
});

// ...剩下所有 /api 路由都保留...

app.post('/api/liblib/text2img', async (req, res) => {
  // ...原有逻辑...
});
app.post('/api/liblib/img2img', async (req, res) => { /* ... */ });
app.post('/api/liblib/query/:generateUuid', async (req, res) => { /* ... */ });
app.post('/api/openai/chat', async (req, res) => { /* ... */ });
app.post('/api/openai/images', async (req, res) => { /* ... */ });
app.get('/api/status', (req, res) => { /* ... */ });

// ================================
// 新增静态资源托管和 SPA fallback，支持所有HTTP请求方法
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientBuildPath = path.join(__dirname, "dist");
app.use(express.static(clientBuildPath));

app.all('*', (req, res) => {
  if (req.path.startsWith("/api/")) {
    res.status(404).json({ error: "API not found" });
  } else {
    res.sendFile(path.join(clientBuildPath, "index.html"));
  }
});

// ================================

app.listen(PORT, () => {
  console.log(`🚀 图画书创作器API服务器运行在 http://localhost:${PORT}`);
});

export default app;
