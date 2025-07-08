/**
 * LiblibAI Kontext API集成模块（使用StarFlow认证）
 * 支持文生图(text2image)和图生图(image2image)功能
 * 基于F.1 Kontext算法
 *
 * API端点: https://api.liblib.art
 * 认证方式: StarFlow AccessKey + SecretKey + 签名
 */

// LiblibAI Kontext API配置 - 使用相对路径
const LIBLIB_CONFIG = {
  baseUrl: import.meta.env.VITE_API_BASE_URL || '/api', // 使用相对路径
  text2imgEndpoint: '/liblib/text2img',
  img2imgEndpoint: '/liblib/img2img',
  queryEndpoint: '/liblib/query', // 注意：这里的路径会在具体调用时加上taskId
  configEndpoint: '/liblib/config'
};

/**
 * 构建请求头（简化版，用于代理服务器）
 * @returns {Object} 请求头对象
 */
function buildHeaders() {
  return {
    'Content-Type': 'application/json'
  };
}

/**
 * 文生图API调用
 * @param {string} prompt - 图像生成提示词（英文，不超过2000字符）
 * @param {Object} options - 可选参数
 * @returns {Promise<Object>} 包含task_id的响应对象
 */
export async function generateTextToImage(prompt, options = {}) {
  try {
    console.log('LiblibAI - 开始文生图请求:', prompt);

    const url = LIBLIB_CONFIG.baseUrl + LIBLIB_CONFIG.text2imgEndpoint;
    const headers = buildHeaders();

    const requestData = {
      prompt: prompt.substring(0, 2000), // 确保不超过2000字符
      options: options
    };

    console.log('LiblibAI - 发送请求到代理服务器:', url);
    console.log('LiblibAI - 请求数据:', requestData);

    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestData)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`LiblibAI代理请求失败: ${response.status} ${response.statusText} - ${errorData.error}`);
    }

    const result = await response.json();
    console.log('LiblibAI - 文生图请求成功:', result);

    return result;

  } catch (error) {
    console.error('LiblibAI - 文生图请求失败:', error);
    throw error;
  }
}

/**
 * 图生图API调用
 * @param {string} prompt - 图像生成提示词
 * @param {string} imageUrl - 参考图像URL
 * @param {Object} options - 可选参数
 * @returns {Promise<Object>} 包含task_id的响应对象
 */
export async function generateImageToImage(prompt, imageUrl, options = {}) {
  try {
    console.log('LiblibAI - 开始图生图请求:', { prompt, imageUrl });

    const url = LIBLIB_CONFIG.baseUrl + LIBLIB_CONFIG.img2imgEndpoint;
    const headers = buildHeaders();

    const requestData = {
      prompt: prompt.substring(0, 2000),
      imageUrl: imageUrl,
      options: options
    };

    console.log('LiblibAI - 发送图生图请求到代理服务器:', url);
    console.log('LiblibAI - 请求数据:', requestData);

    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestData)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`LiblibAI图生图代理请求失败: ${response.status} ${response.statusText} - ${errorData.error}`);
    }

    const result = await response.json();
    console.log('LiblibAI - 图生图请求成功:', result);
    console.log('LiblibAI - 图生图响应结构分析:', {
      hasData: !!result.data,
      hasGenerateUuid: !!result.data?.generateUuid,
      hasTaskId: !!result.task_id,
      hasId: !!result.id,
      keys: Object.keys(result),
      dataKeys: result.data ? Object.keys(result.data) : null
    });

    return result;

  } catch (error) {
    console.error('LiblibAI - 图生图请求失败:', error);
    throw error;
  }
}

/**
 * 查询生成结果
 * @param {string} taskId - 生成任务的ID (Kontext API taskId)
 * @returns {Promise<Object>} 包含生成状态和结果的对象
 */
