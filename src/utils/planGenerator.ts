import type { Course, DailyTask } from '../types';

const generateId = (): string => {
  return Math.random().toString(36).substring(2, 15);
};

const addDays = (date: string, days: number): string => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

export const getLatestExamDate = (courses: Course[]): string => {
  return courses.reduce((latest, course) => {
    return course.examDate > latest ? course.examDate : latest;
  }, '');
};

// 含 start，不含 exam（即只排到考试前一天）
const dayRange = (start: string, exam: string): string[] => {
  const out: string[] = [];
  if (!start || !exam) return out;
  let cur = start;
  let guard = 0;
  while (cur < exam && guard < 1000) {
    out.push(cur);
    cur = addDays(cur, 1);
    guard++;
  }
  return out;
};

const makeTask = (
  course: Course,
  contentId: string,
  contentName: string,
  date: string,
  hours: number
): DailyTask => ({
  id: generateId(),
  courseId: course.id,
  contentId,
  contentName,
  courseName: course.name,
  date,
  completed: false,
  estimatedHours: hours,
});

// 确定性排程骨架：每门课在 [startDate, examDate-1] 区间内每天至少 1 个任务，
// 日期 100% 由程序计算、无空缺、绝不在考试日及之后排任务。
// AI 只负责后续把"学习建议"挂到这些任务上，不再决定任何日期（根治 AI 日期幻觉/不稳定）。
export const buildScheduleSkeleton = (courses: Course[], startDate: string): DailyTask[] => {
  const tasks: DailyTask[] = [];

  for (const course of courses) {
    const exam = course.examDate;
    if (!exam || exam <= startDate) continue; // 已过期或无考试日，跳过

    const days = dayRange(startDate, exam);
    if (days.length === 0) continue;
    const lastDay = days[days.length - 1];

    const contents = (course.contents || []).filter((c) => c.name && c.name.trim());

    if (contents.length === 0) {
      // 无章节：每天一个"自主复习"占位；最后一天改为"整体复习(考前冲刺)"，挂 AI 冲刺建议
      days.forEach((date) => {
        const isLast = date === lastDay;
        tasks.push(
          makeTask(course, `${course.id}__review`, isLast ? '整体复习' : '自主复习', date, isLast ? 2 : 1.5)
        );
      });
      continue;
    }

    // 学习单元：每章首遍 + 每章复习（不再把"综合复盘"混入铺排）
    const units: { contentId: string; contentName: string }[] = [];
    contents.forEach((ct) => units.push({ contentId: ct.id, contentName: ct.name }));
    contents.forEach((ct) => units.push({ contentId: ct.id, contentName: `${ct.name} (复习)` }));

    // 把单元尽量均匀铺到每一天
    const byDay: DailyTask[][] = days.map(() => []);
    units.forEach((u, i) => {
      const dayIdx = Math.min(
        Math.floor((i * days.length) / Math.max(units.length, 1)),
        days.length - 1
      );
      const isChapterReview = u.contentName.includes('(复习)');
      const hours = isChapterReview
        ? 1.5
        : ((contents.find((c) => c.id === u.contentId)?.importance ?? 60) / 50);
      byDay[dayIdx].push(makeTask(course, u.contentId, u.contentName, days[dayIdx], hours));
    });

    // 填充空余天：轮转章节做"回顾"，保证每天 ≥1 个任务且不重复堆叠综合复盘
    let ci = 0;
    byDay.forEach((arr, idx) => {
      if (arr.length === 0) {
        const ct = contents[ci % contents.length];
        ci += 1;
        arr.push(makeTask(course, ct.id, `${ct.name} (回顾)`, days[idx], 1));
      }
    });

    // 最后一天（考试前一天）追加"综合复盘"——这是考前最后战斗，挂 AI 冲刺建议
    byDay[byDay.length - 1].push(
      makeTask(course, `${course.id}__review`, '综合复盘', lastDay, 2)
    );

    byDay.forEach((arr) => arr.forEach((t) => tasks.push(t)));
  }

  return tasks;
};

