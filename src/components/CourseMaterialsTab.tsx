import { useState } from 'react';
import { FileText, MessageCircleQuestion, Eye, X, Download } from 'lucide-react';
import type { Course, CourseContent, Material } from '../types';
import { getFileBlob } from '../utils/fileStore';

export const CourseMaterialsTab = ({
  course,
  onAskChapter,
}: {
  course: Course;
  onAskChapter: (c: CourseContent) => void;
}) => {
  const [preview, setPreview] = useState<{ name: string; url: string; mimeType: string } | null>(
    null
  );

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

  if (course.contents.length === 0) {
    return <p className="text-sm text-text-light text-center py-8">这门课还没上传课件</p>;
  }

  return (
    <>
      <div className="space-y-4">
        {course.contents.map((ct) => (
          <div key={ct.id} className="card">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-bold text-navy truncate">{ct.name}</span>
              <button
                onClick={() => onAskChapter(ct)}
                className="ml-auto inline-flex items-center gap-1 text-[11px] text-navy font-bold border border-navy/30 rounded-full px-2 py-1 hover:bg-navy/5 transition-colors flex-shrink-0"
              >
                <MessageCircleQuestion className="w-3 h-3" /> 问 AI 这一章
              </button>
            </div>
            <div className="text-[11px] text-text-light mb-2">
              重要度 {ct.importance} · 熟悉度 {ct.familiarity}
              {ct.materials.length > 0 && ` · ${ct.materials.length} 份课件`}
            </div>
            <div className="space-y-2">
              {ct.materials.map((m, i) => (
                <div key={i} className="border border-gray-100 rounded-lg p-2 flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-navy flex-shrink-0" />
                  <span className="text-xs font-bold text-text-dark truncate flex-1">{m.name}</span>
                  {m.fileId && (
                    <button
                      onClick={() => handlePreview(m)}
                      className="p-1 text-navy hover:bg-navy/10 rounded-md transition-colors flex-shrink-0"
                      title="预览原始课件"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  )}
                  <span className="chip flex-shrink-0">已纳入 AI 知识</span>
                </div>
              ))}
            </div>
          </div>
        ))}
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