export async function queryGenerationResult(taskId) {
  try {
    if (!taskId) {
      throw new Error('taskId参数不能为空');
    }

    // Kontext API查询格式：POST /api/liblib/query/{taskId}
    const url = `${LIBLIB_CONFIG.baseUrl}${LIBLIB_CONFIG.queryEndpoint}/${taskId}`;
    const headers = buildHeaders();

    console.log('LiblibAI - Kontext API查询请求:', url);

    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({}) // 空的请求体，taskId在URL路径中
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`LiblibAI Kontext查询请求失败: ${response.status} ${response.statusText} - ${errorData.error}`);
    }

    const result = await response.json();
    console.log('LiblibAI - Kontext查询结果:', result);

    return result;

  } catch (error) {
    console.error('LiblibAI - Kontext查询失败:', error);
    throw error;
  }
}

/**
 * 过滤和优化提示词，避免敏感内容
 * @param {string} prompt - 原始提示词
 * @returns {string} 过滤后的提示词
 */
function sanitizePrompt(prompt) {
  // 添加安全前缀，确保生成儿童友好的内容
  const safePrefix = "Safe, family-friendly, children's book style, ";
  const safeSuffix = ", appropriate for children, wholesome, innocent, educational";

  // 确保prompt是字符串类型
  if (typeof prompt !== 'string') {
    console.warn('sanitizePrompt: prompt参数不是字符串类型，使用默认值:', prompt);
    prompt = 'cute cartoon character for children';
  }

  // 移除可能的敏感词汇
  let sanitized = prompt
    .replace(/\b(sexy|adult|mature|violence|weapon|blood|death|scary|horror|dark|evil|bad|dangerous|inappropriate)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  // 如果提示词太短，添加默认的安全描述
  if (sanitized.length < 10) {
    sanitized = "cute cartoon character for children";
  }

  return `${safePrefix}${sanitized}${safeSuffix}`;
}

/**
 * 等待图像生成完成
 * @param {string} taskId - 生成任务的ID
 * @param {Function} onProgress - 进度回调函数
 * @param {number} maxWaitTime - 最大等待时间（毫秒），默认5分钟
 * @param {number} pollInterval - 轮询间隔（毫秒），默认5秒
 * @returns {Promise<Object>} 生成结果
 */
export async function waitForGeneration(taskId, onProgress = null, maxWaitTime = 300000, pollInterval = 5000) {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitTime) {
    try {
      const result = await queryGenerationResult(taskId);

      // 根据LiblibAI API响应格式检查
      if (result.code === 0) {
        const generateStatus = result.data?.generateStatus;
        const generateMsg = result.data?.generateMsg;

        // 检查生成状态
        if (generateStatus === 6) {
          // 状态6表示执行异常
          const errorMsg = generateMsg || '执行异常';

          // 检查是否是敏感内容错误
          if (errorMsg.includes('敏感内容') || errorMsg.includes('sensitive content')) {
            // 抛出特殊的敏感内容错误，用于重试
            const sensitiveError = new Error(`图像生成失败: ${errorMsg}`);
            sensitiveError.isSensitiveContent = true;
            throw sensitiveError;
          }

          throw new Error(`图像生成失败: ${errorMsg}`);
        }

        // 检查是否有图像数据 (状态5表示成功)
        if (generateStatus === 5 && result.data?.images && result.data.images.some(image => image !== null && image.imageUrl)) {
          console.log('LiblibAI - 图像生成成功:', result);
          return result;
        }

        // 任务还在进行中
        if (onProgress) {
          const statusText = generateStatus === 2 ? 'processing' : 'pending';
          onProgress(statusText, result);
        }
        console.log(`LiblibAI - 图像生成中，状态: ${generateStatus}, 等待完成...`);

      } else {
        // API返回错误
        throw new Error(`图像生成失败: ${result.msg || '未知错误'}`);
      }

      // 继续等待
      await new Promise(resolve => setTimeout(resolve, pollInterval));

    } catch (error) {
      console.error('LiblibAI - 查询生成状态时出错:', error);
      throw error;
    }
  }

  throw new Error('图像生成超时，请稍后重试');
}

/**
 * 完整的文生图流程（包含等待和结果获取，支持敏感内容重试）
 * @param {string} prompt - 图像生成提示词
 * @param {Function} onProgress - 进度回调函数
 * @param {Object} options - 可选参数
 * @param {number} maxRetries - 最大重试次数，默认3次
 * @returns {Promise<Object>} 包含图像URL的完整结果
 */
