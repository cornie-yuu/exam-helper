import axios from 'axios';
import type { Course, CourseContent, ExamPlan, DailyTask, Chunk } from '../types';
import { loadPapers } from './paperService';
import { getProviderMode, type ActiveProvider } from './providerService';

const API_KEY = 'sk-ff7aa0a86c5344488f541c5b270537b6';

export interface PlanOptions {
  examType?: string;
  dailyHours?: number;
  weakPoints?: string;
}


// ───────────────────────────────────────────────────────────
// 稳健生成计划（方案 E）：先"逐章摘要"，再一次性成计划。
// 解决"课件全文过长 → 被截断 → 计划覆盖不全"的问题：
// 每个章节单独摘要（该章课件全文只影响本摘要），再把 N 份精炼摘要交给 AI 一次性排计划，
// 最终 prompt 很小、永不超限；合并交给 AI 一次完成，避免手工拼接出 bug。
// 若某章摘要失败，兜底用"标题 + 重要度/熟悉度 + 重要知识点"顶替，保证计划仍覆盖该章。

const summarizeChapter = async (courseName: string, ct: CourseContent): Promise<string> => {
  const fullText = (ct.materials || [])
    .filter((m) => m.content && !m.error)
    .map((m) => `《${m.name}》\n${m.content}`)
    .join('\n\n');
  const MAX_CH = 20000;
  const safeText =
    fullText.length > MAX_CH ? fullText.slice(0, MAX_CH) + '\n...【本章内容过长，仅截取前半】' : fullText;
  const keyPoints = (ct.keyPoints || []).map((k) => k.trim()).filter(Boolean).join('、');

  const prompt =
    `你是期末复习规划助手。请阅读下面【${courseName} - ${ct.name}】这一章的课件内容，产出一份精炼的"章节摘要"，供后续制定整门课的复习计划使用。\n\n` +
    `章节名称：${ct.name}\n` +
    `重要度（0-100，越高越重要）：${ct.importance}\n` +
    `熟悉度（0-100，越低越薄弱）：${ct.familiarity}\n` +
    `${keyPoints ? `用户标注的【重要知识点/教师划重点】：${keyPoints}\n` : '本章未标注重要知识点。\n'}` +
    `\n课件原文：\n${safeText || '（本章未上传课件，仅按章节名与重要知识点安排）'}\n\n` +
    `请输出精炼摘要（300 字以内），包含：\n` +
    `1. 本章的小节/子主题标题（尽量从课件中原样提取）\n` +
    `2. 每个小节的核心考点（2-4 个）\n` +
    `3. 若用户标注了重要知识点，单独列出"必考重点"，并注明需优先、加量安排\n` +
    `不要输出多余内容，直接给摘要。`;

  const { content } = await routeTextAI(prompt, [], { temperature: 0.4, maxTokens: 1000 });
  return content;
};

// 计划生成结果：整体建议 + 分章节建议（key 为 `课程名::章节名`）。
// 注意：这里**绝不生成任何日期**——日期由 planGenerator.buildScheduleSkeleton 确定性排程，
// 从根本上消除 AI 日期幻觉（如把 8/25 写成 8/22）。
export interface GeneratedPlan {
  overallSuggestion: string;
  suggestions: Record<string, string>;
}

