# LiblibAI 双API配置指南

## 概述

本系统现在支持LiblibAI的两套API：
- **Kontext API**（推荐）：新版API，使用Bearer token认证，参数格式更规范
- **StarFlow API**（备用）：旧版API，使用签名认证，作为回退方案

系统会自动选择API：优先使用Kontext API，如果未配置则回退到StarFlow API。

## 快速配置

### 方式一：使用Kontext API（推荐）

1. **获取Kontext API密钥**
   - 登录 [LiblibAI平台](https://www.liblib.art/)
   - 进入开发者中心 → API管理
   - 生成API密钥（Bearer token格式）

2. **获取Kontext模型ID**
   - 在LiblibAI平台选择基于Kontext算法的自定义模型
   - 复制模型ID

3. **配置环境变量**
   ```bash
   # 在.env文件中添加
   VITE_LIBLIB_API_KEY=your-kontext-api-key-here
   VITE_LIBLIB_MODEL_ID=your-kontext-model-id-here
   ```

### 方式二：使用StarFlow API（备用）

如果无法获取Kontext API访问权限，可以使用StarFlow API：

1. **获取StarFlow API密钥**
   - 从LiblibAI获取AccessKey和SecretKey

2. **配置环境变量**
   ```bash
   # 在.env文件中添加
   VITE_LIBLIB_ACCESS_KEY=your-access-key-here
   VITE_LIBLIB_SECRET_KEY=your-secret-key-here
   ```

## 详细配置说明

### Kontext API参数说明

Kontext API基于文档：`LiblibAI Kontext API调用指南：文生图与图生图 (Node.js版本).md`

**支持的参数：**
- `prompt`: 提示词（最大2000字符）
- `negative_prompt`: 负向提示词
- `model_id`: Kontext模型ID
- `width/height`: 图像尺寸（推荐768x768）
- `steps`: 采样步数（推荐25）
- `sampler`: 采样器（推荐"DPM++ SDE Karras"）
- `cfg_scale`: 引导比例（推荐8）
- `seed`: 随机种子
- `additionalNetwork`: LoRA等附加网络
- `controlnet`: ControlNet参数（用于精确控制）

### StarFlow API参数说明

**支持的参数：**
- `prompt`: 提示词
- `templateUuid`: 模板UUID
- `width/height`: 图像尺寸
- `steps`: 采样步数（推荐20）
- `sampler`: 采样器（"Euler a"等）
- `cfg_scale`: 引导比例（推荐7）

## 错误排查

### 常见错误

1. **"参数无效: sampler"**
   - 原因：使用了错误的sampler参数
   - 解决：Kontext API推荐使用"DPM++ SDE Karras"

2. **"未获取到生成任务ID"**
   - 原因：API响应格式不符合预期
   - 解决：检查API密钥和模型ID是否正确

3. **"API配置不完整"**
   - 原因：两套API的密钥都未配置
   - 解决：配置其中任一套API的密钥

### 调试方法

1. **检查配置状态**
   ```bash
   curl http://localhost:8080/api/liblib/config
   ```

2. **查看控制台日志**
   - 前端控制台会显示API调用详情
   - 后端控制台会显示请求和响应信息

3. **测试StarFlow签名**
   ```bash
   curl http://localhost:8080/api/liblib/test-signature
   ```

## API切换逻辑

系统按以下优先级选择API：

```
1. 检查 VITE_LIBLIB_API_KEY
   ↓ 如果存在
   使用 Kontext API
   
2. 检查 VITE_LIBLIB_ACCESS_KEY + VITE_LIBLIB_SECRET_KEY
   ↓ 如果存在
   使用 StarFlow API
   
3. 都不存在
   ↓
   返回配置错误
```

## 环境变量完整列表

```bash
# === Kontext API（推荐）===
VITE_LIBLIB_API_KEY=your-kontext-api-key
VITE_LIBLIB_MODEL_ID=your-kontext-model-id

# === StarFlow API（备用）===
VITE_LIBLIB_ACCESS_KEY=your-access-key
VITE_LIBLIB_SECRET_KEY=your-secret-key
VITE_LIBLIB_TEMPLATE_UUID=your-template-uuid
VITE_LIBLIB_IMG2IMG_TEMPLATE_UUID=your-img2img-template-uuid

# === 服务器配置 ===
PORT=8080
VITE_API_BASE_URL=/api
```

## 部署注意事项

1. **生产环境**
   - 确保环境变量正确设置
   - 使用HTTPS协议
   - 设置正确的CORS配置

2. **Vercel/Netlify部署**
   - 在平台环境变量中配置API密钥
   - 注意环境变量名称必须以`VITE_`开头

3. **Docker部署**
   - 使用`.env`文件或环境变量传递配置
   - 确保端口8080正确映射

## 性能优化

1. **API选择建议**
   - 优先使用Kontext API（更现代的架构）
   - 仅在必要时使用StarFlow API

2. **参数优化**
   - 根据需求调整图像尺寸
   - 合理设置采样步数（质量vs速度）
   - 使用合适的sampler

3. **错误处理**
   - 实现重试机制
   - 处理敏感内容检测
   - 提供用户友好的错误提示

## 更新记录

- **v2.0.0**: 添加Kontext API支持，实现双API自动切换
- **v1.0.0**: 基础StarFlow API支持

## 技术支持

如果遇到问题：
1. 查看控制台错误日志
2. 检查网络连接和API密钥
3. 参考LiblibAI官方文档
4. 联系技术支持 