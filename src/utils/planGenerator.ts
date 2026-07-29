import type { Course, DailyTask, LearningStyle } from '../types';

const generateId = (): string => {
  return Math.random().toString(36).substring(2, 15);
};

const getDaysBetween = (startDate: string, endDate: string): number => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = end.getTime() - start.getTime();
  return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);
};

const addDays = (date: string, days: number): string => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

const getLatestExamDate = (courses: Course[]): string => {
  return courses.reduce((latest, course) => {
    return course.examDate > latest ? course.examDate : latest;
  }, '');
};

const getExamDatesSet = (courses: Course[]): Set<string> => {
  return new Set(courses.map(c => c.examDate));
};

interface ScheduledTask {
  date: string;
  courseId: string;
  contentId: string;
  contentName: string;
  courseName: string;
  estimatedHours: number;
  isReview: boolean;
}

const generateMemoryPlan = (
  courses: Course[],
  startDate: string
): DailyTask[] => {
  const tasks: DailyTask[] = [];
  const reviewIntervals = [0, 2, 4];
  const latestExamDate = getLatestExamDate(courses);
  const examDatesSet = getExamDatesSet(courses);
  
  const scheduledTasks: ScheduledTask[] = [];
  
  courses.forEach(course => {
    const daysUntilExam = getDaysBetween(startDate, course.examDate);
    
    if (daysUntilExam <= 0) return;
    
    course.contents.forEach((content, contentIndex) => {
      reviewIntervals.forEach((interval) => {
        // 首次学习：均匀分布到整个复习周期
        // 复习：在首次学习后的第 2、4 天进行
        let dayOffset: number;
        if (interval === 0) {
          // 首次学习：均匀分布
          const totalContents = course.contents.length;
          const baseOffset = Math.floor((contentIndex / totalContents) * (daysUntilExam - 3));
          dayOffset = baseOffset;
        } else {
          // 复习：基于首次学习的位置加上间隔
          const totalContents = course.contents.length;
          const baseOffset = Math.floor((contentIndex / totalContents) * (daysUntilExam - 3));
          dayOffset = baseOffset + interval;
        }
        
        const taskDate = addDays(startDate, dayOffset);
        
        if (taskDate < course.examDate) {
          scheduledTasks.push({
            date: taskDate,
            courseId: course.id,
            contentId: content.id,
            contentName: content.name + (interval === 0 ? '' : ' (复习)'),
            courseName: course.name,
            estimatedHours: interval === 0 ? content.importance / 5 : (content.importance / 5) * 0.3,
            isReview: interval > 0,
          });
        }
      });
    });
  });
  
  const scheduledTasks2: ScheduledTask[] = scheduledTasks.filter(t => !t.isReview);
  const reviewTasks: ScheduledTask[] = scheduledTasks.filter(t => t.isReview);
  
  scheduledTasks2.sort((a, b) => a.date.localeCompare(b.date));
  
  const groupedByDate: Record<string, ScheduledTask[]> = {};
  scheduledTasks2.forEach(task => {
    if (!groupedByDate[task.date]) {
      groupedByDate[task.date] = [];
    }
    groupedByDate[task.date].push(task);
  });
  
  const allDates: string[] = [];
  let currentDate = startDate;
  while (currentDate <= latestExamDate) {
    allDates.push(currentDate);
    currentDate = addDays(currentDate, 1);
  }
  
  const tasksByDate: Record<string, ScheduledTask[]> = {};
  allDates.forEach(date => {
    tasksByDate[date] = groupedByDate[date] || [];
  });
  
  Object.keys(tasksByDate).forEach(date => {
    const dayTasks = tasksByDate[date];
    const uniqueCourses = new Set(dayTasks.map(t => t.courseId));
    
    if (uniqueCourses.size === 1 && courses.length > 1) {
      const currentCourseId = dayTasks[0]?.courseId;
      const availableCourses = courses.filter(c => 
        c.examDate > date && 
        c.id !== currentCourseId &&
        c.contents.some(c => !c.completed)
      );
      
      if (availableCourses.length > 0) {
        const extraCourse = availableCourses[0];
        const availableContent = extraCourse.contents.find(c => !c.completed);
        
        if (availableContent) {
          dayTasks.push({
            date,
            courseId: extraCourse.id,
            contentId: availableContent.id,
            contentName: availableContent.name + ' (补充)',
            courseName: extraCourse.name,
            estimatedHours: 0.5,
            isReview: false,
          });
        }
      }
    }
    
    if (dayTasks.length === 0 && examDatesSet.has(date)) {
      const availableCourses = courses.filter(c => 
        c.examDate > date &&
        c.contents.some(c => !c.completed)
      );
      
      if (availableCourses.length > 0) {
        const extraCourse = availableCourses[0];
        const availableContent = extraCourse.contents.find(c => !c.completed);
        
        if (availableContent) {
          dayTasks.push({
            date,
            courseId: extraCourse.id,
            contentId: availableContent.id,
            contentName: availableContent.name + ' (补充)',
            courseName: extraCourse.name,
            estimatedHours: 0.5,
            isReview: false,
          });
        }
      }
    }
    
    dayTasks.forEach(task => {
      tasks.push({
        id: generateId(),
        courseId: task.courseId,
        contentId: task.contentId,
        contentName: task.contentName,
        courseName: task.courseName,
        date: task.date,
        completed: false,
        estimatedHours: task.estimatedHours,
      });
    });
  });
  
  reviewTasks.sort((a, b) => a.date.localeCompare(b.date));
  
  reviewTasks.forEach(task => {
    tasks.push({
      id: generateId(),
      courseId: task.courseId,
      contentId: task.contentId,
      contentName: task.contentName,
      courseName: task.courseName,
      date: task.date,
      completed: false,
      estimatedHours: task.estimatedHours,
    });
  });
  
  return tasks;
};

