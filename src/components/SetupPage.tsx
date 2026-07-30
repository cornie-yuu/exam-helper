import { useState, useEffect } from 'react';
import { Target, Sparkles } from 'lucide-react';
import { CourseForm } from './CourseForm';
import { DatePicker } from './DatePicker';
import type { Course, ExamPlan, DailyTask } from '../types';
import { generatePlan } from '../utils/planGenerator';
import { savePlan, saveCourses, saveStartDate, loadCourses, loadStartDate } from '../utils/storage';
import { generatePlanWithAI } from '../utils/aiService';

const generateId = (): string => Math.random().toString(36).substring(2, 15);

interface SetupPageProps {
  onComplete: (plan: ExamPlan) => void;
  initialData?: {
    courses: Course[];
    startDate: string;
  };
}

const parseAITasks = (aiResult: string, courses: Course[], startDate: string, endDate: string): DailyTask[] => {
  const tasks: DailyTask[] = [];
  
  console.log('=== AI原始返回 ===');
  console.log(aiResult);
  
  const dateRegex = /日期[：:]?\s*(\d{4}-\d{2}-\d{2})|(\d{4}年\d{1,2}月\d{1,2}日)/;
  
  const taskPatterns = [
    /^\s*(\d+)\.\s*\*\*([^*]+)\*\*\s*[-—–]\s*\*\*重点[：:]?\s*([^*]+)\*\*/i,
    /^\s*(\d+)\.\s*\*\*([^*]+)\*\*\s*[-—–]\s*重点[：:]?\s*(.+)/i,
    /^\s*(\d+)\.\s*([^：\n]+)\s*[-—–]\s*重点[：:]?\s*(.+)/i,
  ];
  
  const suggestionPattern = /当天建议[：:]?\s*([^\n]+)/i;
  
  let currentDate = startDate;
  let currentSuggestion = '';
  
  for (const line of aiResult.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    // 匹配日期
    const dateMatch = trimmed.match(dateRegex);
    if (dateMatch) {
      if (dateMatch[2]) {
        const year = dateMatch[2].match(/(\d{4})/)?.[1] || '';
        const month = ('0' + (dateMatch[2].match(/年(\d{1,2})月/)?.[1] || '0')).slice(-2);
        const day = ('0' + (dateMatch[2].match(/月(\d{1,2})日/)?.[1] || '0')).slice(-2);
        currentDate = `${year}-${month}-${day}`;
      } else {
        currentDate = dateMatch[1];
      }
      console.log(`切换到日期: ${currentDate}`);
      currentSuggestion = '';
      continue;
    }
    
    // 匹配建议
    const suggestionMatch = trimmed.match(suggestionPattern);
    if (suggestionMatch && suggestionMatch[1]) {
      // 移除Markdown粗体符号
      currentSuggestion = suggestionMatch[1].trim().replace(/\*\*/g, '');
      const lastTask = tasks[tasks.length - 1];
      if (lastTask && lastTask.date === currentDate) {
        lastTask.suggestion = currentSuggestion;
      }
      continue;
    }
    
    // 匹配任务行
    if (/^\d+\./.test(trimmed)) {
      let match = null;
      for (const pattern of taskPatterns) {
        match = trimmed.match(pattern);
        if (match) break;
      }
      
      if (!match) {
        console.log('❌ 未匹配的任务行:', trimmed);
        continue;
      }
      
      let content = match[2] || '';
      let keyPoints = match[3] || '';
      
      // 移除Markdown粗体符号
      content = content.replace(/\*\*/g, '');
      keyPoints = keyPoints.replace(/\*\*/g, '');
      
      if (!content) continue;
      
      const separatorIndex = content.indexOf(' - ');
      let courseName = '';
      let contentName = '';
      
      if (separatorIndex !== -1) {
        courseName = content.substring(0, separatorIndex).trim();
        contentName = content.substring(separatorIndex + 3).trim();
      } else {
        const parts = content.split(/[-—–]/);
        courseName = parts[0]?.trim() || '';
        contentName = parts.slice(1).join(' ').trim() || '复习';
      }
      
      if (keyPoints && !contentName.includes('重点')) {
        contentName = `${contentName}（重点：${keyPoints.trim()}）`;
      }
      
      let foundCourse = courses.find(c => 
        c.name === courseName ||
        c.name.includes(courseName) || 
        courseName.includes(c.name)
      );
      
      if (!foundCourse && courseName) {
        for (const course of courses) {
          if (courseName.includes(course.name) || course.name.includes(courseName)) {
            foundCourse = course;
            break;
          }
        }
      }
      
      if (foundCourse) {
        if (currentDate > foundCourse.examDate) {
          console.log(`跳过过期任务：${foundCourse.name} 在 ${currentDate}`);
          continue;
        }
        
        let matchedContent = foundCourse.contents.find(c => 
          c.name === contentName || c.name.includes(contentName) || contentName.includes(c.name)
        );
        
        tasks.push({
  id: generateId(),
  courseId: foundCourse.id,
  contentId: matchedContent?.id || generateId(),
  contentName: contentName,
  courseName: foundCourse.name,
  date: currentDate,
  completed: false,
  estimatedHours: matchedContent?.importance ? matchedContent.importance / 5 : 2,
  suggestion: currentSuggestion || undefined,
});
        console.log(`✅ 添加任务: ${foundCourse.name} - ${contentName} 在 ${currentDate}`);
      }
    }
  }
  
  console.log('=== 解析出的任务数量 ===', tasks.length);
  
  // 检查是否覆盖到 endDate
  const endDateObj = new Date(endDate);
  const lastTaskDate = tasks.length > 0 
    ? new Date(Math.max(...tasks.map(t => new Date(t.date).getTime())))
    : null;

if (!lastTaskDate || lastTaskDate < endDateObj) {
  console.log(`⚠️ 计划只到 ${lastTaskDate?.toISOString().split('T')[0]}，需要补充到 ${endDate}`);
  const fallbackTasks = generatePlan(courses, startDate, 'memory');
  const existingDates = new Set(tasks.map(t => t.date));
  const newTasks = fallbackTasks.filter(t => !existingDates.has(t.date));
  tasks.push(...newTasks);
  console.log(`✅ 补充了 ${newTasks.length} 个任务`);
}

  return tasks;
};

