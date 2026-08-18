import { useState, useEffect, useMemo } from 'react';
import { Target, RotateCcw, X, Menu } from 'lucide-react';
import { TaskCard } from './TaskCard';
import { MonthCalendar } from './MonthCalendar';
import type { ExamPlan, DailyTask, Material, Course } from '../types';
import { getTodayTasks, getProgress, getOverdueDebts, buildReplanSkeleton, mergeSuggestions } from '../utils/planGenerator';
import { savePlan } from '../utils/storage';
import { replanWithAI } from '../utils/aiService';
import { CourseDrawer } from './CourseDrawer';
import { CourseDetail } from './CourseDetail';

interface DashboardProps {
  plan: ExamPlan;
  onReset: () => void;
}

const groupByCourse = (list: DailyTask[]) => {
  const order: string[] = [];
  const map: Record<string, DailyTask[]> = {};
  list.forEach((t) => {
    if (!map[t.courseName]) {
      map[t.courseName] = [];
      order.push(t.courseName);
    }
    map[t.courseName].push(t);
  });
  return order.map((c) => ({ course: c, tasks: map[c] }));
};

// 圆环进度（SVG，navy 风格，零依赖）
const ProgressRing = ({ pct, label, sub }: { pct: number; label: string; sub: string }) => {
  const r = 26;
  const circ = 2 * Math.PI * r;
  const clamped = Math.min(100, Math.max(0, pct));
  const offset = circ * (1 - clamped / 100);
  return (
    <div className="flex flex-col items-center">
      <div className="relative flex items-center justify-center w-16 h-16">
        <svg width="64" height="64" viewBox="0 0 64 64" className="transform -rotate-90">
          <circle cx="32" cy="32" r={r} fill="none" stroke="#E5E7EB" strokeWidth="6" />
          <circle
            cx="32"
            cy="32"
            r={r}
            fill="none"
            stroke="#1F316D"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            className="transition-all duration-500"
          />
        </svg>
        <span className="absolute text-sm font-bold text-navy tabular-nums">{clamped}%</span>
      </div>
      <div className="text-xs font-bold text-navy mt-1">{label}</div>
      <div className="text-[10px] text-text-light">{sub}</div>
    </div>
  );
};

