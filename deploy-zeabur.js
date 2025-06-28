#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🚀 开始准备Zeabur部署...\n');

// 1. 检查必要的文件
const requiredFiles = ['package.json', 'server.js', 'zeabur.json'];
const missingFiles = requiredFiles.filter(file => !fs.existsSync(file));

if (missingFiles.length > 0) {
  console.error('❌ 缺少必要文件:', missingFiles.join(', '));
  process.exit(1);
}

// 2. 检查package.json中的scripts
const packageJson = require('./package.json');
if (!packageJson.scripts.preview) {
  console.log('⚠️  package.json中缺少preview脚本，但这个项目应该已经包含了。');
}

// 3. 生成前端配置文件（Node.js版本）
const frontendConfig = {
  "name": "picture-book-creator-frontend",
  "type": "nodejs",
  "buildCommand": "npm install && npm run build",
  "startCommand": "npm run preview",
  "environment": {
    "NODE_ENV": "production"
  },
  "domains": [],
  "port": 4173,
  "healthCheck": {
    "path": "/",
    "interval": 30,
    "timeout": 10,
    "retries": 3
  },
  "resources": {
    "cpu": "0.5",
    "memory": "512Mi"
  },
  "autoDeploy": {
    "enabled": true,
    "branch": "main"
  }
};

fs.writeFileSync('zeabur-frontend.json', JSON.stringify(frontendConfig, null, 2));
console.log('✅ 生成前端配置文件: zeabur-frontend.json');

// 4. 生成环境变量模板
const envTemplate = `# Zeabur环境变量配置模板
# 请在Zeabur控制台中设置这些环境变量

# ===== 后端服务环境变量 =====
# 在picture-book-creator-api服务中配置：

# OpenAI配置（必需）
VITE_OPENAI_API_KEY=sk-your-openai-api-key-here

# LiblibAI配置（必需）
VITE_LIBLIB_ACCESS_KEY=your-liblib-access-key-here
VITE_LIBLIB_SECRET_KEY=your-liblib-secret-key-here

# 模板UUID（使用默认值）
VITE_LIBLIB_TEMPLATE_UUID=fe9928fde1b4491c9b360dd24aa2b115
VITE_LIBLIB_IMG2IMG_TEMPLATE_UUID=1c0a9712b3d84e1b8a9f49514a46d88c

# 服务器配置
NODE_ENV=production
PORT=3005

# ===== 前端服务环境变量 =====
# 在picture-book-creator-frontend服务中配置：

# API服务器地址（替换为你的后端URL）
VITE_API_BASE_URL=https://picture-book-creator-api-xxx.zeabur.app

# 前端基础URL（部署完成后填入）
VITE_APP_BASE_URL=https://picture-book-creator-frontend-xxx.zeabur.app

# API密钥（前端也需要）
VITE_OPENAI_API_KEY=sk-your-openai-api-key-here
VITE_LIBLIB_ACCESS_KEY=your-liblib-access-key-here
VITE_LIBLIB_SECRET_KEY=your-liblib-secret-key-here
VITE_LIBLIB_TEMPLATE_UUID=fe9928fde1b4491c9b360dd24aa2b115
VITE_LIBLIB_IMG2IMG_TEMPLATE_UUID=1c0a9712b3d84e1b8a9f49514a46d88c

# Node.js环境
NODE_ENV=production
`;

fs.writeFileSync('zeabur-env-template.txt', envTemplate);
console.log('✅ 生成环境变量模板: zeabur-env-template.txt');

