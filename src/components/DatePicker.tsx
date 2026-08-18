import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Calendar } from 'lucide-react';

interface DatePickerProps {
  value: string;
  onChange: (date: string) => void;
  placeholder?: string;
}

const WEEK = ['一', '二', '三', '四', '五', '六', '日'];
const MONTHS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

export const DatePicker = ({ value, onChange, placeholder = '选择日期' }: DatePickerProps) => {
  const today = new Date();
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<'calendar' | 'year' | 'month'>('calendar');
  // 视图年月（翻月/翻年时变化）
  const [viewYear, setViewYear] = useState(() => (value ? new Date(value).getFullYear() : today.getFullYear()));
  const [viewMonth, setViewMonth] = useState(() => (value ? new Date(value).getMonth() + 1 : today.getMonth() + 1));
  // 选中的“日”（与视图年月组合成完整日期）
  const [selectedDay, setSelectedDay] = useState(() => (value ? new Date(value).getDate() : today.getDate()));
  const [yearBase, setYearBase] = useState(() => viewYear - 2);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen]);

  const formatDisplayDate = () => {
    if (!value) return placeholder;
    const date = new Date(value);
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  };

  const getDaysInMonth = (year: number, month: number) => new Date(year, month, 0).getDate();

  const changeMonth = (delta: number) => {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 1) { m = 12; y -= 1; }
    if (m > 12) { m = 1; y += 1; }
    setViewMonth(m);
    setViewYear(y);
    const maxDay = getDaysInMonth(y, m);
    if (selectedDay > maxDay) setSelectedDay(maxDay);
  };

  const handleConfirm = () => {
    const date = new Date(Date.UTC(viewYear, viewMonth - 1, selectedDay));
    onChange(date.toISOString().split('T')[0]);
    setIsOpen(false);
  };

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDayOfMonth = new Date(viewYear, viewMonth - 1, 1).getDay();
  const offset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1; // 周一为每周第一列

  const isToday = (day: number) =>
    viewYear === today.getFullYear() && viewMonth === today.getMonth() + 1 && day === today.getDate();

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => { setIsOpen(true); setStep('calendar'); }}
        className="input-field flex items-center justify-between w-full"
      >
        <span className={value ? 'text-text-dark font-bold' : 'text-text-light'}>
          {formatDisplayDate()}
        </span>
        <Calendar className="w-5 h-5 text-text-light" />
      </button>

      {isOpen && createPortal(
        <div
          className="fixed inset-0 z-[99999] flex items-end justify-center sm:items-center"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setIsOpen(false); }}
        >
          <div className="absolute inset-0 bg-black/40" />

          <div className="relative w-full max-w-[340px] mx-4 mb-4 sm:mb-0 bg-white rounded-2xl shadow-xl overflow-hidden">
            {step === 'calendar' ? (
              <>
                {/* 月份导航 */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
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

                {/* 星期表头 */}
                <div className="grid grid-cols-7 gap-1 px-4 py-2">
                  {WEEK.map((d) => (
                    <div key={d} className="text-center text-xs text-text-light font-bold py-1">{d}</div>
                  ))}
                </div>

                {/* 日期网格 */}
                <div className="grid grid-cols-7 gap-1 px-4 pb-4">
                  {Array.from({ length: offset }).map((_, i) => (
                    <div key={`empty-${i}`} />
                  ))}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const selectedFlag = day === selectedDay;
                    const todayFlag = isToday(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => setSelectedDay(day)}
                        className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                          selectedFlag
                            ? 'bg-navy text-white'
                            : todayFlag
                              ? 'bg-navy/10 text-navy'
                              : 'text-text-dark hover:bg-gray-100'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>

                {/* 操作按钮 */}
                <div className="flex gap-2 px-4 pb-4">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="flex-1 py-2.5 text-navy font-bold rounded-xl border border-gray-200 bg-white transition-colors hover:bg-gray-50"
                  >取消</button>
                  <button
                    type="button"
                    onClick={handleConfirm}
                    className="flex-1 py-2.5 bg-navy text-white font-bold rounded-xl transition-colors hover:opacity-90"
                  >确认</button>
                </div>
              </>
            ) : step === 'year' ? (
              <>
                {/* 年份选择视图：先选年 */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                  <button
                    type="button"
                    onClick={() => setStep('calendar')}
                    className="text-navy font-bold text-sm"
                  >返回</button>
                  <span className="text-navy font-bold text-sm">选择年份</span>
                  <div className="w-8" />
                </div>

                {/* 年份导航（翻区间） */}
                <div className="flex items-center justify-between px-4 py-2">
                  <button
                    type="button"
                    onClick={() => setYearBase((y) => y - 6)}
                    className="w-8 h-8 rounded-lg text-navy hover:bg-gray-100 flex items-center justify-center text-lg"
                    aria-label="更早的年份"
                  >‹</button>
                  <span className="text-navy font-bold text-sm">{yearBase}–{yearBase + 5}年</span>
                  <button
                    type="button"
                    onClick={() => setYearBase((y) => y + 6)}
                    className="w-8 h-8 rounded-lg text-navy hover:bg-gray-100 flex items-center justify-center text-lg"
                    aria-label="更晚的年份"
                  >›</button>
                </div>

                {/* 年份网格：点选后进入月份选择 */}
                <div className="grid grid-cols-3 gap-2 px-4 pb-5">
                  {Array.from({ length: 6 }).map((_, i) => {
                    const y = yearBase + i;
                    const active = y === viewYear;
                    return (
                      <button
                        key={y}
                        type="button"
                        onClick={() => { setViewYear(y); setStep('month'); }}
                        className={`py-2.5 rounded-lg text-sm font-medium transition-colors ${
                          active
                            ? 'bg-navy text-white'
                            : 'bg-gray-50 text-text-dark hover:bg-gray-100'
                        }`}
                      >
                        {y}年
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <>
                {/* 月份选择视图：再选月 */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                  <button
                    type="button"
                    onClick={() => setStep('year')}
                    className="text-navy font-bold text-sm"
                  >返回</button>
                  <span className="text-navy font-bold text-sm">{viewYear}年 · 选择月份</span>
                  <div className="w-8" />
                </div>

                {/* 月份网格 */}
                <div className="grid grid-cols-3 gap-2 px-4 pb-5">
                  {MONTHS.map((m, idx) => {
                    const monthNum = idx + 1;
                    const active = monthNum === viewMonth;
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => { setViewMonth(monthNum); setStep('calendar'); }}
                        className={`py-2.5 rounded-lg text-sm font-medium transition-colors ${
                          active
                            ? 'bg-navy text-white'
                            : 'bg-gray-50 text-text-dark hover:bg-gray-100'
                        }`}
                      >
                        {m}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
