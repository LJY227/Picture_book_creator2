/**
 * 故事导出模块 - HTML打印方案
 * 生成包含图片和内容的完整HTML文档，支持打印和保存
 */

/**
 * 导出故事为可打印的HTML页面
 * @param {Object} bookData - 绘本数据
 * @param {Function} onProgress - 进度回调函数
 */
export async function exportStoryAsHTML(bookData, onProgress = null) {
  try {
    console.log('开始生成HTML故事文档...');
    onProgress && onProgress('正在准备故事文档...', 0);

    // 生成HTML内容
    const htmlContent = await generateStoryHTML(bookData, onProgress);
    
    onProgress && onProgress('正在打开打印预览...', 90);
    
    // 在新窗口中打开HTML内容
    const printWindow = window.open('', '_blank');
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    // 等待图片加载完成后自动打开打印对话框
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
      }, 1000);
    };
    
    onProgress && onProgress('故事文档已准备完成！', 100);
    
    console.log('HTML故事文档生成成功');
    return true;

  } catch (error) {
    console.error('故事导出失败:', error);
    throw new Error('故事导出失败: ' + error.message);
  }
}

/**
 * 生成完整的HTML故事内容
 */
async function generateStoryHTML(bookData, onProgress) {
  const { character, pages } = bookData;
  const totalPages = pages.length;
  
  // HTML文档头部
  const htmlHeader = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${character.name}的故事</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Microsoft YaHei', 'SimHei', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background: #fff;
        }
        
        .story-container {
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .story-header {
            text-align: center;
            margin-bottom: 40px;
            padding: 30px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-radius: 15px;
        }
        
        .story-title {
            font-size: 2.5em;
            font-weight: bold;
            margin-bottom: 10px;
        }
        
        .story-subtitle {
            font-size: 1.2em;
            opacity: 0.9;
        }
        
        .story-page {
            margin-bottom: 50px;
            padding: 30px;
            background: #fff;
            border-radius: 15px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
            page-break-inside: avoid;
        }
        
        .page-header {
            text-align: center;
            margin-bottom: 20px;
        }
        
        .page-number {
            background: #667eea;
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 0.9em;
            display: inline-block;
        }
        
        .page-title {
            font-size: 1.8em;
            font-weight: bold;
            margin: 15px 0;
            color: #2c3e50;
        }
        
        .page-content {
            display: flex;
            align-items: flex-start;
            gap: 30px;
            margin-top: 25px;
        }
        
        .page-image {
            flex: 1;
            text-align: center;
        }
        
        .page-image img {
            max-width: 100%;
            height: auto;
            border-radius: 10px;
            box-shadow: 0 3px 10px rgba(0,0,0,0.2);
        }
        
        .page-image .emoji-fallback {
            font-size: 120px;
            line-height: 1;
            background: #f8f9fa;
            padding: 40px;
            border-radius: 10px;
            border: 2px dashed #dee2e6;
        }
        
        .page-text {
            flex: 1;
            font-size: 1.1em;
            line-height: 1.8;
            color: #444;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 10px;
            border-left: 4px solid #667eea;
        }
        
        .story-footer {
            text-align: center;
            margin-top: 40px;
            padding: 30px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-radius: 15px;
        }
        
        .story-footer h2 {
            font-size: 2em;
            margin-bottom: 10px;
        }
        
        .story-info {
            margin-top: 30px;
            text-align: center;
            font-size: 0.9em;
            color: #666;
            border-top: 1px solid #eee;
            padding-top: 20px;
        }
        
        /* 打印样式 */
        @media print {
            body {
                font-size: 12pt;
                line-height: 1.4;
            }
            
            .story-page {
                page-break-inside: avoid;
                margin-bottom: 30px;
                box-shadow: none;
                border: 1px solid #ddd;
            }
            
            .page-content {
                flex-direction: column;
                gap: 20px;
            }
            
            .page-image img {
                max-height: 300px;
                object-fit: contain;
            }
            
            .story-header,
            .story-footer {
                background: #667eea !important;
                -webkit-print-color-adjust: exact;
                color-adjust: exact;
            }
        }
        
        /* 移动端适配 */
        @media (max-width: 768px) {
            .story-container {
                padding: 10px;
            }
            
            .page-content {
                flex-direction: column;
                gap: 20px;
            }
            
            .story-title {
                font-size: 2em;
            }
            
            .page-title {
                font-size: 1.5em;
            }
        }
    </style>
</head>
<body>
    <div class="story-container">
`;

  // 故事头部
  const storyHeader = `
        <div class="story-header">
            <div class="story-title">${character.name}的故事</div>
            <div class="story-subtitle">一个关于${character.name}的温馨故事</div>
        </div>
`;

  // 生成页面内容
  let pagesHTML = '';
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const progress = 20 + (i / totalPages) * 60; // 20% - 80%
    onProgress && onProgress(`正在处理第 ${i + 1} 页...`, progress);
    
    pagesHTML += await generatePageHTML(page, i + 1);
  }

  // 故事尾部
  const storyFooter = `
        <div class="story-footer">
            <h2>故事结束</h2>
            <p>感谢您阅读${character.name}的故事！</p>
        </div>
        
        <div class="story-info">
            <p>故事创建时间：${new Date().toLocaleDateString('zh-CN')}</p>
            <p>角色：${character.name}，${character.age}岁${character.gender === 'boy' ? '男孩' : character.gender === 'girl' ? '女孩' : '孩子'}</p>
            <p>总页数：${pages.length}页</p>
        </div>
    </div>
</body>
</html>
`;

  return htmlHeader + storyHeader + pagesHTML + storyFooter;
}

/**
 * 生成单页HTML内容
 */
async function generatePageHTML(pageData, pageNumber) {
  const { title, content, imageUrl, fallbackEmoji, image } = pageData;
  
  // 处理图片显示
  let imageHTML = '';
  if (imageUrl) {
    imageHTML = `<img src="${imageUrl}" alt="第${pageNumber}页插图" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" />
                 <div class="emoji-fallback" style="display:none;">${fallbackEmoji || image || '📖'}</div>`;
  } else {
    imageHTML = `<div class="emoji-fallback">${fallbackEmoji || image || '📖'}</div>`;
  }
  
  return `
        <div class="story-page">
            <div class="page-header">
                <div class="page-number">第 ${pageNumber} 页</div>
                <div class="page-title">${title || `第${pageNumber}页`}</div>
            </div>
            <div class="page-content">
                <div class="page-image">
                    ${imageHTML}
                </div>
                <div class="page-text">
                    ${content || '暂无内容'}
                </div>
            </div>
        </div>
`;
}

/**
 * 导出故事数据为JSON文件（备用方案）
 */
export function exportStoryData(bookData) {
  try {
    const storyData = {
      ...bookData,
      exportTime: new Date().toISOString(),
      version: '1.0'
    };
    
    const dataStr = JSON.stringify(storyData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `${bookData.character.name}_故事数据_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    
    console.log('故事数据导出成功');
    return true;
  } catch (error) {
    console.error('故事数据导出失败:', error);
    return false;
  }
}

