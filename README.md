# 🎨 AI图画书创作器

专为自闭症儿童设计的智能绘本创作工具，集成了OpenAI GPT-4和LiblibAI图像生成能力。

## ✨ 功能特点

- 🧒 **自定义角色**: 创建独特的故事主角
- 📚 **智能故事生成**: AI创作适合自闭症儿童的简单故事
- 🎨 **自动插画生成**: 为每页故事生成精美插图
- 🔄 **角色一致性**: 确保主角在每页中保持形象一致
- 📱 **响应式设计**: 支持桌面和移动设备
- 📄 **PDF导出**: 将完成的绘本导出为PDF文件

## 🚀 快速开始

### 1. 获取API密钥

#### OpenAI API密钥
- 访问 [OpenAI Platform](https://platform.openai.com/api-keys)
- 创建新的API密钥

#### LiblibAI API密钥
- 访问 [LiblibAI官网](https://www.liblibai.com/)
- 注册账户并获取 AccessKey 和 SecretKey

### 2. 配置环境变量

```bash
# 复制环境变量模板
cp env.template .env

# 编辑 .env 文件，填写你的API密钥
# VITE_OPENAI_API_KEY=sk-your-key-here
# VITE_LIBLIB_ACCESS_KEY=your-access-key
# VITE_LIBLIB_SECRET_KEY=your-secret-key
```

### 3. 安装并运行

```bash
# 安装依赖
npm install

# 启动开发服务器
npm start
```

访问 `http://localhost:3000` 开始使用！

## 🌐 部署为公开网站

### 方法一：使用自动化脚本（推荐）

```bash
# 运行部署准备脚本
npm run deploy:prepare
```

脚本会自动：
- ✅ 检查环境变量配置
- ✅ 安装依赖
- ✅ 构建项目
- ✅ 生成部署说明

### 方法二：手动部署

详细部署指南请查看 [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)

#### 后端部署 (Railway)
1. 访问 [Railway](https://railway.app/)
2. 从GitHub部署项目
3. 配置环境变量
4. 设置启动命令: `node server.js`

#### 前端部署 (Vercel)
1. 访问 [Vercel](https://vercel.com/)
2. 从GitHub部署项目
3. 配置环境变量
4. 自动构建和部署

## 🛠️ 技术栈

- **前端**: React + Vite + Tailwind CSS
- **后端**: Node.js + Express
- **AI服务**: OpenAI GPT-4 + LiblibAI
- **UI组件**: Radix UI + Lucide React
- **部署**: Vercel (前端) + Railway (后端)

## 📖 使用说明

### 创建角色
1. 输入角色描述（支持中英文）
2. AI自动优化角色形象
3. 可多次修改完善

### 生成故事
1. 选择故事类型和页数
2. 设置教育主题
3. 选择图像生成引擎
4. 启用角色一致性（推荐）

### 导出绘本
- 支持PDF格式导出
- 包含完整故事和插图
- 适合打印和分享

## 🔧 本地开发

```bash
# 克隆项目
git clone <your-repo-url>
cd picture-book-creator

# 安装依赖
npm install

# 配置环境变量
cp env.template .env
# 编辑 .env 文件

# 启动后端服务
npm run server

# 启动前端服务（新终端）
npm run dev

# 或同时启动前后端
npm start
```

## 💰 成本估算

### 部署成本
- Railway (后端): $5/月
- Vercel (前端): 免费
- 总计: ~$5/月

### API调用成本
- OpenAI: ~$0.002/1K tokens
- LiblibAI: ~0.5-1元/张图片
- 估算: 小规模使用 $10-20/月

## 🔒 安全提醒

- ⚠️ 不要在前端代码中暴露API密钥
- 🔑 定期轮换API密钥
- 🛡️ 使用HTTPS确保数据安全

## 📞 技术支持

遇到问题？请：
1. 查看浏览器控制台错误
2. 检查后端服务器日志
3. 确认API密钥有效性
4. 参考 [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)

## 📝 许可证

MIT License - 详见 [LICENSE](./LICENSE) 文件

---

🎉 **开始创作属于你的AI图画书吧！** 