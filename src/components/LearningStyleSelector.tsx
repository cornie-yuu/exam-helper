import { TrendingUp, Zap, RefreshCw } from 'lucide-react';
import type { LearningStyle } from '../types';

interface LearningStyleSelectorProps {
  selected: LearningStyle;
  onChange: (style: LearningStyle) => void;
}

const styles: { value: LearningStyle; label: string; icon: typeof TrendingUp; description: string }[] = [
  {
    value: 'steady',
    label: '稳健型',
    icon: TrendingUp,
    description: '每天均匀分配学习内容和时间，保持稳定节奏',
  },
  {
    value: 'sprint',
    label: '冲刺型',
    icon: Zap,
    description: '优先学习重要内容，跳过难但不考的部分',
  },
  {
    value: 'memory',
    label: '记忆曲线型',
    icon: RefreshCw,
    description: '每隔2天重复复习，强化记忆效果',
  },
];

export const LearningStyleSelector = ({ selected, onChange }: LearningStyleSelectorProps) => {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-800">选择学习风格</h2>
      <div className="grid gap-3">
        {styles.map(({ value, label, icon: Icon, description }) => (
          <button
            key={value}
            onClick={() => onChange(value)}
            className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-200 text-left ${
              selected === value
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-100 hover:border-primary-200 hover:bg-gray-50'
            }`}
          >
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                selected === value
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 text-gray-400'
              }`}
            >
              <Icon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">{label}</h3>
              <p className="text-sm text-gray-500 mt-1">{description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
