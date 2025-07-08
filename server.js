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

// LiblibAI 配置 - 使用正确的Kontext服务端点
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

// API根路径信息
app.get('/api', (req, res) => {
  res.json({
    message: 'Picture Book Creator API服务器运行正常',
    version: '2.1.0',
    services: {
      openai: '双账户OpenAI聊天和图像生成',
      qwen: '通义千问聊天API',
      liblib: 'LiblibAI Kontext服务图像生成（修复版）'
    },
    endpoints: [
      'GET /api/liblib/config - LiblibAI配置检查',
      'POST /api/liblib/text2img - Kontext文生图',
      'POST /api/liblib/img2img - Kontext图生图',
      'POST /api/liblib/query/:generateUuid - 查询结果',
      'GET /api/liblib/test-signature - 签名测试',
      'POST /api/openai/chat - OpenAI聊天',
      'POST /api/openai/images - DALL-E图像生成',
      'POST /api/qwen/chat - 通义千问聊天',
      'GET /api/status - 服务状态检查'
    ]
  });
});

app.get('/api/liblib/test-signature', (req, res) => {
  try {
    const testUri = '/api/generate/kontext/text2img';
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
    apiSystem: 'LiblibAI Kontext服务',
    baseUrl: LIBLIB_CONFIG.baseUrl,
    endpoints: {
      text2img: LIBLIB_CONFIG.text2imgEndpoint,
      img2img: LIBLIB_CONFIG.img2imgEndpoint,
      status: LIBLIB_CONFIG.statusEndpoint
    },
    templateUuids: {
      text2img: LIBLIB_CONFIG.text2imgTemplateUuid,
      img2img: LIBLIB_CONFIG.img2imgTemplateUuid
    },
    hasAccessKey: !!LIBLIB_CONFIG.accessKey,
    hasSecretKey: !!LIBLIB_CONFIG.secretKey,
    hasText2imgTemplateUuid: !!LIBLIB_CONFIG.text2imgTemplateUuid,
    hasImg2imgTemplateUuid: !!LIBLIB_CONFIG.img2imgTemplateUuid,
    message: isConfigured ? 'LiblibAI Kontext服务配置正常' : 'LiblibAI配置缺失，请检查VITE_LIBLIB_ACCESS_KEY和VITE_LIBLIB_SECRET_KEY环境变量'
  });
});