export const generatePlanRobust = async (
  courses: Course[],
  _startDate: string,
  _endDate: string,
  options?: PlanOptions,
  onProgress?: (msg: string) => void
): Promise<GeneratedPlan> => {
  // 第 1 步：逐章摘要（串行，稳定且可展示进度；失败单章兜底）
  const summaries: { course: string; content: string; summary: string; keyPoints: string }[] = [];
  const total = courses.reduce((acc, c) => acc + c.contents.length, 0);
  let done = 0;
  for (const c of courses) {
    for (const ct of c.contents) {
      done += 1;
      onProgress?.(`正在整理章节 ${done}/${total}：${ct.name || '未命名章节'}…`);
      try {
        const summary = await summarizeChapter(c.name, ct);
        summaries.push({
          course: c.name,
          content: ct.name,
          summary,
          keyPoints: (ct.keyPoints || []).join('、'),
        });
      } catch (err) {
        console.warn('[generatePlanRobust] 章节摘要失败，使用兜底：', ct.name, (err as Error).message);
        summaries.push({
          course: c.name,
          content: ct.name,
          summary: `（摘要生成失败）重要度 ${ct.importance}，熟悉度 ${ct.familiarity}，按章节名安排复习。`,
          keyPoints: (ct.keyPoints || []).join('、'),
        });
      }
    }
  }

  onProgress?.('章节整理完成，正在生成学习建议…');

  // 第 2 步：只生成"学习建议"，绝不包含任何日期（日期由程序自动排程）
  const outline = courses
    .map(
      (c, i) =>
        `${i + 1}. ${c.name}（考试：${c.examDate}）｜用户备注/老师划的重点：${c.note || '（未填写）'}｜章节：${
          (c.contents || [])
            .map((x) => `${x.name}(重要度${x.importance}/熟悉度${x.familiarity})`)
            .join('、') || '（按课程整体复习）'
        }`
    )
    .join('\n');

  const chapterSection = summaries
    .map((s) => {
      let block = `【${s.course} - ${s.content}】\n${s.summary}`;
      if (s.keyPoints && s.keyPoints.trim()) {
        block += `\n[重要知识点/教师划重点] ${s.keyPoints.trim()}`;
      }
      return block;
    })
    .join('\n\n');

  const prompt =
    `你是期末复习规划助手。请基于下面的章节摘要，为每门课的每一章生成"学习建议"。\n\n` +
    `【最重要】你只需要生成"学习方法 / 记忆技巧 / 核心考点"类建议，` +
    `**绝对不能出现任何具体日期**（如"8月22日""考试前三天""考前一周"），也绝对不能写"X月X日考试"。` +
    `日期排程由程序自动完成，你无需也不能决定任何日期。\n` +
    `【重要】输出中绝对不能出现任何星号(*)符号（包括粗体和列表符号），否则按出错处理。\n\n` +
    `课程及章节（含考试日期，仅供你判断优先级，**不要在输出里写任何日期**）：\n${outline}\n\n` +
    `各章节摘要（你写建议的唯一依据，禁止编造摘要中没有的知识点）：\n${chapterSection}\n\n` +
    `${options?.examType ? `用户备考类型：${options.examType}。\n` : ''}` +
    `${options?.dailyHours ? `用户每天可用学习时长约 ${options.dailyHours} 小时。\n` : ''}` +
    `${options?.weakPoints ? `用户特别薄弱/头疼的环节：${options.weakPoints}。请对这些环节给出更具体、可操作的攻克建议。\n` : ''}` +
    `\n请严格按以下格式输出：\n\n` +
    `【整体学习建议】\n（针对全部课程的宏观备考策略，一段话，不要写任何日期）\n\n` +
    `【分章节学习建议】\n` +
    `### 课程名 - 章节名\n建议：（这一章怎么学、记什么、常考什么，2-4 句）\n` +
    `### 课程名 - 章节名\n建议：（同上）\n` +
    `### 课程名 - 综合复盘\n建议：（考前最后冲刺：用户通常已把老师划的重点、重要题目写在「备注」里，` +
    `请**重点引用备注内容**，列出必须背诵、最后理解的核心知识点与题目清单，强调这是考前最后的查漏补缺）\n\n` +
    `【重要】对每一门有章节的课程，都必须额外输出一个"### 课程名 - 综合复盘"块，` +
    `该块的建议必须是"考前最后一天的最后战斗"：基于上面「用户备注/老师划的重点」中的实际内容，` +
    `给出当天必须背诵或最后理解的重要知识点、公式、题型或题目，越具体越好。` +
    `对没有章节（只有整体复习）的课程，改为输出"### 课程名 - 整体复习"块，同样基于备注给出考前冲刺建议。\n` +
    `注意：每一章都必须有对应的"### 课程名 - 章节名"块和建议；课程名与章节名必须与上面列表完全一致。`;

  // DS 优先，DS 不可用时自动转阿里云通义（路由见 routeTextAI）
  const { content, provider } = await routeTextAI(prompt, [], {
    temperature: 0.6,
    maxTokens: 6000,
  });
  if (provider === 'aliyun') {
    console.warn('[generatePlanRobust] DeepSeek 不可用，已切换至阿里云通义生成建议');
  }
  return parseSuggestions(content, courses);
};

// 中途重排：根据逾期欠账与剩余天数，让 AI 重新生成"剩余章节"的学习建议。
// 日期仍由程序（planGenerator.buildReplanSkeleton）决定，确保不出现日期幻觉。
const countRemainingDays = (today: string, exam: string): number => {
  if (!today || !exam || exam <= today) return 0;
  let cur = today;
  let n = 0;
  let guard = 0;
  while (cur < exam && guard < 1000) {
    n += 1;
    const x = new Date(cur);
    x.setDate(x.getDate() + 1);
    cur = x.toISOString().split('T')[0];
    guard += 1;
  }
  return n;
};

