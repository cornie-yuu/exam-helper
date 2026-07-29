import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Calendar } from 'lucide-react';

interface DatePickerProps {
  value: string;
  onChange: (date: string) => void;
  placeholder?: string;
}

export const DatePicker = ({ value, onChange, placeholder = '选择日期' }: DatePickerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [selectedYear, setSelectedYear] = useState(() => {
    if (value) return new Date(value).getFullYear();
    return new Date().getFullYear();
  });
  const [selectedMonth, setSelectedMonth] = useState(() => {
    if (value) return new Date(value).getMonth() + 1;
    return new Date().getMonth() + 1;
  });
  const [selectedDay, setSelectedDay] = useState(() => {
    if (value) return new Date(value).getDate();
    return new Date().getDate();
  });
  const buttonRef = useRef<HTMLDivElement>(null);

  const updatePosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const newPosition = {
        top: rect.bottom + 8,
        left: rect.left,
      };
      setPosition(newPosition);
    }
  };

  const openCalendar = () => {
    updatePosition();
    setIsOpen(true);
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleScroll = () => {
      updatePosition();
    };

    const handleResize = () => {
      updatePosition();
    };

    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest('.date-picker-portal')) return;
      if (buttonRef.current?.contains(target)) return;
      setIsOpen(false);
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const formatDisplayDate = () => {
    if (!value) return placeholder;
    const date = new Date(value);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${year}年${month}月${day}日`;
  };

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month, 0).getDate();
  };

  const handleConfirm = () => {
    const date = new Date(Date.UTC(selectedYear, selectedMonth - 1, selectedDay));
    onChange(date.toISOString().split('T')[0]);
    setIsOpen(false);
  };

  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 2 + i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <div ref={buttonRef} style={{ position: 'relative', zIndex: 1 }}>
      <button
        type="button"
        onClick={openCalendar}
        className="input-field flex items-center justify-between w-full"
      >
        <span className={value ? 'text-text-dark font-bold' : 'text-text-light'}>
          {formatDisplayDate()}
        </span>
        <Calendar className="w-5 h-5 text-text-light" />
      </button>

      {isOpen && createPortal(
        <div 
          className="date-picker-portal"
          style={{
            position: 'fixed',
            top: position.top,
            left: position.left,
            zIndex: 99999,
            transition: 'top 0.05s ease-out',
            backgroundColor: '#FAF8F5',
            borderRadius: '1rem',
            boxShadow: '0 6px 0 #1A1A1A',
            border: '2px solid #1A1A1A',
            width: '320px',
            padding: '16px',
          }}
        >
          <div className="flex gap-2 mb-4">
            <select
              value={selectedYear}
              onChange={(e) => {
                const year = Number(e.target.value);
                setSelectedYear(year);
                const maxDay = getDaysInMonth(year, selectedMonth);
                if (selectedDay > maxDay) setSelectedDay(maxDay);
              }}
              className="flex-1 px-3 py-2 border-2 border-text-dark rounded-xl text-center bg-white font-bold"
            >
              {years.map(year => (
                <option key={year} value={year}>{year}年</option>
              ))}
            </select>
            <select
              value={selectedMonth}
              onChange={(e) => {
                const month = Number(e.target.value);
                setSelectedMonth(month);
                const maxDay = getDaysInMonth(selectedYear, month);
                if (selectedDay > maxDay) setSelectedDay(maxDay);
              }}
              className="flex-1 px-3 py-2 border-2 border-text-dark rounded-xl text-center bg-white font-bold"
            >
              {months.map(month => (
                <option key={month} value={month}>{month}月</option>
              ))}
            </select>
            <select
              value={selectedDay}
              onChange={(e) => setSelectedDay(Number(e.target.value))}
              className="flex-1 px-3 py-2 border-2 border-text-dark rounded-xl text-center bg-white font-bold"
            >
              {days.map(day => (
                <option key={day} value={day}>{day}日</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-4">
            {['一', '二', '三', '四', '五', '六', '日'].map(day => (
              <div key={day} className="text-center text-xs text-text-light font-bold py-1">
                {day}
              </div>
            ))}
            {(() => {
              const firstDayOfMonth = new Date(selectedYear, selectedMonth - 1, 1).getDay();
              const offset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
              const cells = [];
              for (let i = 0; i < offset; i++) {
                cells.push(<div key={`empty-${i}`} />);
              }
              for (let day = 1; day <= daysInMonth; day++) {
                const isSelected = day === selectedDay;
                cells.push(
                  <button
                    key={day}
                    type="button"
                    onClick={() => setSelectedDay(day)}
                    className={`w-8 h-8 rounded-lg text-sm font-bold transition-all ${
                      isSelected
                        ? 'bg-sage text-white'
                        : 'hover:bg-white text-text-dark border-2 border-transparent hover:border-text-dark'
                    }`}
                  >
                    {day}
                  </button>
                );
              }
              return cells;
            })()}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="flex-1 py-2 text-text-dark font-bold hover:bg-white rounded-xl border-2 border-text-dark transition-all"
              style={{ boxShadow: '0 3px 0 #1A1A1A' }}
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="flex-1 py-2 bg-sage text-text-dark font-bold rounded-xl border-2 border-text-dark transition-all hover:translate-y-0.5"
              style={{ boxShadow: '0 3px 0 #1A1A1A' }}
            >
              确认
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
