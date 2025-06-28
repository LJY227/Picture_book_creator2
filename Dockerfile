FROM node:22-slim
WORKDIR /app

# 复制package文件
COPY package*.json ./

# 安装所有依赖（包括开发依赖，用于构建）
RUN npm ci

# 复制源代码（.dockerignore会排除node_modules和dist）
COPY . .

# 构建前端应用
RUN npm run build

# 验证dist目录是否存在
RUN ls -la dist/

# 清理开发依赖
RUN npm prune --production

# 暴露端口
EXPOSE 8080

# 启动应用
CMD ["node", "server.js"] 