export const replanWithAI = async (
  courses: Course[],
  tasks: DailyTask[],
  today: string,
  _options?: PlanOptions,
  onProgress?: (msg: string) => void
): Promise<GeneratedPlan> => {
  const debts = tasks.filter((t) => t.date < today && !t.completed);
  const norm = (name: string) =>
    name.replace(/（顺延）|\(顺延\)/g, '').replace(/\s*\(复习\)|\s*\(回顾\)/g, '').trim();
  const hasReviewDebt = debts.some((d) => d.contentId.endsWith('__review'));
  const reviewDebtNote = hasReviewDebt
    ? '（注意：该课「综合复盘/整体复习」也逾期未完成，请在建议中补上考前冲刺内容）'
    : '';

  const courseInfo = courses
    .map((c, i) => {
      const days = countRemainingDays(today, c.examDate);
      const debtChapters = [
        ...new Set(
          debts
            .filter((d) => d.courseId === c.id && !d.contentId.endsWith('__review'))
            .map((d) => norm(d.contentName))
        ),
      ];
      return (
        `${i + 1}. ${c.name}（考试：${c.examDate}｜剩余约 ${days} 天）｜备注/老师重点：${c.note || '（未填）'}\n` +
        `   章节：${(c.contents || []).map((x) => `${x.name}(重要度${x.importance}/熟悉度${x.familiarity})`).join('、') || '（整体复习，无章节）'}\n` +
        `   逾期未做章节（需重点补）：${debtChapters.length ? debtChapters.join('、') + reviewDebtNote : '（无）'}`
      );
    })
    .join('\n');

  onProgress?.('正在根据剩余时间重新规划…');

  const prompt =
    `你是期末复习规划助手。用户正在做计划的【中途重排】：之前有些任务逾期没做完，现在要根据剩余时间重新规划剩余的学习安排。\n\n` +
    `【硬性约束】\n` +
    `1. 绝对不能出现任何具体日期（如"8月22日""考试前三天"），也绝对不能写"X月X日考试"。日期由程序自动排程。\n` +
    `2. 输出中绝对不能出现星号(*)。\n\n` +
    `【剩余窗口】每门课从今天到考试前一天还有若干天（见下方"剩余天数"），请基于这个窗口重新规划，不必覆盖已完成的章节。\n\n` +
    `课程信息：\n${courseInfo}\n\n` +
    `【你的任务】为每门课"剩余未学/未巩固的章节"生成新的学习建议，并特别强调：\n` +
    `- 逾期章节（上面列出）如何在剩余几天里高效补回，给出具体可操作的追赶策略；\n` +
    `- 结合「备注/老师划的重点」给出必背/必理解清单；\n` +
    `- 体现"重新规划"思路（如哪些章可合并、哪些优先），而不是简单重复首遍建议。\n\n` +
    `请严格按以下格式输出：\n\n` +
    `【整体学习建议】\n（宏观追赶策略，一段话，不写日期）\n\n` +
    `【分章节学习建议】\n` +
    `### 课程名 - 章节名\n建议：（2-4 句）\n` +
    `### 课程名 - 综合复盘\n建议：（考前冲刺，基于备注，列出必须背诵/最后理解的重点）\n\n` +
    `对没有章节（整体复习）的课程，改为输出"### 课程名 - 整体复习"块。每一门有剩余任务的课程都必须有对应建议块。`;

  try {
    const { content, provider } = await routeTextAI(prompt, [], { temperature: 0.6, maxTokens: 6000 });
    if (provider === 'aliyun') console.warn('[replanWithAI] DeepSeek 不可用，已切换至阿里云通义');
    return parseSuggestions(content, courses);
  } catch (err) {
    console.warn('[replanWithAI] AI 重排失败，回退规则重排：', (err as Error).message);
    return {
      overallSuggestion: '（AI 重排建议生成失败，已按剩余时间重新分配任务，建议稍后重试"确认顺延"）',
      suggestions: {},
    };
  }
};

