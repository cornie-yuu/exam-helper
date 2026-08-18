import { useState, useEffect } from 'react';
import { CheckCircle, Circle, ChevronDown, FileText, Play, Pause, Square, RotateCcw, Eye, X, Download } from 'lucide-react';
import type { DailyTask, Material } from '../types';
import { getFileBlob } from '../utils/fileStore';

interface TaskCardProps {
  task: DailyTask;
  onToggle: (taskId: string) => void;
  onUpdateTask: (taskId: string, patch: Partial<DailyTask>) => void;
  materials?: Material[];
  expanded?: boolean;
  onToggleExpand?: () => void;
}

const formatTime = (totalSeconds: number) => {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

// 手机式计时器：未开始/计时中/已暂停/已结束 四态；计划时长可由用户自定义
const TimerSection = ({
  task,
  onUpdate,
}: {
  task: DailyTask;
  onUpdate: (patch: Partial<DailyTask>) => void;
}) => {
  const [, setTick] = useState(0);

  const fallbackMin = Math.max(1, Math.round((task.estimatedHours || 0.5) * 60));
  const [draftMin, setDraftMin] = useState<number>(task.plannedMinutes ?? fallbackMin);

  useEffect(() => {
    if (!task.timerRunning) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [task.timerRunning]);

  // 运行时时长直接用真实当前时间计算，避免依赖每秒才刷新的 state 导致出现负值/跳秒
  const runningElapsed = task.timerRunning && task.timerStart
    ? Math.max(0, Math.floor((Date.now() - task.timerStart) / 1000))
    : 0;
  const total = (task.timerAccumulated || 0) + runningElapsed;
  const plannedSec = (task.plannedMinutes ?? draftMin) * 60;
  const pct = plannedSec > 0 ? Math.min(100, Math.round((total / plannedSec) * 100)) : 0;

  const start = () => onUpdate({ plannedMinutes: draftMin, timerRunning: true, timerStart: Date.now() });
  const pause = () => {
    const add = task.timerStart ? Math.floor((Date.now() - task.timerStart) / 1000) : 0;
    onUpdate({ timerRunning: false, timerStart: undefined, timerAccumulated: (task.timerAccumulated || 0) + add });
  };
  const end = () => {
    const add = task.timerStart ? Math.floor((Date.now() - task.timerStart) / 1000) : 0;
    const finalSeconds = (task.timerAccumulated || 0) + add;
    onUpdate({
      timerRunning: false,
      timerStart: undefined,
      timerAccumulated: undefined,
      actualSeconds: finalSeconds,
      completed: true,
    });
  };

  // 重新开始：清零并立即重新计时
  const restart = () =>
    onUpdate({
      plannedMinutes: draftMin,
      timerRunning: true,
      timerStart: Date.now(),
      timerAccumulated: 0,
      actualSeconds: undefined,
      completed: false,
    });

  // 计划时长输入（未开始 / 已暂停时可编辑）
  const MinInput = (
    <div className="flex items-center gap-1.5">
      <span className="text-[11px] text-text-light">计划</span>
      <input
        type="number"
        min={1}
        max={600}
        value={draftMin}
        onChange={(e) => setDraftMin(Math.max(1, Math.min(600, Number(e.target.value) || 1)))}
        className="input-field w-16 py-1 text-center text-xs"
      />
      <span className="text-[11px] text-text-light">分</span>
    </div>
  );

  // 已结束：显示实际用时
  if (task.actualSeconds != null && !task.timerRunning) {
    return (
      <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 flex items-center justify-between gap-3">
        <div className="flex flex-col">
          <span className="text-xs text-text-light">实际用时</span>
          <span className="text-lg font-bold text-navy tabular-nums">{formatTime(task.actualSeconds)}</span>
        </div>
        <button
          type="button"
          onClick={restart}
          className="flex-shrink-0 py-2 px-3 rounded-xl border border-gray-200 text-navy font-bold text-xs flex items-center justify-center gap-1.5 transition-colors hover:bg-white"
        >
          <RotateCcw className="w-3.5 h-3.5" /> 重新开始
        </button>
      </div>
    );
  }

  // 计时中
  if (task.timerRunning) {
    return (
      <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-text-light">计时中</span>
          <span className="text-lg font-bold text-navy tabular-nums">{formatTime(total)}</span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-gray-200 overflow-hidden mb-2">
          <div className="h-full rounded-full bg-navy transition-all" style={{ width: `${pct}%` }} />
        </div>
        <div className="mb-2">{MinInput}</div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={pause}
            className="flex-1 py-2 rounded-xl border border-gray-200 text-navy font-bold text-xs flex items-center justify-center gap-1.5 transition-colors hover:bg-white"
          >
            <Pause className="w-3.5 h-3.5" /> 暂停
          </button>
          <button
            type="button"
            onClick={end}
            className="flex-1 py-2 rounded-xl bg-navy text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-opacity hover:opacity-90"
          >
            <Square className="w-3.5 h-3.5" /> 结束
          </button>
          <button
            type="button"
            onClick={restart}
            className="flex-1 py-2 rounded-xl border border-gray-200 text-navy font-bold text-xs flex items-center justify-center gap-1.5 transition-colors hover:bg-white"
          >
            <RotateCcw className="w-3.5 h-3.5" /> 重新开始
          </button>
        </div>
      </div>
    );
  }

  // 已暂停（有累计时长）
  if ((task.timerAccumulated || 0) > 0) {
    return (
      <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-text-light">已暂停</span>
          <span className="text-lg font-bold text-navy tabular-nums">{formatTime(total)}</span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-gray-200 overflow-hidden mb-2">
          <div className="h-full rounded-full bg-navy transition-all" style={{ width: `${pct}%` }} />
        </div>
        <div className="mb-2">{MinInput}</div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={start}
            className="flex-1 py-2 rounded-xl bg-navy text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-opacity hover:opacity-90"
          >
            <Play className="w-3.5 h-3.5" /> 继续
          </button>
          <button
            type="button"
            onClick={end}
            className="flex-1 py-2 rounded-xl border border-gray-200 text-navy font-bold text-xs flex items-center justify-center gap-1.5 transition-colors hover:bg-white"
          >
            <Square className="w-3.5 h-3.5" /> 结束
          </button>
          <button
            type="button"
            onClick={restart}
            className="flex-1 py-2 rounded-xl border border-gray-200 text-navy font-bold text-xs flex items-center justify-center gap-1.5 transition-colors hover:bg-white"
          >
            <RotateCcw className="w-3.5 h-3.5" /> 重新开始
          </button>
        </div>
      </div>
    );
  }

  // 未开始
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 flex flex-col gap-2">
      {MinInput}
      <button
        type="button"
        onClick={start}
        className="w-full py-2.5 rounded-xl bg-navy text-white font-bold text-sm flex items-center justify-center gap-1.5 transition-opacity hover:opacity-90"
      >
        <Play className="w-4 h-4" /> 开始计时
      </button>
    </div>
  );
};

// 课件资料行：与资料 tab 一致——只显示文件名 + 眼睛图标预览原始文件 + 已纳入 AI 知识 chip（不展示解析文字）
const MaterialRow = ({
  material,
  onPreview,
}: {
  material: Material;
  onPreview: (m: Material) => void;
}) => (
  <div className="border border-gray-100 rounded-lg p-2 flex items-center gap-2">
    <FileText className="w-3.5 h-3.5 text-navy flex-shrink-0" />
    <span className="text-xs font-bold text-text-dark truncate flex-1">{material.name}</span>
    {material.fileId && (
      <button
        type="button"
        onClick={() => onPreview(material)}
        className="p-1 text-navy hover:bg-navy/10 rounded-md transition-colors flex-shrink-0"
        title="预览原始课件"
      >
        <Eye className="w-4 h-4" />
      </button>
    )}
    <span className="chip flex-shrink-0">已纳入 AI 知识</span>
  </div>
);

export const TaskCard = ({
  task,
  onToggle,
  onUpdateTask,
  materials = [],
  expanded = false,
  onToggleExpand,
}: TaskCardProps) => {
  const mainContent = task.contentName.replace(/（重点：.*）/g, '').replace(/\(重点：.*\)/g, '');
  const update = (patch: Partial<DailyTask>) => onUpdateTask(task.id, patch);

  const [preview, setPreview] = useState<{ name: string; url: string; mimeType: string } | null>(null);
  const handlePreview = async (m: Material) => {
    if (!m.fileId) return;
    try {
      const stored = await getFileBlob(m.fileId);
      if (!stored) {
        alert('原始文件未保存，无法预览');
        return;
      }
      const url = URL.createObjectURL(stored.blob);
      setPreview({ name: stored.name, url, mimeType: stored.mimeType || m.mimeType || '' });
    } catch {
      alert('预览失败，请重试');
    }
  };
  const closePreview = () => {
    if (preview) URL.revokeObjectURL(preview.url);
    setPreview(null);
  };

  return (
    <>
    <div className={`task-card ${task.completed ? 'completed' : ''} ${expanded ? 'shadow-sm' : ''}`}>
      <div className="flex items-center gap-3 p-3" onClick={onToggleExpand}>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onToggle(task.id); }}
          className="flex-shrink-0"
          aria-label={task.completed ? '取消完成' : '标记完成'}
        >
          {task.completed ? (
            <div className="w-7 h-7 bg-navy rounded-full flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-white" />
            </div>
          ) : (
            <div className="w-7 h-7 bg-white border-2 border-gray-200 rounded-full flex items-center justify-center hover:border-navy/50 transition-all">
              <Circle className="w-4 h-4 text-gray-300" />
            </div>
          )}
        </button>

        <div className="flex-1 min-w-0">
          <h3
            className={`font-bold text-sm leading-snug ${
              task.completed ? 'text-text-light line-through' : 'text-text-dark'
            }`}
          >
            {mainContent}
          </h3>
          <p className="text-xs text-text-light mt-1 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-navy rounded-full flex-shrink-0" />
            <span className="truncate">{task.courseName}</span>
          </p>
        </div>

        <ChevronDown
          className={`w-4 h-4 text-text-light transition-transform flex-shrink-0 ${
            expanded ? 'rotate-180' : ''
          }`}
        />
      </div>

      {expanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-gray-100 pt-3">
          {/* 学习建议（按课程粒度） */}
          {task.suggestion && (
            <div>
              <div className="text-xs font-bold text-navy mb-1">学习建议</div>
              <p className="text-sm text-text-dark whitespace-pre-wrap leading-relaxed">
                {task.suggestion.replace(/^[：:]\s*/, '')}
              </p>
            </div>
          )}

          {/* 课件资料（内嵌查看：点击展开原文） */}
          <div>
            <div className="text-xs font-bold text-navy mb-1">课件资料</div>
            {materials.length > 0 ? (
              <div className="space-y-1">
                {materials.map((m, i) => (
                  <MaterialRow key={i} material={m} onPreview={handlePreview} />
                ))}
              </div>
            ) : (
              <p className="text-xs text-text-light">暂未上传课件</p>
            )}
          </div>

          {/* 计时器（手机式：开始/暂停/结束） */}
          <TimerSection task={task} onUpdate={update} />

          {/* 掌握度（0-100 用户自评滑块） */}
          <div>
            <div className="text-xs font-bold text-navy mb-2 flex items-center justify-between">
              <span>掌握度</span>
              <span className="text-navy font-bold tabular-nums">{task.masteryScore ?? 0} 分</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={task.masteryScore ?? 0}
              onChange={(e) => update({ masteryScore: Number(e.target.value) })}
              className="mastery-slider w-full"
              style={{
                background: `linear-gradient(to right, #1F316D 0%, #1F316D ${task.masteryScore ?? 0}%, #E5E7EB ${task.masteryScore ?? 0}%, #E5E7EB 100%)`,
              }}
            />
            <div className="flex justify-between text-[10px] text-text-light mt-1">
              <span>不会</span>
              <span>模糊</span>
              <span>懂了</span>
            </div>
          </div>
        </div>
      )}
    </div>

      {preview && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={closePreview} />
          <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-3 border-b border-gray-100">
              <span className="text-sm font-bold text-navy truncate">{preview.name}</span>
              <div className="flex items-center gap-1 flex-shrink-0">
                <a
                  href={preview.url}
                  download={preview.name}
                  className="p-2 text-navy hover:bg-navy/10 rounded-lg"
                  title="下载"
                >
                  <Download className="w-4 h-4" />
                </a>
                <button
                  onClick={closePreview}
                  className="p-2 text-text-dark hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-2">
              {(() => {
                const isImage =
                  preview.mimeType.startsWith('image/') ||
                  /\.(png|jpe?g|webp|gif)$/i.test(preview.name);
                const isPdf = preview.mimeType === 'application/pdf' || /\.pdf$/i.test(preview.name);
                if (isImage) {
                  return <img src={preview.url} alt={preview.name} className="max-w-full mx-auto rounded" />;
                }
                if (isPdf) {
                  return (
                    <iframe src={preview.url} title={preview.name} className="w-full h-[70vh] rounded" />
                  );
                }
                return (
                  <div className="py-16 text-center text-text-light">
                    <p>该格式浏览器无法直接预览（{preview.mimeType || '未知格式'}）</p>
                    <p className="mt-2 text-xs">请点击右上角下载图标下载后查看</p>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