/**
 * 完整保存故事（先保存图片，再生成PDF）
 */
export async function saveCompleteStory(storyData, onProgress = null) {
  try {
    if (onProgress) onProgress('开始保存完整故事...', 0);
    
    // 第一阶段：生成所有图片
    if (onProgress) onProgress('正在生成高质量图片...', 5);
    
    const images = [];
    const totalPages = storyData.pages?.length || 0;
    
    // 创建封面图片
    if (onProgress) onProgress('正在生成封面图片...', 10);
    const coverImage = await generatePageImage({
      type: 'cover',
      title: storyData.title || '我的故事书',
      subtitle: storyData.subtitle || '',
      coverImage: storyData.coverImage
    });
    images.push({ name: '00-封面.png', data: coverImage });
    
    // 生成每一页的图片
    for (let i = 0; i < totalPages; i++) {
      const progress = 10 + (i / totalPages) * 30; // 10-40%
      if (onProgress) onProgress(`正在生成第${i + 1}页图片...`, progress);
      
      const pageImage = await generatePageImage({
        type: 'content',
        pageNumber: i + 1,
        content: storyData.pages[i].content,
        imageUrl: storyData.pages[i].imageUrl || storyData.pages[i].illustration
      });
      images.push({ name: `${String(i + 1).padStart(2, '0')}-第${i + 1}页.png`, data: pageImage });
    }
    
    // 创建结束页图片
    if (onProgress) onProgress('正在生成结束页图片...', 45);
    const endImage = await generatePageImage({
      type: 'end',
      title: '故事结束',
      subtitle: '谢谢阅读！'
    });
    images.push({ name: `${String(totalPages + 1).padStart(2, '0')}-结束页.png`, data: endImage });
    
    // 第二阶段：创建图片ZIP文件
    if (onProgress) onProgress('正在打包图片文件...', 50);
    
    const JSZip = (await import('jszip')).default;
    const imageZip = new JSZip();
    
    images.forEach(image => {
      imageZip.file(image.name, image.data.split(',')[1], { base64: true });
    });
    
    const imageZipBlob = await imageZip.generateAsync({ type: 'blob' });
    
    // 下载图片ZIP文件
    const imageUrl = URL.createObjectURL(imageZipBlob);
    const imageLink = document.createElement('a');
    imageLink.href = imageUrl;
    imageLink.download = `${storyData.title || '故事书'}-图片集.zip`;
    document.body.appendChild(imageLink);
    imageLink.click();
    document.body.removeChild(imageLink);
    URL.revokeObjectURL(imageUrl);
    
    if (onProgress) onProgress('图片文件保存完成，开始生成PDF...', 60);
    
    // 第三阶段：生成PDF
    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    
    let isFirstPage = true;
    
    // 添加封面到PDF
    if (onProgress) onProgress('正在添加封面到PDF...', 65);
    
    const coverBase64 = coverImage.split(',')[1];
    pdf.addImage(coverBase64, 'PNG', 0, 0, pageWidth, pageHeight);
    
    // 添加内容页到PDF
    for (let i = 0; i < images.length - 1; i++) { // 排除结束页，稍后单独处理
      if (i === 0) continue; // 跳过封面，已经添加
      
      const progress = 65 + (i / images.length) * 25; // 65-90%
      if (onProgress) onProgress(`正在添加第${i}页到PDF...`, progress);
      
      if (!isFirstPage) {
        pdf.addPage();
      } else {
        isFirstPage = false;
      }
      
      const imageBase64 = images[i].data.split(',')[1];
      pdf.addImage(imageBase64, 'PNG', 0, 0, pageWidth, pageHeight);
    }
    
    // 添加结束页到PDF
    if (onProgress) onProgress('正在添加结束页到PDF...', 90);
    pdf.addPage();
    const endBase64 = endImage.split(',')[1];
    pdf.addImage(endBase64, 'PNG', 0, 0, pageWidth, pageHeight);
    
    // 保存PDF文件
    if (onProgress) onProgress('正在保存PDF文件...', 95);
    
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const pdfFilename = `${storyData.title || '故事书'}-${timestamp}.pdf`;
    
    pdf.save(pdfFilename);
    
    if (onProgress) onProgress('故事保存完成！', 100);
    
    return { 
      success: true, 
      message: '完整故事保存成功！已生成图片集ZIP文件和PDF文件。',
      files: {
        images: `${storyData.title || '故事书'}-图片集.zip`,
        pdf: pdfFilename
      }
    };
    
  } catch (error) {
    console.error('完整故事保存失败:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 生成单页图片
 */
async function generatePageImage(pageData) {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // A4比例，高分辨率
    const width = 2480; // 300 DPI A4宽度
    const height = 3508; // 300 DPI A4高度
    canvas.width = width;
    canvas.height = height;
    
    // 白色背景
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    
    if (pageData.type === 'cover') {
      // 绘制封面
      drawCoverPage(ctx, pageData, width, height);
      resolve(canvas.toDataURL('image/png'));
    } else if (pageData.type === 'content') {
      // 绘制内容页
      drawContentPage(ctx, pageData, width, height, resolve, reject);
    } else if (pageData.type === 'end') {
      // 绘制结束页
      drawEndPage(ctx, pageData, width, height);
      resolve(canvas.toDataURL('image/png'));
    }
  });
}

/**
 * 绘制封面页
 */
function drawCoverPage(ctx, pageData, width, height) {
  // 设置字体
  ctx.textAlign = 'center';
  ctx.fillStyle = '#2c3e50';
  
  // 标题
  ctx.font = 'bold 120px "Microsoft YaHei", "PingFang SC", "Hiragino Sans GB", sans-serif';
  ctx.fillText(pageData.title, width / 2, height * 0.3);
  
  // 副标题
  if (pageData.subtitle) {
    ctx.font = '60px "Microsoft YaHei", "PingFang SC", "Hiragino Sans GB", sans-serif';
    ctx.fillText(pageData.subtitle, width / 2, height * 0.4);
  }
  
  // 装饰元素
  ctx.fillStyle = '#3498db';
  ctx.fillRect(width * 0.1, height * 0.8, width * 0.8, 20);
}

/**
 * 绘制内容页
 */
function drawContentPage(ctx, pageData, width, height, resolve, reject) {
  // 获取canvas对象
  const canvas = ctx.canvas;
  
  // 页码
  ctx.textAlign = 'center';
  ctx.fillStyle = '#7f8c8d';
  ctx.font = '40px "Microsoft YaHei", "PingFang SC", "Hiragino Sans GB", sans-serif';
  ctx.fillText(`第 ${pageData.pageNumber} 页`, width / 2, height - 100);
  
  // 如果有图片，先加载图片
  if (pageData.imageUrl) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      // 绘制图片（上半部分）
      const imgHeight = height * 0.6;
      const imgWidth = width * 0.8;
      const imgX = (width - imgWidth) / 2;
      const imgY = height * 0.1;
      
      ctx.drawImage(img, imgX, imgY, imgWidth, imgHeight);
      
      // 绘制文字（下半部分）
      drawContentText(ctx, pageData.content, width, height);
      
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => {
      // 图片加载失败，只绘制文字
      drawContentText(ctx, pageData.content, width, height);
      resolve(canvas.toDataURL('image/png'));
    };
    img.src = pageData.imageUrl;
  } else {
    // 没有图片，只绘制文字
    drawContentText(ctx, pageData.content, width, height);
    resolve(canvas.toDataURL('image/png'));
  }
}

