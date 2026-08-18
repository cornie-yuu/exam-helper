import type { DailyTask, CourseContent } from '../types';

export type RiskLevel = 'high' | 'medium' | 'low';

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/**
 * 单个任务的风险分（0-100）。
 * 基础风险 = 重要性(0-100) × 不熟悉度(1 - 熟悉度/100)，
 * 再被用户自评掌握度拉低：实际风险 = 基础风险 × (1 - 掌握度/100)。
 * 未评掌握度时按基础风险计。
 */
export const computeTaskRisk = (task: DailyTask, content?: CourseContent): number => {
  if (!content) return 0;
  const importance = clamp(content.importance ?? 50, 0, 100);
  const familiarity = clamp(content.familiarity ?? 30, 0, 100);
  const baseRisk = (importance / 100) * (1 - familiarity / 100) * 100;
  const mastery = clamp(task.masteryScore ?? 0, 0, 100);
  const actual = baseRisk * (1 - mastery / 100);
  return Math.round(actual);
};

export const riskLevel = (score: number): RiskLevel => {
  if (score >= 50) return 'high';
  if (score >= 25) return 'medium';
  return 'low';
};

export const RISK_META: Record<RiskLevel, { label: string; dot: string; badge: string }> = {
  high: { label: '高风险', dot: 'bg-apple-red', badge: 'bg-apple-red/10 text-apple-red' },
  medium: { label: '中风险', dot: 'bg-amber-400', badge: 'bg-amber-100 text-amber-600' },
  low: { label: '低风险', dot: 'bg-green-500', badge: 'bg-green-100 text-green-600' },
};

/** 一天的风险等级：取当天所有任务中的最高风险 */
export const dayRiskLevel = (scores: number[]): RiskLevel | null => {
  if (scores.length === 0) return null;
  const max = Math.max(...scores);
  return riskLevel(max);
};