// 图生图测试端点
app.post('/api/liblib/img2img-test', async (req, res) => {
  try {
    console.log('🧪 图生图测试端点调用');
    
    if (!LIBLIB_CONFIG.accessKey || !LIBLIB_CONFIG.secretKey) {
      return res.status(500).json({ error: 'LiblibAI API配置不完整' });
    }

    const uri = LIBLIB_CONFIG.img2imgEndpoint;
    const { signature, timestamp, signatureNonce } = generateSignature(uri);
    const url = `${LIBLIB_CONFIG.baseUrl}${uri}?AccessKey=${LIBLIB_CONFIG.accessKey}&Signature=${signature}&Timestamp=${timestamp}&SignatureNonce=${signatureNonce}`;

    // 使用官方示例的测试数据
    const requestData = {
      templateUuid: LIBLIB_CONFIG.img2imgTemplateUuid,
      generateParams: {
        prompt: "Turn this image into a Ghibli-style, a traditional Japanese anime aesthetics.",
        aspectRatio: "2:3",
        guidance_scale: 3.5,
        imgCount: 1,
        image_list: [
          "https://liblibai-online.liblib.cloud/img/081e9f07d9bd4c2ba090efde163518f9/10d686ff178fb603bec49e84eed8a5d95c20d969cf3ea4abb83d11caff80fd34.jpg"
        ]
      }
    };

    console.log('🧪 测试请求数据:', JSON.stringify(requestData, null, 2));

    const fetch = (await import('node-fetch')).default;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestData)
    });

    const responseText = await response.text();
    console.log('🧪 原始响应文本:', responseText);
    
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error('🧪 响应解析失败:', parseError);
      return res.status(500).json({
        error: 'API响应格式错误',
        details: responseText.substring(0, 500),
        status: response.status
      });
    }

    console.log('🧪 解析后的响应:', JSON.stringify(result, null, 2));

    if (!response.ok) {
      console.error('🧪 API请求失败:', response.status, result);
      return res.status(response.status).json(result);
    }

    res.json({
      testSuccess: true,
      apiResponse: result,
      extractedGenerateUuid: result?.data?.generateUuid,
      responseStructure: {
        hasCode: 'code' in result,
        hasData: 'data' in result,
        hasGenerateUuid: result?.data && 'generateUuid' in result.data,
        codeValue: result.code,
        dataType: typeof result.data
      }
    });

  } catch (error) {
    console.error('🧪 测试端点异常:', error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

// LiblibAI Kontext服务 - 文生图
app.post('/api/liblib/text2img', async (req, res) => {
  try {
    const { prompt, options = {} } = req.body;
    if (!prompt) return res.status(400).json({ error: '缺少prompt参数' });
    if (!LIBLIB_CONFIG.accessKey || !LIBLIB_CONFIG.secretKey)
      return res.status(500).json({ error: 'LiblibAI API配置不完整' });
    
    const uri = LIBLIB_CONFIG.text2imgEndpoint;
    const { signature, timestamp, signatureNonce } = generateSignature(uri);
    const url = `${LIBLIB_CONFIG.baseUrl}${uri}?AccessKey=${LIBLIB_CONFIG.accessKey}&Signature=${signature}&Timestamp=${timestamp}&SignatureNonce=${signatureNonce}`;
    
    // 使用正确的LiblibAI Kontext服务参数格式
    const requestData = {
      templateUuid: LIBLIB_CONFIG.text2imgTemplateUuid,
      generateParams: {
        model: options.model || "pro",
        prompt: prompt.substring(0, 2000),
        aspectRatio: options.aspectRatio || "3:4",
        guidance_scale: options.guidance_scale || 3.5,
        imgCount: options.imgCount || 1
      }
    };
    
    console.log('LiblibAI Kontext服务 - 文生图请求:', {
      url: `${LIBLIB_CONFIG.baseUrl}${uri}`,
      templateUuid: requestData.templateUuid,
      prompt: requestData.generateParams.prompt.substring(0, 100) + '...',
      model: requestData.generateParams.model,
      aspectRatio: requestData.generateParams.aspectRatio
    });
    
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(url, { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify(requestData) 
    });
    
    const responseText = await response.text();
    let result;
    try { 
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error('LiblibAI Kontext服务响应解析失败:', responseText.substring(0, 500));
      return res.status(500).json({
        error: 'API响应格式错误',
        details: responseText.substring(0, 500),
        status: response.status
      });
    }
    
    if (!response.ok) {
      console.error('LiblibAI Kontext服务请求失败:', response.status, result);
      return res.status(response.status).json(result);
    }
    
    console.log('LiblibAI Kontext服务 - 文生图请求成功:', result);
    res.json(result);
  } catch (error) {
    console.error('LiblibAI Kontext服务请求异常:', error);
    res.status(500).json({ error: error.message });
  }
});

// LiblibAI Kontext服务 - 图生图
app.post('/api/liblib/img2img', async (req, res) => {
  try {
    console.log('🖼️ 图生图请求开始 - 接收参数:', { 
      hasPrompt: !!req.body.prompt, 
      hasImageUrl: !!req.body.imageUrl,
      options: req.body.options 
    });

    const { prompt, imageUrl, options = {} } = req.body;
    if (!prompt || !imageUrl)
      return res.status(400).json({ error: '缺少prompt或imageUrl参数' });
    if (!LIBLIB_CONFIG.accessKey || !LIBLIB_CONFIG.secretKey)
      return res.status(500).json({ error: 'LiblibAI API配置不完整' });

    const uri = LIBLIB_CONFIG.img2imgEndpoint;
    const { signature, timestamp, signatureNonce } = generateSignature(uri);
    const url = `${LIBLIB_CONFIG.baseUrl}${uri}?AccessKey=${LIBLIB_CONFIG.accessKey}&Signature=${signature}&Timestamp=${timestamp}&SignatureNonce=${signatureNonce}`;

    // 使用正确的LiblibAI Kontext服务图生图参数格式（注意：图生图不需要model参数）
    const requestData = {
      templateUuid: LIBLIB_CONFIG.img2imgTemplateUuid,
      generateParams: {
        prompt: prompt.substring(0, 2000),
        aspectRatio: options.aspectRatio || "2:3",
        guidance_scale: options.guidance_scale || 3.5,
        imgCount: options.imgCount || 1,
        image_list: [imageUrl]
      }
    };

    console.log('🖼️ 图生图请求配置:', {
      url: `${LIBLIB_CONFIG.baseUrl}${uri}`,
      templateUuid: requestData.templateUuid,
      prompt: requestData.generateParams.prompt.substring(0, 100) + '...',
      aspectRatio: requestData.generateParams.aspectRatio,
      guidance_scale: requestData.generateParams.guidance_scale,
      imageCount: requestData.generateParams.imgCount,
      imageUrl: imageUrl.substring(0, 80) + '...'
    });

    console.log('🖼️ 完整请求数据:', JSON.stringify(requestData, null, 2));

    const fetch = (await import('node-fetch')).default;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestData)
    });

    console.log('🖼️ HTTP响应状态:', response.status, response.statusText);

    const responseText = await response.text();
    console.log('🖼️ 原始响应文本:', responseText);
    
    let result;
    try {
      result = JSON.parse(responseText);
      console.log('🖼️ 解析后的JSON:', JSON.stringify(result, null, 2));
    } catch (parseError) {
      console.error('🖼️ JSON解析失败:', parseError);
      console.error('🖼️ 原始响应长度:', responseText.length);
      console.error('🖼️ 响应前500字符:', responseText.substring(0, 500));
      return res.status(500).json({
        error: 'API响应格式错误',
        details: responseText.substring(0, 500),
        status: response.status
      });
    }

    // 详细分析响应结构
    console.log('🖼️ 响应结构分析:', {
      hasCode: 'code' in result,
      codeValue: result.code,
      codeType: typeof result.code,
      hasData: 'data' in result,
      dataValue: result.data,
      dataType: typeof result.data,
      hasMsg: 'msg' in result,
      msgValue: result.msg
    });

    if (result.data) {
      console.log('🖼️ data字段分析:', {
        hasGenerateUuid: 'generateUuid' in result.data,
        generateUuidValue: result.data.generateUuid,
        generateUuidType: typeof result.data.generateUuid,
        dataKeys: Object.keys(result.data)
      });
    }

    if (!response.ok) {
      console.error('🖼️ HTTP请求失败:', response.status, result);
      return res.status(response.status).json(result);
    }

    if (result.code !== 0) {
      console.error('🖼️ API业务逻辑失败:', result);
      return res.status(400).json(result);
    }

    // 确保返回标准格式
    const standardResponse = {
      code: result.code,
      data: result.data,
      msg: result.msg || '',
      // 为前端添加便于解析的字段
      success: result.code === 0,
      generateUuid: result.data?.generateUuid
    };

    console.log('🖼️ 标准化响应:', JSON.stringify(standardResponse, null, 2));
    console.log('🖼️ 图生图请求成功完成');
    
    res.json(standardResponse);
  } catch (error) {
    console.error('🖼️ 图生图请求异常:', error);
    console.error('🖼️ 异常堆栈:', error.stack);
    res.status(500).json({ 
      error: error.message,
      type: 'server_exception',
      details: error.stack
    });
  }
});