export async function generateTextToImageComplete(prompt, onProgress = null, options = {}, maxRetries = 3) {
  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // 过滤提示词，确保内容安全
      let safePrompt = sanitizePrompt(prompt);

      // 如果是重试，进一步优化提示词
      if (attempt > 1) {
        safePrompt = `Very safe and innocent ${safePrompt}, completely appropriate for young children, no controversial content`;
        if (onProgress) onProgress(`第${attempt}次尝试生成（优化提示词）...`, 5);
      }

      // 1. 发起文生图请求
      if (onProgress) onProgress(`正在发起图像生成请求...（尝试 ${attempt}/${maxRetries}）`, 10);
      const generateResponse = await generateTextToImage(safePrompt, options);

      // 根据Kontext API响应格式提取taskId
      console.log('LiblibAI - Kontext文生图响应完整结构:', JSON.stringify(generateResponse, null, 2));
      
      // Kontext API返回格式通常包含task_id字段
      const taskId = generateResponse.task_id || 
                     generateResponse.id ||
                     generateResponse.taskId ||
                     generateResponse.data?.task_id ||
                     generateResponse.data?.id ||
                     generateResponse.uuid ||
                     generateResponse.generateUuid; // 保留作为备用

      console.log('LiblibAI - Kontext尝试提取的任务ID:', {
        'task_id': generateResponse.task_id,
        'id': generateResponse.id,
        'taskId': generateResponse.taskId,
        'data.task_id': generateResponse.data?.task_id,
        'data.id': generateResponse.data?.id,
        'uuid': generateResponse.uuid,
        'generateUuid': generateResponse.generateUuid,
        'finalTaskId': taskId
      });

      if (!taskId) {
        console.error('LiblibAI - 无法提取任务ID，完整响应:', generateResponse);
        throw new Error('未获取到生成任务ID');
      }

      // 2. 等待生成完成
      if (onProgress) onProgress('图像生成中，请稍候...', 30);
      const result = await waitForGeneration(
        taskId,
        (status, data) => {
          if (onProgress) {
            const progressMap = {
              'pending': 40,
              'running': 50,
              'processing': 60,
              'completed': 100,
              'success': 100,
              'failed': 0,
              'error': 0
            };
            onProgress(`生成状态: ${status}`, progressMap[status] || 50);
          }
        }
      );

      if (onProgress) onProgress('图像生成完成！', 100);

      // 调试：输出原始响应数据
      console.log('LiblibAI - 原始响应数据:', result);
      console.log('LiblibAI - 图像数组:', result.data?.images);

      // 标准化返回格式，确保兼容性
      const imageUrl = result.data?.images?.[0]?.imageUrl || result.data?.images?.[0] || result.images?.[0] || result.output?.[0] || result.url || result.image_url;
      
      console.log('LiblibAI - 提取的图像URL:', imageUrl);

      return {
        status: 'success',
        imageUrl: imageUrl,
        images: result.data?.images || [], // 添加原始images数组以便调试
        taskId: result.data?.generateUuid || taskId,
        originalResponse: result,
        attempts: attempt,
        finalPrompt: safePrompt
      };

    } catch (error) {
      lastError = error;
      console.error(`LiblibAI - 第${attempt}次生成尝试失败:`, error);

      // 如果是敏感内容错误且还有重试机会，继续重试
      if (error.isSensitiveContent && attempt < maxRetries) {
        if (onProgress) onProgress(`检测到敏感内容，正在重试...（${attempt}/${maxRetries}）`, 0);
        console.log(`检测到敏感内容，将进行第${attempt + 1}次尝试`);
        continue;
      }

      // 如果不是敏感内容错误或已达到最大重试次数，抛出错误
      break;
    }
  }

  // 所有重试都失败了
  if (onProgress) onProgress(`生成失败: ${lastError.message}`, 0);
  throw lastError;
}

/**
 * 完整的图生图流程（包含等待和结果获取，支持敏感内容重试）
 * @param {string} prompt - 图像生成提示词
 * @param {string} referenceImageUrl - 参考图像URL
 * @param {Function} onProgress - 进度回调函数
 * @param {Object} options - 可选参数
 * @param {number} maxRetries - 最大重试次数，默认3次
 * @returns {Promise<Object>} 包含图像URL的完整结果
 */