// 解析 AI 返回的建议文本：提取整体建议 + 每个"课程名 - 章节名"对应的建议。
// 不解析任何日期——日期完全由程序排程决定。
const parseSuggestions = (text: string, _courses: Course[]): GeneratedPlan => {
  const overallMatch = text.match(/【整体学习建议】\s*([\s\S]*?)(?:\n\s*【分章节学习建议】|$)/);
  const overallSuggestion = overallMatch ? overallMatch[1].trim().replace(/\*/g, '') : '';

  const suggestions: Record<string, string> = {};
  // 按 ### / ## 标题切块（"### 课程名 - 章节名"）
  const blocks = text.split(/(?:^|\n)#{2,3}\s+/m).slice(1);
  for (const block of blocks) {
    const firstLineEnd = block.indexOf('\n');
    const header = (firstLineEnd >= 0 ? block.slice(0, firstLineEnd) : block).trim();
    const sep = header.indexOf(' - ');
    if (sep < 0) continue;
    const courseName = header.slice(0, sep).trim();
    const contentName = header.slice(sep + 3).trim();
    if (!courseName || !contentName) continue;
    const body = firstLineEnd >= 0 ? block.slice(firstLineEnd + 1) : '';
    const sugMatch = body.match(/建议[：:]\s*([\s\S]*)/);
    const sug = (sugMatch ? sugMatch[1] : body).trim().replace(/\*/g, '');
    if (!sug) continue;
    suggestions[`${courseName}::${contentName}`] = sug;
  }

  return { overallSuggestion, suggestions };
};

// （对话式建计划 chatWithAI / extractPlanInfo 已移除，录入页改为轻量表单）

// ───────────────────────────────────────────────────────────
// 阿里云百炼（通义千问）多模态：直接识别图片课件内容（替代 OCR）
// 兼容 OpenAI 格式：base_url = dashscope.aliyuncs.com/compatible-model/v1
// 安全提醒：KEY 当前硬编码在前端，仅适合本地/演示；上线前应改为后端代理转发，避免泄露。
// 从 .env.local 读取（VITE_ 前缀，Vite 会注入到前端）；未配置时给出明确提示
const DASHSCOPE_API_KEY = import.meta.env.VITE_DASHSCOPE_API_KEY as string | undefined;

export const describeImageWithVL = async (base64: string, mime = 'image/jpeg'): Promise<string> => {
  if (!DASHSCOPE_API_KEY) {
    throw new Error('未配置百炼 API Key：请在项目根目录 .env.local 中设置 VITE_DASHSCOPE_API_KEY');
  }
  const response = await axios.post(
    'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    {
      model: 'qwen-vl-max', // 识别质量优先；想省成本可换成 qwen-vl-plus
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text:
                '这是一张学习资料/课件/笔记图片。请仔细识别其中的全部文字、公式、图表标题与章节结构，' +
                '尽量保持原有顺序和层级输出，不要编造图中没有的内容。输出将作为复习课件内容用于制定学习计划。',
            },
            {
              type: 'image_url',
              image_url: { url: `data:${mime};base64,${base64}` },
            },
          ],
        },
      ],
      temperature: 0.2,
      max_tokens: 3000,
    },
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${DASHSCOPE_API_KEY}`,
      },
      timeout: 120000,
    }
  );
  return (response.data as any).choices[0].message.content;
};

// ───────────────────────────────────────────────────────────
// 通用对话（课程专属知识库 + 内置联网搜索）：用于课程详情里的"聊天"tab
// 轻量多角色（知识速记员/助教/题型判官/网络搜查员/知识整合员），纯对话交互，
// 用户用指令（出卷/答疑/上网查）驱动；course 提供时将其课件/备注/已出卷子注入
// 作为强约束，使 AI 只基于用户资料回答、越聊越懂这门课。
// 联网搜索走 DeepSeek 内置 web_search（仅 Responses API 支持、服务端自动执行）。

/** 后处理硬清洗：去除 AI 输出中的机器生成排版痕迹（双保险，配合 prompt 里的排版师角色） */
const cleanFormatting = (text: string): string => {
  let out = text;
  // 去除装饰性分隔行：--- / *** / ___ / ____ 等（独立成行的）
  out = out.replace(/^[ \t]*[-*_]{3,}[ \t]*$/gm, '');
  // 去除连续空行（压到最多 1 个空行）
  out = out.replace(/\n{3,}/g, '\n\n');
  // 去除行首尾多余空白
  out = out.trim();
  return out;
};
interface ChatTurn {
  role: 'user' | 'ai';
  content: string;
}

const buildKnowledgeBase = (course: Course, plan?: ExamPlan | null, retrieved?: string): string => {
  const MAX = 50000;
  // 元数据（课程名 / 考试日 / 备注 / 已出卷子）优先完整保留
  const meta: string[] = [];
  meta.push(`课程名称：${course.name}`);
  meta.push(`考试日期：${course.examDate}`);
  if (course.note) meta.push(`用户备注：${course.note}`);
  const papers = loadPapers(course.id);
  if (papers.length) {
    meta.push(`用户已生成的试卷：\n${papers.map((p) => `《${p.title}》`).join('\n')}`);
  }

  // 学习计划：仅注入本门课的任务排期（按 courseId 隔离）。
  // 注意：不注入 plan.aiSuggestion（全局建议），因为它是自由文本、混有所有课程的备注/重点，
  // 注入到单课聊天会导致 AI 把别课的备注当成当前课程的（已实测确认会串）。
  // 全局策略价值远低于串课带来的混淆风险。
  const planParts: string[] = [];
  if (plan) {
    planParts.push(`【学习计划周期】${plan.startDate} 至 ${plan.endDate}`);
    const courseTasks = plan.tasks
      .filter((t) => t.courseId === course.id)
      .sort((a, b) => a.date.localeCompare(b.date));
    if (courseTasks.length) {
      planParts.push(
        `【本门课每日学习任务（AI 生成排期，供你参考进度/调整）】\n` +
          courseTasks
            .map((t) => {
              const status = t.completed ? '已完成' : '未完成';
              const sug = t.suggestion ? `｜学习建议：${t.suggestion}` : '';
              const mastery =
                t.masteryScore != null ? `｜自评掌握度 ${t.masteryScore}/100` : '';
              return `${t.date} · ${t.contentName} · 预计${t.estimatedHours}h · ${status}${mastery}${sug}`;
            })
            .join('\n')
      );
    }
  }
  const planText = planParts.join('\n');

  const metaText = meta.join('\n');
  // 剩余预算先扣掉计划文本，保证课程资料（课件）能被均分；计划本身较小，优先完整保留
  const usable = Math.max(MAX - metaText.length - planText.length - 100, 2000);
  const perContent = Math.floor(usable / Math.max(course.contents.length, 1));
  const contentParts = course.contents.map((ct) => {
    let block = `【${ct.name}】重要度 ${ct.importance}/100，熟悉度 ${ct.familiarity}/100`;
    if (ct.keyPoints && ct.keyPoints.length) {
      block += `\n[重要知识点/教师划重点] ${ct.keyPoints.join('、')}`;
    }
    block += '\n';
    const mats = ct.materials
      .filter((m) => m.content && !m.error)
      .map((m) => `--- 课件《${m.name}》---\n${m.content}`)
      .join('\n');
    const budget = Math.max(perContent - block.length, 300);
    block += mats.slice(0, budget);
    return block;
  });
  if (retrieved && retrieved.trim()) {
    // RAG 模式：直接注入与本次提问最相关的课件片段（已精选，不再受 MAX 均分限制）
    return `${metaText}\n${planText}\n\n【课程资料 · 与本次提问最相关的课件片段（检索自分块向量库）】\n${retrieved}`;
  }
  // 回退模式（无向量/无提问）：拼接课件全文，受 MAX 预算均分（兼容旧数据）
  let kb = metaText + '\n' + planText + '\n' + contentParts.join('\n');
  if (kb.length > MAX) kb = kb.slice(0, MAX) + '\n...【资料过长已截断】';
  return kb;
};

// 轻量多角色系统提示（含"课件内/课件外"来源标注）
const buildChatSystem = (course?: Course, plan?: ExamPlan | null, retrieved?: string): string => {
  const base =
    '你是考期助手·期末冲刺 AI 助教，同时承担以下职能（按用户指令切换，不要主动炫技）：\n' +
    '\n' +
    '【知识速记员】你已掌握本课程的用户课件、备注与历史对话（附在下方"课程资料"区）。请优先基于这些用户资料作答，不得编造资料外知识点。\n' +
    '【助教】用本课程资料针对性讲解概念、答疑；可结合考试日判断该知识点现在是否值得优先搞懂。回复简洁、中文、直接。\n' +
    '【题型判官】当用户要出卷/出题时，先明确题型（概念辨析/简答/选择），再生成覆盖知识点的卷子并附答案。\n' +
    '【网络搜查员】默认优先基于用户课件资料回答；仅在以下情况才使用联网搜索：(1) 用户明确要求"上网查""搜索一下"；(2) 你判断该知识点是老师划重点必考、但课件中完全没有的盲区。其他情况不要主动联网。\n' +
    '【知识整合员】当同时拿到课件资料与网络结果时，对比两者，挑选更符合用户要求的版本（更精准/更通俗易懂），并说明取舍。\n' +
    '【排版师】负责所有回复的呈现质量：用干净、克制、易读的排版，去除机器生成味。详见下方"排版规范"。\n' +
    '\n' +
    '【来源标注·务必遵守】当你在回答中使用了网络搜索到的内容时，必须在相关句子末尾用 🌐 标注（如"……🌐"），并简述来源性质（如"来自网络公开资料"）；内容来自用户课件时无需特别标注。让用户一眼区分"课件内"与"课件外"。\n' +
    '\n' +
    '【排版规范·务必遵守】\n' +
    '1. 严禁装饰性分隔符：不要输出 "---"、"***"、"___" 或连续符号做满屏分隔；需要分段时用空行即可，最多在必要处用一条轻量横线。\n' +
    '2. 标题克制：一篇文章/一份卷子最多 1 个一级标题，二级标题也尽量少用；不要滥用多级标题。\n' +
    '3. 加粗克制：只在卷名、关键概念、区块标题（如"参考答案"）处加粗，不要每句话都加粗。\n' +
    '4. 不使用 emoji 装饰（来源标注 🌐 除外）。\n' +
    '5. 列表用标准有序/无序列表（题号、步骤、要点），对齐清晰、留白舒适。\n' +
    '6. 出卷时遵循结构：① 卷名（一级标题，如"《XX》期末模拟卷（一）"）；② 题目用有序列表，选择题选项用 A. B. C. D. 行内列出；③ 全部题目之后，用"## 参考答案"单独区块集中给出答案与简要解析，不要把答案逐题穿插在题干里。';
  if (!course) return base;
  return `${base}\n\n以下是用户【${course.name}】的课程资料（你只能基于这些内容回答，不得编造资料中没有的知识点）：\n${buildKnowledgeBase(course, plan, retrieved)}`;
};

// ───────────────────────────────────────────────────────────
// RAG：课件分块 + 轻量向量检索（语义优先，本地 BM25 回退）
// 解决"课件全文过长 → 被截断 → AI 读不全"：上传时把课件分块并向量化，
// 聊天时只把与本次提问最相关的 top-K 块注入上下文，不再受 50000 预算均分限制。
// 双引擎：配了百炼 Key 走语义向量；未配则自动降级本地 BM25 关键词检索（零 API、零隐私顾虑）。

const ALIYUN_EMBED_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1/embeddings';
const ALIYUN_EMBED_MODEL = 'text-embedding-v3'; // 如不可用可降级 text-embedding-v2 / v1

// 批量向量化：一次请求多段文本；失败（无 Key / 网络）返回全 null，调用方回退 BM25
export const embedBatch = async (texts: string[]): Promise<(number[] | null)[]> => {
  if (!texts.length) return [];
  if (!DASHSCOPE_API_KEY) {
    console.warn('[embedBatch] 未配置百炼 Key，跳过向量化（将降级 BM25）');
    return texts.map(() => null);
  }
  try {
    const resp = await axios.post(
      ALIYUN_EMBED_URL,
      { model: ALIYUN_EMBED_MODEL, input: texts },
      {
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${DASHSCOPE_API_KEY}` },
        timeout: 60000,
      }
    );
    const data = resp.data as any;
    const list = data?.output?.embeddings || data?.data;
    if (!Array.isArray(list) || !list.length) throw new Error('embedding 返回格式异常');
    const sorted = [...list].sort((a: any, b: any) =>
      typeof a.index === 'number' && typeof b.index === 'number' ? a.index - b.index : 0
    );
    return sorted.map((e: any) => (Array.isArray(e.embedding) ? (e.embedding as number[]) : null));
  } catch (e) {
    console.warn('[embedBatch] 失败，降级 BM25：', (e as Error).message);
    return texts.map(() => null);
  }
};