// LiblibAI Kontext服务 - 查询任务状态
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

    console.log('LiblibAI Kontext服务 - 查询任务状态:', { 
      url: `${LIBLIB_CONFIG.baseUrl}${uri}`, 
      generateUuid: generateUuid 
    });

    const fetch = (await import('node-fetch')).default;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestData)
    });

    const responseText = await response.text();
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error('LiblibAI Kontext服务查询响应解析失败:', responseText.substring(0, 500));
      return res.status(500).json({
        error: '查询响应格式错误',
        details: responseText.substring(0, 500)
      });
    }

    if (!response.ok) {
      console.error('LiblibAI Kontext服务查询请求失败:', response.status, result);
      return res.status(response.status).json(result);
    }

    console.log('LiblibAI Kontext服务 - 查询任务成功:', result);
    res.json(result);
  } catch (error) {
    console.error('LiblibAI Kontext服务查询请求异常:', error);
    res.status(500).json({ error: error.message });
  }
});

// 🔗 双账户OpenAI聊天API代理
app.post('/api/openai/chat', async (req, res) => {
  try {
    const { 
      messages, 
      model = 'gpt-4o', 
      temperature = 0.7, 
      max_tokens = 150,
      accountId = 'primary',  // 新增：账户选择
      accountType = 'paid'    // 新增：账户类型
    } = req.body;
    
    if (!messages) return res.status(400).json({ error: '缺少messages参数' });
    
    // 🔗 双账户API key配置
    const API_KEYS = {
      primary: process.env.VITE_OPENAI_API_KEY,        // 主账户（付费）
      secondary: process.env.OPENAI_API_KEY2           // 副账户（免费）
    };
    
    // 智能选择账户
    let selectedApiKey;
    if (accountId === 'secondary' || !API_KEYS.primary) {
      selectedApiKey = API_KEYS.secondary;
      console.log('🔗 OpenAI - 使用副账户API');
    } else {
      selectedApiKey = API_KEYS.primary;
      console.log('🔗 OpenAI - 使用主账户API');
    }
    
    if (!selectedApiKey) {
      return res.status(500).json({ 
        error: 'OpenAI API密钥未配置',
        details: '请设置VITE_OPENAI_API_KEY或OPENAI_API_KEY2环境变量'
      });
    }
    
    const openaiPayload = {
      model,
      messages,
      temperature,
      max_tokens
    };
    
    console.log('🔗 OpenAI聊天请求:', { model, messageCount: messages.length, accountType });
    
    const fetch = (await import('node-fetch')).default;
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${selectedApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(openaiPayload)
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      console.error('🔗 OpenAI API错误:', response.status, result);
      
      // 如果主账户失败且有副账户，尝试副账户
      if (accountId === 'primary' && API_KEYS.secondary && result.error?.code === 'insufficient_quota') {
        console.log('🔗 主账户配额不足，尝试副账户...');
        return await exports.handleOpenAIRequest(req, res, { ...req.body, accountId: 'secondary' });
      }
      
      return res.status(response.status).json(result);
    }
    
    console.log('🔗 OpenAI聊天成功');
    res.json(result);
    
  } catch (error) {
    console.error('🔗 OpenAI聊天异常:', error);
    res.status(500).json({ error: error.message });
  }
});

