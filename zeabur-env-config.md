# Zeabur 环境变量配置指南

## 🎯 前端服务环境变量

在Zeabur控制台的**前端服务**中设置以下环境变量：

```bash
# API基础URL - 使用/api相对路径
VITE_API_BASE_URL=/api

# API密钥（前端也需要这些）
VITE_OPENAI_API_KEY=sk-your-openai-api-key-here
VITE_LIBLIB_ACCESS_KEY=your-liblib-access-key-here
VITE_LIBLIB_SECRET_KEY=your-liblib-secret-key-here
VITE_LIBLIB_TEMPLATE_UUID=fe9928fde1b4491c9b360dd24aa2b115
VITE_LIBLIB_IMG2IMG_TEMPLATE_UUID=1c0a9712b3d84e1b8a9f49514a46d88c

# Node.js环境
NODE_ENV=production
```

## 🎯 后端服务环境变量

在Zeabur控制台的**后端服务**中设置以下环境变量：

```bash
# OpenAI配置
VITE_OPENAI_API_KEY=sk-your-openai-api-key-here

# LiblibAI配置
VITE_LIBLIB_ACCESS_KEY=your-liblib-access-key-here
VITE_LIBLIB_SECRET_KEY=your-liblib-secret-key-here
VITE_LIBLIB_TEMPLATE_UUID=fe9928fde1b4491c9b360dd24aa2b115
VITE_LIBLIB_IMG2IMG_TEMPLATE_UUID=1c0a9712b3d84e1b8a9f49514a46d88c

# 服务器配置
NODE_ENV=production
PORT=8080
```

## 📋 重要说明

### ✅ 正确配置
- **VITE_API_BASE_URL** 设置为 `/api`
- 前端会使用相对路径调用 `/api/openai/chat` 等接口
- 这样前端和后端部署在同一个域名下时会正常工作

### ❌ 错误配置
- 不要设置 `VITE_API_BASE_URL=http://localhost:8080`
- 不要使用任何带端口号的localhost地址
- 不要使用其他域名的绝对URL

## 🔧 部署步骤

1. **设置前端环境变量** → **重新部署前端**
2. **设置后端环境变量** → **重新部署后端**
3. **测试连接** → 访问前端应用检查功能

## 🧪 验证方法

部署完成后：
1. 打开浏览器开发者工具 → Network标签页
2. 使用前端应用的功能（如生成绘本）
3. 检查API请求的URL应该是相对路径：`/api/openai/chat`
4. 不应该出现`localhost`或端口号 