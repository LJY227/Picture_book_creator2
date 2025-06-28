import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import hmacsha1 from 'hmacsha1';
import randomString from 'string-random';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080; // 关键：监听 8080

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

// 所有你的 API 路由 ↓↓↓

// API根路径信息
app.get('/api', (req, res) => {
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

app.post('/api/liblib/text2img', async (req, res) => {
  try {
    const { prompt, options = {} } = req.body;
    if (!prompt) return res.status(400).json({ error: '缺少prompt参数' });
    if (!LIBLIB_CONFIG.accessKey || !LIBLIB_CONFIG.secretKey)
      return res.status(500).json({ error: 'LiblibAI API配置不完整' });
    const uri = LIBLIB_CONFIG.text2imgEndpoint;
    const { signature, timestamp, signatureNonce } = generateSignature(uri);
    const url = `${LIBLIB_CONFIG.baseUrl}${uri}?AccessKey=${LIBLIB_CONFIG.accessKey}&Signature=${signature}&Timestamp=${timestamp}&SignatureNonce=${signatureNonce}`;
    const requestData = {
      templateUuid: LIBLIB_CONFIG.text2imgTemplateUuid,
      generateParams: {
        model: "pro",
        prompt: prompt.substring(0, 2000),
        aspectRatio: options.aspectRatio || "3:4",
        guidance_scale: options.guidance_scale || 3.5,
        imgCount: options.imgCount || 1
      }
    };
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requestData) });
    const responseText = await response.text();
    let result;
    try { result = JSON.parse(responseText);} catch (parseError) {
      return res.status(500).json({
        error: 'API响应格式错误',
        details: responseText.substring(0, 500),
        status: response.status
      });
    }
    if (!response.ok) return res.status(response.status).json(result);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/liblib/img2img', async (req, res) => {
  try {
    const { prompt, imageUrl, options = {} } = req.body;
    if (!prompt || !imageUrl)
      return res.status(400).json({ error: '缺少prompt或imageUrl参数' });
    if (!LIBLIB_CONFIG.accessKey || !LIBLIB_CONFIG.secretKey)
      return res.status(500).json({ error: 'LiblibAI API配置不完整' });
    const uri = LIBLIB_CONFIG.img2imgEndpoint;
    const { signature, timestamp, signatureNonce } = generateSignature(uri);
    const url = `${LIBLIB_CONFIG.baseUrl}${uri}?AccessKey=${LIBLIB_CONFIG.accessKey}&Signature=${signature}&Timestamp=${timestamp}&SignatureNonce=${signatureNonce}`;
    const requestData = {
      templateUuid: LIBLIB_CONFIG.img2imgTemplateUuid,
      generateParams: {
        model: options.model || "pro",
        prompt: prompt.substring(0, 2000),
        aspectRatio: options.aspectRatio || "1:1",
        guidance_scale: options.guidance_scale || 3.5,
        imgCount: options.imgCount || 1,
        image_list: [imageUrl]
      }
    };
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requestData) });
    const responseText = await response.text();
    let result;
    try { result = JSON.parse(responseText);} catch (parseError) {
      return res.status(500).json({ error: 'API响应格式错误', details: responseText.substring(0, 500), status: response.status });
    }
    if (!response.ok) return res.status(response.status).json(result);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/liblib/query/:generateUuid', async (req, res) => {
  try {
    const { generateUuid } = req.params;
    if (!generateUuid) return res.status(400).json({ error: '缺少generateUuid参数' });
    if (!LIBLIB_CONFIG.accessKey || !LIBLIB_CONFIG.secretKey)
      return res.status(500).json({ error: 'LiblibAI API配置不完整' });
    const uri = LIBLIB_CONFIG.statusEndpoint;
    const { signature, timestamp, signatureNonce } = generateSignature(uri);
    const url = `${LIBLIB_CONFIG.baseUrl}${uri}?AccessKey=${LIBLIB_CONFIG.accessKey}&Signature=${signature}&Timestamp=${timestamp}&SignatureNonce=${signatureNonce}`;
    const requestData = { generateUuid: generateUuid };
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requestData) });
    const responseText = await response.text();
    let result;
    try { result = JSON.parse(responseText);} catch (parseError) {
      return res.status(500).json({ error: '查询响应格式错误', details: responseText.substring(0, 500) });
    }
    if (!response.ok) return res.status(response.status).json(result);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// OpenAI聊天API代理