// 🎨 DALL-E图像生成API
app.post('/api/openai/images', async (req, res) => {
  try {
    const { 
      prompt, 
      model = 'dall-e-3',
      size = '1024x1024',
      quality = 'standard',
      n = 1,
      accountId = 'primary'
    } = req.body;
    
    if (!prompt) return res.status(400).json({ error: '缺少prompt参数' });
    
    const API_KEYS = {
      primary: process.env.VITE_OPENAI_API_KEY,
      secondary: process.env.OPENAI_API_KEY2
    };
    
    const selectedApiKey = (accountId === 'secondary' || !API_KEYS.primary) ? API_KEYS.secondary : API_KEYS.primary;
    
    if (!selectedApiKey) {
      return res.status(500).json({ error: 'OpenAI API密钥未配置' });
    }
    
    const imagePayload = {
      model,
      prompt,
      size,
      quality,
      n
    };
    
    console.log('🎨 DALL-E图像生成请求:', { model, size, quality });
    
    const fetch = (await import('node-fetch')).default;
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${selectedApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(imagePayload)
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      console.error('🎨 DALL-E API错误:', response.status, result);
      return res.status(response.status).json(result);
    }
    
    console.log('🎨 DALL-E图像生成成功');
    res.json(result);
    
  } catch (error) {
    console.error('🎨 DALL-E图像生成异常:', error);
    res.status(500).json({ error: error.message });
  }
});

