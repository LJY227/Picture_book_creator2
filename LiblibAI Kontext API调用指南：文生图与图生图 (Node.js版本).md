## LiblibAI Kontext API调用指南：文生图与图生图 (Node.js版本)

本指南旨在为Node.js开发者提供通过调用LiblibAI平台API使用Kontext文生图（Text-to-Image, T2I）和图生图（Image-to-Image, I2I）功能的详细步骤和参数设定。Kontext作为LiblibAI自定义模型的基础算法之一，能够提供高度自由和精准的图像生成控制。

### 1. 前提条件

在开始调用API之前，请确保您已完成以下准备工作：

*   **获取API密钥：** 登录LiblibAI平台，生成您的API密钥（`api_key`）。该密钥是进行API请求的身份验证凭证，将用于`Authorization` Header。
*   **确定Kontext模型ID：** LiblibAI自定义模型基于多种基础算法，包括Kontext。您需要从LiblibAI平台获取您希望使用的、基于Kontext的特定自定义模型ID。这个`model_id`是API请求中指定使用Kontext功能的核心参数。
*   **安装HTTP客户端：** 在Node.js项目中，您可以使用内置的`https`模块或流行的第三方库如`axios`或`node-fetch`来发送HTTP请求。本指南将以`axios`为例。

    ```bash
    npm install axios
    ```

### 2. 核心概念：Kontext与高级控制

Kontext在LiblibAI自定义模型中扮演着底层算法的角色，其主要优势在于支持更精细的图像生成控制。这意味着在调用API时，您可以充分利用以下参数来发挥Kontext的强大能力：

*   **`model_id`：** 确保您选择的`model_id`是基于Kontext的自定义模型。这是激活Kontext算法的关键。
*   **`additionalNetwork`：** 用于加载额外的网络模型，如LoRA（Low-Rank Adaptation）。通过配置LoRA，您可以对图像的风格、角色、光照等进行微调，实现特定的艺术效果。Kontext模式特别适合结合LoRA进行创作。
*   **`controlnet`：** 用于精确控制图像的结构、姿态、边缘等。ControlNet允许您输入额外的图像（如骨骼图、深度图、边缘图）来引导生成过程，确保输出图像符合特定的构图或形状要求。Kontext模式下，ControlNet的运用能极大提升图像控制的精准度。

### 3. 文生图（Text-to-Image）API调用步骤

文生图功能允许您通过纯文本描述生成图像。以下是调用步骤及关键参数设定：

**API请求信息：**
*   **请求地址：** `https://api.liblib.art/v1/workflows/run`
*   **请求方式：** `POST`
*   **Header：**
    *   `Authorization`: `Bearer <您的API密钥>`
    *   `Content-Type`: `application/json`

**Body参数设定（JSON格式）：**

| 参数名 | 类型 | 是否必须 | 说明 | 设定建议（针对Kontext） |
|---|---|---|---|---|
| `prompt` | string | 是 | 详细描述您希望生成的图像内容。 | 尽可能具体和富有想象力，例如：“一只穿着宇航服的猫，在月球表面行走，背景是地球，超现实主义风格，电影级光照。” |
| `negative_prompt` | string | 否 | 描述您不希望图像中出现的内容。 | 例如：“模糊，变形，多余的肢体，低质量，水印。” |
| `model_id` | string | 是 | 您选择的基于Kontext的自定义模型ID。 | **务必填写正确的Kontext模型ID。** |
| `width` | integer | 否 | 生成图像的宽度（像素）。 | 常用尺寸如 `512`, `768`, `1024`。建议使用模型训练时常用的尺寸。 |
| `height` | integer | 否 | 生成图像的高度（像素）。 | 同 `width`。 |
| `steps` | integer | 否 | 采样步数。 | 建议 `20-30` 之间，更高步数通常会提升细节但增加生成时间。 |
| `sampler` | string | 否 | 采样器类型。 | 根据文档推荐选择，如 `DPM++ SDE Karras`, `Euler a` 等。 |
| `cfg_scale` | number | 否 | 分类器自由引导比例。 | 建议 `7-12`。数值越大，生成图像越贴近`prompt`，但可能牺牲多样性。 |
| `seed` | integer | 否 | 随机种子。 | 填写一个整数以复现特定图像。不填则随机生成。 |
| `n_iter` | integer | 否 | 生成图像的数量。 | 每次请求生成多张图像，例如 `1` 或 `4`。 |
| `additionalNetwork` | object | 否 | 附加网络参数，用于LoRA等。 | **利用Kontext优势：** 如果您有特定的LoRA模型（如人物风格、物品细节），在此处配置。例如：`{"lora": [{"model_id": "your_lora_model_id", "weight": 0.7}]}`。 |
| `hiResFixInfo` | object | 否 | 高分辨率修复参数。 | 用于提升图像分辨率和细节。例如：`{"upscaler": "ESRGAN_4x", "denoising_strength": 0.5}`。 |