/**
 * 绘制内容文字
 */
function drawContentText(ctx, content, width, height) {
  if (!content) return;
  
  ctx.textAlign = 'left';
  ctx.fillStyle = '#2c3e50';
  ctx.font = '60px "Microsoft YaHei", "PingFang SC", "Hiragino Sans GB", sans-serif';
  
  // 文字区域
  const textX = width * 0.1;
  const textY = height * 0.75;
  const textWidth = width * 0.8;
  const lineHeight = 80;
  
  // 文字换行处理
  const lines = wrapText(ctx, content, textWidth);
  lines.forEach((line, index) => {
    ctx.fillText(line, textX, textY + index * lineHeight);
  });
}

/**
 * 绘制结束页
 */
function drawEndPage(ctx, pageData, width, height) {
  ctx.textAlign = 'center';
  ctx.fillStyle = '#e74c3c';
  
  // 主标题
  ctx.font = 'bold 100px "Microsoft YaHei", "PingFang SC", "Hiragino Sans GB", sans-serif';
  ctx.fillText(pageData.title, width / 2, height * 0.4);
  
  // 副标题
  ctx.font = '60px "Microsoft YaHei", "PingFang SC", "Hiragino Sans GB", sans-serif';
  ctx.fillText(pageData.subtitle, width / 2, height * 0.6);
  
  // 装饰
  ctx.fillStyle = '#f39c12';
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.arc(width * (0.2 + i * 0.15), height * 0.8, 30, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * 文字换行处理
 */
function wrapText(ctx, text, maxWidth) {
  const lines = [];
  const chars = text.split('');
  let currentLine = '';
  
  for (let i = 0; i < chars.length; i++) {
    const testLine = currentLine + chars[i];
    const metrics = ctx.measureText(testLine);
    
    if (metrics.width > maxWidth && currentLine !== '') {
      lines.push(currentLine);
      currentLine = chars[i];
    } else {
      currentLine = testLine;
    }
  }
  
  if (currentLine) {
    lines.push(currentLine);
  }
  
  return lines;
}

/**
 * 将图片URL转换为Base64格式
 */
async function loadImageAsBase64(imageUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = function() {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      canvas.width = img.width;
      canvas.height = img.height;
      
      ctx.drawImage(img, 0, 0);
      
      try {
        const dataURL = canvas.toDataURL('image/png');
        resolve(dataURL);
      } catch (error) {
        console.error('图片转换失败:', error);
        resolve(null);
      }
    };
    
    img.onerror = function(error) {
      console.error('图片加载失败:', error);
      resolve(null);
    };
    
    img.src = imageUrl;
  });
}

