# LiblibAI x 星流图像大模型API使用指南

## 目录

1. [基本信息](#1-基本信息)
2. [认证与安全](#2-认证与安全)
   - [2.1 获取API密钥](#21-获取api密钥)
   - [2.2 签名生成](#22-签名生成)
3. [API调用流程](#3-api调用流程)
   - [3.1 请求头设置](#31-请求头设置)
   - [3.2 文生图API调用](#32-文生图api调用)
   - [3.3 查询生成结果](#33-查询生成结果)
   - [3.4 并发和限制](#34-并发和限制)
4. [代码示例](#4-代码示例)
   - [Python实现示例](#python实现示例)
   - [完整API调用示例（文生图）](#完整api调用示例文生图)
5. [最佳实践](#5-最佳实践)

## 1. 基本信息

- **API基础URL**: `https://openapi.liblibai.cloud`  
- **文生图接口**: `POST /api/generate/webui/text2img/ultra`
- **图生图接口**: `POST /api/generate/webui/img2img/ultra`
- **查询结果接口**: `GET /api/generate/query`

## 2. 认证与安全

### 2.1 获取API密钥

首先，您需要在LiblibAI平台注册并获取以下两个关键凭证：

- **AccessKey**: API访问凭证，用于识别访问用户，长度通常在20-30位左右  
  例如: `KlQMFXjHaobx7wqo9XvYKA`

- **SecretKey**: API访问密钥，用于加密请求参数，长度通常在30位以上  
  例如: `KppKsn7ezZxhi6llDjbo7YyVYzanSu2d`

### 2.2 签名生成

每次API请求都需要生成签名，步骤如下：

1. 准备请求参数：URL地址、时间戳、随机字符串
2. 构建原文：`URL地址 + "&" + 毫秒时间戳 + "&" + 随机字符串`
3. 使用SecretKey和HMAC-SHA1算法对原文进行加密
4. 将加密结果进行Base64编码（注意去除填充等号）

签名生成公式：
```
原文 = URL地址 + "&" + 毫秒时间戳 + "&" + 随机字符串
密文 = hmacSha1(原文, SecretKey)
签名 = base64UrlEncode(密文).rstrip('=')

Jav签名生成公式示例：

import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import org.apache.commons.codec.binary.Base64;
import org.apache.commons.lang3.RandomStringUtils;

public class SignUtil {

    /**
     * 生成请求签名
     * 其中相关变量均为示例，请替换为您的实际数据
     */
    public static String makeSign() {

        // API访问密钥
        String secretKey = "KppKsn7ezZxhi6lIDjbo7YyVYzanSu2d";
        
        // 请求API接口的uri地址
        String uri = "/api/generate/webui/text2img";
        // 当前毫秒时间戳
        Long timestamp = System.currentTimeMillis();
        // 随机字符串
        String signatureNonce = RandomStringUtils.randomAlphanumeric(10);
        // 拼接请求数据
        String content = uri + "&" + timestamp + "&" + signatureNonce;
    
        try {
            // 生成签名
            SecretKeySpec secret = new SecretKeySpec(secretKey.getBytes(), "HmacSHA1");
            Mac mac = Mac.getInstance("HmacSHA1");
            mac.init(secret);
            return Base64.encodeBase64URLSafeString(mac.doFinal(content.getBytes()));
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("no such algorithm");
        } catch (InvalidKeyException e) {
            throw new RuntimeException(e);
        }
    }
}

NodeJs 生成签名示例，以访问上方“使用密钥”的请求地址为例：

const hmacsha1 = require("hmacsha1");
const randomString = require("string-random");
// 生成签名
const urlSignature = (url) => {
  if (!url) return;
  const timestamp = Date.now(); // 当前时间戳
  const signatureNonce = randomString(16); // 随机字符串，你可以任意设置，这个没有要求
  // 原文 = URl地址 + "&" + 毫秒时间戳 + "&" + 随机字符串
  const str = `${url}&${timestamp}&${signatureNonce}`;
  const secretKey = "官网上的 SecretKey "; // 下单后在官网中，找到自己的 SecretKey'
  const hash = hmacsha1(secretKey, str);
  // 最后一步： encodeBase64URLSafeString(密文)
  // 这一步很重要，生成安全字符串。java、Python 以外的语言，可以参考这个 JS 的处理
  let signature = hash
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return {
    signature,
    timestamp,
    signatureNonce,
  };
};
// 例子：原本查询生图进度接口是 https://openapi.liblibai.cloud/api/generate/webui/status
// 加密后，url 就变更为 https://openapi.liblibai.cloud/api/generate/webui/status?AccessKey={YOUR_ACCESS_KEY}&Signature={签名}&Timestamp={时间戳}&SignatureNonce={随机字符串}
const getUrl = () => {
  const url = "/api/generate/webui/status";
  const { signature, timestamp, signatureNonce } = urlSignature(url);
  const accessKey = "替换自己的 AccessKey"; // '下单后在官网中，找到自己的 AccessKey'
  return `${url}?AccessKey=${accessKey}&Signature=${signature}&Timestamp=${timestamp}&SignatureNonce=${signatureNonce}`;
};
```

## 3. API调用流程

### 3.1 请求头设置

每个API请求需要包含以下请求头：

| 请求头 | 说明 |
|--------|------|
| Content-Type | application/json |
| AccessKey | 您的AccessKey |
| Signature | 生成的签名 |
| Timestamp | 毫秒时间戳 |
| SignatureNonce | 随机字符串 |

### 3.2 文生图API调用

**接口**: `POST /api/generate/webui/text2img/ultra`

**请求体**:
```json
{
  "templateUuid": "5d7e67009b344550bc1aa6ccbfa1d7f4",  // 星流Star-3 Alpha文生图模板ID
  "generateParams": {
    "prompt": "您的提示词（不超过2000字符，纯英文）"
    // 其他可选参数
  }
}
```

**返回值**:
```json
{
  "generateUuid": "生成任务的UUID"
}
```

### 3.3 查询生成结果

**接口**: `GET /api/generate/query?generateUuid=您的生成任务UUID`

**返回值**: 包含生成状态和图片URL的JSON对象

示例请求：
```
https://openapi.liblibai.cloud/api/generate/query?generateUuid=abcdef123456
```

### 3.4 并发和限制

- **生图任务并发数**：默认5（因生图需要时间，指同时可进行的生图任务数）
- **发起生图任务接口QPS**：默认1秒1次（可用于每天预计生图张数/24h/60m/60s来估算平均值）
- **查询生图结果接口QPS**：无限制

## 4. 代码示例

### Python实现示例

以下是签名生成的Python实现：

```python
import hmac
from hashlib import sha1
import base64
import time
import uuid

def make_sign():
    # API访问密钥
    secret_key = 'KppKsn7ezZxhi6llDjbo7YyVYzanSu2d'
    
    # 请求API接口的uri地址
    uri = "/api/genImg"
    
    # 当前毫秒时间戳
    timestamp = str(int(time.time() * 1000))
    
    # 随机字符串
    signature_nonce = str(uuid.uuid4())
    
    # 拼接请求数据
    content = '&'.join([uri, timestamp, signature_nonce])
    
    # 生成签名
    digest = hmac.new(secret_key.encode(), content.encode(), sha1).digest()
    # 移除了末尾的base64位数而成的等号
    sign = base64.urlsafe_b64encode(digest).rstrip(b'=').decode()
    
    return sign, timestamp, signature_nonce
```

### 完整API调用示例（文生图）

以下是一个完整的文生图API调用示例：

```python
import requests
import json
import hmac
from hashlib import sha1
import base64
import time
import uuid

# API密钥
access_key = "您的AccessKey"
secret_key = "您的SecretKey"

# API基础URL
base_url = "https://openapi.liblibai.cloud"

# 生成签名
def generate_signature(uri):
    timestamp = str(int(time.time() * 1000))
    signature_nonce = str(uuid.uuid4())
    
    content = '&'.join([uri, timestamp, signature_nonce])
    
    digest = hmac.new(secret_key.encode(), content.encode(), sha1).digest()
    signature = base64.urlsafe_b64encode(digest).rstrip(b'=').decode()
    
    return signature, timestamp, signature_nonce

# 文生图API调用
def text_to_image(prompt):
    uri = "/api/generate/webui/text2img/ultra"
    url = base_url + uri
    
    signature, timestamp, signature_nonce = generate_signature(uri)
    
    headers = {
        "Content-Type": "application/json",
        "AccessKey": access_key,
        "Signature": signature,
        "Timestamp": timestamp,
        "SignatureNonce": signature_nonce
    }
    
    data = {
        "templateUuid": "5d7e67009b344550bc1aa6ccbfa1d7f4",
        "generateParams": {
            "prompt": prompt
        }
    }
    
    response = requests.post(url, headers=headers, data=json.dumps(data))
    return response.json()

# 查询生成结果
def query_result(generate_uuid):
    uri = "/api/generate/query"
    url = f"{base_url}{uri}?generateUuid={generate_uuid}"
    
    signature, timestamp, signature_nonce = generate_signature(uri)
    
    headers = {
        "AccessKey": access_key,
        "Signature": signature,
        "Timestamp": timestamp,
        "SignatureNonce": signature_nonce
    }
    
    response = requests.get(url, headers=headers)
    return response.json()

# 使用示例
if __name__ == "__main__":
    # 发起文生图请求
    result = text_to_image("a beautiful landscape with mountains and lake")
    generate_uuid = result.get("generateUuid")
    
    print(f"生成任务ID: {generate_uuid}")
    
    # 等待生成完成
    import time
    time.sleep(10)
    
    # 查询结果
    while True:
        query_result_data = query_result(generate_uuid)
        status = query_result_data.get("status")
        
        if status == "success":
            print("图片生成成功!")
            print(f"图片URL: {query_result_data.get('imageUrl')}")
            break
        elif status == "failed":
            print("图片生成失败!")
            break
        else:
            print("图片生成中，请稍候...")
            time.sleep(5)
```

## 5. 最佳实践

### 安全性考虑

- 妥善保管SecretKey，不要在客户端代码中暴露
- 考虑使用服务器端代理API调用，避免在前端暴露密钥
- 定期更换密钥，提高安全性

### 性能优化

- 遵循API的QPS限制，避免频繁调用
- 实现请求重试机制，处理可能的网络错误
- 考虑使用异步调用方式，提高并发处理能力

### 错误处理

- 实现完善的错误处理逻辑，捕获并处理API可能返回的各种错误
- 记录API调用日志，便于问题排查
- 设置合理的超时时间，避免请求长时间挂起

### 用户体验

- 在等待图像生成过程中，提供适当的加载提示
- 考虑实现图像缓存机制，避免重复生成相同内容
- 提供图像预览和调整功能，优化用户体验

---

*本文档基于LiblibAI官方API文档整理，如有更新请以官方文档为准。*
