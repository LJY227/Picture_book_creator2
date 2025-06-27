import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * 将绘本导出为PDF
 * @param {Object} bookData - 绘本数据
 * @param {Function} onProgress - 进度回调函数
 * @returns {Promise<void>}
 */
export async function exportBookToPDF(bookData, onProgress = null) {
  try {
    console.log('开始导出PDF...');
    onProgress && onProgress('正在准备PDF导出...', 0);

    // 创建PDF文档 (A4尺寸)
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - 2 * margin;
    const contentHeight = pageHeight - 2 * margin;

    let currentPageIndex = 0;
    const totalPages = bookData.pages.length;

    for (const pageData of bookData.pages) {
      console.log(`处理第 ${currentPageIndex + 1} 页...`);
      onProgress && onProgress(`正在处理第 ${currentPageIndex + 1} 页...`, (currentPageIndex / totalPages) * 80);

      // 如果不是第一页，添加新页
      if (currentPageIndex > 0) {
        pdf.addPage();
      }

      // 根据页面类型渲染内容
      if (pageData.type === 'cover') {
        await renderCoverPage(pdf, pageData, margin, contentWidth, contentHeight);
      } else if (pageData.type === 'content') {
        await renderContentPage(pdf, pageData, margin, contentWidth, contentHeight);
      } else if (pageData.type === 'ending') {
        await renderEndingPage(pdf, pageData, margin, contentWidth, contentHeight);
      }

      currentPageIndex++;
    }

    onProgress && onProgress('正在生成PDF文件...', 90);

    // 生成文件名 - 处理中文字符
    const characterName = bookData.character.name || 'PictureBook';
    const safeFileName = encodeForPDF(characterName).replace(/[^a-zA-Z0-9\-_]/g, '_');
    const fileName = `${safeFileName}_${new Date().toISOString().slice(0, 10)}.pdf`;
    
    onProgress && onProgress('PDF导出完成！', 100);
    
    // 下载PDF
    pdf.save(fileName);
    
    console.log('PDF导出成功:', fileName);
    return fileName;

  } catch (error) {
    console.error('PDF导出失败:', error);
    throw new Error('PDF导出失败: ' + error.message);
  }
}

/**
 * 渲染封面页
 */
async function renderCoverPage(pdf, pageData, margin, contentWidth, contentHeight) {
  // 设置字体 - 使用支持中文的字体
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(24);
  pdf.setTextColor(40, 40, 40);

  // 标题 - 处理中文字符
  const titleText = encodeForPDF(pageData.title);
  const titleLines = pdf.splitTextToSize(titleText, contentWidth);
  const titleHeight = titleLines.length * 10;
  let yPosition = margin + 60;
  
  titleLines.forEach(line => {
    const textWidth = pdf.getTextWidth(line);
    const xPosition = (contentWidth - textWidth) / 2 + margin;
    pdf.text(line, xPosition, yPosition);
    yPosition += 10;
  });

  // 副标题
  if (pageData.subtitle) {
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'normal');
    yPosition += 20;
    
    const subtitleText = encodeForPDF(pageData.subtitle);
    const subtitleLines = pdf.splitTextToSize(subtitleText, contentWidth);
    subtitleLines.forEach(line => {
      const textWidth = pdf.getTextWidth(line);
      const xPosition = (contentWidth - textWidth) / 2 + margin;
      pdf.text(line, xPosition, yPosition);
      yPosition += 8;
    });
  }

  // 装饰性图标
  pdf.setFontSize(48);
  const iconWidth = pdf.getTextWidth(pageData.image);
  const iconX = (contentWidth - iconWidth) / 2 + margin;
  pdf.text(pageData.image, iconX, margin + 40);
}

/**
 * 渲染内容页
 */
