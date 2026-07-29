import { useState } from 'react';
import { Check, Sparkles, Eye, ChevronDown, ChevronUp } from 'lucide-react';
import type { ExamPlan } from '../types';

interface PlanOption {
  id: string;
  name: string;
  description: string;
  color: string;
  tasks: any[];
}

interface PlanSelectorProps {
  plans: PlanOption[];
  onSelect: (plan: ExamPlan) => void;
  onBack: () => void;
  courses: any[];
  startDate: string;
}

const colorMap: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  green: {
    bg: 'bg-green-50',
    border: 'border-green-200 hover:border-green-400',
    text: 'text-green-600',
    icon: 'bg-green-500',
  },
  cyan: {
    bg: 'bg-cyan-50',
    border: 'border-cyan-200 hover:border-cyan-400',
    text: 'text-cyan-600',
    icon: 'bg-cyan-500',
  },
  purple: {
    bg: 'bg-purple-50',
    border: 'border-purple-200 hover:border-purple-400',
    text: 'text-purple-600',
    icon: 'bg-purple-500',
  },
};

export const PlanSelector = ({ plans, onSelect, onBack, courses, startDate }: PlanSelectorProps) => {
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);

  const getLatestExamDate = () => {
    return courses.reduce((latest, course) => {
      return course.examDate > latest ? course.examDate : latest;
    }, startDate);
  };

  const handleSelect = (planOption: PlanOption) => {
    const plan: ExamPlan = {
      id: `plan-${Date.now()}`,
      startDate,
      endDate: getLatestExamDate(),
      learningStyle: planOption.id as any,
      courses,
      tasks: planOption.tasks,
    };
    onSelect(plan);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  };

  const getTasksByDate = (tasks: any[]) => {
    const grouped: Record<string, any[]> = {};
    tasks.forEach(task => {
      if (!grouped[task.date]) {
        grouped[task.date] = [];
      }
      grouped[task.date].push(task);
    });
    return grouped;
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-pink-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Sparkles className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-text-dark">DeepSeek为你生成3个方案</h1>
        <p className="text-gray-500 mt-2">点击预览详情，选择最适合你的学习计划</p>
      </div>

      <div className="space-y-4">
        {plans.map((plan) => {
          const colors = colorMap[plan.color] || colorMap.green;
          const isExpanded = expandedPlan === plan.id;
          const tasksByDate = getTasksByDate(plan.tasks);

          return (
            <div key={plan.id} className={`rounded-2xl border-2 transition-all duration-200 ${colors.bg} ${colors.border}`}>
              <button
                onClick={() => setExpandedPlan(isExpanded ? null : plan.id)}
                className="w-full p-6 text-left"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 ${colors.icon} rounded-xl flex items-center justify-center flex-shrink-0`}>
                    <Check className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className={`text-lg sm:text-xl font-bold ${colors.text}`}>{plan.name}</h3>
                    <p className="text-gray-600 mt-1">{plan.description}</p>
                    <div className="flex gap-4 mt-3 text-sm text-gray-500">
                      <span>📚 {courses.length} 门课程</span>
                      <span>✅ {plan.tasks.filter((t: any) => t.completed).length} 已完成</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Eye className="w-5 h-5 text-gray-400" />
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </div>
              </button>

{isExpanded && (
  <div className="px-6 pb-6 border-t border-gray-200">
    <div className="pt-4 space-y-4">
      {Object.entries(tasksByDate).map(([date, dayTasks]) => (
        <div key={date} className="bg-white rounded-xl p-4">
          <h4 className="font-medium text-gray-800 mb-2">{formatDate(date)}</h4>
          <div className="space-y-3">
            {dayTasks.map((task: any, idx: number) => (
              <div key={idx} className="space-y-1">
                <div className="flex items-center gap-2 text-sm">
                  <span className="w-2 h-2 rounded-full bg-green-400"></span>
                  <span className="text-gray-700">{task.courseName} - {task.contentName}</span>
                  <span className="text-gray-400 ml-auto"></span>
                </div>
                {task.suggestion && (
                  <div className="ml-4 pl-2 border-l-2 border-pink-300">
                    <p className="text-xs text-pink-600 bg-pink-50 p-2 rounded-lg">
                      💡 {task.suggestion}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>

    <button
      onClick={() => handleSelect(plan)}
      className={`w-full mt-4 py-3 rounded-xl font-medium ${colors.icon} text-white hover:opacity-90 transition-opacity`}
    >
      使用此方案
    </button>
  </div>
)}
            </div>
          );
        })}
      </div>

      <button
        onClick={onBack}
        className="w-full py-3 text-gray-500 hover:text-gray-700 transition-colors"
      >
        ← 返回修改课程信息
      </button>
    </div>
  );
};