export const generatePlan = (
  courses: Course[],
  startDate: string,
  learningStyle: LearningStyle
): DailyTask[] => {
  switch (learningStyle) {
    case 'memory':
      return generateMemoryPlan(courses, startDate);
    default:
      return generateMemoryPlan(courses, startDate);
  }
};

export const getTodayTasks = (tasks: DailyTask[]): DailyTask[] => {
  const today = new Date().toISOString().split('T')[0];
  return tasks.filter(task => task.date === today);
};

export const getProgress = (tasks: DailyTask[]): number => {
  if (tasks.length === 0) return 0;
  const completed = tasks.filter(t => t.completed).length;
  return Math.round((completed / tasks.length) * 100);
};

export const generateMissingTasks = (
  existingTasks: DailyTask[],
  courses: Course[],
  endDate: string
): DailyTask[] => {
  const tasks: DailyTask[] = [];
  const existingDates = new Set(existingTasks.map(t => t.date));
  
  const existingDatesArray = [...existingDates].sort();
  const lastExistingDate = existingDatesArray[existingDatesArray.length - 1];
  
  if (!lastExistingDate) return tasks;
  
  let currentDate = addDays(lastExistingDate, 1);
  
  while (currentDate <= endDate) {
    const examOnDate = courses.filter(c => c.examDate === currentDate);
    
    if (examOnDate.length === 0) {
      const availableCourses = courses.filter(c => c.examDate > currentDate);
      
      if (availableCourses.length > 0) {
        const course = availableCourses[0];
        const incompleteContent = course.contents.filter(c => !c.completed);
        
        if (incompleteContent.length > 0) {
          tasks.push({
            id: generateId(),
            courseId: course.id,
            contentId: incompleteContent[0].id,
            contentName: incompleteContent[0].name,
            courseName: course.name,
            date: currentDate,
            completed: false,
            estimatedHours: incompleteContent[0].importance / 5,
          });
        }
      }
    }
    
    currentDate = addDays(currentDate, 1);
  }
  
  return tasks;
};