// 5. 生成部署检查清单
const deploymentChecklist = `# Zeabur部署检查清单

## 📋 部署前准备

### 1. GitHub仓库
- [ ] 代码已推送到GitHub
- [ ] 仓库设为公开或已授权Zeabur访问

### 2. API密钥准备
- [ ] OpenAI API Key（从 https://platform.openai.com/api-keys 获取）
- [ ] LiblibAI Access Key 和 Secret Key（从LiblibAI平台获取）

## 🚀 Zeabur部署步骤

### 第一步：部署后端API服务

1. **创建服务**
   - [ ] 在Zeabur中点击"Add Service"
   - [ ] 选择"GitHub"
   - [ ] 选择picture-book-creator仓库
   - [ ] 服务名称：picture-book-creator-api

2. **配置构建**
   - [ ] Build Command: \`npm install\`
   - [ ] Start Command: \`node server.js\`
   - [ ] Port: 3005

3. **设置环境变量**
   - [ ] 复制zeabur-env-template.txt中的后端环境变量
   - [ ] 在Zeabur控制台的Environment tab中添加
   - [ ] 确保API密钥正确填入

4. **部署**
   - [ ] 点击Deploy
   - [ ] 等待构建完成
   - [ ] 记录后端URL（如：https://xxx.zeabur.app）

### 第二步：部署前端应用

1. **创建前端服务**
   - [ ] 再次点击"Add Service"
   - [ ] 选择"GitHub"，同一个仓库
   - [ ] 服务名称：picture-book-creator-frontend

2. **配置构建**
   - [ ] Build Command: \`npm install && npm run build\`
   - [ ] Start Command: \`npm run preview\`
   - [ ] Port: 4173

3. **设置环境变量**
   - [ ] 复制zeabur-env-template.txt中的前端环境变量
   - [ ] 将VITE_API_BASE_URL设置为第一步中的后端URL
   - [ ] 添加所有必需的API密钥

4. **部署前端**
   - [ ] 点击Deploy
   - [ ] 等待构建完成
   - [ ] 获取前端URL

### 第三步：测试部署

- [ ] 访问前端URL
- [ ] 测试主页是否正常显示  
- [ ] 访问后端URL/api/status检查API状态
- [ ] 测试角色设置页面
- [ ] 测试图像生成功能
- [ ] 检查浏览器控制台是否有错误

## 🔧 故障排查

### 常见问题：

1. **没有Static服务类型**
   - ✅ 使用Node.js服务 + \`npm run preview\`
   - ✅ 端口设置为4173

2. **API连接失败**
   - 检查VITE_API_BASE_URL是否正确
   - 确认后端服务正常运行
   - 检查CORS配置

3. **环境变量问题**
   - 前端环境变量必须以VITE_开头
   - 重新部署后环境变量才生效
   - 检查API密钥格式

4. **构建失败**
   - 检查Node.js版本（需要>=18.0.0）
   - 查看构建日志找出具体错误
   - 确认所有依赖正确安装

## 📞 获取帮助

如果遇到问题：
1. 查看Zeabur控制台的构建和运行日志
2. 检查浏览器开发者工具的网络和控制台标签
3. 访问 /api/status 检查后端服务状态

## 🎉 部署成功！

部署完成后，你将获得：
- 前端应用：https://your-frontend-xxx.zeabur.app
- 后端API：https://your-backend-xxx.zeabur.app
- 状态检查：https://your-backend-xxx.zeabur.app/api/status
`;

fs.writeFileSync('ZEABUR_DEPLOYMENT_CHECKLIST.md', deploymentChecklist);
console.log('✅ 生成部署检查清单: ZEABUR_DEPLOYMENT_CHECKLIST.md');

// 6. 显示总结信息
console.log('\n🎉 Zeabur部署准备完成！');
console.log('\n📁 生成的文件：');
console.log('  - zeabur-frontend.json        (前端配置文件)');
console.log('  - zeabur-env-template.txt     (环境变量模板)');
console.log('  - ZEABUR_DEPLOYMENT_CHECKLIST.md (部署检查清单)');

console.log('\n📋 下一步操作：');
console.log('1. 打开 ZEABUR_DEPLOYMENT_CHECKLIST.md 查看详细步骤');
console.log('2. 准备你的API密钥（OpenAI和LiblibAI）');
console.log('3. 登录Zeabur开始部署：https://zeabur.com');

console.log('\n⚠️  重要提示：');
console.log('  - 如果Zeabur没有Static服务类型，使用Node.js + npm run preview');
console.log('  - 前端服务端口设置为4173');
console.log('  - 记得设置所有环境变量！');

console.log('\n🚀 祝你部署顺利！'); 