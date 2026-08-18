import { useState, useEffect } from 'react';
import { Target, Sparkles, Trash2, Plus, Upload, X, FileText } from 'lucide-react';
import { DatePicker } from './DatePicker';
import type { Course, ExamPlan, Material, Chunk } from '../types';
import { getLatestExamDate, buildScheduleSkeleton, mergeSuggestions } from '../utils/planGenerator';
import { savePlan, saveCourses, saveStartDate, loadCourses, loadStartDate } from '../utils/storage';
import { generatePlanRobust, buildChunksWithEmbedding } from '../utils/aiService';
import { extractTextFromFile } from '../utils/extractTextFromFile';
import { saveFileBlob } from '../utils/fileStore';

const generateId = (): string => Math.random().toString(36).substring(2, 15);
const MAX_TEXT_LENGTH = 50000;

interface ContentInput {
  id: string;
  name: string;
  importance: number; // 0-100
  familiarity: number; // 0-100
  materials: Material[];
  keyPoints: string[]; // 重要知识点（教师划重点，可选）
}

interface Subject {
  id: string;
  name: string;
  examDate: string;
  note: string;
  contents: ContentInput[];
}

interface SetupPageProps {
  onComplete: (plan: ExamPlan) => void;
  initialData?: {
    courses: Course[];
    startDate: string;
  };
}

// 把录入的科目构建成底层 Course 模型（每课多内容块，含各自的重要性/熟悉度/课件，供 AI 与风险引擎使用）
const buildCourses = (subs: Subject[]): Course[] =>
  subs.map((s) => ({
    id: s.id,
    name: s.name,
    examDate: s.examDate,
    note: s.note,
    contents: s.contents.map((c) => ({
      id: c.id,
      name: c.name,
      importance: c.importance,
      familiarity: c.familiarity,
      completed: false,
      materials: c.materials,
      keyPoints: c.keyPoints,
    })),
  }));