export const SetupPage = ({ onComplete, initialData }: SetupPageProps) => {
  const [courses, setCourses] = useState<Course[]>(initialData?.courses || []);
  const [startDate, setStartDate] = useState(initialData?.startDate || '');
  const [isLoading, setIsLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  useEffect(() => {
    if (!initialData) {
      const savedCourses = loadCourses();
      const savedStartDate = loadStartDate();
      if (savedCourses.length > 0) {
        setCourses(savedCourses);
      }
      if (savedStartDate) {
        setStartDate(savedStartDate);
      }
    }
  }, [initialData]);

  useEffect(() => {
    saveCourses(courses);
  }, [courses]);

  useEffect(() => {
    if (startDate) {
      saveStartDate(startDate);
    }
  }, [startDate]);

  const getLatestExamDate = () => {
    return courses.reduce((latest, course) => {
      return course.examDate > latest ? course.examDate : latest;
    }, startDate);
  };

  const handleGenerate = async () => {
    if (courses.length === 0 || !startDate) return;

    setIsLoading(true);
    setAiError('');

    const endDate = getLatestExamDate();

    try {
      const courseText = courses.map(course =>
        `${course.name}（考试：${course.examDate}）：${course.contents.map(c => c.name).join('、')}`
      );

      // 整理课件内容（从每个课程内容中提取）
      const courseMaterials = courses.flatMap(course => 
        course.contents.flatMap(content => 
          content.materials
            .filter(m => !m.error && m.content)
            .map(m => `【${course.name} - ${content.name} - ${m.name}】\n${m.content}`)
        )
      ).join('\n\n');

      const aiResult = await generatePlanWithAI(courseText, startDate, endDate, courseMaterials);
      console.log('AI生成结果:', aiResult);
      
      // 检查课件是否被包含在AI提示词中
      if (courseMaterials && courseMaterials.length > 0) {
        console.log('✅ 课件内容已成功传递给AI');
        console.log('课件数量:', courses.flatMap(c => c.contents.flatMap(co => co.materials)).length);
      } else {
        console.log('⚠️ 未上传课件或课件内容为空');
      }

      const aiTasks = parseAITasks(aiResult, courses, startDate,endDate);
      console.log('解析出的任务:', aiTasks);
      
      let tasks: DailyTask[];
      if (aiTasks.length > 0) {
        tasks = aiTasks;
      } else {
        tasks = generatePlan(courses, startDate, 'memory');
      }

      const plan: ExamPlan = {
        id: generateId(),
        startDate,
        endDate,
        learningStyle: 'memory',
        courses,
        tasks,
        aiSuggestion: aiResult,
      };
      savePlan(plan);
      onComplete(plan);
    } catch (error) {
      console.error('生成计划失败:', error);
      setAiError('AI生成失败，已自动切换为算法生成');

      const tasks = generatePlan(courses, startDate, 'memory');
      const plan: ExamPlan = {
        id: generateId(),
        startDate,
        endDate,
        learningStyle: 'memory',
        courses,
        tasks,
      };
      savePlan(plan);
      onComplete(plan);
    } finally {
      setIsLoading(false);
    }
  };

  const isDisabled = courses.length === 0 || !startDate;

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-5">
      <div className="text-center mb-5">
        <div className="w-16 h-16 bg-sage rounded-full flex items-center justify-center mx-auto mb-3">
          <Target className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-text-dark">📚 考期助手</h1>
        <p className="text-text-light mt-1 text-sm">制定你的专属学习计划</p>
      </div>

      <div className="card">
        <h2 className="text-base font-bold text-text-dark mb-3">
          📅 设置开始日期
        </h2>

        <div>
          <label className="block text-sm font-bold text-text-dark mb-1">开始复习日期</label>
          <DatePicker
            value={startDate}
            onChange={setStartDate}
            placeholder="选择开始日期"
          />
          <p className="text-xs text-text-light mt-2">每个课程的考试日期在添加课程时单独设置</p>
        </div>
      </div>

      {aiError && (
        <div className="card bg-coral/10">
          <p className="text-coral text-sm">{aiError}</p>
        </div>
      )}

      <CourseForm courses={courses} onSave={setCourses} />

      <button
        onClick={handleGenerate}
        disabled={isDisabled || isLoading}
        className={`w-full py-4 rounded-2xl font-bold text-lg transition-all duration-300 border-2 border-text-dark ${
          isDisabled || isLoading
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'btn-primary'
        }`}
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-5 h-5 border-2 border-text-dark border-t-transparent rounded-full animate-spin" />
            AI思考中...
          </span>
        ) : (
          <>
            <Sparkles className="inline w-5 h-5 mr-2" />
            AI生成学习计划
          </>
        )}
      </button>
    </div>
  );
};
