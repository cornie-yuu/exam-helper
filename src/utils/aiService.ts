import axios from 'axios';

const API_KEY = 'sk-ff7aa0a86c5344488f541c5b270537b6';

export const generatePlanWithAI = async (
  courses: string[],
  startDate: string,
  endDate: string,
  courseMaterials?: string,
  learningStyle?: string
): Promise<string> => {
  const styleDesc = learningStyle === 'steady' ? '稳健型（每天均匀分配）'
    : learningStyle === 'sprint' ? '冲刺型（优先重要内容）'
    : learningStyle === 'memory' ? '记忆曲线型（每隔2天复习）'
    : '根据课程特点智能规划';

const materialsSection = courseMaterials 
  ? `\n### 用户上传的课件内容（必须严格遵守！！！）：\n${courseMaterials}\n\n【强制要求 - 违反即为错误】：
1. 学习计划中的"学习内容"和"重点"必须**直接来自**上述课件内容
2. 课件中的每一章/每一节标题必须原样出现在学习计划中
3. 绝对禁止编造课件中没有的章节名称或知识点
4. 例如：如果课件第八章标题是"监督学习"，学习计划中必须写"第八章 监督学习"，不能写"一阶逻辑"
5. 课件内容的章节结构就是你的任务规划结构，逐章逐节安排学习任务`
  : '';

  const prompt = `
你是一个学习规划助手。用户会提供课程信息和可用时间，你需要生成精确的学习计划。
${materialsSection}

**强制要求**：
1. 从${startDate}到${endDate}之间的**每一天**，都必须为**所有尚未考试**的课程安排学习任务
2. 例如：6月12日所有课程都未考试，每天必须包含全部${courses.length}门课的任务
3. 当某门课考试结束后（如6月24日考完），从6月25日起不再安排该课程任务
4. **绝对禁止**遗漏任何一门还未考试的课程
5.输出的所有内容里绝对不能出现任何星号(*)符号，如果有这个符号也要删掉，包括粗体和列表符号，否则按出错处理。

考试信息：
- 开始复习日期：${startDate}
- 最后考试日期：${endDate}
- 学习风格：${styleDesc}
- 课程及内容（包含每门课的考试日期）：
${courses.map((course, index) => `${index + 1}. ${course}`).join('\n')}

### 关键规则：
1. 每门课程的学习任务必须安排到该课程考试日期的前一天
2. 例如：如果某门课考试日期是6月29日，那么该课程的学习任务最晚要安排到6月28日
3. 不同课程考试日期不同时，要分别安排到各自的考试前一天
4. 已经过考试日期的课程不要再安排学习任务
5. 每天的学习任务要合理分配，确保每门课都能在考前完成复习

### 输出格式必须严格遵守：

#### 每日学习计划
日期：YYYY-MM-DD
1. **[课程名] - [学习内容]** - **重点：[知识点1]、[知识点2]、[知识点3]**
**当天建议**：[针对今天学习内容的具体建议，比如这个知识点的理解方法、记忆技巧、常见考点等，至少两句话]
2. **[课程名] - [学习内容]** - **重点：[知识点1]、[知识点2]**
**当天建议**：[针对今天学习内容的具体建议，至少两句话]

日期：YYYY-MM-DD
1. **[课程名] - [学习内容]** - **重点：[知识点1]、[知识点2]、[知识点3]**
**当天建议**：[针对今天学习内容的具体建议，至少两句话]
...

### 重要要求：
${courseMaterials ? '【最重要】课件内容是你生成计划的唯一依据！学习内容和重点必须从课件中提取，禁止使用自己的知识编造任何内容！' : ''}
课程名必须使用用户提供的准确课程名称。
每个任务必须包含重点：部分，列出该任务的2-4个核心知识点。
每个任务后面必须紧跟"当天建议"，给出针对今天学习内容的具体建议。
知识点要具体、明确，不能太笼统。
每天的建议都要完整详细，针对当天学习的内容给出具体可操作的建议。
只输出上述格式，不要添加额外说明或解释。`;

  const response = await axios.post(
    'https://api.deepseek.com/chat/completions',
    {
      model: 'deepseek-chat',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 10000,
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      timeout: 60000,
    }
  );

  return (response.data as any).choices[0].message.content;
};

export const getStudySuggestion = async (
  completedTasks: number,
  totalTasks: number,
  daysLeft: number
): Promise<string> => {
  const prompt = `
你是一个学习建议助手，请根据以下情况给出学习建议：
- 今日已完成任务：${completedTasks}个
- 今日总任务：${totalTasks}个
- 距离考试还有：${daysLeft}天

请给出一条简短、鼓励性的学习建议。
`;

  const response = await axios.post(
    'https://api.deepseek.com/chat/completions',
    {
      model: 'deepseek-chat',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.8,
      max_tokens: 100,
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      timeout: 30000,
    }
  );

  return (response.data as any).choices[0].message.content;
};