export const embedQuery = async (text: string): Promise<number[] | null> => {
  const r = await embedBatch([text]);
  return r[0] ?? null;
};

// 全文分块：按 ~700 字符切块、100 字符重叠
const chunkText = (text: string, size = 700, overlap = 100): string[] => {
  const clean = (text || '').replace(/\s+/g, ' ').trim();
  if (!clean) return [];
  if (clean.length <= size) return [clean];
  const chunks: string[] = [];
  let start = 0;
  while (start < clean.length) {
    const end = Math.min(start + size, clean.length);
    chunks.push(clean.slice(start, end));
    if (end === clean.length) break;
    start = end - overlap;
  }
  return chunks;
};

// 上传时调用：把全文分块并向量化，返回 Chunk[]（embedding 可能缺失 → 聊天时走 BM25）
export const buildChunksWithEmbedding = async (text: string): Promise<Chunk[]> => {
  const pieces = chunkText(text).slice(0, 200); // 上限 200 块（约 14 万字覆盖），防止极端超长
  if (!pieces.length) return [];
  const BATCH = 32;
  const embs: (number[] | null)[] = [];
  for (let i = 0; i < pieces.length; i += BATCH) {
    const r = await embedBatch(pieces.slice(i, i + BATCH));
    embs.push(...r);
  }
  return pieces.map((p, i) => ({ index: i, text: p, embedding: embs[i] || undefined }));
};

