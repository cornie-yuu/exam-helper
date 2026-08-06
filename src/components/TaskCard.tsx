import { CheckCircle, Circle, Sparkles } from 'lucide-react';
import type { DailyTask } from '../types';

interface TaskCardProps {
  task: DailyTask;
  onToggle: (taskId: string) => void;
}

function splitKeyPoints(str: string): string[] {
  const result: string[] = [];
  let current = '';
  let depth = 0;

  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (char === '（' || char === '(') {
      depth++;
      current += char;
    } else if (char === '）' || char === ')') {
      depth--;
      current += char;
    } else if (char === '、' && depth === 0) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  if (current) result.push(current);
  return result;
}

export const TaskCard = ({ task, onToggle }: TaskCardProps) => {
  const contentParts = task.contentName.split(/（重点：|\(重点：/);
  const mainContent = contentParts[0] || task.contentName;
  const keyPoints = contentParts[1]?.replace(/[）)]$/, '') || '';

  return (
    <div
      className={`task-card flex items-center gap-3 p-3 ${
        task.completed ? 'completed' : ''
      }`}
      onClick={() => onToggle(task.id)}
    >
      <button className="flex-shrink-0">
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
        
        {keyPoints && (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {splitKeyPoints(keyPoints).map((point, index) => (
              <span
                key={index}
                className="chip text-xs flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" />
                {point.trim()}
              </span>
            ))}
          </div>
        )}
        
        <p className="text-xs text-text-light mt-1.5 flex items-center gap-1">
          <span className="w-1.5 h-1.5 bg-navy rounded-full" />
          {task.courseName}
        </p>
      </div>
    </div>
  );
};