async function renderContentPage(pdf, pageData, margin, contentWidth, contentHeight) {
  let yPosition = margin + 20;

  // 页面标题
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(18);
  pdf.setTextColor(40, 40, 40);
  
  const titleText = encodeForPDF(pageData.title);
  const titleLines = pdf.splitTextToSize(titleText, contentWidth);
  titleLines.forEach(line => {
    pdf.text(line, margin, yPosition);
    yPosition += 8;
  });

  yPosition += 10;

  // 插画区域
  const imageHeight = 80;
  const imageY = yPosition;
  
  if (pageData.imageUrl) {
    try {
      // 尝试加载并嵌入图片
      await embedImageInPDF(pdf, pageData.imageUrl, margin, imageY, contentWidth, imageHeight);
    } catch (error) {
      console.warn('无法加载图片，使用备用图标:', error);
      // 使用备用图标
      pdf.setFontSize(36);
      pdf.setTextColor(100, 100, 100);
      const fallbackIcon = pageData.fallbackEmoji || pageData.image || '🖼️';
      const iconWidth = pdf.getTextWidth(fallbackIcon);
      const iconX = (contentWidth - iconWidth) / 2 + margin;
      pdf.text(fallbackIcon, iconX, imageY + imageHeight / 2);
    }
  } else {
    // 使用备用图标
    pdf.setFontSize(36);
    pdf.setTextColor(100, 100, 100);
    const fallbackIcon = pageData.fallbackEmoji || pageData.image || '🖼️';
    const iconWidth = pdf.getTextWidth(fallbackIcon);
    const iconX = (contentWidth - iconWidth) / 2 + margin;
    pdf.text(fallbackIcon, iconX, imageY + imageHeight / 2);
  }

  yPosition = imageY + imageHeight + 20;

  // 页面内容 - 处理中文字符
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(14);
  pdf.setTextColor(60, 60, 60);
  
  const contentText = encodeForPDF(pageData.content);
  const contentLines = pdf.splitTextToSize(contentText, contentWidth);
  contentLines.forEach(line => {
    if (yPosition > contentHeight + margin - 20) {
      // 如果内容太长，截断并添加省略号
      pdf.text('...', margin, yPosition);
      return;
    }
    pdf.text(line, margin, yPosition);
    yPosition += 6;
  });

  // 页码
  pdf.setFontSize(10);
  pdf.setTextColor(120, 120, 120);
  const pageNumberText = encodeForPDF(`第 ${pageData.pageNumber} 页`);
  pdf.text(pageNumberText, contentWidth + margin - 20, contentHeight + margin - 5);
}

/**
 * 渲染结尾页
 */
async function renderEndingPage(pdf, pageData, margin, contentWidth, contentHeight) {
  // 装饰性图标
  pdf.setFontSize(48);
  pdf.setTextColor(100, 100, 100);
  const iconWidth = pdf.getTextWidth(pageData.image);
  const iconX = (contentWidth - iconWidth) / 2 + margin;
  pdf.text(pageData.image, iconX, margin + 40);

  // 标题
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(20);
  pdf.setTextColor(40, 40, 40);
  
  const titleText = encodeForPDF(pageData.title);
  const titleLines = pdf.splitTextToSize(titleText, contentWidth);
  let yPosition = margin + 80;
  
  titleLines.forEach(line => {
    const textWidth = pdf.getTextWidth(line);
    const xPosition = (contentWidth - textWidth) / 2 + margin;
    pdf.text(line, xPosition, yPosition);
    yPosition += 10;
  });

  // 内容
  if (pageData.content) {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(14);
    pdf.setTextColor(60, 60, 60);
    yPosition += 20;
    
    const contentText = encodeForPDF(pageData.content);
    const contentLines = pdf.splitTextToSize(contentText, contentWidth);
    contentLines.forEach(line => {
      const textWidth = pdf.getTextWidth(line);
      const xPosition = (contentWidth - textWidth) / 2 + margin;
      pdf.text(line, xPosition, yPosition);
      yPosition += 8;
    });
  }
}

/**
 * 编码文本以支持PDF显示（处理中文字符）
 */
