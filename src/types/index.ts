export type LearningStyle = 'steady' | 'sprint' | 'memory';

export interface Material {
  name: string;
  content: string;
  error?: boolean;
}

export interface CourseContent {
  id: string;
  name: string;
  importance: number; 
  familiarity: number; 
  completed: boolean;
  materials: Material[];
}

export interface Course {
  id: string;
  name: string;
  examDate: string;
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
  actualHours?: number;
  suggestion?: string;
}

export interface ExamPlan {
  id: string;
  startDate: string;
  endDate: string;
  learningStyle: LearningStyle;
  courses: Course[];
  tasks: DailyTask[];
  aiSuggestion?: string;
}

export interface AppState {
  plan: ExamPlan | null;
  todayTasks: DailyTask[];
}