export const SetupPage = ({ onComplete, initialData }: SetupPageProps) => {
  const [startDate, setStartDate] = useState(initialData?.startDate || '');
  const [dailyHours, setDailyHours] = useState(3);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [progress, setProgress] = useState('');

  useEffect(() => {
    if (initialData) return;
    const savedCourses = loadCourses();
    if (savedCourses.length > 0) {
      setSubjects(
        savedCourses.map((c) => ({
          id: c.id,
          name: c.name,
          examDate: c.examDate,
          note: c.note || '',
          contents: (c.contents || []).map((x) => ({
            id: x.id,
            name: x.name,
            importance: x.importance ?? 50,
            familiarity: x.familiarity ?? 30,
            materials: x.materials || [],
            keyPoints: Array.isArray(x.keyPoints) ? x.keyPoints : [],
          })),
        }))
      );
    }
    const savedStart = loadStartDate();
    if (savedStart) setStartDate(savedStart);
  }, [initialData]);

  useEffect(() => {
    if (startDate) saveStartDate(startDate);
  }, [startDate]);

  useEffect(() => {
    saveCourses(buildCourses(subjects));
  }, [subjects]);

  const addSubject = () =>
    setSubjects((prev) => [
      ...prev,
      { id: generateId(), name: '', examDate: '', note: '', contents: [] },
    ]);

  const updateSubject = (id: string, patch: Partial<Subject>) =>
    setSubjects((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  const removeSubject = (id: string) =>
    setSubjects((prev) => prev.filter((s) => s.id !== id));

  const addContent = (id: string) =>
    setSubjects((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              contents: [
                ...s.contents,
                {
                  id: generateId(),
                  name: '',
                  importance: 50,
                  familiarity: 30,
                  materials: [],
                  keyPoints: [],
                },
              ],
            }
          : s
      )
    );

  const updateContent = (id: string, contentId: string, patch: Partial<ContentInput>) =>
    setSubjects((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              contents: s.contents.map((c) => (c.id === contentId ? { ...c, ...patch } : c)),
            }
          : s
      )
    );

  const removeContent = (id: string, contentId: string) =>
    setSubjects((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, contents: s.contents.filter((c) => c.id !== contentId) } : s
      )
    );

  const addKeyPoint = (id: string, contentId: string, raw: string) => {
    const items = raw
      .split(/[\s、,，]+/)
      .map((v) => v.trim())
      .filter(Boolean);
    if (!items.length) return;
    setSubjects((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              contents: s.contents.map((c) =>
                c.id === contentId
                  ? { ...c, keyPoints: Array.from(new Set([...c.keyPoints, ...items])) }
                  : c
              ),
            }
          : s
      )
    );
  };

  const removeKeyPoint = (id: string, contentId: string, idx: number) =>
    setSubjects((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              contents: s.contents.map((c) =>
                c.id === contentId
                  ? { ...c, keyPoints: c.keyPoints.filter((_, i) => i !== idx) }
                  : c
              ),
            }
          : s
      )
    );

  const handleFiles = async (id: string, contentId: string, files: FileList) => {
    const added: Material[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const text = await extractTextFromFile(file);
      const hasError = text.includes('【错误】') || text.includes('【警告】');
      let truncated = text;
      if (text.length > MAX_TEXT_LENGTH) {
        truncated = text.substring(0, MAX_TEXT_LENGTH) + `\n...【文本已截断，仅显示前${MAX_TEXT_LENGTH}字符】`;
      }
      // 原始文件存入 IndexedDB（供资料 tab 预览），Material 只存 fileId 引用、不占 localStorage
      const fileId = `${generateId()}_${i}`;
      try {
        await saveFileBlob(fileId, file.name, file.type, file);
      } catch (err) {
        console.warn('[SetupPage] 原始文件存入 IndexedDB 失败：', file.name, (err as Error).message);
      }
      // RAG：把全文分块并向量化（不截断，聊天时按提问检索相关片段，根治"读不全"）
      let chunks: Chunk[] = [];
      try {
        chunks = await buildChunksWithEmbedding(text);
      } catch (err) {
        console.warn('[handleFiles] 分块向量化失败，将回退全文模式：', file.name, (err as Error).message);
      }
      added.push({
        name: file.name,
        content: truncated,
        error: hasError,
        fileId,
        mimeType: file.type,
        chunks,
      });
    }
    setSubjects((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              contents: s.contents.map((c) =>
                c.id === contentId ? { ...c, materials: [...c.materials, ...added] } : c
              ),
            }
          : s
      )
    );
  };

  const removeMaterial = (id: string, contentId: string, idx: number) =>
    setSubjects((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              contents: s.contents.map((c) =>
                c.id === contentId
                  ? { ...c, materials: c.materials.filter((_, i) => i !== idx) }
                  : c
              ),
            }
          : s
      )
    );

  const isDisabled =
    subjects.length === 0 ||
    !startDate ||
    subjects.some((s) => !s.name.trim() || !s.examDate);

  const handleGenerate = async () => {
    if (isDisabled) return;
    setIsLoading(true);
    setAiError('');
    setProgress('');

    const courses = buildCourses(subjects);
    const endDate = getLatestExamDate(courses);

    try {
      const weakPoints = subjects.map((s) => s.note.trim()).filter(Boolean).join('；');

      // AI 只生成学习建议；日期由程序确定性排程（保证覆盖到考试前一天、无空缺）
      let overallSuggestion = '';
      let suggestions: Record<string, string> = {};
      try {
        const gen = await generatePlanRobust(
          courses,
          startDate,
          endDate,
          {
            examType: '期末',
            dailyHours,
            weakPoints: weakPoints || undefined,
          },
          setProgress
        );
        overallSuggestion = gen.overallSuggestion;
        suggestions = gen.suggestions;
      } catch (e) {
        console.warn('[handleGenerate] AI 建议生成失败，使用纯程序排程：', (e as Error)?.message);
      }

      const skeleton = buildScheduleSkeleton(courses, startDate);
      const tasks = mergeSuggestions(skeleton, suggestions);

      const plan: ExamPlan = {
        id: generateId(),
        startDate,
        endDate,
        courses,
        tasks,
        aiSuggestion: overallSuggestion,
      };
      savePlan(plan);
      onComplete(plan);
    } catch (error: unknown) {
      console.error('生成计划失败:', error);
      let msg = 'AI生成失败';
      if (typeof error === 'object' && error && 'response' in error) {
        const e = error as {
          response?: { status?: number; data?: { error?: { message?: string } } };
          request?: unknown;
          message?: string;
        };
        if (e.response) {
          msg = `AI服务错误: ${e.response.status} - ${e.response.data?.error?.message || '未知错误'}`;
        } else if (e.request) {
          msg = '网络连接失败，请检查网络';
        } else {
          msg = `请求失败: ${e.message || '未知错误'}`;
        }
      }
      setAiError(msg);
      setIsLoading(false);
      setProgress('');
    } finally {
      setIsLoading(false);
      setProgress('');
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4 pb-24">
      <div className="text-center mb-2">
        <div className="w-14 h-14 bg-navy rounded-full flex items-center justify-center mx-auto mb-2">
          <Target className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-xl font-bold text-navy">考期助手</h1>
        <p className="text-text-light mt-1 text-xs">期末备考专属 · 把多门考试排得明明白白</p>
      </div>

      {/* 复习节奏 */}
      <div className="card space-y-4">
        <h2 className="text-sm font-bold text-navy">复习节奏</h2>
        <div>
          <label className="block text-xs font-bold text-text-dark mb-1">开始复习日期</label>
          <DatePicker value={startDate} onChange={setStartDate} placeholder="选择开始日期" />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-bold text-text-dark">每天可投入学习时长</label>
            <span className="text-xs font-bold text-navy">{dailyHours} 小时/天</span>
          </div>
          <input
            type="range"
            min={1}
            max={12}
            step={1}
            value={dailyHours}
            onChange={(e) => setDailyHours(Number(e.target.value))}
            className="w-full accent-navy"
          />
          <p className="text-[10px] text-text-light mt-1">
            用于合理安排每日任务量，避免排太满或太空
          </p>
        </div>
      </div>

      {/* 考试科目清单 */}
      <div className="card space-y-3">
        <h2 className="text-sm font-bold text-navy">我的考试科目</h2>
        {subjects.length === 0 && (
          <p className="text-xs text-text-light">还没有添加科目，点下面按钮添加你的第一门考试吧～</p>
        )}
        {subjects.map((s) => (
          <div key={s.id} className="rounded-xl border border-gray-100 p-3 space-y-3 bg-gray-50/40">
            <div className="flex items-center gap-2">
              <input
                type="text"
                lang="zh"
                value={s.name}
                onChange={(e) => updateSubject(s.id, { name: e.target.value })}
                className="input-field flex-1"
                placeholder="课程名称，如：高等数学"
              />
              <button
                onClick={() => removeSubject(s.id)}
                className="p-2 text-apple-red hover:bg-apple-red/10 rounded-lg transition-colors"
                title="删除科目"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-text-dark mb-1">
                考试日期
              </label>
              <DatePicker
                value={s.examDate}
                onChange={(d) => updateSubject(s.id, { examDate: d })}
                placeholder="选择这门课的考试日"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-text-dark mb-1">备注（可选）</label>
              <input
                type="text"
                lang="zh"
                value={s.note}
                onChange={(e) => updateSubject(s.id, { note: e.target.value })}
                className="input-field w-full"
                placeholder="比如：最怕级数、记不住公式"
              />
            </div>

            {/* 课程内容：每课下多个内容块，各自独立输入 */}
            <div className="pt-1">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-text-dark">课程内容</label>
                <span className="text-[10px] text-text-light">{s.contents.length} 项</span>
              </div>

              <div className="space-y-3">
                {s.contents.map((c) => (
                  <div
                    key={c.id}
                    className="rounded-xl border border-gray-100 bg-white p-3 space-y-2.5"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        lang="zh"
                        value={c.name}
                        onChange={(e) => updateContent(s.id, c.id, { name: e.target.value })}
                        className="input-field flex-1"
                        placeholder="内容名称，如：极限、导数"
                      />
                      <button
                        onClick={() => removeContent(s.id, c.id)}
                        className="p-2 text-apple-red hover:bg-apple-red/10 rounded-lg transition-colors"
                        title="删除内容"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[11px] font-medium text-text-dark">重要性</label>
                          <span className="text-[11px] font-bold text-navy">{c.importance}</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={1}
                          value={c.importance}
                          onChange={(e) =>
                            updateContent(s.id, c.id, { importance: Number(e.target.value) })
                          }
                          className="w-full accent-navy"
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[11px] font-medium text-text-dark">熟悉度</label>
                          <span className="text-[11px] font-bold text-navy">{c.familiarity}</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={1}
                          value={c.familiarity}
                          onChange={(e) =>
                            updateContent(s.id, c.id, { familiarity: Number(e.target.value) })
                          }
                          className="w-full accent-navy"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-text-dark mb-1">
                        重要知识点（可选）
                      </label>
                      <div
                        className="flex flex-wrap items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2 py-1.5 min-h-[38px] cursor-text focus-within:border-navy/40 focus-within:ring-1 focus-within:ring-navy/20"
                        onClick={() => document.getElementById(`kp-${s.id}-${c.id}`)?.focus()}
                      >
                        {c.keyPoints.map((kp, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 bg-navy/10 text-navy text-[11px] px-2 py-0.5 rounded-full"
                          >
                            {kp}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeKeyPoint(s.id, c.id, i);
                              }}
                              className="hover:text-apple-red"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                        <input
                          id={`kp-${s.id}-${c.id}`}
                          type="text"
                          lang="zh"
                          className="flex-1 min-w-[80px] text-xs bg-transparent outline-none border-0 p-0"
                          placeholder={
                            c.keyPoints.length === 0
                              ? '输入知识点后按空格/回车添加，如：拉格朗日中值定理'
                              : ''
                          }
                          onKeyDown={(e) => {
                            if (
                              e.key === 'Enter' ||
                              e.key === ' ' ||
                              e.key === '、' ||
                              e.key === ',' ||
                              e.key === '，'
                            ) {
                              if (e.nativeEvent.isComposing) return;
                              e.preventDefault();
                              const input = e.target as HTMLInputElement;
                              addKeyPoint(s.id, c.id, input.value);
                              input.value = '';
                            } else if (
                              e.key === 'Backspace' &&
                              !(e.target as HTMLInputElement).value &&
                              c.keyPoints.length > 0
                            ) {
                              removeKeyPoint(s.id, c.id, c.keyPoints.length - 1);
                            }
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-text-dark mb-1">
                        课件（可选）
                      </label>
                      <div
                        onClick={() => document.getElementById(`mat-${s.id}-${c.id}`)?.click()}
                        className="border-2 border-dashed border-gray-200 rounded-lg p-2.5 text-center hover:border-navy/40 hover:bg-navy/5 cursor-pointer transition-all"
                      >
                        <input
                          id={`mat-${s.id}-${c.id}`}
                          type="file"
                          multiple
                          accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,.webp"
                          className="hidden"
                          onChange={(e) =>
                            e.target.files && handleFiles(s.id, c.id, e.target.files)
                          }
                        />
                        <span className="text-[11px] text-text-light flex items-center justify-center gap-1.5">
                          <Upload className="w-3.5 h-3.5" />
                          点击上传
                        </span>
                      </div>
                      {c.materials.length > 0 && (
                        <div className="mt-1.5 space-y-1">
                          {c.materials.map((f, i) => (
                            <div
                              key={i}
                              className={`flex items-center gap-2 p-1.5 rounded-lg ${
                                f.error ? 'bg-apple-red/10' : 'bg-gray-50'
                              }`}
                            >
                              <FileText className="w-3.5 h-3.5 text-navy flex-shrink-0" />
                              <span className="flex-1 text-[11px] text-text-dark truncate">
                                {f.name}
                              </span>
                              {f.error && <span className="text-[10px] text-apple-red">解析异常</span>}
                              <button
                                onClick={() => removeMaterial(s.id, c.id, i)}
                                className="text-apple-red/70 hover:text-apple-red"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => addContent(s.id)}
                className="mt-2 w-full py-2 rounded-xl border border-dashed border-navy/30 text-navy font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-navy/5 transition-colors"
              >
                <Plus className="w-4 h-4" /> 添加内容
              </button>
            </div>
          </div>
        ))}
        <button
          onClick={addSubject}
          className="w-full py-2.5 rounded-xl border border-dashed border-navy/30 text-navy font-bold text-sm flex items-center justify-center gap-1.5 hover:bg-navy/5 transition-colors"
        >
          <Plus className="w-4 h-4" /> 添加科目
        </button>
      </div>

      {aiError && (
        <div className="card bg-apple-red/10 border-apple-red/20">
          <p className="text-apple-red text-xs">{aiError}</p>
        </div>
      )}

      <button
        onClick={handleGenerate}
        disabled={isDisabled || isLoading}
        className={`w-full py-3 rounded-xl font-bold text-sm transition-all duration-200 ${
          isDisabled || isLoading
            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
            : 'btn-primary'
        }`}
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            {progress || 'AI 思考中…'}
          </span>
        ) : (
          <>
            <Sparkles className="inline w-4 h-4 mr-1.5" />
            AI 生成学习计划
          </>
        )}
      </button>
    </div>
  );
};
