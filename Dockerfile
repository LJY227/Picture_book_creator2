FROM node:22-slim
WORKDIR /app

# 先复制依赖文件并安装所有依赖（含dev）
COPY package*.json ./
RUN npm install      # 使用npm install确保所有依赖都被正确安装

# 再把所有文件复制进去
COPY . .

# 构建产物（此时dev依赖还在，可以调用vite打包）
RUN npm run build

# 验证dist目录是否存在
RUN ls -la dist/

# 生产环境只保留纯production依赖
RUN npm prune --production

# 暴露端口
EXPOSE 8080

# 启动应用
CMD ["node", "server.js"] 