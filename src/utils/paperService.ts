import type { Paper } from '../types';

const PAPER_KEY = 'exam-helper-papers';

type PaperStore = Record<string, Paper[]>;

const loadStore = (): PaperStore => {
  const data = localStorage.getItem(PAPER_KEY);
  return data ? (JSON.parse(data) as PaperStore) : {};
};

const saveStore = (store: PaperStore): void => {
  localStorage.setItem(PAPER_KEY, JSON.stringify(store));
};

export const loadPapers = (courseId: string): Paper[] => {
  return loadStore()[courseId] || [];
};

export const savePaper = (paper: Paper): void => {
  const store = loadStore();
  const list = store[paper.courseId] || [];
  list.unshift(paper);
  store[paper.courseId] = list;
  saveStore(store);
};

export const deletePaper = (courseId: string, paperId: string): void => {
  const store = loadStore();
  store[courseId] = (store[courseId] || []).filter((p) => p.id !== paperId);
  saveStore(store);
};

export const renamePaper = (courseId: string, paperId: string, newTitle: string): void => {
  const store = loadStore();
  const list = store[courseId] || [];
  const target = list.find((p) => p.id === paperId);
  if (target) target.title = newTitle.trim() || target.title;
  store[courseId] = list;
  saveStore(store);
};