app.post('/api/openai/chat', async (req, res) => {
  try {
    const { messages, model = 'gpt-4o', temperature = 0.7, max_tokens = 150 } = req.body;
    if (!messages) return res.status(400).json({ error: '缺少messages参数' });
    if (!process.env.VITE_OPENAI_API_KEY)
      return res.status(500).json({ error: 'OpenAI API密钥未配置' });
    const fetch = (await import('node-fetch')).default;
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.VITE_OPENAI_API_KEY}`
      },
      body: JSON.stringify({ model, messages, temperature, max_tokens })
    });
    const result = await response.json();
    if (!response.ok) return res.status(response.status).json(result);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DALL-E 3 图像生成API代理
app.post('/api/openai/images', async (req, res) => {
  try {
    const { prompt, size = '1024x1024', quality = 'standard', n = 1 } = req.body;
    if (!prompt) return res.status(400).json({ error: '缺少prompt参数' });
    if (!process.env.VITE_OPENAI_API_KEY)
      return res.status(500).json({ error: 'OpenAI API密钥未配置' });
    const fetch = (await import('node-fetch')).default;
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.VITE_OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: prompt.substring(0, 4000),
        size,
        quality,
        n
      })
    });
    const result = await response.json();
    if (!response.ok) return res.status(response.status).json(result);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API状态检查
app.get('/api/status', (req, res) => {
  const hasOpenAIKey = !!process.env.VITE_OPENAI_API_KEY;
  const hasLiblibConfig = !!(LIBLIB_CONFIG.accessKey && LIBLIB_CONFIG.secretKey);
  res.json({
    status: 'running',
    timestamp: new Date().toISOString(),
    services: {
      openai: {
        configured: hasOpenAIKey,
        message: hasOpenAIKey ? 'OpenAI API已配置' : 'OpenAI API密钥未配置'
      },
      liblib: {
        configured: hasLiblibConfig,
        message: hasLiblibConfig ? 'LiblibAI API已配置' : 'LiblibAI API密钥未配置'
      }
    },
    endpoints: [
      'POST /api/openai/chat - OpenAI聊天API',
      'POST /api/openai/images - DALL-E图像生成',
      'POST /api/liblib/text2img - LiblibAI文生图',
      'POST /api/liblib/img2img - LiblibAI图生图',
      'GET /api/status - 服务状态检查'
    ]
  });
});

// ========== 静态资源托管和 SPA fallback ==========
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientBuildPath = path.join(__dirname, "dist");

// 静态文件服务 - 处理所有静态资源 (CSS, JS, 图片等)
app.use(express.static(clientBuildPath, {
  index: false, // 不自动提供index.html，让我们手动控制
  maxAge: '1d'  // 缓存静态资源1天
}));

// SPA fallback - 所有非API路由都返回index.html
app.get("*", (req, res) => {
  // 如果是API路由但没有找到对应的处理器，返回404
  if (req.path.startsWith("/api/")) {
    res.status(404).json({ error: "API endpoint not found" });
  } else {
    // 所有其他路由都返回前端应用的index.html
    res.sendFile(path.join(clientBuildPath, "index.html"), (err) => {
      if (err) {
        console.error('Error serving index.html:', err);
        res.status(500).json({ error: "Failed to serve frontend application" });
      }
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 图画书创作器API服务器运行在 http://localhost:${PORT}`);
});

export default app;