**示例请求Body (Node.js `axios`):**

```javascript
const axios = require("axios");

const apiKey = "YOUR_API_KEY";
const kontextModelId = "YOUR_KONTEXT_MODEL_ID";

const url = "https://api.liblib.art/v1/workflows/run";
const headers = {
  Authorization: `Bearer ${apiKey}`,
  "Content-Type": "application/json",
};

const payload = {
  prompt: "一只穿着宇航服的猫，在月球表面行走，背景是地球，超现实主义风格，电影级光照",
  negative_prompt: "模糊，变形，多余的肢体，低质量，水印",
  model_id: kontextModelId,
  width: 768,
  height: 768,
  steps: 25,
  sampler: "DPM++ SDE Karras",
  cfg_scale: 8,
  seed: 12345,
  n_iter: 1,
  additionalNetwork: {
    lora: [
      {
        model_id: "your_lora_model_id", // 替换为您的LoRA模型ID
        weight: 0.7,
      },
    ],
  },
};

axios
  .post(url, payload, { headers })
  .then((response) => {
    const taskInfo = response.data;
    console.log("任务提交成功:", taskInfo);
    // 提取 task_id 用于后续查询
    const taskId = taskInfo.data?.task_id;
    console.log("Task ID:", taskId);
  })
  .catch((error) => {
    console.error("任务提交失败:", error.response?.status, error.response?.data);
  });
```

### 4. 图生图（Image-to-Image）API调用步骤

图生图功能允许您基于一张输入图像进行修改或风格转换。以下是调用步骤及关键参数设定：

**API请求信息：**
*   **请求地址：** `https://api.liblib.art/v1/workflows/run`
*   **请求方式：** `POST`
*   **Header：**
    *   `Authorization`: `Bearer <您的API密钥>`
    *   `Content-Type`: `application/json`

**Body参数设定（JSON格式）：**

| 参数名 | 类型 | 是否必须 | 说明 | 设定建议（针对Kontext） |
|---|---|---|---|---|
| `image` | string | 是 | 输入图像的Base64编码字符串或可访问的URL。 | 将本地图像转换为Base64编码，或提供一个公开可访问的图像URL。 |
| `prompt` | string | 是 | 描述您希望图像修改后的内容或风格。 | 例如：“将图像中的人物转换为赛博朋克风格，背景保持不变。” |
| `negative_prompt` | string | 否 | 描述您不希望图像中出现的内容。 | 同文生图。 |
| `model_id` | string | 是 | 您选择的基于Kontext的自定义模型ID。 | **务必填写正确的Kontext模型ID。** |
| `strength` | number | 否 | 强度，控制生成图像与原始图像的相似度。 | 范围通常在 `0` 到 `1` 之间。数值越小，生成图像与原图越相似；数值越大，生成图像与原图差异越大，更受`prompt`影响。建议 `0.5-0.8`。 |
| `steps` | integer | 否 | 采样步数。 | 同文生图。 |
| `sampler` | string | 否 | 采样器类型。 | 同文生图。 |
| `cfg_scale` | number | 否 | 分类器自由引导比例。 | 同文生图。 |
| `seed` | integer | 否 | 随机种子。 | 同文生图。 |
| `n_iter` | integer | 否 | 生成图像的数量。 | 同文生图。 |
| `mask` | string | 否 | 蒙版图像的Base64编码字符串或URL。 | 如果需要进行局部重绘，提供蒙版图像。白色区域表示重绘，黑色区域表示保留。 |
| `controlnet` | array | 否 | ControlNet相关参数。 | **利用Kontext优势：** 如果需要精确控制图像结构（如人物姿态、建筑轮廓），在此处配置ControlNet。例如：`[{"controlnet_model": "canny", "controlnet_weight": 1.0, "controlnet_image": "base64_of_canny_edge_map", "controlnet_preprocessor": "canny"}]`。可以添加多个ControlNet。 |

**示例请求Body (Node.js `axios`):**

