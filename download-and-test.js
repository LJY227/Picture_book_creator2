/**
 * 下载imgur图片并测试LiblibAI图生图功能
 */

import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

const IMGUR_URL = 'https://i.imgur.com/e7bXLEd.jpeg';
const LOCAL_IMAGE_PATH = './downloaded-image.jpeg';

async function downloadImage() {
  try {
    console.log('📥 正在下载图片:', IMGUR_URL);
    
    const response = await fetch(IMGUR_URL);
    if (!response.ok) {
      throw new Error(`下载失败: ${response.status} ${response.statusText}`);
    }
    
    const buffer = await response.buffer();
    fs.writeFileSync(LOCAL_IMAGE_PATH, buffer);
    
    console.log('✅ 图片下载成功:', LOCAL_IMAGE_PATH);
    console.log('📊 文件大小:', Math.round(buffer.length / 1024), 'KB');
    
    return LOCAL_IMAGE_PATH;
  } catch (error) {
    console.error('❌ 下载失败:', error.message);
    return null;
  }
}

async function testWithLocalFile() {
  try {
    // 首先下载图片
    const localPath = await downloadImage();
    if (!localPath) {
      return;
    }
    
    console.log('\n🔍 分析图片信息...');
    const stats = fs.statSync(localPath);
    console.log('📁 文件大小:', Math.round(stats.size / 1024), 'KB');
    
    // 检查文件是否为有效图片
    const buffer = fs.readFileSync(localPath);
    const isJPEG = buffer[0] === 0xFF && buffer[1] === 0xD8;
    console.log('🖼️ 是否为JPEG:', isJPEG);
    
    if (stats.size > 5 * 1024 * 1024) { // 5MB
      console.log('⚠️ 图片可能过大 (>5MB)，LiblibAI可能无法处理');
    }
    
    console.log('\n💡 建议解决方案:');
    console.log('1. 使用其他图床服务 (如 postimages.org, imgbb.com)');
    console.log('2. 压缩图片大小');
    console.log('3. 使用应用内的文生图功能生成基础图片，然后用图生图优化');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

// 运行测试
testWithLocalFile(); 