/**
 * 等待图片加载完成
 */
function waitForImagesToLoad(doc) {
  return new Promise((resolve) => {
    const images = doc.querySelectorAll('img');
    if (images.length === 0) {
      resolve();
      return;
    }
    
    let loadedCount = 0;
    const totalImages = images.length;
    
    const checkComplete = () => {
      loadedCount++;
      if (loadedCount >= totalImages) {
        resolve();
      }
    };
    
    images.forEach(img => {
      if (img.complete) {
        checkComplete();
      } else {
        img.addEventListener('load', checkComplete);
        img.addEventListener('error', checkComplete);
      }
    });
    
    // 备用超时
    setTimeout(resolve, 5000);
  });
}

/**
 * 生成故事HTML内容（用于打印）- 同步版本
 */
function generateStoryHTMLForPrint(storyData) {
  const { title, subtitle, pages = [], coverImage } = storyData;
  
  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title || '我的故事书'}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@300;400;500;700&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Noto Sans SC', 'Microsoft YaHei', '微软雅黑', 'PingFang SC', 'Hiragino Sans GB', sans-serif;
            line-height: 1.6;
            color: #333;
            background: white;
        }
        
        .page {
            width: 210mm;
            min-height: 297mm;
            margin: 0 auto;
            padding: 20mm;
            page-break-after: always;
            display: flex;
            flex-direction: column;
            position: relative;
        }
        
        .page:last-child {
            page-break-after: avoid;
        }
        
        .cover-page {
            justify-content: center;
            align-items: center;
            text-align: center;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        
        .cover-title {
            font-size: 48px;
            font-weight: 700;
            margin-bottom: 20px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }
        
        .cover-subtitle {
            font-size: 24px;
            font-weight: 300;
            opacity: 0.9;
        }
        
        .content-page {
            justify-content: space-between;
        }
        
        .page-number {
            position: absolute;
            bottom: 10mm;
            right: 20mm;
            font-size: 14px;
            color: #666;
        }
        
        .story-image {
            width: 100%;
            max-height: 60%;
            object-fit: contain;
            border-radius: 8px;
            margin-bottom: 20px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        
        .story-text {
            font-size: 18px;
            line-height: 1.8;
            text-align: justify;
            flex-grow: 1;
            display: flex;
            align-items: center;
            padding: 20px 0;
        }
        
        .end-page {
            justify-content: center;
            align-items: center;
            text-align: center;
            background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%);
        }
        
        .end-title {
            font-size: 36px;
            font-weight: 700;
            color: #d63384;
            margin-bottom: 20px;
        }
        
        .end-subtitle {
            font-size: 20px;
            color: #6f42c1;
        }
        
        @media print {
            .page {
                margin: 0;
                page-break-after: always;
            }
            
            .page:last-child {
                page-break-after: avoid;
            }
            
            body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
        }
        
        @media screen and (max-width: 768px) {
            .page {
                width: 100%;
                min-height: auto;
                padding: 20px;
            }
            
            .cover-title {
                font-size: 32px;
            }
            
            .story-text {
                font-size: 16px;
            }
        }
    </style>
</head>
<body>
    <!-- 封面页 -->
    <div class="page cover-page">
        <div>
            ${coverImage ? `<img src="${coverImage}" alt="封面图" style="max-width: 300px; max-height: 300px; margin-bottom: 30px; border-radius: 10px;">` : ''}
            <h1 class="cover-title">${title || '我的故事书'}</h1>
            ${subtitle ? `<p class="cover-subtitle">${subtitle}</p>` : ''}
        </div>
    </div>
    
    <!-- 内容页 -->
    ${pages.map((page, index) => `
    <div class="page content-page">
        <div class="page-number">第 ${index + 1} 页</div>
        ${page.imageUrl || page.illustration ? `
        <img src="${page.imageUrl || page.illustration}" alt="插图 ${index + 1}" class="story-image" crossorigin="anonymous">
        ` : ''}
        <div class="story-text">
            <p>${page.content || ''}</p>
        </div>
    </div>
    `).join('')}
    
    <!-- 结束页 -->
    <div class="page end-page">
        <div>
            <h2 class="end-title">故事结束</h2>
            <p class="end-subtitle">谢谢阅读！</p>
        </div>
    </div>
</body>
</html>
  `;
}

/**
 * 导出为图片集合（ZIP格式）
 */
export async function exportStoryAsImages(storyData, onProgress = null) {
  try {
    if (onProgress) onProgress('正在准备图片导出...', 0);
    
    const images = [];
    const totalPages = storyData.pages?.length || 0;
    
    // 创建封面
    if (onProgress) onProgress('正在生成封面...', 10);
    const coverImage = await generatePageImage({
      type: 'cover',
      title: storyData.title || '我的故事书',
      subtitle: storyData.subtitle || '',
      coverImage: storyData.coverImage
    });
    images.push({ name: '00-封面.png', data: coverImage });
    
    // 生成每一页的图片
    for (let i = 0; i < totalPages; i++) {
      const progress = 10 + (i / totalPages) * 70;
      if (onProgress) onProgress(`正在生成第${i + 1}页...`, progress);
      
      const pageImage = await generatePageImage({
        type: 'content',
        pageNumber: i + 1,
        content: storyData.pages[i].content,
        imageUrl: storyData.pages[i].imageUrl || storyData.pages[i].illustration
      });
      images.push({ name: `${String(i + 1).padStart(2, '0')}-第${i + 1}页.png`, data: pageImage });
    }
    
    // 创建结束页
    if (onProgress) onProgress('正在生成结束页...', 85);
    const endImage = await generatePageImage({
      type: 'end',
      title: '故事结束',
      subtitle: '谢谢阅读！'
    });
    images.push({ name: `${String(totalPages + 1).padStart(2, '0')}-结束页.png`, data: endImage });
    
    if (onProgress) onProgress('正在打包图片...', 95);
    
    // 创建ZIP文件
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    
    images.forEach(image => {
      zip.file(image.name, image.data.split(',')[1], { base64: true });
    });
    
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    
    // 下载ZIP文件
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${storyData.title || '故事书'}-图片集.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    if (onProgress) onProgress('图片导出完成！', 100);
    
    return { success: true, message: '图片集导出成功' };
    
  } catch (error) {
    console.error('图片导出失败:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 导出故事为PDF
 */
export async function exportStoryAsPDF(storyData, onProgress = null) {
  try {
    if (onProgress) onProgress('开始生成PDF...', 0);
    
    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    
    // 添加封面
    if (onProgress) onProgress('正在添加封面...', 10);
    
    pdf.setFontSize(24);
    pdf.text(storyData.title || '我的故事书', pageWidth / 2, 60, { align: 'center' });
    
    if (storyData.subtitle) {
      pdf.setFontSize(16);
      pdf.text(storyData.subtitle, pageWidth / 2, 80, { align: 'center' });
    }
    
    // 添加内容页
    const totalPages = storyData.pages?.length || 0;
    for (let i = 0; i < totalPages; i++) {
      const progress = 10 + (i / totalPages) * 80;
      if (onProgress) onProgress(`正在添加第${i + 1}页...`, progress);
      
      pdf.addPage();
      
      const page = storyData.pages[i];
      
      // 如果有图片URL，尝试加载并添加图片
      if (page.imageUrl) {
        try {
          const imageBase64 = await loadImageAsBase64(page.imageUrl);
          if (imageBase64) {
            const imgData = imageBase64.split(',')[1];
            pdf.addImage(imgData, 'PNG', margin, margin, pageWidth - margin * 2, 100);
          }
        } catch (error) {
          console.log('图片加载失败，跳过图片:', error);
        }
      }
      
      // 添加文字内容
      pdf.setFontSize(14);
      const textY = page.imageUrl ? 140 : 60;
      const splitText = pdf.splitTextToSize(page.content, pageWidth - margin * 2);
      pdf.text(splitText, margin, textY);
      
      // 添加页码
      pdf.setFontSize(10);
      pdf.text(`第 ${i + 1} 页`, pageWidth - margin, pageHeight - 10, { align: 'right' });
    }
    
    if (onProgress) onProgress('正在保存PDF文件...', 95);
    
    // 保存PDF
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const filename = `${storyData.title || '故事书'}-${timestamp}.pdf`;
    pdf.save(filename);
    
    if (onProgress) onProgress('PDF导出完成！', 100);
    
    return { success: true, message: 'PDF导出成功', filename };
    
  } catch (error) {
    console.error('PDF导出失败:', error);
    return { success: false, error: error.message };
  }
} 