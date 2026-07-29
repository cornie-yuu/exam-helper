interface ProgressBarProps {
  progress: number;
  showLabel?: boolean;
}

export const ProgressBar = ({ progress, showLabel = true }: ProgressBarProps) => {
  return (
    <div className="w-full">
      <div className="relative h-4 bg-cream border-2 border-text-dark/30 rounded-full overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 bg-sage rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      {showLabel && (
        <div className="mt-2 flex justify-between text-sm text-gray-600">
          <span>学习进度</span>
          <span className="font-semibold text-primary-600">{progress}%</span>
        </div>
      )}
    </div>
  );
};
