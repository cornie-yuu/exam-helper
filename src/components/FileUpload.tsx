import { useState, useRef } from 'react';
import { Upload, FileText, X, Loader2 } from 'lucide-react';
import { parseFile, type ParsedFile } from '../utils/fileParser';

interface FileUploadProps {
  onFilesParsed: (files: ParsedFile[]) => void;
  parsedFiles: ParsedFile[];
}

export const FileUpload = ({ onFilesParsed, parsedFiles }: FileUploadProps) => {
  const [isParsing, setIsParsing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (files: FileList) => {
    setIsParsing(true);
    
    const newParsedFiles: ParsedFile[] = [];
    for (let i = 0; i < files.length; i++) {
      const result = await parseFile(files[i]);
      newParsedFiles.push(result);
    }
    
    onFilesParsed([...parsedFiles, ...newParsedFiles]);
    setIsParsing(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const removeFile = (index: number) => {
    const newFiles = parsedFiles.filter((_, i) => i !== index);
    onFilesParsed(newFiles);
  };

  const getFileTypeIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return '📄';
      case 'word':
        return '📝';
      case 'ppt':
        return '📊';
      default:
        return '📁';
    }
  };

  const getFileTypeColor = (type: string) => {
    switch (type) {
      case 'pdf':
        return 'text-red-500';
      case 'word':
        return 'text-blue-500';
      case 'ppt':
        return 'text-orange-500';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">
        📚 上传课件（可选）
      </label>
      
      {/* 上传区域 */}
      <div
        onClick={() => fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
          dragOver
            ? 'border-pink-400 bg-pink-50'
            : 'border-pink-200 hover:border-pink-300 hover:bg-pink-50/50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.ppt,.pptx"
          onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
          className="hidden"
        />
        
        {isParsing ? (
          <div className="flex items-center justify-center gap-2 text-pink-500">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>正在解析课件...</span>
          </div>
        ) : (
          <>
            <Upload className="w-8 h-8 mx-auto text-pink-400 mb-2" />
            <p className="text-sm text-gray-600">
              点击或拖拽上传课件
            </p>
            <p className="text-xs text-gray-400 mt-1">
              支持 PDF、Word、PPT 格式
            </p>
          </>
        )}
      </div>
      
      {/* 已上传文件列表 */}
      {parsedFiles.length > 0 && (
        <div className="space-y-2">
          {parsedFiles.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-3 bg-white rounded-lg border border-pink-100"
            >
              <span className="text-lg sm:text-xl">{getFileTypeIcon(file.type)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">
                  {file.name}
                </p>
                {file.error ? (
                  <p className="text-xs text-red-500">{file.error}</p>
                ) : (
                  <p className={`text-xs ${getFileTypeColor(file.type)}`}>
                    {file.content.length > 0 
                      ? `已解析 ${file.content.length} 字符`
                      : '解析中...'}
                  </p>
                )}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(index);
                }}
                className="p-1 hover:bg-pink-100 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-gray-400 hover:text-pink-500" />
              </button>
            </div>
          ))}
        </div>
      )}
      
      {/* 提示信息 */}
      {parsedFiles.length > 0 && (
        <p className="text-xs text-gray-500 flex items-center gap-1">
          <FileText className="w-3 h-3" />
          AI将根据课件内容生成更精准的复习计划
        </p>
      )}
    </div>
  );
};
