/**
 * LiblibAI API代理服务器
 * 解决CORS问题，安全地处理API密钥
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import hmacsha1 from 'hmacsha1';
import randomString from 'string-random';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3005;

// 中间件
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5173', 
    'https://localhost:3000',
    'https://localhost:5173',
    /\.vercel\.app$/,
    /\.zeabur\.app$/,
    /\.netlify\.app$/,
    /\.pages\.dev$/,  // Cloudflare Pages支持
    /\.surge\.sh$/,   // Surge.sh支持
    /\.github\.io$/   // GitHub Pages支持
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// LiblibAI配置 - 根据官方文档更新
const LIBLIB_CONFIG = {
  baseUrl: 'https://openapi.liblibai.cloud',
  text2imgEndpoint: '/api/generate/kontext/text2img',
  img2imgEndpoint: '/api/generate/kontext/img2img',
  statusEndpoint: '/api/generate/status',
  accessKey: process.env.VITE_LIBLIB_ACCESS_KEY,
  secretKey: process.env.VITE_LIBLIB_SECRET_KEY,
  // 根据官方文档使用正确的模板UUID
  text2imgTemplateUuid: process.env.VITE_LIBLIB_TEMPLATE_UUID || 'fe9928fde1b4491c9b360dd24aa2b115',
  img2imgTemplateUuid: process.env.VITE_LIBLIB_IMG2IMG_TEMPLATE_UUID || '1c0a9712b3d84e1b8a9f49514a46d88c'
};



/**
 * 生成API签名（按照官方Python示例实现）
 */
function generateSignature(uri) {
  const timestamp = Date.now(); // 当前时间戳
  const signatureNonce = randomString(16); // 随机字符串，16位

  // 原文 = URL地址 + "&" + 毫秒时间戳 + "&" + 随机字符串
  const str = `${uri}&${timestamp}&${signatureNonce}`;

  console.log('签名原文:', str);
  console.log('SecretKey:', LIBLIB_CONFIG.secretKey);

  // 使用hmacsha1库生成签名
  const hash = hmacsha1(LIBLIB_CONFIG.secretKey, str);

  // 按照官方示例：base64.urlsafe_b64encode().rstrip(b'=').decode()
  // 生成URL安全的Base64编码并移除末尾的=
  const signature = hash
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  console.log('生成的签名:', signature);

  return {
    signature,
    timestamp: timestamp.toString(),
    signatureNonce
  };
}



// 根路径响应
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

// 测试签名生成
app.get('/api/liblib/test-signature', (req, res) => {
  try {
    // 使用固定的测试数据
    const testUri = '/api/generate/webui/text2img/ultra';
    const testTimestamp = 1640995200000;
    const testNonce = 'abcd123456789012'; // 16位随机字符串
    const testContent = `${testUri}&${testTimestamp}&${testNonce}`;

    // 使用正确的hmacsha1库
    const hash = hmacsha1(LIBLIB_CONFIG.secretKey, testContent);
    const signature = hash
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

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

// 检查配置
app.get('/api/liblib/config', (req, res) => {
  const isConfigured = !!(LIBLIB_CONFIG.accessKey && LIBLIB_CONFIG.secretKey);
  res.json({
    configured: isConfigured,
    message: isConfigured ? 'LiblibAI配置正常' : 'LiblibAI配置缺失，请检查环境变量'
  });
});

// 文生图API代理
app.post('/api/liblib/text2img', async (req, res) => {
  try {
    const { prompt, options = {} } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: '缺少prompt参数' });
    }

    if (!LIBLIB_CONFIG.accessKey || !LIBLIB_CONFIG.secretKey) {
      return res.status(500).json({ error: 'LiblibAI API配置不完整' });
    }

    const uri = LIBLIB_CONFIG.text2imgEndpoint;

    // 生成签名
    const { signature, timestamp, signatureNonce } = generateSignature(uri);

    // 按照官方示例构建URL（查询参数方式）
    const url = `${LIBLIB_CONFIG.baseUrl}${uri}?AccessKey=${LIBLIB_CONFIG.accessKey}&Signature=${signature}&Timestamp=${timestamp}&SignatureNonce=${signatureNonce}`;

    // 按照官方示例格式构建请求体
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

    console.log('代理请求到LiblibAI:', url);
    console.log('请求数据:', requestData);

    const fetch = (await import('node-fetch')).default;

    // 按照官方示例发送请求（认证信息已在URL中）
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    });

    // 先获取响应文本，然后尝试解析JSON
    const responseText = await response.text();
    console.log('LiblibAI原始响应:', responseText);
    console.log('响应状态:', response.status, response.statusText);
    console.log('响应头:', Object.fromEntries(response.headers.entries()));

    let result;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error('JSON解析失败:', parseError);
      console.error('响应内容:', responseText);
      return res.status(500).json({
        error: 'API响应格式错误',
        details: responseText.substring(0, 500),
        status: response.status
      });
    }

    if (!response.ok) {
      console.error('LiblibAI API错误:', result);
      return res.status(response.status).json(result);
    }

    console.log('LiblibAI响应:', result);
    res.json(result);

  } catch (error) {
    console.error('代理服务器错误:', error);
    res.status(500).json({ error: error.message });
  }
});

