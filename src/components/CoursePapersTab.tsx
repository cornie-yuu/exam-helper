import { useState } from 'react';
import { Trash2, FileDown, Eye, Pencil, Check, X } from 'lucide-react';
import type { Course, Paper } from '../types';
import { loadPapers, deletePaper, renamePaper } from '../utils/paperService';
import { exportPaperPdf } from '../utils/exportPdf';
import { markdownToHtml } from '../utils/markdown';

export const CoursePapersTab = ({ course }: { course: Course }) => {
  const [papers, setPapers] = useState<Paper[]>(() => loadPapers(course.id));
  const [viewing, setViewing] = useState<Paper | null>(null);
  const [renaming, setRenaming] = useState<{ id: string; value: string } | null>(null);

  const refresh = () => setPapers(loadPapers(course.id));

  const handleDelete = (id: string) => {
    deletePaper(course.id, id);
    refresh();
  };

  if (viewing) {
    return (
      <div className="space-y-3">
        <button
          onClick={() => setViewing(null)}
          className="text-xs text-navy font-bold hover:underline"
        >
          ← 返回试卷列表
        </button>
        <div className="card">
          <h3 className="text-sm font-bold text-navy mb-2">{viewing.title}</h3>
          <div
            className="markdown-body text-sm text-text-dark"
            dangerouslySetInnerHTML={{ __html: markdownToHtml(viewing.markdown) }}
          />
        </div>
        <button
          onClick={() => exportPaperPdf(viewing.title, viewing.markdown)}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          <FileDown className="w-4 h-4" /> 导出 PDF
        </button>
      </div>
    );
  }

  if (papers.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-sm text-text-dark font-bold mb-1">还没有试卷</p>
        <p className="text-xs text-text-light">
          在「聊天」里让 AI 出一份卷子，点「存为试卷」就会出现在这里
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {papers.map((p) => {
        const isRenaming = renaming?.id === p.id;
        return (
        <div key={p.id} className="card flex items-center gap-2">
          <div className="flex-1 min-w-0">
            {isRenaming ? (
              <input
                autoFocus
                value={renaming!.value}
                onChange={(e) => setRenaming({ id: p.id, value: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    renamePaper(course.id, p.id, renaming!.value);
                    setRenaming(null);
                    refresh();
                  }
                }}
                className="input-field w-full text-sm"
              />
            ) : (
              <div className="text-sm font-bold text-text-dark truncate">{p.title}</div>
            )}
            <div className="text-[11px] text-text-light">
              {new Date(p.createdAt).toLocaleString('zh-CN')}
            </div>
          </div>
          {isRenaming ? (
            <>
              <button
                onClick={() => {
                  renamePaper(course.id, p.id, renaming!.value);
                  setRenaming(null);
                  refresh();
                }}
                className="p-2 text-navy hover:bg-navy/10 rounded-lg"
                title="保存"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={() => setRenaming(null)}
                className="p-2 text-text-dark hover:bg-gray-100 rounded-lg"
                title="取消"
              >
                <X className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setRenaming({ id: p.id, value: p.title })}
                className="p-2 text-navy hover:bg-navy/10 rounded-lg"
                title="重命名"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewing(p)}
                className="p-2 text-navy hover:bg-navy/10 rounded-lg"
                title="查看"
              >
                <Eye className="w-4 h-4" />
              </button>
              <button
                onClick={() => exportPaperPdf(p.title, p.markdown)}
                className="p-2 text-navy hover:bg-navy/10 rounded-lg"
                title="导出 PDF"
              >
                <FileDown className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDelete(p.id)}
                className="p-2 text-apple-red hover:bg-apple-red/10 rounded-lg"
                title="删除"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
        );
      })}
    </div>
  );
};
