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
  text2imgEndpoint: '/api/generate/webui/text2img/ultra',
  img2imgEndpoint: '/api/generate/webui/img2img/ultra',
  statusEndpoint: '/api/generate/query',
  accessKey: process.env.VITE_LIBLIB_ACCESS_KEY,
  secretKey: process.env.VITE_LIBLIB_SECRET_KEY,
  // 星流Star-3 Alpha模板UUID（适用于文生图和图生图）
  templateUuid: '5d7e67009b344550bc1aa6ccbfa1d7f4'
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
      templateUuid: LIBLIB_CONFIG.templateUuid,
      generateParams: {
        prompt: prompt.substring(0, 2000),
        // 移除model参数，星流API不需要这个参数
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
      templateUuid: LIBLIB_CONFIG.templateUuid,
      generateParams: {
        prompt: prompt.substring(0, 2000),
        // 移除model参数，星流API不需要这个参数
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
    
    // 根据指南文档，查询接口是GET请求，generateUuid作为查询参数
    const uri = LIBLIB_CONFIG.statusEndpoint;
    const { signature, timestamp, signatureNonce } = generateSignature(uri);
    const url = `${LIBLIB_CONFIG.baseUrl}${uri}?generateUuid=${generateUuid}&AccessKey=${LIBLIB_CONFIG.accessKey}&Signature=${signature}&Timestamp=${timestamp}&SignatureNonce=${signatureNonce}`;
    
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(url, { 
      method: 'GET',  // 改为GET请求
      headers: { 'Content-Type': 'application/json' }
    });
    
    const responseText = await response.text();
    let result;
    try { 
      result = JSON.parse(responseText);
    } catch (parseError) {
      return res.status(500).json({ error: '查询响应格式错误', details: responseText.substring(0, 500) });
    }
    
    if (!response.ok) return res.status(response.status).json(result);
    res.json(result);
  } catch (error) {
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
    
    // 选择API key
    let selectedApiKey = API_KEYS[accountId];
    if (!selectedApiKey) {
      // 如果指定的账户没有配置，使用主账户
      selectedApiKey = API_KEYS.primary;
      console.log(`⚠️ 账户${accountId}未配置，使用主账户`);
    }
    
    if (!selectedApiKey) {
      return res.status(500).json({ 
        error: 'OpenAI API密钥未配置',
        details: '请在环境变量中配置 VITE_OPENAI_API_KEY 或 OPENAI_API_KEY2',
        accountId: accountId,
        availableAccounts: {
          primary: !!API_KEYS.primary,
          secondary: !!API_KEYS.secondary
        }
      });
    }
    
    // 记录API调用
    const accountName = accountId === 'primary' ? '主账户(付费)' : '副账户(免费)';
    console.log(`🔗 使用${accountName}调用OpenAI API: ${model}`);
    
    const fetch = (await import('node-fetch')).default;
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${selectedApiKey}`
      },
      body: JSON.stringify({ model, messages, temperature, max_tokens })
    });
    
    const result = await response.json();
    
    // 增强错误信息
    if (!response.ok) {
      console.error(`❌ ${accountName}API调用失败:`, result);
      
      // 为429错误添加特殊处理
      if (response.status === 429) {
        result.accountInfo = {
          accountId: accountId,
          accountName: accountName,
          accountType: accountType,
          suggestion: accountId === 'primary' ? 
            '主账户被限频，建议切换到副账户' : 
            '副账户被限频，建议切换到主账户'
        };
      }
      
      return res.status(response.status).json(result);
    }
    
    console.log(`✅ ${accountName}API调用成功`);
    
    // 添加账户信息到响应
    result.accountInfo = {
      accountId: accountId,
      accountName: accountName,
      accountType: accountType
    };
    
    res.json(result);
  } catch (error) {
    console.error('OpenAI API代理错误:', error);
    res.status(500).json({ 
      error: error.message,
      details: '服务器内部错误，请稍后重试'
    });
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

// 🤖 通义千问API代理 (OpenAI兼容模式)
app.post('/api/qwen/chat', async (req, res) => {
  try {
    const { model = 'qwen-turbo', messages, temperature, max_tokens, ...otherParams } = req.body;
    
    // 🔍 详细调试日志
    console.log('🔍 通义千问API调试信息 (OpenAI兼容模式):');
    console.log('  📝 请求参数:', { model, hasMessages: !!messages, messagesCount: messages?.length });
    
    // 1. 优先读取DASHSCOPE_API_KEY（Zeabur推荐）
    const apiKey = process.env.DASHSCOPE_API_KEY || process.env.VITE_QWEN_API_KEY;
    if (!apiKey) {
      console.log('❌ QWEN API KEY 获取失败，请检查Zeabur配置');
      return res.status(500).json({ 
        error: "QWEN API KEY 获取失败，请检查Zeabur配置",
        details: '请在环境变量中配置 DASHSCOPE_API_KEY 或 VITE_QWEN_API_KEY',
        env_check: {
          DASHSCOPE_API_KEY: !!process.env.DASHSCOPE_API_KEY,
          VITE_QWEN_API_KEY: !!process.env.VITE_QWEN_API_KEY,
          available_vars: Object.keys(process.env).filter(key => key.includes('QWEN') || key.includes('DASHSCOPE'))
        }
      });
    }
    
    console.log('  🔑 API密钥状态: 已配置', `(${apiKey.substring(0, 10)}...)`);
    console.log('  🔍 环境变量检查:', {
      DASHSCOPE_API_KEY: !!process.env.DASHSCOPE_API_KEY,
      VITE_QWEN_API_KEY: !!process.env.VITE_QWEN_API_KEY
    });
    
    // 2. 按OpenAI chat API格式透传参数
    if (!messages || !Array.isArray(messages)) {
      console.log('❌ 参数验证失败: 缺少messages数组');
      return res.status(400).json({ 
        error: '缺少messages参数或格式错误',
        received: { model, hasMessages: !!messages, isArray: Array.isArray(messages) },
        expected: 'messages should be an array of {role, content} objects'
      });
    }
    
    console.log(`🤖 使用OpenAI兼容模式调用通义千问API: ${model}`);
    console.log('  📤 消息数量:', messages.length);
    
    const fetch = (await import('node-fetch')).default;
    
    // 按OpenAI chat API格式透传参数
    const openaiPayload = req.body;
    
    const qwenResp = await fetch(
      "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(openaiPayload),
      }
    );
    
    console.log(`📡 API响应状态: ${qwenResp.status} ${qwenResp.statusText}`);
    const data = await qwenResp.json();

    // 3. 日志详细报错帮助排查
    if (!qwenResp.ok) {
      console.error("QWEN API详细错误响应：", data);
      return res.status(qwenResp.status).json({ error: data });
    }

    // 4. 返回正常响应
    console.log(`✅ 通义千问API调用成功 (${model})`);
    res.json(data);
    
  } catch (err) {
    console.error("请求QWEN接口异常:", err);
    res.status(500).json({ error: "服务器内部错误" });
  }
});

// 🔗 API状态检查
app.get('/api/status', (req, res) => {
  const hasPrimaryKey = !!process.env.VITE_OPENAI_API_KEY;
  const hasSecondaryKey = !!process.env.OPENAI_API_KEY2;
  const hasLiblibConfig = !!(LIBLIB_CONFIG.accessKey && LIBLIB_CONFIG.secretKey);
  const hasQwenKey = !!(process.env.DASHSCOPE_API_KEY || process.env.VITE_QWEN_API_KEY);
  
  // 双账户配置状态
  const dualAccountStatus = {
    primary: {
      configured: hasPrimaryKey,
      name: '主账户(付费)',
      env: 'VITE_OPENAI_API_KEY',
      message: hasPrimaryKey ? '主账户已配置' : '主账户密钥未配置'
    },
    secondary: {
      configured: hasSecondaryKey,
      name: '副账户(免费)',
      env: 'OPENAI_API_KEY2',
      message: hasSecondaryKey ? '副账户已配置' : '副账户密钥未配置'
    }
  };
  
  const totalConfiguredAccounts = (hasPrimaryKey ? 1 : 0) + (hasSecondaryKey ? 1 : 0);
  
  res.json({
    status: 'running',
    timestamp: new Date().toISOString(),
    dualAccountSystem: {
      enabled: true,
      totalAccounts: 2,
      configuredAccounts: totalConfiguredAccounts,
      accounts: dualAccountStatus,
      loadBalancing: totalConfiguredAccounts > 1 ? 'active' : 'single-account'
    },
    services: {
      openai: {
        configured: hasPrimaryKey || hasSecondaryKey,
        dualAccount: true,
        primaryAccount: dualAccountStatus.primary,
        secondaryAccount: dualAccountStatus.secondary,
        message: totalConfiguredAccounts === 2 ? 
          '双账户负载均衡已启用' : 
          totalConfiguredAccounts === 1 ? 
            '单账户运行中' : 
            'OpenAI API密钥未配置'
      },
      qwen: {
        configured: hasQwenKey,
        env: 'DASHSCOPE_API_KEY (优先) 或 VITE_QWEN_API_KEY',
        models: ['qwen-turbo', 'qwen-plus', 'qwen-max'],
        message: hasQwenKey ? '通义千问API已配置' : '通义千问API密钥未配置',
        priority: 'DASHSCOPE_API_KEY > VITE_QWEN_API_KEY'
      },
      liblib: {
        configured: hasLiblibConfig,
        message: hasLiblibConfig ? 'LiblibAI API已配置' : 'LiblibAI API密钥未配置'
      }
    },
    endpoints: [
      'POST /api/openai/chat - 双账户OpenAI聊天API',
      'POST /api/openai/images - DALL-E图像生成',
      'POST /api/qwen/chat - 通义千问聊天API',
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
  
  // 🔍 启动时环境变量检查
  console.log('\n🔍 环境变量配置检查:');
  console.log(`  🔑 DASHSCOPE_API_KEY (优先): ${process.env.DASHSCOPE_API_KEY ? 
    `已配置 (${process.env.DASHSCOPE_API_KEY.substring(0, 10)}...)` : '❌ 未配置'}`);
  console.log(`  🔑 VITE_QWEN_API_KEY (备用): ${process.env.VITE_QWEN_API_KEY ? 
    `已配置 (${process.env.VITE_QWEN_API_KEY.substring(0, 10)}...)` : '❌ 未配置'}`);
  console.log(`  🔑 VITE_LIBLIB_ACCESS_KEY: ${process.env.VITE_LIBLIB_ACCESS_KEY ? 
    `已配置 (${process.env.VITE_LIBLIB_ACCESS_KEY.substring(0, 10)}...)` : '❌ 未配置'}`);
  console.log(`  🔑 VITE_LIBLIB_SECRET_KEY: ${process.env.VITE_LIBLIB_SECRET_KEY ? 
    `已配置 (${process.env.VITE_LIBLIB_SECRET_KEY.substring(0, 10)}...)` : '❌ 未配置'}`);
  console.log(`  🌐 NODE_ENV: ${process.env.NODE_ENV || '未设置'}`);
  console.log(`  📱 PORT: ${PORT}`);
  console.log(`  🔧 通义千问模式: OpenAI兼容模式 (Zeabur优化版)\n`);
});

export default app;