const matchSuggestion = (
  courseName: string,
  contentName: string,
  suggestions: Record<string, string>
): string | undefined => {
  const exact = suggestions[`${courseName}::${contentName}`];
  if (exact) return exact;
  for (const [key, val] of Object.entries(suggestions)) {
    const idx = key.indexOf('::');
    if (idx < 0) continue;
    const c = key.slice(0, idx);
    const n = key.slice(idx + 2);
    if (
      (c === courseName || c.includes(courseName) || courseName.includes(c)) &&
      (n === contentName || n.includes(contentName) || contentName.includes(n))
    ) {
      return val;
    }
  }
  return undefined;
};

// 把 AI 生成的分章节建议挂到确定性排程骨架上（按 课程::章节 模糊匹配）。
// 综合复盘/整体复习也会匹配到 AI 专门输出的"考前最后冲刺"建议块。
export const mergeSuggestions = (
  skeleton: DailyTask[],
  suggestions: Record<string, string>
): DailyTask[] => {
  if (!suggestions || Object.keys(suggestions).length === 0) return skeleton;
  return skeleton.map((t) => {
    const sug = matchSuggestion(t.courseName, t.contentName, suggestions);
    return sug ? { ...t, suggestion: sug } : t;
  });
};

// 过期未完成的"欠账"：date 早于 today 且未完成任务（用于建议式顺延）。
export const getOverdueDebts = (tasks: DailyTask[], today: string): DailyTask[] =>
  tasks.filter((t) => t.date < today && !t.completed);

// 建议式顺延（仅当用户确认后调用，不静默改排程）：
// 把过期未完成的任务顺延到最近的可用未来日期，逐天铺开避免全堆一天；
// 上限为该课最晚已有日期（≈考试前一天），绝不排到考试日及之后；顺延任务标记「（顺延）」。
export const applyRollover = (tasks: DailyTask[], today: string): DailyTask[] => {
  const debts = getOverdueDebts(tasks, today);
  if (!debts.length) return tasks;

  // 每门课最晚已有日期，作为顺延上界（保证不超出原计划的考试前一天）
  const courseMax: Record<string, string> = {};
  for (const t of tasks) {
    if (!courseMax[t.courseId] || t.date > courseMax[t.courseId]) courseMax[t.courseId] = t.date;
  }

  const updated = tasks.map((t) => ({ ...t }));
  let cursor = today;
  for (const debt of debts) {
    const ceiling = courseMax[debt.courseId] ?? today;
    let target = cursor < today ? today : cursor; // 从今天起顺延
    if (target > ceiling) target = ceiling; // 超出上界则压到最晚一天
    const idx = updated.findIndex((u) => u.id === debt.id);
    if (idx >= 0) {
      updated[idx] = {
        ...updated[idx],
        date: target,
        contentName: updated[idx].contentName.includes('（顺延）')
          ? updated[idx].contentName
          : `${updated[idx].contentName}（顺延）`,
      };
    }
    // 每个欠账往后推一天，避免全堆同一天（不超过上界）
    const next = addDays(cursor, 1);
    cursor = next > ceiling ? cursor : next;
  }
  return updated;
};