// 图生图API代理
app.post('/api/liblib/img2img', async (req, res) => {
  try {
    const { prompt, imageUrl, options = {} } = req.body;

    if (!prompt || !imageUrl) {
      return res.status(400).json({ error: '缺少prompt或imageUrl参数' });
    }

    if (!LIBLIB_CONFIG.accessKey || !LIBLIB_CONFIG.secretKey) {
      return res.status(500).json({ error: 'LiblibAI API配置不完整' });
    }

    const uri = LIBLIB_CONFIG.img2imgEndpoint;

    // 生成签名
    const { signature, timestamp, signatureNonce } = generateSignature(uri);

    // 按照官方示例构建URL（查询参数方式）
    const url = `${LIBLIB_CONFIG.baseUrl}${uri}?AccessKey=${LIBLIB_CONFIG.accessKey}&Signature=${signature}&Timestamp=${timestamp}&SignatureNonce=${signatureNonce}`;

    // 按照官方文档格式构建请求体 - Kontext图生图
    const requestData = {
      templateUuid: LIBLIB_CONFIG.img2imgTemplateUuid,
      generateParams: {
        model: options.model || "pro", // 默认使用pro模型
      prompt: prompt.substring(0, 2000),
        aspectRatio: options.aspectRatio || "1:1",
        guidance_scale: options.guidance_scale || 3.5,
        imgCount: options.imgCount || 1,
        image_list: [imageUrl] // 根据官方文档，图生图使用image_list数组
      }
    };

    console.log('代理图生图请求到LiblibAI:', url);
    console.log('请求数据:', requestData);

    const fetch = (await import('node-fetch')).default;

    // 按照官方示例发送请求（认证信息已在URL中）
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    });

    // 先获取响应文本，然后尝试解析JSON
    const responseText = await response.text();
    console.log('LiblibAI图生图原始响应:', responseText);
    console.log('响应状态:', response.status, response.statusText);
    console.log('响应头:', Object.fromEntries(response.headers.entries()));

    let result;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error('图生图JSON解析失败:', parseError);
      console.error('响应内容:', responseText);
      return res.status(500).json({
        error: 'API响应格式错误',
        details: responseText.substring(0, 500),
        status: response.status
      });
    }

    if (!response.ok) {
      console.error('LiblibAI图生图API错误:', result);
      return res.status(response.status).json(result);
    }

    console.log('LiblibAI图生图响应:', result);
    res.json(result);

  } catch (error) {
    console.error('图生图代理服务器错误:', error);
    res.status(500).json({ error: error.message });
  }
});

