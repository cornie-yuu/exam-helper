import { useState, useRef, useEffect } from 'react';
import { Send, FileDown, X } from 'lucide-react';
import type { Course, ChatMessage } from '../types';
import { loadChat, saveChat } from '../utils/chatService';
import { loadPlan } from '../utils/storage';
import { savePaper } from '../utils/paperService';
import { chatWithAI } from '../utils/aiService';
import { markdownToHtml } from '../utils/markdown';

const genId = (): string => Math.random().toString(36).substring(2, 15);

// 判断用户是否在要求出卷（只有此时才在 AI 回复上显示「存为试卷」）
const isPaperRequest = (text: string): boolean =>
  /出卷|试卷|出题|出一份|模拟卷|考题|练习题|考一下|测验|卷子|自测|quiz/i.test(text);

interface ChapterFocus {
  text: string;
  prompt: string;
  key: number;
}

export const CourseChatTab = ({
  course,
  focus,
  onFocusConsumed,
}: {
  course: Course;
  focus?: ChapterFocus | null;
  onFocusConsumed?: () => void;
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => loadChat(course.id));
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const handledFocusKey = useRef<number | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, loading]);

  // 资料 tab 点「问 AI 这一章」→ 自动把该章完整课件原文发给 AI 精读
  useEffect(() => {
    if (!focus || focus.key === handledFocusKey.current) return;
    handledFocusKey.current = focus.key;
    send(focus.prompt, focus.text);
    onFocusConsumed?.();
  }, [focus]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const send = async (overrideText?: string, focusText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || loading) return;
    const userMsg: ChatMessage = { role: 'user', content: text, ts: Date.now() };
    const next = [...messages, userMsg];
    setMessages(next);
    if (!overrideText) setInput('');
    setLoading(true);
    try {
      const plan = loadPlan();
      const reply = await chatWithAI(next, course, plan, focusText);
      const aiMsg: ChatMessage = { role: 'ai', content: reply, ts: Date.now() };
      const finalMsgs = [...next, aiMsg];
      setMessages(finalMsgs);
      saveChat(course.id, finalMsgs);
    } catch {
      const errMsg: ChatMessage = {
        role: 'ai',
        content: '⚠️ AI 请求失败，请检查网络或 API Key。',
        ts: Date.now(),
      };
      const finalMsgs = [...next, errMsg];
      setMessages(finalMsgs);
      saveChat(course.id, finalMsgs);
    } finally {
      setLoading(false);
    }
  };

  const [naming, setNaming] = useState<{ open: boolean; markdown: string; title: string }>({
    open: false,
    markdown: '',
    title: '',
  });

  // 点「存为试卷」→ 弹出命名框，由用户自行命名后再保存
  const openNaming = (msg: ChatMessage) => {
    setNaming({
      open: true,
      markdown: msg.content,
      title: `${course.name} · 试卷 ${new Date().toLocaleDateString('zh-CN')}`,
    });
  };

  const confirmNaming = () => {
    const paper = {
      id: genId(),
      courseId: course.id,
      title: naming.title.trim() || `${course.name} · 试卷`,
      markdown: naming.markdown,
      createdAt: Date.now(),
    };
    savePaper(paper);
    setNaming({ open: false, markdown: '', title: '' });
    setToast('✅ 试卷已生成，可在「试卷栏」查看');
  };

  return (
    <div className="flex flex-col h-[60vh]">
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 pr-1">
        {messages.length === 0 && (
          <p className="text-xs text-text-light text-center py-6">
            和这门课的 AI 助教聊起来吧～让它出卷、答疑，它会越来越懂你的这门课。
          </p>
        )}
        {messages.map((m, idx) => {
          const prevUser = idx > 0 ? messages[idx - 1] : null;
          const wantsPaper = !!prevUser && prevUser.role === 'user' && isPaperRequest(prevUser.content);
          const looksLikePaper =
            /题目|答案|解答|习题|选择题|简答题|填空题|【.*题.*】/i.test(m.content) &&
            /答案|解答|解析/i.test(m.content);
          const showSave = m.role === 'ai' && (wantsPaper || looksLikePaper);
          return (
          <div key={m.ts} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                m.role === 'user' ? 'bg-navy text-white' : 'bg-gray-100 text-text-dark'
              }`}
            >
              <div
                className="whitespace-pre-wrap markdown-body"
                dangerouslySetInnerHTML={{ __html: markdownToHtml(m.content) }}
              />
              {showSave && (
                <button
                  onClick={() => openNaming(m)}
                  className="mt-1.5 text-[11px] text-navy font-bold hover:underline flex items-center gap-1"
                >
                  <FileDown className="w-3 h-3" /> 存为试卷
                </button>
              )}
            </div>
          </div>
          );
        })}
        {loading && <div className="text-xs text-text-light">AI 思考中…</div>}
      </div>

      <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="问点什么，或让 AI 出份卷子…"
          className="input-field flex-1"
        />
        <button
          onClick={() => send()}
          disabled={loading || !input.trim()}
          className="btn-primary px-4 py-2.5 disabled:opacity-40"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>

      {naming.open && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setNaming({ ...naming, open: false })}
          />
          <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-navy">为试卷命名</h3>
              <button
                onClick={() => setNaming({ ...naming, open: false })}
                className="p-1 text-text-dark hover:bg-gray-100 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <input
              autoFocus
              value={naming.title}
              onChange={(e) => setNaming({ ...naming, title: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') confirmNaming();
              }}
              placeholder="试卷名称"
              className="input-field w-full"
            />
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setNaming({ ...naming, open: false })}
                className="flex-1 py-2 rounded-xl border border-gray-200 text-navy font-bold text-xs hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={confirmNaming}
                className="flex-1 py-2 rounded-xl bg-navy text-white font-bold text-xs hover:opacity-90 transition-opacity"
              >
                保存到试卷栏
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[99999] bg-navy text-white text-xs px-4 py-2 rounded-full shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
};