// 中途重排骨架：保留所有「已完成」任务（进度不丢），把未完成任务（含今天未完成与逾期欠账）
// 按 [today, examDate-1] 重新排程。欠账章节优先排到前面几天，综合复盘仍钉考试前一天。
// 日期 100% 程序决定（无 AI 幻觉）；AI 建议由 mergeSuggestions 后续挂上。
export const buildReplanSkeleton = (tasks: DailyTask[], courses: Course[], today: string): DailyTask[] => {
  const kept = tasks.filter((t) => t.completed); // 已完成任务原样保留
  const pending = tasks.filter((t) => !t.completed);
  if (!pending.length) return kept;

  const debts = tasks.filter((t) => t.date < today && !t.completed);
  const debtIds = new Set(debts.map((d) => d.contentId));

  // 每门课待重排的章节 contentId（去重）
  const pendingByCourse: Record<string, string[]> = {};
  pending.forEach((t) => {
    if (!pendingByCourse[t.courseId]) pendingByCourse[t.courseId] = [];
    pendingByCourse[t.courseId].push(t.contentId);
  });

  const newTasks: DailyTask[] = [];
  for (const course of courses) {
    const exam = course.examDate;
    if (!exam || exam <= today) continue;
    const days = dayRange(today, exam);
    if (!days.length) continue;
    const lastDay = days[days.length - 1];
    const ids = [...new Set(pendingByCourse[course.id] || [])];
    if (!ids.length) continue; // 该课都完成了

    const contents = (course.contents || []).filter((c) => ids.includes(c.id));
    const hasReview = ids.includes(`${course.id}__review`);
    if (contents.length === 0 && !hasReview) continue;

    // 欠账章节优先排前面
    const sortedContents = contents
      .slice()
      .sort((a, b) => (debtIds.has(b.id) ? 1 : 0) - (debtIds.has(a.id) ? 1 : 0));

    // 学习单元：欠账/其余章节首遍；若天数充裕，再加一轮复习
    const units: { contentId: string; contentName: string }[] = [];
    sortedContents.forEach((ct) => units.push({ contentId: ct.id, contentName: ct.name }));
    if (days.length > sortedContents.length * 1.5 && sortedContents.length > 0) {
      sortedContents.forEach((ct) => units.push({ contentId: ct.id, contentName: `${ct.name} (复习)` }));
    }

    const byDay: DailyTask[][] = days.map(() => []);
    units.forEach((u, i) => {
      const dayIdx = Math.min(
        Math.floor((i * days.length) / Math.max(units.length, 1)),
        days.length - 1
      );
      const isReview = u.contentName.includes('(复习)');
      const hours = isReview ? 1.5 : ((contents.find((c) => c.id === u.contentId)?.importance ?? 60) / 50);
      byDay[dayIdx].push(makeTask(course, u.contentId, u.contentName, days[dayIdx], hours));
    });

    // 空余天：有章节则轮转"回顾"；无章节课程用自主/整体复习占位
    let ci = 0;
    byDay.forEach((arr, idx) => {
      if (arr.length === 0) {
        if (contents.length > 0) {
          const ct = contents[ci % contents.length];
          ci += 1;
          arr.push(makeTask(course, ct.id, `${ct.name} (回顾)`, days[idx], 1));
        } else {
          const isLast = days[idx] === lastDay;
          arr.push(makeTask(course, `${course.id}__review`, isLast ? '整体复习' : '自主复习', days[idx], isLast ? 2 : 1.5));
        }
      }
    });

    // 综合复盘钉考试前一天（仅对有章节的课程）
    if (contents.length > 0) {
      byDay[byDay.length - 1].push(makeTask(course, `${course.id}__review`, '综合复盘', lastDay, 2));
    }

    byDay.forEach((arr) => arr.forEach((t) => newTasks.push(t)));
  }

  return [...kept, ...newTasks];
};

export const getTodayTasks = (tasks: DailyTask[]): DailyTask[] => {
  const today = new Date().toISOString().split('T')[0];
  return tasks.filter((task) => task.date === today);
};

export const getProgress = (tasks: DailyTask[]): number => {
  if (tasks.length === 0) return 0;
  const completed = tasks.filter((t) => t.completed).length;
  return Math.round((completed / tasks.length) * 100);
};

export const generateMissingTasks = (
  existingTasks: DailyTask[],
  courses: Course[],
  endDate: string
): DailyTask[] => {
  const tasks: DailyTask[] = [];
  const existingDates = new Set(existingTasks.map((t) => t.date));

  const existingDatesArray = [...existingDates].sort();
  const lastExistingDate = existingDatesArray[existingDatesArray.length - 1];

  if (!lastExistingDate) return tasks;

  let currentDate = addDays(lastExistingDate, 1);

  while (currentDate <= endDate) {
    const examOnDate = courses.filter((c) => c.examDate === currentDate);

    if (examOnDate.length === 0) {
      const availableCourses = courses.filter((c) => c.examDate > currentDate);

      if (availableCourses.length > 0) {
        const course = availableCourses[0];
        const incompleteContent = course.contents.filter((c) => !c.completed);

        if (incompleteContent.length > 0) {
          tasks.push({
            id: generateId(),
            courseId: course.id,
            contentId: incompleteContent[0].id,
            contentName: incompleteContent[0].name,
            courseName: course.name,
            date: currentDate,
            completed: false,
            estimatedHours: incompleteContent[0].importance / 50,
          });
        }
      }
    }

    currentDate = addDays(currentDate, 1);
  }

  return tasks;
};
