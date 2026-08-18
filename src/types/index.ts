export interface Chunk {
  index: number;
  text: string;
  // 向量（阿里云 text-embedding 生成）；缺失时检索回退为本地 BM25
  embedding?: number[];
}

export interface Material {
  name: string;
  content: string;
  error?: boolean;
  // 原始文件在 IndexedDB 的引用 id 与 MIME 类型，用于资料 tab 预览原始课件
  fileId?: string;
  mimeType?: string;
  // 课件分块 + 向量（RAG 检索用）；未生成时为 undefined（回退到 content 全文）
  chunks?: Chunk[];
}

export interface CourseContent {
  id: string;
  name: string;
  importance: number; 
  familiarity: number; 
  completed: boolean;
  materials: Material[];
  // 重要知识点（教师划重点，可选）；规划与答疑时优先安排
  keyPoints?: string[];
}

export interface Course {
  id: string;
  name: string;
  examDate: string;
  note?: string;
  contents: CourseContent[];
}

export interface DailyTask {
  id: string;
  courseId: string;
  contentId: string;
  contentName: string;
  courseName: string;
  date: string;
  completed: boolean;
  estimatedHours: number;
  suggestion?: string;
  // 掌握度（0-100 用户自评分数）
  masteryScore?: number;
  // 计时器（手机式计时，秒）
  actualSeconds?: number;
  timerRunning?: boolean;
  timerStart?: number;
  timerAccumulated?: number;
  // 用户自定义的计划时长（分钟），用于「已用/计划」进度展示，缺省时按 estimatedHours 推算
  plannedMinutes?: number;
}

export interface ExamPlan {
  id: string;
  startDate: string;
  endDate: string;
  courses: Course[];
  tasks: DailyTask[];
  aiSuggestion?: string;
  // 用户「暂时忽略」的过期未完成任务 id，避免每日弹窗/红点反复出现
  dismissedDebtIds?: string[];
}

export interface AppState {
  plan: ExamPlan | null;
  todayTasks: DailyTask[];
}

export interface ChatMessage {
  role: 'user' | 'ai';
  content: string;
  ts: number;
}

export interface Paper {
  id: string;
  courseId: string;
  title: string;
  markdown: string;
  createdAt: number;
}
