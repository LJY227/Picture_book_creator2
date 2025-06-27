#!/usr/bin/env node

/**
 * 图画书创作器快速部署脚本
 * 自动化部署流程，简化部署过程
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const colors = {
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(colors[color] + message + colors.reset);
}

function checkEnvFile() {
  log('\n🔍 检查环境变量配置...', 'blue');
  
  if (!fs.existsSync('.env')) {
    log('❌ 未找到 .env 文件', 'red');
    log('📝 请按照以下步骤创建 .env 文件:', 'yellow');
    log('1. 复制 env.template 为 .env');
    log('2. 填写你的 OpenAI API 密钥');
    log('3. 填写你的 LiblibAI API 密钥');
    log('\n💡 示例命令:', 'cyan');
    log('cp env.template .env');
    return false;
  }
  
  const envContent = fs.readFileSync('.env', 'utf8');
  const hasOpenAI = envContent.includes('VITE_OPENAI_API_KEY=sk-');
  const hasLiblib = envContent.includes('VITE_LIBLIB_ACCESS_KEY=') && 
                   !envContent.includes('your-liblib-access-key-here');
  
  if (!hasOpenAI) {
    log('❌ OpenAI API密钥未正确配置', 'red');
    return false;
  }
  
  if (!hasLiblib) {
    log('❌ LiblibAI API密钥未正确配置', 'red');
    return false;
  }
  
  log('✅ 环境变量配置正确', 'green');
  return true;
}

function installDependencies() {
  log('\n📦 安装项目依赖...', 'blue');
  try {
    execSync('npm install', { stdio: 'inherit' });
    log('✅ 依赖安装完成', 'green');
    return true;
  } catch (error) {
    log('❌ 依赖安装失败: ' + error.message, 'red');
    return false;
  }
}

function buildProject() {
  log('\n🔨 构建前端项目...', 'blue');
  try {
    execSync('npm run build', { stdio: 'inherit' });
    log('✅ 项目构建完成', 'green');
    return true;
  } catch (error) {
    log('❌ 项目构建失败: ' + error.message, 'red');
    return false;
  }
}

function testLocalServer() {
  log('\n🧪 测试本地服务器...', 'blue');
  try {
    log('启动后端服务器进行测试...', 'yellow');
    log('💡 你可以在另一个终端运行以下命令测试:', 'cyan');
    log('npm run server', 'cyan');
    log('npm run dev', 'cyan');
    return true;
  } catch (error) {
    log('❌ 服务器测试失败: ' + error.message, 'red');
    return false;
  }
}

function generateDeploymentInstructions() {
  log('\n📋 生成部署说明...', 'blue');
  
  const instructions = `
# 🚀 部署说明

## 后端部署 (Railway)
1. 访问 https://railway.app/
2. 创建新项目，选择 "Deploy from GitHub repo"
3. 配置环境变量（从 .env 文件复制）:
   - VITE_OPENAI_API_KEY
   - VITE_LIBLIB_ACCESS_KEY
   - VITE_LIBLIB_SECRET_KEY
   - PORT=3005
   - NODE_ENV=production

4. 设置启动命令: node server.js

## 前端部署 (Vercel)
1. 访问 https://vercel.com/
2. 创建新项目，选择你的GitHub仓库
3. 配置环境变量:
   - VITE_API_BASE_URL=你的Railway后端URL
   - VITE_APP_BASE_URL=你的Vercel应用URL

## 本地测试
运行以下命令测试功能:
\`\`\`bash
# 启动后端
npm run server

# 在另一个终端启动前端
npm run dev
\`\`\`

访问 http://localhost:3000 测试所有功能
`;

  fs.writeFileSync('DEPLOYMENT_READY.md', instructions);
  log('✅ 部署说明已保存到 DEPLOYMENT_READY.md', 'green');
}

function main() {
  log(colors.bold + colors.cyan + '🚀 图画书创作器部署准备工具' + colors.reset);
  log('==================================\n');
  
  // 检查环境变量
  if (!checkEnvFile()) {
    log('\n❌ 部署准备失败：环境变量配置不完整', 'red');
    log('请先配置 .env 文件，然后重新运行此脚本\n', 'yellow');
    process.exit(1);
  }
  
  // 安装依赖
  if (!installDependencies()) {
    log('\n❌ 部署准备失败：依赖安装失败', 'red');
    process.exit(1);
  }
  
  // 构建项目
  if (!buildProject()) {
    log('\n❌ 部署准备失败：项目构建失败', 'red');
    process.exit(1);
  }
  
  // 测试服务器
  testLocalServer();
  
  // 生成部署说明
  generateDeploymentInstructions();
  
  log('\n🎉 部署准备完成！', 'bold');
  log('==================', 'green');
  log('✅ 环境变量已配置', 'green');
  log('✅ 依赖已安装', 'green');
  log('✅ 项目已构建', 'green');
  log('✅ 部署说明已生成', 'green');
  
  log('\n📖 接下来的步骤:', 'yellow');
  log('1. 查看 DEPLOYMENT_READY.md 获取详细部署说明');
  log('2. 将代码推送到 GitHub');
  log('3. 按照说明在 Railway 和 Vercel 上部署');
  log('4. 测试部署后的应用功能');
  
  log('\n💡 需要帮助？查看 DEPLOYMENT_GUIDE.md 获取完整指南', 'cyan');
}

// 运行主函数
main(); 