// 查询结果API代理
app.post('/api/liblib/query/:generateUuid', async (req, res) => {
  try {
    const { generateUuid } = req.params;

    if (!generateUuid) {
      return res.status(400).json({ error: '缺少generateUuid参数' });
    }

    if (!LIBLIB_CONFIG.accessKey || !LIBLIB_CONFIG.secretKey) {
      return res.status(500).json({ error: 'LiblibAI API配置不完整' });
    }

    const uri = LIBLIB_CONFIG.statusEndpoint;

    // 生成签名
    const { signature, timestamp, signatureNonce } = generateSignature(uri);

    // 按照官方示例构建URL
    const url = `${LIBLIB_CONFIG.baseUrl}${uri}?AccessKey=${LIBLIB_CONFIG.accessKey}&Signature=${signature}&Timestamp=${timestamp}&SignatureNonce=${signatureNonce}`;

    // 按照官方示例，查询状态需要POST请求，body包含generateUuid
    const requestData = {
      generateUuid: generateUuid
    };

    const fetch = (await import('node-fetch')).default;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    });

    // 先获取响应文本，然后尝试解析JSON
    const responseText = await response.text();
    console.log('LiblibAI查询原始响应:', responseText);

    let result;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error('查询JSON解析失败:', parseError);
      return res.status(500).json({
        error: '查询响应格式错误',
        details: responseText.substring(0, 500)
      });
    }

    if (!response.ok) {
      console.error('LiblibAI查询API错误:', result);
      return res.status(response.status).json(result);
    }

    res.json(result);

  } catch (error) {
    console.error('查询代理服务器错误:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== OpenAI API代理服务 =====

// OpenAI聊天API代理
app.post('/api/openai/chat', async (req, res) => {
  try {
    const { messages, model = 'gpt-4o', temperature = 0.7, max_tokens = 150 } = req.body;

    if (!messages) {
      return res.status(400).json({ error: '缺少messages参数' });
    }

    if (!process.env.VITE_OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OpenAI API密钥未配置' });
    }

    console.log('OpenAI Chat API请求:', { model, messagesCount: messages.length });

    const fetch = (await import('node-fetch')).default;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.VITE_OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens
      })
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('OpenAI Chat API错误:', result);
      return res.status(response.status).json(result);
    }

    console.log('OpenAI Chat API成功');
    res.json(result);

  } catch (error) {
    console.error('OpenAI Chat代理服务器错误:', error);
    res.status(500).json({ error: error.message });
  }
});

// DALL-E 3 图像生成API代理
app.post('/api/openai/images', async (req, res) => {
  try {
    const { prompt, size = '1024x1024', quality = 'standard', n = 1 } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: '缺少prompt参数' });
    }

    if (!process.env.VITE_OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OpenAI API密钥未配置' });
    }

    console.log('DALL-E API请求:', { promptLength: prompt.length, size, quality });

    const fetch = (await import('node-fetch')).default;

    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.VITE_OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: prompt.substring(0, 4000), // DALL-E 3有字符限制
        size,
        quality,
        n
      })
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('DALL-E API错误:', result);
      return res.status(response.status).json(result);
    }

    console.log('DALL-E API成功');
    res.json(result);

  } catch (error) {
    console.error('DALL-E代理服务器错误:', error);
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

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 图画书创作器API服务器运行在 http://localhost:${PORT}`);
  console.log('📡 API端点:');
  console.log(`  - 服务状态: GET http://localhost:${PORT}/api/status`);
  console.log(`  - OpenAI聊天: POST http://localhost:${PORT}/api/openai/chat`);
  console.log(`  - DALL-E生成: POST http://localhost:${PORT}/api/openai/images`);
  console.log(`  - LiblibAI配置: GET http://localhost:${PORT}/api/liblib/config`);
  console.log(`  - LiblibAI文生图: POST http://localhost:${PORT}/api/liblib/text2img`);
  console.log(`  - LiblibAI图生图: POST http://localhost:${PORT}/api/liblib/img2img`);
  console.log(`  - 查询结果: POST http://localhost:${PORT}/api/liblib/query/:generateUuid`);
  
  // 检查配置
  const hasOpenAIKey = !!process.env.VITE_OPENAI_API_KEY;
  const hasLiblibConfig = !!(LIBLIB_CONFIG.accessKey && LIBLIB_CONFIG.secretKey);
  
  console.log('\n🔑 API配置状态:');
  console.log(`  - OpenAI: ${hasOpenAIKey ? '✅ 已配置' : '❌ 未配置'}`);
  console.log(`  - LiblibAI: ${hasLiblibConfig ? '✅ 已配置' : '❌ 未配置'}`);
  
  if (!hasOpenAIKey || !hasLiblibConfig) {
    console.log('\n⚠️  请检查环境变量配置！');
  }
});

export default app;
