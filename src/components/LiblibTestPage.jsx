import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  generateTextToImageComplete, 
  generateImageToImageComplete,
  checkLiblibConfig 
} from '@/lib/liblibai';

export default function LiblibTestPage() {
  const [prompt, setPrompt] = useState('A cute cartoon bear wearing a red t-shirt, simple 2D style, children\'s book illustration');
  const [referenceImageUrl, setReferenceImageUrl] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [generatedImage, setGeneratedImage] = useState(null);
  const [error, setError] = useState('');
  const [generationType, setGenerationType] = useState('text2img'); // 'text2img' or 'img2img'
  const [configValid, setConfigValid] = useState(false);

  // 检查配置
  React.useEffect(() => {
    checkLiblibConfig().then(setConfigValid);
  }, []);

  const handleTextToImage = async () => {
    if (!configValid) {
      setError('LiblibAI API配置不完整，请检查环境变量');
      return;
    }

    setIsGenerating(true);
    setError('');
    setGeneratedImage(null);
    setProgress(0);

    try {
      const result = await generateTextToImageComplete(
        prompt,
        (message, progressValue) => {
          setProgressMessage(message);
          setProgress(progressValue);
        }
      );

      if (result.status === 'success' && result.imageUrl) {
        setGeneratedImage({
          url: result.imageUrl,
          type: 'text2img',
          prompt: prompt
        });
      } else {
        throw new Error('图像生成失败，未获取到图像URL');
      }

    } catch (error) {
      console.error('文生图失败:', error);
      setError(error.message);
    } finally {
      setIsGenerating(false);
      setProgress(0);
      setProgressMessage('');
    }
  };

  const handleImageToImage = async () => {
    if (!configValid) {
      setError('LiblibAI API配置不完整，请检查环境变量');
      return;
    }

    if (!referenceImageUrl.trim()) {
      setError('请输入参考图像URL');
      return;
    }

    setIsGenerating(true);
    setError('');
    setGeneratedImage(null);
    setProgress(0);

    try {
      const result = await generateImageToImageComplete(
        prompt,
        referenceImageUrl,
        (message, progressValue) => {
          setProgressMessage(message);
          setProgress(progressValue);
        }
      );

      if (result.status === 'success' && result.imageUrl) {
        setGeneratedImage({
          url: result.imageUrl,
          type: 'img2img',
          prompt: prompt,
          referenceUrl: referenceImageUrl
        });
      } else {
        throw new Error('图生图失败，未获取到图像URL');
      }

    } catch (error) {
      console.error('图生图失败:', error);
      setError(error.message);
    } finally {
      setIsGenerating(false);
      setProgress(0);
      setProgressMessage('');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            LiblibAI 图像生成测试
          </h1>
          <p className="text-gray-600">
            测试LiblibAI的文生图和图生图功能
          </p>
        </div>

        {/* API配置状态 */}
        <Alert className={configValid ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
          <AlertDescription className={configValid ? "text-green-800" : "text-red-800"}>
            {configValid 
              ? "✅ LiblibAI API配置正常" 
              : "❌ LiblibAI API配置不完整，请检查 .env 文件中的 VITE_LIBLIB_ACCESS_KEY 和 VITE_LIBLIB_SECRET_KEY"
            }
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 左侧：参数设置 */}
          <div className="space-y-6">
            {/* 提示词设置 */}
            <Card>
              <CardHeader>
                <CardTitle>图像生成参数</CardTitle>
                <CardDescription>配置图像生成的提示词和参数</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="prompt">提示词 (英文，最多2000字符)</Label>
                  <Textarea
                    id="prompt"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="输入英文提示词，例如：A cute cartoon bear..."
                    rows={4}
                    maxLength={2000}
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    字符数: {prompt.length}/2000
                  </p>
                </div>

                {/* 图生图参考图像 */}
                <div>
                  <Label htmlFor="referenceUrl">参考图像URL (仅图生图需要)</Label>
                  <Input
                    id="referenceUrl"
                    value={referenceImageUrl}
                    onChange={(e) => setReferenceImageUrl(e.target.value)}
                    placeholder="输入参考图像的URL"
                  />
                </div>
              </CardContent>
            </Card>

            {/* 生成按钮 */}
            <div className="space-y-4">
              <Button 
                onClick={handleTextToImage} 
                disabled={isGenerating || !configValid}
                className="w-full"
                size="lg"
              >
                {isGenerating && generationType === 'text2img' ? '生成中...' : '文生图 (Text to Image)'}
              </Button>

              <Button 
                onClick={handleImageToImage} 
                disabled={isGenerating || !configValid || !referenceImageUrl.trim()}
                className="w-full"
                size="lg"
                variant="outline"
              >
                {isGenerating && generationType === 'img2img' ? '生成中...' : '图生图 (Image to Image)'}
              </Button>
            </div>

            {/* 进度显示 */}
            {isGenerating && (
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>生成进度</span>
                      <span>{progress}%</span>
                    </div>
                    <Progress value={progress} className="w-full" />
                    <p className="text-sm text-gray-600">{progressMessage}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 错误显示 */}
            {error && (
              <Alert className="border-red-200 bg-red-50">
                <AlertDescription className="text-red-800">
                  ❌ {error}
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* 右侧：生成结果 */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>生成结果</CardTitle>
                <CardDescription>
                  LiblibAI生成的图像结果
                </CardDescription>
              </CardHeader>
              <CardContent>
                {generatedImage ? (
                  <div className="space-y-4">
                    <div className="relative">
                      <img
                        src={generatedImage.url}
                        alt="Generated by LiblibAI"
                        className="w-full rounded-lg shadow-lg"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          setError('图像加载失败，URL可能已过期');
                        }}
                      />
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div>
                        <strong>生成类型:</strong> {generatedImage.type === 'text2img' ? '文生图' : '图生图'}
                      </div>
                      <div>
                        <strong>提示词:</strong> {generatedImage.prompt}
                      </div>
                      {generatedImage.referenceUrl && (
                        <div>
                          <strong>参考图像:</strong> 
                          <a 
                            href={generatedImage.referenceUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline ml-1"
                          >
                            查看参考图
                          </a>
                        </div>
                      )}
                      <div>
                        <strong>图像URL:</strong> 
                        <a 
                          href={generatedImage.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline ml-1 break-all"
                        >
                          {generatedImage.url}
                        </a>
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      <Button
                        onClick={() => navigator.clipboard.writeText(generatedImage.url)}
                        variant="outline"
                        size="sm"
                      >
                        复制URL
                      </Button>
                      <Button
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = generatedImage.url;
                          link.download = `liblib-generated-${Date.now()}.png`;
                          link.click();
                        }}
                        variant="outline"
                        size="sm"
                      >
                        下载图像
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <p>点击上方按钮开始生成图像</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* 底部：使用说明 */}
        <Card>
          <CardHeader>
            <CardTitle>使用说明</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-semibold mb-2">文生图 (Text to Image)</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• 根据文字描述生成图像</li>
                  <li>• 提示词必须为英文</li>
                  <li>• 最多2000个字符</li>
                  <li>• 适合生成角色参考图</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">图生图 (Image to Image)</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• 基于参考图像生成新图像</li>
                  <li>• 需要提供参考图像URL</li>
                  <li>• 保持角色一致性</li>
                  <li>• 适合绘本插图生成</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
