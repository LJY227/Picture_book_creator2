/**
 * 图像工具函数
 * 用于处理图像生成、转换和显示
 */

/**
 * 生成本地SVG图像作为DALL-E 3的备用方案
 * @param {Object} page - 页面数据
 * @param {Object} character - 角色信息
 * @returns {string} Base64编码的SVG图像
 */
export function generateLocalImage(page, character) {
  const colors = [
    '#4F46E5', '#059669', '#DC2626', '#7C3AED', '#EA580C',
    '#0891B2', '#BE185D', '#65A30D', '#CA8A04', '#9333EA'
  ];
  
  const bgColor = colors[page.pageNumber % colors.length];
  const accentColor = colors[(page.pageNumber + 3) % colors.length];
  
  // 根据角色类型选择图标
  const characterIcon = character.identity === 'human' 
    ? (character.gender === 'boy' ? '👦' : character.gender === 'girl' ? '👧' : '🧒')
    : '🐾';
  
  // 根据页面内容选择场景元素
  const sceneElements = getSceneElements(page.content || page.sceneDescription || '');
  
  const svg = `
    <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
      <!-- 背景渐变 -->
      <defs>
        <linearGradient id="bg-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${bgColor};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${accentColor};stop-opacity:0.8" />
        </linearGradient>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="2" dy="2" stdDeviation="3" flood-color="rgba(0,0,0,0.3)"/>
        </filter>
      </defs>
      
      <!-- 背景 -->
      <rect width="400" height="300" fill="url(#bg-gradient)"/>
      
      <!-- 装饰性元素 -->
      <circle cx="50" cy="50" r="20" fill="rgba(255,255,255,0.2)"/>
      <circle cx="350" cy="80" r="15" fill="rgba(255,255,255,0.3)"/>
      <circle cx="80" cy="250" r="25" fill="rgba(255,255,255,0.15)"/>
      
      <!-- 主要内容区域 -->
      <rect x="50" y="100" width="300" height="120" rx="15" fill="rgba(255,255,255,0.9)" filter="url(#shadow)"/>
      
      <!-- 角色图标 -->
      <text x="200" y="140" text-anchor="middle" font-size="32" fill="${bgColor}">
        ${characterIcon}
      </text>
      
      <!-- 页面标题 -->
      <text x="200" y="170" text-anchor="middle" font-size="14" font-family="Arial, sans-serif" fill="${bgColor}" font-weight="bold">
        ${(page.title || `第${page.pageNumber}页`).substring(0, 20)}
      </text>
      
      <!-- 场景元素 -->
      <text x="200" y="195" text-anchor="middle" font-size="24" fill="${accentColor}">
        ${sceneElements}
      </text>
      
      <!-- 页码 -->
      <circle cx="370" cy="280" r="15" fill="rgba(255,255,255,0.8)"/>
      <text x="370" y="285" text-anchor="middle" font-size="12" font-family="Arial, sans-serif" fill="${bgColor}" font-weight="bold">
        ${page.pageNumber}
      </text>
      
      <!-- 装饰边框 -->
      <rect x="5" y="5" width="390" height="290" rx="10" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="2"/>
    </svg>
  `;
  
  // 使用 encodeURIComponent 来处理包含中文字符的 SVG
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

/**
 * 根据内容获取场景元素emoji
 * @param {string} content - 页面内容
 * @returns {string} 场景元素emoji
 */
function getSceneElements(content) {
  const contentLower = content.toLowerCase();
  
  // 场景关键词映射
  const sceneMap = {
    '森林': '🌲🌳',
    '花园': '🌸🌺',
    '学校': '🏫📚',
    '家': '🏠❤️',
    '公园': '🌳🌼',
    '海边': '🌊🏖️',
    '山': '⛰️🌄',
    '城市': '🏙️🚗',
    '朋友': '👫🤝',
    '分享': '🤲💝',
    '帮助': '🤝💪',
    '学习': '📖✨',
    '成长': '🌱📈',
    '勇敢': '💪⭐',
    '冒险': '🗺️⚡',
    '快乐': '😊🎉',
    '梦想': '💭⭐'
  };
  
  // 查找匹配的关键词
  for (const [keyword, emoji] of Object.entries(sceneMap)) {
    if (contentLower.includes(keyword)) {
      return emoji;
    }
  }
  
  // 默认场景元素
  const defaultElements = ['🌟✨', '🌈☀️', '🎈🎊', '🌸🦋', '⭐🌙', '🍀🌺'];
  return defaultElements[Math.floor(Math.random() * defaultElements.length)];
}

/**
 * 检查图像URL是否有效（简化版，避免CORS问题）
 * @param {string} url - 图像URL
 * @returns {Promise<boolean>} 是否有效
 */
export async function isImageUrlValid(url) {
  // 对于DALL-E URL，我们假设它们是有效的
  // 因为CORS策略阻止我们进行预检查
  if (url && url.includes('oaidalleapiprodscus.blob.core.windows.net')) {
    return true;
  }

  // 对于其他URL，尝试简单验证
  try {
    return url && url.startsWith('http');
  } catch (error) {
    console.warn('图像URL验证失败:', url, error);
    return false;
  }
}

/**
 * 创建图像加载Promise，带超时处理
 * @param {string} url - 图像URL
 * @param {number} timeout - 超时时间（毫秒）
 * @returns {Promise<boolean>} 加载是否成功
 */
export function loadImageWithTimeout(url, timeout = 5000) {
  return new Promise((resolve) => {
    const img = new Image();
    const timer = setTimeout(() => {
      resolve(false);
    }, timeout);
    
    img.onload = () => {
      clearTimeout(timer);
      resolve(true);
    };
    
    img.onerror = () => {
      clearTimeout(timer);
      resolve(false);
    };
    
    img.src = url;
  });
}