```javascript
const axios = require("axios");
const fs = require("fs");

const apiKey = "YOUR_API_KEY";
const kontextModelId = "YOUR_KONTEXT_MODEL_ID";

// 假设您有一张名为 input_image.png 的图片
// 将图片转换为Base64编码
function imageToBase64(imagePath) {
  const imageBuffer = fs.readFileSync(imagePath);
  return imageBuffer.toString("base64");
}

const inputImageBase64 = imageToBase64("input_image.png"); // 替换为您的图片路径

// 如果使用ControlNet，您可能需要预处理图像并获取其Base64编码
// const openposeImageBase64 = imageToBase64("openpose_image.png"); // 替换为OpenPose图像的Base64编码

const url = "https://api.liblib.art/v1/workflows/run";
const headers = {
  Authorization: `Bearer ${apiKey}`,
  "Content-Type": "application/json",
};

const payload = {
  image: inputImageBase64,
  prompt: "将图像中的人物转换为赛博朋克风格，背景保持不变",
  negative_prompt: "低质量，模糊",
  model_id: kontextModelId,
  strength: 0.7,
  steps: 25,
  sampler: "DPM++ SDE Karras",
  cfg_scale: 7,
  seed: 54321,
  n_iter: 1,
  controlnet: [
    {
      controlnet_model: "openpose", // 替换为您的ControlNet模型ID
      controlnet_weight: 1.0,
      controlnet_image: "base64_of_openpose_image", // 替换为OpenPose图像的Base64编码
      controlnet_preprocessor: "openpose",
    },
  ],
};

axios
  .post(url, payload, { headers })
  .then((response) => {
    const taskInfo = response.data;
    console.log("任务提交成功:", taskInfo);
    const taskId = taskInfo.data?.task_id;
    console.log("Task ID:", taskId);
  })
  .catch((error) => {
    console.error("任务提交失败:", error.response?.status, error.response?.data);
  });
```

### 5. 查询生图结果步骤

提交文生图或图生图任务后，您会立即获得一个`task_id`。您需要使用这个`task_id`来查询任务的执行状态和最终生成的图像URL。

**API请求信息：**
*   **请求地址：** `https://api.liblib.art/v1/tasks/{task_id}` (将`{task_id}`替换为实际的任务ID)
*   **请求方式：** `GET`
*   **Header：**
    *   `Authorization`: `Bearer <您的API密钥>`

**示例请求 (Node.js `axios`):**

```javascript
const axios = require("axios");

const apiKey = "YOUR_API_KEY";
const taskId = "YOUR_TASK_ID"; // 替换为提交任务后获得的 task_id

const url = `https://api.liblib.art/v1/tasks/${taskId}`;
const headers = {
  Authorization: `Bearer ${apiKey}`,
};

async function pollTaskStatus() {
  while (true) {
    try {
      const response = await axios.get(url, { headers });
      const taskStatus = response.data;
      const status = taskStatus.data?.status;
      console.log(`当前任务状态: ${status}`);

      if (status === "success") {
        const imageUrl = taskStatus.data?.output?.images?.[0]?.url;
        console.log("图像生成成功，图片URL:", imageUrl);
        break;
      } else if (status === "failed") {
        console.error(
          "图像生成失败:",
          taskStatus.data?.error_message
        );
        break;
      } else {
        await new Promise((resolve) => setTimeout(resolve, 5000)); // 等待5秒后继续查询
      }
    } catch (error) {
      console.error(
        "查询任务状态失败:",
        error.response?.status,
        error.response?.data
      );
      break;
    }
  }
}

pollTaskStatus();
```

### 6. 错误处理与最佳实践

*   **API密钥安全：** 您的API密钥是敏感信息，请务必妥善保管，不要硬编码在代码中，建议使用环境变量或配置管理工具。
*   **请求频率限制：** 注意LiblibAI平台可能存在的API请求频率限制（QPS）。如果遇到频率限制错误，请适当增加请求间隔或实施重试机制。
*   **错误码处理：** 针对API返回的不同HTTP状态码和错误信息，进行相应的错误处理，例如：
    *   `401 Unauthorized`: API密钥无效或缺失。
    *   `400 Bad Request`: 请求参数错误，请检查您的JSON payload。
    *   `500 Internal Server Error`: 平台内部错误，可尝试重试或联系技术支持。
*   **异步处理：** 图像生成通常是耗时操作。在Node.js中，使用`async/await`或Promise可以很好地处理异步操作，避免阻塞主线程。
*   **图像Base64编码：** 在图生图任务中，如果上传本地图片，需要将其转换为Base64编码字符串。请确保编码正确，并且字符串没有额外的换行符或空格。可以使用Node.js的`fs`模块读取文件并`toString('base64')`。
*   **ControlNet图像预处理：** 如果使用ControlNet，您可能需要对输入图像进行预处理（例如生成Canny边缘图、OpenPose骨骼图），然后将预处理后的图像Base64编码后作为`controlnet_image`参数传入。
*   **持续关注官方文档：** API接口和参数可能会更新，建议定期查阅LiblibAI官方API文档以获取最新信息。

遵循以上步骤和建议，您将能够成功开发Node.js程序来调用LiblibAI平台API，并利用Kontext模型进行文生图和图生图操作。