export const Dashboard = ({ plan, onReset }: DashboardProps) => {
  const [tasks, setTasks] = useState<DailyTask[]>(plan.tasks);
  const [todayTasks, setTodayTasks] = useState<DailyTask[]>([]);
  const [progress, setProgress] = useState(0);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  // 课程抽屉 / 详情（汉堡菜单）
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  // 今日状态（UI 先立，重排逻辑后续接）
  const [energy, setEnergy] = useState(3);
  const [availableHours, setAvailableHours] = useState('');
  // 用户「暂时忽略」的过期欠账 id（持久化到 plan，避免每日红点反复出现）
  const [dismissedDebtIds, setDismissedDebtIds] = useState<string[]>(plan.dismissedDebtIds || []);
  // AI 重排中（点确认顺延时）
  const [rolling, setRolling] = useState(false);

  useEffect(() => {
    const today = getTodayTasks(tasks);
    setTodayTasks(today);
    setProgress(getProgress(tasks));
  }, [tasks]);

  const toggleTask = (taskId: string) => {
    const updatedTasks = tasks.map((task) =>
      task.id === taskId ? { ...task, completed: !task.completed } : task
    );
    setTasks(updatedTasks);
    savePlan({ ...plan, tasks: updatedTasks });
  };

  // 通用任务更新（计时器状态、掌握度等）
  const updateTask = (taskId: string, patch: Partial<DailyTask>) => {
    const updatedTasks = tasks.map((task) =>
      task.id === taskId ? { ...task, ...patch } : task
    );
    setTasks(updatedTasks);
    savePlan({ ...plan, tasks: updatedTasks });
  };

  const daysLeft = Math.ceil(
    (new Date(plan.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  const totalAll = tasks.length;
  const doneAll = tasks.filter((t) => t.completed).length;
  const todayTotal = todayTasks.length;
  const todayDone = todayTasks.filter((t) => t.completed).length;
  const todayPct = todayTotal > 0 ? Math.round((todayDone / todayTotal) * 100) : 0;

  // 建议式顺延：找出过期未完成的欠账（未被用户忽略的），供日历红点与横幅使用
  const todayKey = new Date().toISOString().split('T')[0];
  const debts = getOverdueDebts(tasks, todayKey).filter((t) => !dismissedDebtIds.includes(t.id));
  const adjustDates = useMemo(() => new Set(debts.map((t) => t.date)), [debts]);

  const handleRollover = async () => {
    setRolling(true);
    try {
      // AI 根据剩余天数 + 逾期欠账重新规划剩余安排；日期由程序保证正确
      const { suggestions } = await replanWithAI(plan.courses, tasks, todayKey);
      const skeleton = buildReplanSkeleton(tasks, plan.courses, todayKey);
      const merged = mergeSuggestions(skeleton, suggestions);
      setTasks(merged);
      savePlan({ ...plan, tasks: merged });
    } catch (e) {
      console.warn('[Dashboard] AI 重排失败', e);
    } finally {
      setRolling(false);
    }
  };
  const handleDismissDebts = () => {
    const ids = [...new Set([...dismissedDebtIds, ...debts.map((d) => d.id)])];
    setDismissedDebtIds(ids);
    savePlan({ ...plan, tasks, dismissedDebtIds: ids });
  };

  const contentMaterials = useMemo(() => {
    const map: Record<string, Material[]> = {};
    plan.courses.forEach((c) => c.contents.forEach((ct) => { map[ct.id] = ct.materials; }));
    return map;
  }, [plan.courses]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (dateStr === today.toISOString().split('T')[0]) return '今天';
    if (dateStr === tomorrow.toISOString().split('T')[0]) return '明天';
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', weekday: 'short' });
  };

  const selectedTasks = selectedDate ? tasks.filter((t) => t.date === selectedDate) : [];
  const grouped = useMemo(() => groupByCourse(selectedTasks), [selectedTasks]);

  const toggleExpand = (id: string) => {
    setExpandedTaskId((cur) => (cur === id ? null : id));
  };

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      {/* header */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setDrawerOpen(true)}
          className="p-2 -ml-2 text-navy hover:bg-navy/10 rounded-xl transition-all"
          title="我的课程"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-navy">备考台</h1>
          <p className="text-text-light text-xs">{daysLeft}天后考试 · 总进度 {progress}%</p>
        </div>
        <button
          onClick={onReset}
          className="ml-auto p-2 text-text-dark hover:text-apple-red hover:bg-apple-red/5 rounded-xl transition-all"
          title="重新开始"
        >
          <RotateCcw className="w-5 h-5" />
        </button>
      </div>

      {/* 进度可视化：整体进度 + 今日完成（双圆环） */}
      <div className="card flex items-center justify-around py-4">
        <ProgressRing pct={progress} label="整体进度" sub={`${doneAll}/${totalAll} 项`} />
        <ProgressRing pct={todayPct} label="今日完成" sub={`${todayDone}/${todayTotal} 项`} />
      </div>

      {/* 今日状态控件 */}
      <div className="card">
        <div className="text-xs font-bold text-navy mb-2">今日状态</div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-text-light w-10">精力</span>
          <input
            type="range"
            min={1}
            max={5}
            value={energy}
            onChange={(e) => setEnergy(Number(e.target.value))}
            className="flex-1 accent-navy"
          />
          <span className="text-xs text-navy font-bold w-4">{energy}</span>
        </div>
        <div className="flex items-center gap-3 mt-2">
          <span className="text-xs text-text-light w-10">可用</span>
          <input
            type="number"
            min={0}
            value={availableHours}
            onChange={(e) => setAvailableHours(e.target.value)}
            placeholder="今天能学几小时"
            className="input-field flex-1 py-1.5"
          />
          <span className="text-xs text-text-light">小时</span>
        </div>
        <p className="text-[10px] text-text-light mt-1.5">调整后计划将自动重排（即将上线）</p>
      </div>

      {/* 建议式顺延横幅：过期未完成的欠账，日历对应日期亮红点（adjustDates） */}
      {debts.length > 0 && (
        <div className="card border-apple-red/30 bg-apple-red/5 border">
          <div className="flex items-start gap-2">
            <span className="text-apple-red text-base leading-none mt-0.5">⚠️</span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-apple-red">有 {debts.length} 个过往任务未完成</div>
              <p className="text-xs text-text-dark mt-1 leading-relaxed">
                以下任务已过期未完成，点「确认顺延」将让 AI 根据剩余时间重新规划剩余安排：
              </p>
              <ul className="text-xs text-text-dark mt-1 space-y-0.5">
                {debts.slice(0, 3).map((d) => (
                  <li key={d.id} className="truncate">· {d.date} {d.courseName}：{d.contentName}</li>
                ))}
                {debts.length > 3 && <li>· …还有 {debts.length - 3} 项</li>}
              </ul>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={handleRollover} disabled={rolling} className="btn-primary flex-1 py-2 text-sm disabled:opacity-60">
              {rolling ? 'AI 重排中…' : '确认顺延'}
            </button>
            <button
              onClick={handleDismissDebts}
              className="flex-1 py-2 text-sm rounded-xl border border-gray-200 text-text-light hover:bg-gray-50 transition-colors"
            >
              暂时忽略
            </button>
          </div>
        </div>
      )}

      {/* 全月日历 */}
      <MonthCalendar tasks={tasks} selectedDate={selectedDate} onSelectDate={setSelectedDate} adjustDates={adjustDates} />

      {/* 今日任务速览 */}
      <div>
        <h2 className="text-sm font-bold text-navy mb-2">今日任务</h2>
        {todayTasks.length === 0 ? (
          <div className="card text-center py-8">
            <div className="w-14 h-14 bg-navy/10 rounded-full flex items-center justify-center mx-auto mb-3">
              <Target className="w-7 h-7 text-navy" />
            </div>
            <p className="text-text-dark font-bold text-sm">今日任务已完成或暂无任务</p>
            <p className="text-text-light mt-1 text-xs">太棒啦！</p>
          </div>
        ) : (
          <div className="space-y-2">
            {todayTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onToggle={toggleTask}
                onUpdateTask={updateTask}
                materials={contentMaterials[task.contentId] || []}
                expanded={expandedTaskId === task.id}
                onToggleExpand={() => toggleExpand(task.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* 详情弹窗：选中日详情（按课程拆分），屏幕正中央显示 */}
      {selectedDate && (
        <div className="fixed inset-0 z-[99998] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelectedDate(null)} />
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-xl max-h-[88vh] overflow-y-auto animate-[slideUp_0.2s_ease-out]">
            <div className="sticky top-0 bg-white border-b border-gray-100 flex items-center justify-between p-4">
              <div>
                <h3 className="text-sm font-bold text-navy">{formatDate(selectedDate)}的任务</h3>
                <p className="text-xs text-text-light">{selectedDate} · 共 {selectedTasks.length} 项</p>
              </div>
              <button onClick={() => setSelectedDate(null)} className="text-text-light hover:text-text-dark">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              {grouped.length === 0 ? (
                <p className="text-sm text-text-light text-center py-6">这一天没有安排任务</p>
              ) : (
                grouped.map((g) => (
                  <div key={g.course}>
                    <div className="text-xs font-bold text-navy mb-1.5">{g.course}</div>
                    <div className="space-y-2">
                      {g.tasks.map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          onToggle={toggleTask}
                          onUpdateTask={updateTask}
                          materials={contentMaterials[task.contentId] || []}
                          expanded={expandedTaskId === task.id}
                          onToggleExpand={() => toggleExpand(task.id)}
                        />
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {drawerOpen && (
        <CourseDrawer
          open={drawerOpen}
          courses={plan.courses}
          onSelect={(c) => {
            setSelectedCourse(c);
            setDrawerOpen(false);
          }}
          onClose={() => setDrawerOpen(false)}
        />
      )}
      {selectedCourse && (
        <CourseDetail course={selectedCourse} onClose={() => setSelectedCourse(null)} />
      )}
    </div>
  );
};
