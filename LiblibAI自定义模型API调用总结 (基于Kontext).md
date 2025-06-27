# LiblibAI自定义模型API调用总结 (基于Kontext)

根据飞书文档《LiblibAI x 星流 图像大模型API 使用说明》，LiblibAI自定义模型支持文生图和图生图功能，其底层算法包括F.1 Kontex。以下是按照文档格式对相关API调用方法和参数的总结：

## 4.1.3 提交文生图任务

### 请求地址

```

```

### 请求方式

`POST`

### Header

| 参数名 | 类型 | 是否必须 | 说明 |
| --- | --- | --- | --- |
| `Authorization` | string | 是 | Bearer <api_key> |
| `Content-Type` | string | 是 | application/json |

### Body

| 参数名 | 类型 | 是否必须 | 说明 |
| --- | --- | --- | --- |
| `prompt` | string | 是 | 描述生成图像内容的文本提示。 |
| `negative_prompt` | string | 否 | 描述不希望出现在图像中的内容。 |
| `model_id` | string | 是 | 指定使用的模型ID。对于基于Kontext的模型，这里应填写相应的自定义模型ID。 |
| `width` | integer | 否 | 生成图像的宽度 (例如：512, 768, 1024)。 |
| `height` | integer | 否 | 生成图像的高度 (例如：512, 768, 1024)。 |
| `steps` | integer | 否 | 采样步数，影响图像生成质量和时间。 |
| `sampler` | string | 否 | 采样器类型。 |
| `cfg_scale` | number | 否 | 分类器自由引导比例，控制提示词对生成图像的影响程度。 |
| `seed` | integer | 否 | 随机种子，用于复现特定图像。 |
| `n_iter` | integer | 否 | 生成图像的数量。 |
| `additionalNetwork` | object | 否 | 附加网络参数，如LoRA、LyCORIS等。 |
| `hiResFixInfo` | object | 否 | 高分辨率修复参数。 |

## 4.1.4 提交图生图任务

### 请求地址

```
https://api.liblib.art/v1/workflows/run
```

### 请求方式

`POST`

### Header

| 参数名 | 类型 | 是否必须 | 说明 |
| --- | --- | --- | --- |
| `Authorization` | string | 是 | Bearer <api_key> |
| `Content-Type` | string | 是 | application/json |

### Body

| 参数名 | 类型 | 是否必须 | 说明 |
| --- | --- | --- | --- |
| `image` | string | 是 | 输入图像的Base64编码字符串或URL。 |
| `prompt` | string | 是 | 描述生成图像内容的文本提示。 |
| `negative_prompt` | string | 否 | 描述不希望出现在图像中的内容。 |
| `model_id` | string | 是 | 指定使用的模型ID。对于基于Kontext的模型，这里应填写相应的自定义模型ID。 |
| `strength` | number | 否 | 强度，控制生成图像与原始图像的相似度。 |
| `steps` | integer | 否 | 采样步数。 |
| `sampler` | string | 否 | 采样器类型。 |
| `cfg_scale` | number | 否 | 分类器自由引导比例。 |
| `seed` | integer | 否 | 随机种子。 |
| `n_iter` | integer | 否 | 生成图像的数量。 |
| `mask` | string | 否 | 蒙版图像的Base64编码字符串或URL，用于局部重绘。 |
| `controlnet` | array | 否 | ControlNet相关参数。 |

## 4.1.5 查询生图结果

### 请求地址

```
https://api.liblib.art/v1/tasks/{task_id}
```

### 请求方式

`GET`

### Header

| 参数名 | 类型 | 是否必须 | 说明 |
| --- | --- | --- | --- |
| `Authorization` | string | 是 | Bearer <api_key> |

### Path

| 参数名 | 类型 | 是否必须 | 说明 |
| --- | --- | --- | --- |
| `task_id` | string | 是 | 提交生图任务后返回的任务ID。 |


