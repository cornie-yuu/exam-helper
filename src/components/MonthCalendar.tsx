import { useState, useMemo } from 'react';
import type { DailyTask } from '../types';

interface MonthCalendarProps {
  tasks: DailyTask[];
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
  adjustDates?: Set<string>;
}

const WEEK = ['一', '二', '三', '四', '五', '六', '日'];
const MONTHS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

// 马卡龙色板：按课程名 hash 分配，同一课程始终同色
const COURSE_COLORS = [
  { bg: '#E8D5E0', text: '#6B4C6A' }, // 藕粉
  { bg: '#D5E5ED', text: '#3A5A6E' }, // 浅蓝
  { bg: '#D5EDDF', text: '#3A6B4F' }, // 浅绿
  { bg: '#E0DDEE', text: '#4D4A6B' }, // 浅紫
  { bg: '#EDE4D5', text: '#6B5A3A' }, // 浅橙
  { bg: '#DEDDE8', text: '#5A4D6B' }, // 浅藤
];

const getCourseColor = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
  return COURSE_COLORS[Math.abs(hash) % COURSE_COLORS.length];
};

export const MonthCalendar = ({ tasks, selectedDate, onSelectDate, adjustDates }: MonthCalendarProps) => {
  const today = new Date();
  const initialYear = selectedDate ? new Date(selectedDate).getFullYear() : today.getFullYear();
  const initialMonth = selectedDate ? new Date(selectedDate).getMonth() + 1 : today.getMonth() + 1;

  const [viewYear, setViewYear] = useState(initialYear);
  const [viewMonth, setViewMonth] = useState(initialMonth);
  const [step, setStep] = useState<'calendar' | 'year' | 'month'>('calendar');
  const [yearBase, setYearBase] = useState(initialYear - 2);

  const tasksByDate = useMemo(() => {
    const map: Record<string, DailyTask[]> = {};
    tasks.forEach((t) => {
      (map[t.date] ||= []).push(t);
    });
    return map;
  }, [tasks]);

  const getDaysInMonth = (y: number, m: number) => new Date(y, m, 0).getDate();

  const changeMonth = (delta: number) => {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 1) { m = 12; y -= 1; }
    if (m > 12) { m = 1; y += 1; }
    setViewMonth(m);
    setViewYear(y);
  };

  const formatKey = (y: number, m: number, d: number) =>
    `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = new Date(viewYear, viewMonth - 1, 1).getDay();
  const offset = firstDay === 0 ? 6 : firstDay - 1;
  const todayKey = today.toISOString().split('T')[0];

  return (
    <div className="card">
      {/* 月份导航 */}
      <div className="flex items-center justify-between px-1 py-2">
        <button
          type="button"
          onClick={() => changeMonth(-1)}
          className="w-8 h-8 rounded-lg text-navy hover:bg-gray-100 flex items-center justify-center text-lg"
          aria-label="上个月"
        >‹</button>
        <button
          type="button"
          onClick={() => setStep('year')}
          className="text-navy font-bold text-sm px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors"
        >
          {viewYear}年{viewMonth}月
        </button>
        <button
          type="button"
          onClick={() => changeMonth(1)}
          className="w-8 h-8 rounded-lg text-navy hover:bg-gray-100 flex items-center justify-center text-lg"
          aria-label="下个月"
        >›</button>
      </div>

      {step === 'calendar' ? (
        <>
          <div className="grid grid-cols-7 gap-1 px-1 pb-1">
            {WEEK.map((d) => (
              <div key={d} className="text-center text-xs text-text-light font-bold py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1 px-1 pb-2">
            {Array.from({ length: offset }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const key = formatKey(viewYear, viewMonth, day);
              const dayTasks = tasksByDate[key] || [];
              const hasTasks = dayTasks.length > 0;
              const allDone = hasTasks && dayTasks.every((t) => t.completed);
              const selectedFlag = key === selectedDate;
              const todayFlag = key === todayKey;
              const adjust = adjustDates?.has(key) && !allDone;
              const courses = [...new Set(dayTasks.map((t) => t.courseName))];
              const visibleCourses = courses.slice(0, 3);
              const extraCount = courses.length - 3;
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => onSelectDate(key)}
                  className={`relative flex flex-col items-center justify-start pt-1 pb-0.5 rounded-lg transition-colors min-h-[52px] ${
                    selectedFlag
                      ? 'bg-navy text-white'
                      : todayFlag
                        ? 'bg-navy/10 text-navy'
                        : 'text-text-dark hover:bg-gray-100'
                  }`}
                >
                  <span className="text-sm font-medium leading-none">{day}</span>
                  <div className="flex flex-col items-center gap-0.5 mt-1 w-full px-0.5">
                    {visibleCourses.map((name) => {
                      const short = name.length > 5 ? `${name.slice(0, 5)}…` : name;
                      const color = getCourseColor(name);
                      return (
                        <span
                          key={name}
                          className={`text-[9px] leading-tight w-full text-center rounded px-0.5 py-[1px] truncate ${
                            selectedFlag
                              ? 'bg-white/20 text-white'
                              : ''
                          }`}
                          style={
                            selectedFlag
                              ? undefined
                              : { backgroundColor: color.bg, color: color.text }
                          }
                          title={name}
                        >
                          {short}
                        </span>
                      );
                    })}
                    {extraCount > 0 && (
                      <span
                        className={`text-[8px] leading-tight w-full text-center rounded px-0.5 py-[1px] truncate ${
                          selectedFlag
                            ? 'bg-white/15 text-white/80'
                            : 'bg-gray-100 text-text-light'
                        }`}
                      >
                        …还有{extraCount}项
                      </span>
                    )}
                  </div>
                  {allDone && hasTasks && (
                    <span className={`absolute top-1 right-1 w-1.5 h-1.5 rounded-full ${selectedFlag ? 'bg-white' : 'bg-navy'}`} />
                  )}
                  {adjust && (
                    <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-apple-red" />
                  )}
                </button>
              );
            })}
          </div>
        </>
      ) : step === 'year' ? (
        <>
          <div className="flex items-center justify-between px-1 py-2">
            <button type="button" onClick={() => setStep('calendar')} className="text-navy font-bold text-sm">返回</button>
            <span className="text-navy font-bold text-sm">选择年份</span>
            <div className="w-8" />
          </div>
          <div className="flex items-center justify-between px-1 py-1">
            <button type="button" onClick={() => setYearBase((y) => y - 6)} className="w-8 h-8 rounded-lg text-navy hover:bg-gray-100 flex items-center justify-center text-lg" aria-label="更早的年份">‹</button>
            <span className="text-navy font-bold text-sm">{yearBase}–{yearBase + 5}年</span>
            <button type="button" onClick={() => setYearBase((y) => y + 6)} className="w-8 h-8 rounded-lg text-navy hover:bg-gray-100 flex items-center justify-center text-lg" aria-label="更晚的年份">›</button>
          </div>
          <div className="grid grid-cols-3 gap-2 px-1 pb-3">
            {Array.from({ length: 6 }).map((_, i) => {
              const y = yearBase + i;
              const active = y === viewYear;
              return (
                <button
                  key={y}
                  type="button"
                  onClick={() => { setViewYear(y); setStep('month'); }}
                  className={`py-2.5 rounded-lg text-sm font-medium transition-colors ${active ? 'bg-navy text-white' : 'bg-gray-50 text-text-dark hover:bg-gray-100'}`}
                >
                  {y}年
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center justify-between px-1 py-2">
            <button type="button" onClick={() => setStep('year')} className="text-navy font-bold text-sm">返回</button>
            <span className="text-navy font-bold text-sm">{viewYear}年 · 选择月份</span>
            <div className="w-8" />
          </div>
          <div className="grid grid-cols-3 gap-2 px-1 pb-3">
            {MONTHS.map((m, idx) => {
              const monthNum = idx + 1;
              const active = monthNum === viewMonth;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => { setViewMonth(monthNum); setStep('calendar'); }}
                  className={`py-2.5 rounded-lg text-sm font-medium transition-colors ${active ? 'bg-navy text-white' : 'bg-gray-50 text-text-dark hover:bg-gray-100'}`}
                >
                  {m}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
