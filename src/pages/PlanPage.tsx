import { Dashboard } from '../components/Dashboard';
import type { ExamPlan } from '../types';
import { Calendar } from 'lucide-react';

interface PlanPageProps {
  plan: ExamPlan | null;
  onReset: () => void;
}

export const PlanPage = ({ plan, onReset }: PlanPageProps) => {
  if (!plan) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <div className="max-w-2xl mx-auto p-4">
          <h1 className="text-xl font-bold text-navy mb-4">计划</h1>
          
          <div className="card text-center py-12">
            <div className="w-16 h-16 bg-navy/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-navy" />
            </div>
            <h2 className="text-lg font-bold text-text-dark mb-2">暂无学习计划</h2>
            <p className="text-sm text-text-light">
              请先在"开始"页添加课程并生成AI学习计划
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Dashboard plan={plan} onReset={onReset} />
    </div>
  );
};
