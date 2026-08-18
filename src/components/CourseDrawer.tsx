import { X } from 'lucide-react';
import type { Course } from '../types';

interface CourseDrawerProps {
  open: boolean;
  courses: Course[];
  onSelect: (course: Course) => void;
  onClose: () => void;
}

export const CourseDrawer = ({ open, courses, onSelect, onClose }: CourseDrawerProps) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[99999] flex">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-72 max-w-[82%] h-full bg-white shadow-xl flex flex-col animate-[fadeIn_0.18s_ease-out]">
        <div className="sticky top-0 bg-white border-b border-gray-100 flex items-center justify-between p-4">
          <h3 className="text-sm font-bold text-navy">我的课程</h3>
          <button onClick={onClose} className="text-text-light hover:text-text-dark" title="关闭">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {courses.length === 0 ? (
            <p className="text-xs text-text-light text-center py-8">还没有课程</p>
          ) : (
            courses.map((c) => (
              <button
                key={c.id}
                onClick={() => onSelect(c)}
                className="w-full text-left rounded-xl border border-gray-100 p-3.5 hover:bg-navy/5 hover:border-navy/30 transition-all"
              >
                <div className="text-sm font-bold text-text-dark">{c.name}</div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
