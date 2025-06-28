import { useState } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group.jsx'
import { Textarea } from '@/components/ui/textarea.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { ArrowLeft, ArrowRight, User, Sparkles, Settings, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { CHARACTER_STRATEGY } from '@/lib/characterConsistency.js'
import { optimizeCharacterDescription } from '@/lib/openai.js'

export default function CharacterSetupPage() {
  const navigate = useNavigate()
  const [characterData, setCharacterData] = useState({
    name: '',
    age: 6,
    identity: 'human',
    gender: 'any',
    customDescription: '',
    optimizedDescription: '',
    strategy: CHARACTER_STRATEGY.HYBRID
  })

  const [showAdvanced, setShowAdvanced] = useState(false)
  const [isOptimizing, setIsOptimizing] = useState(false)

  const handleNext = () => {
    // 如果姓名为空，生成随机姓名
    if (!characterData.name.trim()) {
      const randomNames = ['小明', '小红', '小华', '小丽', '小强', '小美', '小杰', '小雨']
      const randomName = randomNames[Math.floor(Math.random() * randomNames.length)]
      setCharacterData(prev => ({ ...prev, name: randomName }))
    }
    
    // 如果有优化后的描述，使用优化后的描述作为customDescription
    const finalData = {
      ...characterData,
      customDescription: characterData.optimizedDescription || characterData.customDescription,
      strategy: characterData.customDescription || characterData.optimizedDescription 
        ? CHARACTER_STRATEGY.HYBRID 
        : CHARACTER_STRATEGY.PREDEFINED
    }
    
    // 保存数据到localStorage
    localStorage.setItem('characterData', JSON.stringify(finalData))
    navigate('/story-setup')
  }

  const handleOptimizeDescription = async () => {
    if (!characterData.customDescription.trim()) {
      return
    }

    setIsOptimizing(true)
    try {
      const basicInfo = {
        age: characterData.age,
        gender: characterData.gender,
        identity: characterData.identity
      }
      
      const optimizedResult = await optimizeCharacterDescription(
        characterData.customDescription, 
        basicInfo
      )
      
      setCharacterData(prev => ({
        ...prev,
        optimizedDescription: optimizedResult
      }))
    } catch (error) {
      console.error('优化角色描述失败:', error)
      // 可以添加错误提示
    } finally {
      setIsOptimizing(false)
    }
  }

  const handleBack = () => {
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-white">
      {/* 顶部导航栏 */}
      <div className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center">
            <User className="w-6 h-6 text-blue-500 mr-3" />
            <h1 className="text-xl font-medium text-gray-800">角色设定</h1>
          </div>
          <div className="text-sm text-gray-500">步骤 1/3</div>
        </div>
        
        {/* 进度条 */}
        <div className="max-w-2xl mx-auto mt-4">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-blue-500 h-2 rounded-full w-1/3 transition-all duration-300"></div>
          </div>
        </div>
      </div>

      {/* 主要内容 */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-12 pb-24 sm:pb-32">
        <div className="space-y-6 sm:space-y-8">
          {/* 角色姓名 */}
          <div className="space-y-3">
            <Label htmlFor="name" className="text-base font-medium text-gray-700">
              角色姓名
            </Label>
            <Input
              id="name"
              type="text"
              placeholder="请输入角色姓名（可选，留空将随机生成）"
              value={characterData.name}
              onChange={(e) => setCharacterData(prev => ({ ...prev, name: e.target.value }))}
              className="text-base py-3 rounded-xl border-gray-200 focus:border-blue-500"
            />
          </div>

          {/* 角色年龄 */}
          <div className="space-y-3">
            <Label htmlFor="age" className="text-base font-medium text-gray-700">
              角色年龄
            </Label>
            <Input
              id="age"
              type="number"
              min="3"
              max="12"
              value={characterData.age}
              onChange={(e) => setCharacterData(prev => ({ ...prev, age: parseInt(e.target.value) }))}
              className="text-base py-3 rounded-xl border-gray-200 focus:border-blue-500"
            />
            <p className="text-sm text-gray-500">适合年龄：3-12岁</p>
          </div>

          {/* 角色身份 */}
          <div className="space-y-4">
            <Label className="text-base font-medium text-gray-700">角色身份</Label>
            <RadioGroup
              value={characterData.identity}
              onValueChange={(value) => setCharacterData(prev => ({ ...prev, identity: value }))}
              className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-8"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="human" id="human" />
                <Label htmlFor="human" className="text-base cursor-pointer">人类</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="animal" id="animal" />
                <Label htmlFor="animal" className="text-base cursor-pointer">动物</Label>
              </div>
            </RadioGroup>
          </div>

          {/* 角色性别 */}
          <div className="space-y-4">
            <Label className="text-base font-medium text-gray-700">角色性别</Label>
            <RadioGroup
              value={characterData.gender}
              onValueChange={(value) => setCharacterData(prev => ({ ...prev, gender: value }))}
              className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-8"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="boy" id="boy" />
                <Label htmlFor="boy" className="text-base cursor-pointer">男孩</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="girl" id="girl" />
                <Label htmlFor="girl" className="text-base cursor-pointer">女孩</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="any" id="any" />
                <Label htmlFor="any" className="text-base cursor-pointer">不限</Label>
              </div>
            </RadioGroup>
          </div>

          {/* 高级设置切换 */}
          <div className="border-t border-gray-100 pt-8">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full justify-between p-4 rounded-xl border border-gray-200 hover:bg-gray-50"
            >
              <div className="flex items-center">
                <Settings className="w-5 h-5 mr-3 text-gray-500" />
                <span className="text-base font-medium text-gray-700">自定义角色形象</span>
              </div>
              <span className="text-sm text-gray-500">
                {showAdvanced ? '收起' : '展开'}
              </span>
            </Button>
          </div>

          {/* 高级设置内容 */}
          {showAdvanced && (
            <Card className="border-gray-200">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-lg">
                  <Sparkles className="w-5 h-5 mr-2 text-blue-500" />
                  智能角色形象设计
                </CardTitle>
                <CardDescription>
                  描述您想要的角色特征，AI将帮您完善关键细节。支持中文、英文、繁体输入，会用相同语言回复（约50字/词）
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* 用户输入描述 */}
                <div className="space-y-3">
                  <Label htmlFor="customDescription" className="text-base font-medium text-gray-700">
                    角色特征描述
                  </Label>
                                      <Textarea
                      id="customDescription"
                      placeholder="中文：一个穿着蓝色毛衣的小男孩，有着卷曲的棕色头发｜English: A boy with blue sweater and curly hair｜繁體：穿著藍色毛衣的男孩"
                      value={characterData.customDescription}
                      onChange={(e) => setCharacterData(prev => ({ ...prev, customDescription: e.target.value }))}
                      className="min-h-[100px] text-base rounded-xl border-gray-200 focus:border-blue-500"
                    />
                  <p className="text-sm text-gray-500">
                    💡 支持中文、英文、繁体中文输入，AI会用相同语言回复。您可以描述任何特征，即使不完整也没关系！
                  </p>
                </div>

                {/* 优化按钮 */}
                <div className="flex justify-center">
                  <Button
                    onClick={handleOptimizeDescription}
                    disabled={!characterData.customDescription.trim() || isOptimizing}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg"
                  >
                    {isOptimizing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        AI完善中...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        智能完善形象
                      </>
                    )}
                  </Button>
                </div>

                {/* 优化结果显示 */}
                {characterData.optimizedDescription && (
                  <div className="space-y-3">
                    <Label className="text-base font-medium text-gray-700">
                      完善后的角色形象
                    </Label>
                    <Textarea
                      value={characterData.optimizedDescription}
                      onChange={(e) => setCharacterData(prev => ({ ...prev, optimizedDescription: e.target.value }))}
                      className="min-h-[120px] text-base rounded-xl border-green-200 focus:border-green-500 bg-green-50"
                      placeholder="AI完善后的角色形象描述将显示在这里，保持您使用的语言，您可以继续编辑..."
                    />
                    <p className="text-sm text-gray-500">
                      ✨ AI已帮您完善角色形象描述，保持您使用的语言。系统会在生成图像时自动优化为最佳格式
                    </p>
                    
                    {/* 操作按钮 */}
                    <div className="flex justify-center space-x-3 pt-2">
                      <Button
                        variant="outline"
                        onClick={() => setCharacterData(prev => ({ ...prev, optimizedDescription: '' }))}
                        className="text-sm px-4 py-2"
                      >
                        清除重新开始
                      </Button>
                      <Button
                        onClick={handleOptimizeDescription}
                        disabled={!characterData.customDescription.trim() || isOptimizing}
                        variant="outline"
                        className="text-sm px-4 py-2"
                      >
                        {isOptimizing ? (
                          <>
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            重新完善中...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3 h-3 mr-1" />
                            重新完善
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* 底部按钮 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 sm:px-6 py-3 sm:py-4 safe-area-bottom">
        <div className="max-w-2xl mx-auto flex flex-col sm:flex-row gap-3 sm:justify-between">
          <Button
            onClick={handleBack}
            variant="outline"
            className="w-full sm:w-auto px-4 sm:px-6 py-3 rounded-xl border-gray-200 hover:bg-gray-50 order-2 sm:order-1"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回首页
          </Button>
          <Button
            onClick={handleNext}
            className="w-full sm:w-auto bg-blue-500 hover:bg-blue-600 text-white px-6 sm:px-8 py-3 rounded-xl order-1 sm:order-2"
          >
            下一步
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  )
}

