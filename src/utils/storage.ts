import type { ExamPlan, Course } from '../types';

const STORAGE_KEY = 'exam-helper-data';
const COURSES_KEY = 'exam-helper-courses';
const START_DATE_KEY = 'exam-helper-start-date';

export const savePlan = (plan: ExamPlan): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
};

export const loadPlan = (): ExamPlan | null => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : null;
};

export const clearPlan = (): void => {
  localStorage.removeItem(STORAGE_KEY);
};

export const saveCourses = (courses: Course[]): void => {
  localStorage.setItem(COURSES_KEY, JSON.stringify(courses));
};

export const loadCourses = (): Course[] => {
  const data = localStorage.getItem(COURSES_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveStartDate = (startDate: string): void => {
  localStorage.setItem(START_DATE_KEY, startDate);
};

export const loadStartDate = (): string => {
  return localStorage.getItem(START_DATE_KEY) || '';
};

export const clearCourses = (): void => {
  localStorage.removeItem(COURSES_KEY);
  localStorage.removeItem(START_DATE_KEY);
};