export async function generateImageToImageComplete(prompt, referenceImageUrl, onProgress = null, options = {}, maxRetries = 3) {
  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // 过滤提示词，确保内容安全
      let safePrompt = sanitizePrompt(prompt);

      // 如果是重试，进一步优化提示词
      if (attempt > 1) {
        safePrompt = `Very safe and innocent ${safePrompt}, completely appropriate for young children, no controversial content`;
        if (onProgress) onProgress(`第${attempt}次尝试图生图（优化提示词）...`, 5);
      }

      // 1. 发起图生图请求
      if (onProgress) onProgress(`正在发起图生图请求...（尝试 ${attempt}/${maxRetries}）`, 10);
      const generateResponse = await generateImageToImage(safePrompt, referenceImageUrl, options);

      // 根据Kontext API响应格式提取taskId
      console.log('LiblibAI - Kontext图生图响应完整结构:', JSON.stringify(generateResponse, null, 2));
      
      // Kontext API返回格式通常包含task_id字段
      const taskId = generateResponse.task_id || 
                     generateResponse.id ||
                     generateResponse.taskId ||
                     generateResponse.data?.task_id ||
                     generateResponse.data?.id ||
                     generateResponse.uuid ||
                     generateResponse.generateUuid; // 保留作为备用

      console.log('LiblibAI - Kontext尝试提取的任务ID:', {
        'task_id': generateResponse.task_id,
        'id': generateResponse.id,
        'taskId': generateResponse.taskId,
        'data.task_id': generateResponse.data?.task_id,
        'data.id': generateResponse.data?.id,
        'uuid': generateResponse.uuid,
        'generateUuid': generateResponse.generateUuid,
        'finalTaskId': taskId
      });

      if (!taskId) {
        console.error('LiblibAI - 无法提取任务ID，完整响应:', generateResponse);
        throw new Error('未获取到生成任务ID');
      }

      // 2. 等待生成完成
      if (onProgress) onProgress('图像生成中，请稍候...', 30);
      const result = await waitForGeneration(
        taskId,
        (status, data) => {
          if (onProgress) {
            const progressMap = {
              'pending': 40,
              'running': 50,
              'processing': 60,
              'completed': 100,
              'success': 100,
              'failed': 0,
              'error': 0
            };
            onProgress(`生成状态: ${status}`, progressMap[status] || 50);
          }
        }
      );

      if (onProgress) onProgress('图生图完成！', 100);

      // 标准化返回格式，确保兼容性
      return {
        status: 'success',
        imageUrl: result.data?.images?.[0]?.imageUrl || result.data?.images?.[0] || result.images?.[0] || result.output?.[0] || result.url || result.image_url,
        taskId: result.data?.generateUuid || taskId,
        originalResponse: result,
        attempts: attempt,
        finalPrompt: safePrompt
      };

    } catch (error) {
      lastError = error;
      console.error(`LiblibAI - 第${attempt}次图生图尝试失败:`, error);

      // 如果是敏感内容错误且还有重试机会，继续重试
      if (error.isSensitiveContent && attempt < maxRetries) {
        if (onProgress) onProgress(`检测到敏感内容，正在重试...（${attempt}/${maxRetries}）`, 0);
        console.log(`检测到敏感内容，将进行第${attempt + 1}次尝试`);
        continue;
      }

      // 如果不是敏感内容错误或已达到最大重试次数，抛出错误
      break;
    }
  }

  // 所有重试都失败了
  if (onProgress) onProgress(`生成失败: ${lastError.message}`, 0);
  throw lastError;
}

/**
 * 检查API配置是否正确（通过代理服务器）
 * @returns {Promise<boolean>} 配置是否完整
 */
export async function checkLiblibConfig() {
  try {
    const url = LIBLIB_CONFIG.baseUrl + LIBLIB_CONFIG.configEndpoint;
    const response = await fetch(url);

    if (!response.ok) {
      return false;
    }

    const result = await response.json();
    return result.configured;

  } catch (error) {
    console.error('检查LiblibAI配置失败:', error);
    return false;
  }
}
