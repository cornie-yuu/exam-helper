import { useState } from 'react';
import { X } from 'lucide-react';
import type { Course, CourseContent } from '../types';
import { CourseMaterialsTab } from './CourseMaterialsTab';
import { CoursePapersTab } from './CoursePapersTab';
import { CourseChatTab } from './CourseChatTab';

type TabKey = 'materials' | 'papers' | 'chat';

interface ChapterFocus {
  text: string;
  prompt: string;
  key: number;
}

interface CourseDetailProps {
  course: Course;
  onClose: () => void;
}

export const CourseDetail = ({ course, onClose }: CourseDetailProps) => {
  const [tab, setTab] = useState<TabKey>('materials');
  const [focus, setFocus] = useState<ChapterFocus | null>(null);

  const handleAskChapter = (content: CourseContent) => {
    const texts = content.materials
      .filter((m) => m.content && !m.error)
      .map((m) => `--- 课件《${m.name}》---\n${m.content}`);
    const full = texts.join('\n') || '（该章无文本课件）';
    setFocus({
      text: full,
      prompt: `请基于《${content.name}》这章的完整课件内容，帮我梳理重点，并出 2-3 道自测题（附答案）。`,
      key: Date.now(),
    });
    setTab('chat');
  };
  const tabs: { key: TabKey; label: string }[] = [
    { key: 'materials', label: '资料' },
    { key: 'papers', label: '试卷栏' },
    { key: 'chat', label: '聊天' },
  ];

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-xl max-h-[90vh] flex flex-col overflow-hidden animate-[slideUp_0.2s_ease-out]">
        <div className="sticky top-0 bg-white border-b border-gray-100 flex items-center justify-between p-4">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-navy truncate">{course.name}</h3>
            {course.note && <p className="text-xs text-text-light mt-0.5 truncate">备注：{course.note}</p>}
          </div>
          <button onClick={onClose} className="text-text-light hover:text-text-dark ml-2">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex border-b border-gray-100">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-2.5 text-sm font-bold transition-colors ${
                tab === t.key ? 'text-navy border-b-2 border-navy' : 'text-text-light'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {tab === 'materials' && <CourseMaterialsTab course={course} onAskChapter={handleAskChapter} />}
          {tab === 'papers' && <CoursePapersTab course={course} />}
          {tab === 'chat' && (
            <CourseChatTab course={course} focus={focus} onFocusConsumed={() => setFocus(null)} />
          )}
        </div>
      </div>
    </div>
  );
};