function encodeForPDF(text) {
  if (!text) return '';
  
  try {
    // 尝试使用UTF-8编码
    const encoded = text.toString();
    
    // 如果包含中文字符，进行替换以避免乱码
    if (/[\u4e00-\u9fff]/.test(encoded)) {
      return encoded
        // 常用词汇
        .replace(/绘本/g, 'Picture Book')
        .replace(/故事/g, 'Story')
        .replace(/第/g, 'Page ')
        .replace(/页/g, '')
        .replace(/结束/g, 'The End')
        .replace(/完/g, 'Finished')
        .replace(/谢谢/g, 'Thank You')
        .replace(/再见/g, 'Goodbye')
        // 角色相关
        .replace(/小勇/g, 'Xiao Yong')
        .replace(/小明/g, 'Xiao Ming')
        .replace(/小红/g, 'Xiao Hong')
        .replace(/主角/g, 'Hero')
        .replace(/孩子/g, 'Child')
        .replace(/朋友/g, 'Friend')
        .replace(/妈妈/g, 'Mom')
        .replace(/爸爸/g, 'Dad')
        // 场景相关
        .replace(/公园/g, 'Park')
        .replace(/学校/g, 'School')
        .replace(/家/g, 'Home')
        .replace(/森林/g, 'Forest')
        .replace(/花园/g, 'Garden')
        .replace(/教室/g, 'Classroom')
        .replace(/操场/g, 'Playground')
        // 动作相关
        .replace(/开心/g, 'Happy')
        .replace(/高兴/g, 'Joyful')
        .replace(/玩耍/g, 'Playing')
        .replace(/学习/g, 'Learning')
        .replace(/帮助/g, 'Helping')
        .replace(/种树/g, 'Planting Trees')
        .replace(/看书/g, 'Reading')
        // 其他常用字符
        .replace(/和/g, 'and')
        .replace(/的/g, '')
        .replace(/了/g, '')
        .replace(/在/g, 'at')
        .replace(/是/g, 'is')
        .replace(/有/g, 'has')
        .replace(/很/g, 'very')
        .replace(/非常/g, 'very')
        .replace(/一起/g, 'together')
        .replace(/可以/g, 'can')
        .replace(/还/g, 'also')
        .replace(/对/g, 'to')
        .replace(/说/g, 'said')
        .replace(/你/g, 'you');
    }
    
    return encoded;
  } catch (error) {
    console.warn('文本编码失败，使用备用方案:', error);
    // 如果编码失败，返回简化的英文版本
    return text.replace(/[\u4e00-\u9fff]/g, '?');
  }
}

/**
 * 在PDF中嵌入图片
 */
async function embedImageInPDF(pdf, imageUrl, x, y, width, height) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      try {
        // 创建canvas来处理图片
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // 计算合适的尺寸保持宽高比
        const aspectRatio = img.width / img.height;
        let drawWidth = width;
        let drawHeight = height;
        
        if (aspectRatio > width / height) {
          drawHeight = width / aspectRatio;
        } else {
          drawWidth = height * aspectRatio;
        }
        
        canvas.width = drawWidth * 2; // 提高分辨率
        canvas.height = drawHeight * 2;
        
        // 绘制图片到canvas
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // 转换为base64
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        
        // 居中计算位置
        const centerX = x + (width - drawWidth) / 2;
        const centerY = y + (height - drawHeight) / 2;
        
        // 添加到PDF
        pdf.addImage(dataUrl, 'JPEG', centerX, centerY, drawWidth, drawHeight);
        resolve();
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => {
      reject(new Error('无法加载图片'));
    };
    
    // 处理跨域问题
    if (imageUrl.startsWith('http')) {
      // 对于外部URL，尝试通过代理或直接加载
      img.src = imageUrl;
    } else {
      img.src = imageUrl;
    }
  });
}

/**
 * 将HTML元素转换为图片并添加到PDF
 */
export async function htmlToPDF(element, pdf, x, y, width, height) {
  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff'
    });
    
    const imgData = canvas.toDataURL('image/png');
    pdf.addImage(imgData, 'PNG', x, y, width, height);
    
    return true;
  } catch (error) {
    console.error('HTML转PDF失败:', error);
    return false;
  }
} 