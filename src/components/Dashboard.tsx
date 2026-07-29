import { useState, useEffect } from 'react';
import { Calendar, Target, Award, RotateCcw, ArrowLeft, ChevronDown, ChevronUp, X } from 'lucide-react';
import { TaskCard } from './TaskCard';
import { ProgressBar } from './ProgressBar';
import type { ExamPlan, DailyTask } from '../types';
import { getTodayTasks, getProgress } from '../utils/planGenerator';
import { savePlan } from '../utils/storage';

interface DashboardProps {
  plan: ExamPlan;
  onReset: () => void;
  onBack: () => void;
}

export const Dashboard = ({ plan, onReset, onBack }: DashboardProps) => {
  const [tasks, setTasks] = useState<DailyTask[]>(plan.tasks);
  const [todayTasks, setTodayTasks] = useState<DailyTask[]>([]);
  const [progress, setProgress] = useState(0);
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    const today = getTodayTasks(tasks);
    setTodayTasks(today);
    setProgress(getProgress(tasks));
  }, [tasks]);

  const toggleTask = (taskId: string) => {
    const updatedTasks = tasks.map(task =>
      task.id === taskId ? { ...task, completed: !task.completed } : task
    );
    setTasks(updatedTasks);
    
    const updatedPlan = { ...plan, tasks: updatedTasks };
    savePlan(updatedPlan);
  };

  const daysLeft = Math.ceil((new Date(plan.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  const completedToday = todayTasks.filter(t => t.completed).length;
  const totalToday = todayTasks.length;

  const getTasksByDate = (date: string) => {
    return tasks.filter(t => t.date === date);
  };

  const getAllDates = () => {
    const dates = [...new Set(tasks.map(t => t.date))];
    return dates.sort();
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (dateStr === today.toISOString().split('T')[0]) {
      return '今天';
    }
    if (dateStr === tomorrow.toISOString().split('T')[0]) {
      return '明天';
    }
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', weekday: 'short' });
  };

  const getSelectedDateTasks = () => {
    if (!selectedDate) return [];
    return getTasksByDate(selectedDate);
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 text-text-dark hover:text-sage hover:bg-cream rounded-xl transition-all"
            title="返回修改"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-text-dark">📚 今日学习</h1>
            <p className="text-text-light mt-1">
              {new Date().toLocaleDateString('zh-CN', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>
        <button
          onClick={onReset}
          className="p-2 text-text-dark hover:text-coral hover:bg-coral/10 rounded-xl transition-all"
          title="重新开始"
        >
          <RotateCcw className="w-6 h-6" />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <button
          onClick={() => setShowCalendar(!showCalendar)}
          className="card card-hover text-center cursor-pointer"
        >
          <div className="w-12 h-12 bg-sage/20 rounded-2xl flex items-center justify-center mx-auto mb-2">
            <Calendar className="w-6 h-6 text-sage" />
          </div>
          <p className="text-xl sm:text-2xl font-bold text-text-dark">{daysLeft}</p>
          <p className="text-sm text-text-light">剩余天数</p>
          {showCalendar ? (
            <ChevronUp className="w-4 h-4 text-text-light mx-auto mt-1" />
          ) : (
            <ChevronDown className="w-4 h-4 text-text-light mx-auto mt-1" />
          )}
        </button>
        
        <div className="card text-center">
          <div className="w-12 h-12 bg-coral/20 rounded-2xl flex items-center justify-center mx-auto mb-2">
            <Target className="w-6 h-6 text-coral" />
          </div>
          <p className="text-xl sm:text-2xl font-bold text-text-dark">{completedToday}/{totalToday}</p>
          <p className="text-sm text-text-light">今日完成</p>
        </div>
        
        <div className="card text-center">
          <div className="w-12 h-12 bg-sage/20 rounded-2xl flex items-center justify-center mx-auto mb-2">
            <Award className="w-6 h-6 text-sage" />
          </div>
          <p className="text-xl sm:text-2xl font-bold text-text-dark">{progress}%</p>
          <p className="text-sm text-text-light">总进度</p>
        </div>
      </div>

      {showCalendar && (
        <div className="card max-h-64 overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-text-dark text-lg">📅 学习日历</h3>
            <button
              onClick={() => setShowCalendar(false)}
              className="text-text-light hover:text-text-dark"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {getAllDates().map(date => {
              const dateTasks = getTasksByDate(date);
              const isToday = date === today;
              const isSelected = date === selectedDate;
              const completed = dateTasks.every(t => t.completed);
              const hasTasks = dateTasks.length > 0;
              
              return (
                <button
                  key={date}
                  onClick={() => setSelectedDate(isSelected ? null : date)}
                  className={`p-3 rounded-xl text-left transition-all border-2 ${
                    isSelected ? 'bg-sage text-white border-text-dark' :
                    isToday ? 'bg-coral/10 border-coral' :
                    completed ? 'bg-sage/10 border-sage' :
                    hasTasks ? 'bg-cream border-text-dark/50 hover:border-text-dark' :
                    'bg-white/50 border-transparent opacity-50'
                  }`}
                >
                  <p className="font-bold text-sm">{formatDate(date)}</p>
                  <p className="text-xs mt-1 opacity-70">{dateTasks.length}个任务</p>
                  {completed && hasTasks && (
                    <p className="text-xs mt-1">✓ 已完成</p>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="font-bold text-text-dark text-lg">📖 学习进度</h2>
        </div>
        <ProgressBar progress={progress} />
      </div>

      <div>
        <h2 className="text-lg sm:text-xl font-bold text-text-dark mb-4">📝 今日任务</h2>
        
        {todayTasks.length === 0 ? (
          <div className="card text-center py-12">
            <div className="w-20 h-20 bg-sage/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Target className="w-10 h-10 text-sage" />
            </div>
            <p className="text-text-dark font-bold">今日任务已完成或暂无任务</p>
            <p className="text-text-light mt-1">太棒啦！🎉</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {todayTasks.map(task => (
              <TaskCard key={task.id} task={task} onToggle={toggleTask} />
            ))}
          </div>
        )}
      </div>

      {selectedDate && (
        <div className="modal-container">
          <div className="modal-content">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-text-dark">
                  {formatDate(selectedDate)}的任务
                </h3>
                <p className="text-sm text-text-light">{selectedDate}</p>
              </div>
              <button
                onClick={() => setSelectedDate(null)}
                className="text-text-light hover:text-text-dark"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-3 mb-6">
              {getSelectedDateTasks().map(task => (
                <div key={task.id} className="flex items-center justify-between p-4 bg-cream rounded-xl border-2 border-text-dark">
                  <div>
                    <p className="font-bold text-text-dark">{task.contentName}</p>
                    <p className="text-sm text-text-light">{task.courseName}</p>
                  </div>
                  {task.completed && (
                    <div className="w-6 h-6 bg-sage rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">✓</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {(() => {
              const selectedTasks = plan.tasks.filter(t => t.date === selectedDate);
              if (selectedTasks.length === 0) return null;
              
              const suggestions = selectedTasks
                .filter(t => t.suggestion)
                .map((t, idx) => {
                  const cleanSuggestion = t.suggestion?.replace(/^[：:]+\s*/, '') || '';
                  return `${idx + 1}. 【${t.courseName} - ${t.contentName.replace(/（重点：.*）/g, '')}】\n${cleanSuggestion}`;
                });
              
              if (suggestions.length === 0) return null;
              
              return (
                <div className="highlight-box">
                  <h4 className="font-bold text-text-dark mb-2">📚 当天学习建议</h4>
                  <div className="text-text-dark text-sm whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                    {suggestions.join('\n\n')}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};