const cosine = (a: number[], b: number[]): number => {
  if (a.length !== b.length) return 0;
  let dot = 0,
    na = 0,
    nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
};

// 本地 BM25 关键词检索（无 embedding 时回退）：中文拆单字 + 英文数字按词
const tokenize = (s: string): string[] => {
  const cjk = s.match(/[一-鿿]/g) || [];
  const en = s.toLowerCase().match(/[a-z0-9]+/g) || [];
  return [...cjk, ...en];
};

// 检索该课程与提问最相关的 top-K 课件片段（语义优先，BM25 回退）
export const retrieveForCourse = (
  course: Course,
  queryEmbedding: number[] | null,
  queryText: string,
  topK = 8
): string => {
  const all: { text: string; emb?: number[]; src: string }[] = [];
  for (const ct of course.contents || []) {
    for (const m of ct.materials || []) {
      if (!m.chunks || !m.chunks.length) continue;
      for (const ch of m.chunks) {
        all.push({ text: ch.text, emb: ch.embedding, src: `《${m.name}》` });
      }
    }
  }
  if (!all.length) return '';

  const useSemantic = !!queryEmbedding && all.every((x) => x.emb && x.emb.length);
  let picked: { text: string; src: string }[];

  if (useSemantic) {
    picked = all
      .map((x) => ({ ...x, score: cosine(queryEmbedding!, x.emb!) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map((x) => ({ text: x.text, src: x.src }));
  } else if (queryText) {
    // BM25
    const docs = all.map((x) => tokenize(x.text));
    const qTokens = tokenize(queryText);
    const N = docs.length;
    const avgdl = docs.reduce((s, d) => s + d.length, 0) / Math.max(N, 1);
    const scored = all.map((x, i) => {
      const dl = docs[i].length;
      let score = 0;
      for (const q of qTokens) {
        const f = docs[i].filter((t) => t === q).length;
        if (f === 0) continue;
        const df = docs.filter((d) => d.includes(q)).length || 1;
        const idf = Math.log(1 + (N - df + 0.5) / (df + 0.5));
        score += idf * ((f * 2.5) / (f + 2.5 * (1 - 0.75 + 0.75 * (dl / Math.max(avgdl, 1)))));
      }
      return { ...x, score };
    });
    picked = scored.sort((a, b) => b.score - a.score).slice(0, topK).map((x) => ({ text: x.text, src: x.src }));
  } else {
    picked = all.slice(0, topK).map((x) => ({ text: x.text, src: x.src }));
  }

  return picked.map((x) => `【课件片段 ${x.src}】\n${x.text}`).join('\n\n');
};

// ───────────────────────────────────────────────────────────
// 多供应商路由：DeepSeek（默认）⇄ 阿里云通义（qwen-plus 文本对话）
// 图片识别仍走 describeImageWithVL（qwen-vl-max），不在本路由内。
// 模式见 providerService：auto=DS 优先、失败转阿里云；deepseek=仅DS；aliyun=仅阿里云。
const DEEPSEEK_CHAT_URL = 'https://api.deepseek.com/chat/completions';
const DEEPSEEK_RESPONSES_URL = 'https://api.deepseek.com/responses';
const ALIYUN_CHAT_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
const ALIYUN_CHAT_MODEL = 'qwen-plus'; // 文本对话模型（通义千问，性价比均衡）

// DS 主路径：Responses API + 内置联网搜索（服务端自动执行）
const deepseekResponses = async (system: string, input: any[]): Promise<string> => {
  const response = await axios.post(
    DEEPSEEK_RESPONSES_URL,
    {
      model: 'deepseek-v4-flash',
      instructions: system,
      input,
      tools: [{ type: 'web_search' }],
      temperature: 0.7,
      max_output_tokens: 4000,
    },
    {
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
      timeout: 180000,
    }
  );
  const data = response.data as any;
  const text = (data.output || [])
    .filter((o: any) => o.type === 'message' && o.role === 'assistant')
    .flatMap((o: any) => (o.content || []).map((c: any) => c.text || ''))
    .join('')
    .trim();
  if (!text) throw new Error('Responses 返回为空');
  return text;
};

// DS 兜底 / 无联网：chat/completions
const deepseekChat = async (
  system: string,
  input: any[],
  temperature = 0.7,
  maxTokens = 4000
): Promise<string> => {
  const response = await axios.post(
    DEEPSEEK_CHAT_URL,
    {
      model: 'deepseek-chat',
      messages: [{ role: 'system', content: system }, ...input],
      temperature,
      max_tokens: maxTokens,
    },
    {
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
      timeout: 180000,
    }
  );
  const text = (response.data as any).choices[0].message.content;
  if (!text) throw new Error('DeepSeek 返回为空');
  return text;
};

// 阿里云通义：OpenAI 兼容 chat/completions（文本对话，无联网搜索）
const aliyunChat = async (
  system: string,
  input: any[],
  temperature = 0.7,
  maxTokens = 4000
): Promise<string> => {
  if (!DASHSCOPE_API_KEY) {
    throw new Error('未配置百炼 API Key：请在 .env.local 设置 VITE_DASHSCOPE_API_KEY');
  }
  const response = await axios.post(
    ALIYUN_CHAT_URL,
    {
      model: ALIYUN_CHAT_MODEL,
      messages: [{ role: 'system', content: system }, ...input],
      temperature,
      max_tokens: maxTokens,
    },
    {
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${DASHSCOPE_API_KEY}` },
      timeout: 180000,
    }
  );
  const text = (response.data as any).choices[0].message.content;
  if (!text) throw new Error('阿里云返回为空');
  return text;
};

export interface TextAIResult {
  content: string;
  provider: ActiveProvider;
}

interface RouteOpts {
  useWebSearch?: boolean;
  temperature?: number;
  maxTokens?: number;
}

// 核心路由：按模式依次尝试供应商，任一成功即返回；全失败抛最后一个错误
export const routeTextAI = async (
  system: string,
  input: any[],
  opts: RouteOpts = {}
): Promise<TextAIResult> => {
  const { useWebSearch = false, temperature = 0.7, maxTokens = 4000 } = opts;
  const mode = getProviderMode();
  const order: ActiveProvider[] =
    mode === 'aliyun' ? ['aliyun'] : mode === 'deepseek' ? ['deepseek'] : ['deepseek', 'aliyun'];

  let lastErr: unknown;
  for (const p of order) {
    try {
      let content: string;
      if (p === 'deepseek') {
        if (useWebSearch) {
          try {
            content = await deepseekResponses(system, input);
          } catch (e) {
            console.warn('[routeTextAI] DS Responses 失败，转 chat/completions：', (e as Error).message);
            content = await deepseekChat(system, input, temperature, maxTokens);
          }
        } else {
          content = await deepseekChat(system, input, temperature, maxTokens);
        }
      } else {
        content = await aliyunChat(system, input, temperature, maxTokens);
      }
      if (content?.trim()) return { content, provider: p };
    } catch (e) {
      lastErr = e;
      console.warn(`[routeTextAI] ${p} 调用失败：`, (e as Error).message);
    }
  }
  throw lastErr ?? new Error('所有模型均调用失败');
};

export const chatWithAI = async (
  messages: ChatTurn[],
  course?: Course,
  plan?: ExamPlan | null,
  focusText?: string
): Promise<string> => {
  // RAG：提取最近一条用户提问 → 向量化 → 检索该课程最相关的课件片段，注入知识库
  let retrieved = '';
  if (course) {
    const lastUser = [...messages].reverse().find((m) => m.role === 'user')?.content || '';
    if (lastUser) {
      const qEmb = await embedQuery(lastUser);
      retrieved = retrieveForCourse(course, qEmb, lastUser, 8);
    }
  }
  let system = buildChatSystem(course, plan, retrieved);
  if (focusText) {
    system +=
      `\n\n【以下为用户特别指定要精读的某章完整课件内容（优先以此为准，回答时以此章内容为主）】：\n${focusText}`;
  }
  const input = messages.map((m) => ({
    role: m.role === 'ai' ? 'assistant' : 'user',
    content: m.content,
  }));

  // 主路径：Responses API + DeepSeek 内置联网搜索（服务端自动执行，单次请求拿最终答案）
  try {
    const response = await axios.post(
      'https://api.deepseek.com/responses',
      {
        model: 'deepseek-v4-flash',
        instructions: system,
        input,
        tools: [{ type: 'web_search' }],
        temperature: 0.7,
        max_output_tokens: 4000,
      },
      {
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
        timeout: 180000,
      }
    );
    const data = response.data as any;
    const text = (data.output || [])
      .filter((o: any) => o.type === 'message' && o.role === 'assistant')
      .flatMap((o: any) => (o.content || []).map((c: any) => c.text || ''))
      .join('')
      .trim();
    if (text) return cleanFormatting(text);
    throw new Error('Responses 返回为空');
  } catch (err) {
    console.warn('[chatWithAI] Responses API 失败，回退 chat/completions：', (err as Error).message);
    const fallback = await deepseekChat(system, input);
    return cleanFormatting(fallback);
  }
};
