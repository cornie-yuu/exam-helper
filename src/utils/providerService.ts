// AI 模型供应商切换：DeepSeek（默认）与阿里云通义（文本对话，替代仅图片识别）可互换。
// 模式：auto = DeepSeek 优先，失败自动转阿里云；deepseek = 仅 DeepSeek；aliyun = 仅阿里云通义。
// 设置存 localStorage，全局生效（聊天与计划生成共用）。

export type ProviderMode = 'auto' | 'deepseek' | 'aliyun';
export type ActiveProvider = 'deepseek' | 'aliyun';

const STORAGE_KEY = 'kqzs_provider_mode';

export const PROVIDER_MODE_LABELS: Record<ProviderMode, string> = {
  auto: '自动（DeepSeek 优先）',
  deepseek: '仅 DeepSeek',
  aliyun: '仅阿里云通义',
};

export const ACTIVE_PROVIDER_LABELS: Record<ActiveProvider, string> = {
  deepseek: 'DeepSeek',
  aliyun: '阿里云通义',
};

export const getProviderMode = (): ProviderMode => {
  const v = localStorage.getItem(STORAGE_KEY);
  return v === 'deepseek' || v === 'aliyun' || v === 'auto' ? (v as ProviderMode) : 'auto';
};

export const setProviderMode = (mode: ProviderMode): void => {
  localStorage.setItem(STORAGE_KEY, mode);
};
