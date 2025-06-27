import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  generateAutismFriendlyPrompt, 
  extractSceneInfo, 
  generateCharacterDescription,
  getAvailableEmotions,
  getAvailableActions,
  getAvailableEnvironments
} from '@/lib/autismFriendlyPrompts';

export default function KeywordTestPage() {
  const [character, setCharacter] = useState({
    name: '小明',
    age: 6,
    identity: 'human',
    gender: 'boy'
  });
  
  const [sceneDescription, setSceneDescription] = useState('小明在公园里开心地玩耍');
  const [emotion, setEmotion] = useState('happy');
  const [action, setAction] = useState('playing');
  const [environment, setEnvironment] = useState('park');
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [extractedInfo, setExtractedInfo] = useState(null);

  const handleGeneratePrompt = () => {
    const prompt = generateAutismFriendlyPrompt({
      character,
      sceneDescription,
      emotion,
      action,
      environment
    });
    setGeneratedPrompt(prompt);
  };

  const handleExtractInfo = () => {
    const info = extractSceneInfo(sceneDescription);
    setExtractedInfo(info);
    setEmotion(info.emotion);
    setAction(info.action);
    setEnvironment(info.environment);
  };

  const characterDescription = generateCharacterDescription(character);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            自闭症友好关键词生成器测试
          </h1>
          <p className="text-gray-600">
            测试基于自闭症儿童视觉偏好设计的DALL-E 3关键词生成模块
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 左侧：参数设置 */}
          <div className="space-y-6">
            {/* 角色设置 */}
            <Card>
              <CardHeader>
                <CardTitle>角色设置</CardTitle>
                <CardDescription>配置绘本主角的基本信息</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">角色名字</Label>
                    <Input
                      id="name"
                      value={character.name}
                      onChange={(e) => setCharacter({...character, name: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="age">年龄</Label>
                    <Select value={character.age.toString()} onValueChange={(value) => setCharacter({...character, age: parseInt(value)})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5岁</SelectItem>
                        <SelectItem value="6">6岁</SelectItem>
                        <SelectItem value="7">7岁</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="identity">身份</Label>
                    <Select value={character.identity} onValueChange={(value) => setCharacter({...character, identity: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="human">人类</SelectItem>
                        <SelectItem value="animal">动物</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="gender">性别</Label>
                    <Select value={character.gender} onValueChange={(value) => setCharacter({...character, gender: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="boy">男孩</SelectItem>
                        <SelectItem value="girl">女孩</SelectItem>
                        <SelectItem value="any">不限</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>标准化角色描述：</strong><br />
                    {characterDescription}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* 场景设置 */}
            <Card>
              <CardHeader>
                <CardTitle>场景设置</CardTitle>
                <CardDescription>配置场景描述和相关参数</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="scene">中文场景描述</Label>
                  <Textarea
                    id="scene"
                    value={sceneDescription}
                    onChange={(e) => setSceneDescription(e.target.value)}
                    placeholder="例如：小明在公园里开心地玩耍"
                    rows={3}
                  />
                  <Button 
                    onClick={handleExtractInfo} 
                    variant="outline" 
                    size="sm" 
                    className="mt-2"
                  >
                    自动提取信息
                  </Button>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="emotion">情绪</Label>
                    <Select value={emotion} onValueChange={setEmotion}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {getAvailableEmotions().map(em => (
                          <SelectItem key={em} value={em}>{em}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="action">动作</Label>
                    <Select value={action} onValueChange={setAction}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {getAvailableActions().map(act => (
                          <SelectItem key={act} value={act}>{act}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="environment">环境</Label>
                    <Select value={environment} onValueChange={setEnvironment}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {getAvailableEnvironments().map(env => (
                          <SelectItem key={env} value={env}>{env}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {extractedInfo && (
                  <div className="p-3 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-800">
                      <strong>自动提取结果：</strong><br />
                      情绪: {extractedInfo.emotion} | 动作: {extractedInfo.action} | 环境: {extractedInfo.environment}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Button onClick={handleGeneratePrompt} className="w-full" size="lg">
              生成DALL-E 3关键词
            </Button>
          </div>

          {/* 右侧：生成结果 */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>生成的DALL-E 3关键词</CardTitle>
                <CardDescription>
                  基于自闭症儿童视觉偏好优化的专业关键词
                </CardDescription>
              </CardHeader>
              <CardContent>
                {generatedPrompt ? (
                  <div className="space-y-4">
                    <Textarea
                      value={generatedPrompt}
                      readOnly
                      rows={15}
                      className="font-mono text-sm"
                    />
                    <div className="flex space-x-2">
                      <Button
                        onClick={() => navigator.clipboard.writeText(generatedPrompt)}
                        variant="outline"
                        size="sm"
                      >
                        复制关键词
                      </Button>
                      <Button
                        onClick={() => {
                          const blob = new Blob([generatedPrompt], { type: 'text/plain' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = 'dalle3-prompt.txt';
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                        variant="outline"
                        size="sm"
                      >
                        下载文件
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <p>点击"生成DALL-E 3关键词"按钮来生成专业关键词</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* 底部：关键词模板说明 */}
        <Card>
          <CardHeader>
            <CardTitle>关键词模板特点</CardTitle>
            <CardDescription>基于自闭症儿童视觉偏好设计的关键词策略</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">低感官刺激</h4>
                <p className="text-sm text-blue-700">柔和色彩、避免混乱与强烈对比</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <h4 className="font-semibold text-green-900 mb-2">高可预测性</h4>
                <p className="text-sm text-green-700">结构清晰、重复风格、固定角色</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <h4 className="font-semibold text-purple-900 mb-2">高可辨识度</h4>
                <p className="text-sm text-purple-700">面部表情、姿态与动作清晰</p>
              </div>
              <div className="p-4 bg-orange-50 rounded-lg">
                <h4 className="font-semibold text-orange-900 mb-2">单一焦点</h4>
                <p className="text-sm text-orange-700">画面简洁，角色突出，背景干净</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
