# Zeabur 部署指南 - Picture Book Creator

这个指南将帮助你将Picture Book Creator项目部署到Zeabur平台，实现在线访问。

## 📋 部署前准备

### 1. 确保代码已推送到GitHub
✅ 代码已经在：https://github.com/LJY227/picture-book-creator.git

### 2. 准备API密钥
你需要以下API密钥：
- **OpenAI API Key** (必需) - 用于GPT-4和DALL-E
- **LiblibAI Access Key & Secret Key** (必需) - 用于图像生成

## 🚀 Zeabur部署步骤

### 第一步：创建Zeabur账户并登录

1. 访问 https://zeabur.com
2. 使用GitHub账户登录（推荐）
3. 进入控制台面板

### 第二步：创建新项目

1. 点击 **"New Project"** 
2. 选择 **"Deploy from GitHub"**
3. 授权Zeabur访问你的GitHub仓库
4. 选择 `picture-book-creator` 仓库

### 第三步：部署后端API服务

#### 3.1 添加后端服务
1. 在项目面板中，点击 **"Add Service"**
2. 选择 **"GitHub"** 
3. 选择你的 `picture-book-creator` 仓库
4. Zeabur会自动检测到这是一个Node.js项目

#### 3.2 配置后端服务
1. **Service Name**: `picture-book-creator-api`
2. **Branch**: `main`
3. **Root Directory**: `/` (根目录)
4. **Build Command**: `npm install`
5. **Start Command**: `node server.js`

#### 3.3 配置环境变量
在后端服务的设置中，添加以下环境变量：

**必需的环境变量：**
```bash
# OpenAI配置
VITE_OPENAI_API_KEY=sk-your-openai-api-key-here

# LiblibAI配置  
VITE_LIBLIB_ACCESS_KEY=your-liblib-access-key-here
VITE_LIBLIB_SECRET_KEY=your-liblib-secret-key-here

# 模板UUID（使用默认值）
VITE_LIBLIB_TEMPLATE_UUID=fe9928fde1b4491c9b360dd24aa2b115
VITE_LIBLIB_IMG2IMG_TEMPLATE_UUID=1c0a9712b3d84e1b8a9f49514a46d88c

# 服务器配置
NODE_ENV=production
PORT=3005
```

#### 3.4 部署后端
1. 点击 **"Deploy"** 开始部署
2. 等待构建完成（约2-5分钟）
3. 记录后端服务的URL（类似：`https://picture-book-creator-api-xxx.zeabur.app`）

### 第四步：部署前端应用

⚠️ **重要提示：如果Zeabur没有"Static"服务类型，请使用以下方案**

#### 方案A：使用Node.js服务部署前端（推荐）

#### 4.1 添加前端服务
1. 在同一个项目中，再次点击 **"Add Service"**
2. 选择 **"GitHub"** 
3. 连接同一个GitHub仓库

#### 4.2 配置前端构建
1. **Service Name**: `picture-book-creator-frontend`
2. **Branch**: `main`
3. **Root Directory**: `/` (根目录)
4. **Build Command**: `npm install && npm run build`
5. **Start Command**: `npm run preview`
6. **Port**: `4173`

#### 4.3 配置前端环境变量
为前端添加环境变量：

```bash
# API服务器地址（使用步骤3.4中的后端URL）
VITE_API_BASE_URL=https://picture-book-creator-api-xxx.zeabur.app

# 前端基础URL（部署完成后会得到）
VITE_APP_BASE_URL=https://picture-book-creator-frontend-xxx.zeabur.app

# API密钥（前端也需要这些）
VITE_OPENAI_API_KEY=sk-your-openai-api-key-here
VITE_LIBLIB_ACCESS_KEY=your-liblib-access-key-here
VITE_LIBLIB_SECRET_KEY=your-liblib-secret-key-here
VITE_LIBLIB_TEMPLATE_UUID=fe9928fde1b4491c9b360dd24aa2b115
VITE_LIBLIB_IMG2IMG_TEMPLATE_UUID=1c0a9712b3d84e1b8a9f49514a46d88c

# Node.js环境
NODE_ENV=production
```

#### 方案B：使用其他平台部署前端

如果Zeabur的前端部署有限制，可以考虑：

1. **Vercel**（推荐用于前端）
   - 支持自动检测Vite项目
   - 优秀的CDN和性能
   - 免费套餐足够使用

2. **Netlify**
   - 静态站点托管专家
   - 简单的拖拽部署
   - 自动HTTPS

3. **Cloudflare Pages**
   - 全球CDN加速
   - 免费额度丰富

### 第五步：配置域名（可选）

1. 在Zeabur控制台中，为每个服务配置自定义域名
2. 更新环境变量中的URL为自定义域名

## 🔧 部署后配置

### 更新CORS配置
确保后端的CORS配置包含你的前端域名。服务器已经配置了多平台域名支持：

```javascript
origin: [
  /\.zeabur\.app$/,    // Zeabur域名
  /\.vercel\.app$/,    // Vercel域名  
  /\.netlify\.app$/,   // Netlify域名
  /\.pages\.dev$/,     // Cloudflare Pages域名
  // 你的自定义域名
]
```

### 测试部署
1. 访问前端URL
2. 测试各个功能页面
3. 检查API连接是否正常

## 📝 部署检查清单

- [ ] 后端服务部署成功
- [ ] 前端应用部署成功  
- [ ] 环境变量配置正确
- [ ] API密钥有效
- [ ] CORS配置正确
- [ ] 所有功能测试通过

## 🚨 常见问题

### 1. 没有Static服务类型
- 使用Node.js服务 + `npm run preview` 命令
- 或者使用Vercel/Netlify等专门的静态托管平台

### 2. API连接失败
- 检查 `VITE_API_BASE_URL` 是否指向正确的后端URL
- 确认后端服务正常运行（访问 `/api/status` 端点）

### 3. 图像生成失败
- 检查OpenAI和LiblibAI的API密钥是否正确
- 查看后端日志确认API调用状态

### 4. 构建失败
- 检查Node.js版本是否兼容（需要>=18.0.0）
- 确认所有依赖都已正确安装

### 5. 前端访问404
- 确认Vite preview模式正确启动
- 检查端口配置（默认4173）

## 📞 技术支持

如遇到部署问题，可以：
1. 查看Zeabur控制台的构建日志
2. 检查浏览器控制台的错误信息
3. 访问后端的 `/api/status` 端点检查服务状态

## 🎉 部署完成

恭喜！你的Picture Book Creator现在已经在线可用了！

- **前端地址**: https://your-frontend-url.zeabur.app
- **后端API**: https://your-backend-url.zeabur.app
- **状态检查**: https://your-backend-url.zeabur.app/api/status

## 🚀 快速部署命令

你也可以使用项目中的部署脚本：

```bash
npm run deploy:zeabur
```

这将自动准备部署所需的配置文件。