// 📚 通义千问API代理 (兼容OpenAI格式)
app.post('/api/qwen/chat', async (req, res) => {
  try {
    const { messages, model = 'qwen-turbo', temperature = 0.7, max_tokens = 150 } = req.body;
    
    if (!messages) {
      return res.status(400).json({ error: '缺少messages参数' });
    }
    
    // 🔍 环境变量检查 - 优先使用 DASHSCOPE_API_KEY
    const qwenApiKey = process.env.DASHSCOPE_API_KEY || process.env.VITE_QWEN_API_KEY;
    
    if (!qwenApiKey) {
      return res.status(500).json({ 
        error: '通义千问API密钥未配置',
        details: '请设置DASHSCOPE_API_KEY或VITE_QWEN_API_KEY环境变量'
      });
    }
    
    const qwenPayload = {
      model,
      input: {
        messages
      },
      parameters: {
        temperature,
        max_tokens,
        result_format: 'message'
      }
    };
    
    console.log('📚 通义千问请求:', { model, messageCount: messages.length });
    
    const fetch = (await import('node-fetch')).default;
    const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${qwenApiKey}`,
        'Content-Type': 'application/json'
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
      console.error('📚 通义千问API错误:', response.status, result);
      return res.status(response.status).json(result);
    }
    
    console.log('📚 通义千问请求成功');
    res.json(result);
    
  } catch (error) {
    console.error('📚 通义千问请求异常:', error);
    res.status(500).json({ error: error.message });
  }
});

// 📊 服务器状态检查
app.get('/api/status', (req, res) => {
  res.json({
    status: 'running',
    timestamp: new Date().toISOString(),
    version: '2.1.0',
    services: {
      liblib: !!(LIBLIB_CONFIG.accessKey && LIBLIB_CONFIG.secretKey),
      openai: !!(process.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY2),
      qwen: !!(process.env.DASHSCOPE_API_KEY || process.env.VITE_QWEN_API_KEY)
    }
  });
});

// 🎯 静态文件服务（生产环境）
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'dist')));
  
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ error: 'API endpoint not found' });
    }
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

// 🚀 启动服务器
const server = app.listen(PORT, () => {
  console.log(`🚀 图画书创作器API服务器运行在 http://localhost:${PORT}`);
  console.log('');
  console.log('🔍 环境变量配置检查:');
  console.log(`  🔑 DASHSCOPE_API_KEY (优先): ${process.env.DASHSCOPE_API_KEY ? '✅ 已配置' : '❌ 未配置'}`);
  console.log(`  🔑 VITE_QWEN_API_KEY (备用): ${process.env.VITE_QWEN_API_KEY ? '✅ 已配置' : '❌ 未配置'}`);
  console.log(`  🔑 VITE_LIBLIB_ACCESS_KEY: ${LIBLIB_CONFIG.accessKey ? '✅ 已配置' : '❌ 未配置'}`);
  console.log(`  🔑 VITE_LIBLIB_SECRET_KEY: ${LIBLIB_CONFIG.secretKey ? '✅ 已配置' : '❌ 未配置'}`);
  console.log(`  🌐 NODE_ENV: ${process.env.NODE_ENV || '未设置'}`);
  console.log(`  📱 PORT: ${PORT}`);
  console.log('  🔧 通义千问模式: OpenAI兼容模式 (Zeabur优化版)');
  console.log('');
  console.log('🎯 可用API端点:');
  console.log(`  📖 LiblibAI Kontext服务: ${LIBLIB_CONFIG.accessKey && LIBLIB_CONFIG.secretKey ? '✅ 可用' : '❌ 需要配置'}`);
  console.log(`  🤖 OpenAI聊天: ${process.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY2 ? '✅ 可用' : '❌ 需要配置'}`);
  console.log(`  📚 通义千问: ${process.env.DASHSCOPE_API_KEY || process.env.VITE_QWEN_API_KEY ? '✅ 可用' : '❌ 需要配置'}`);
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('🛑 接收到SIGTERM信号，开始优雅关闭...');
  server.close(() => {
    console.log('✅ 服务器已优雅关闭');
  });
});

export default app;