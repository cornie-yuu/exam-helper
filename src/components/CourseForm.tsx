import { useState } from 'react';
import { Plus, Trash2, Edit2, X, Save, Check, Upload } from 'lucide-react';
import type { Course, CourseContent, Material } from '../types';
import { DatePicker } from './DatePicker';
import { extractTextFromFile } from '../utils/extractTextFromFile';

const MAX_TEXT_LENGTH = 5000;

const generateId = (): string => Math.random().toString(36).substring(2, 15);

interface CourseFormProps {
  courses: Course[];
  onSave: (courses: Course[]) => void;
}

export const CourseForm = ({ courses, onSave }: CourseFormProps) => {
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [courseName, setCourseName] = useState('');
  const [examDate, setExamDate] = useState('');
  const [contents, setContents] = useState<CourseContent[]>([]);
  const [contentName, setContentName] = useState('');
  const [importance, setImportance] = useState(5);
  const [familiarity, setFamiliarity] = useState(3);
  const [editingContentId, setEditingContentId] = useState<string | null>(null);
  const [contentMaterials, setContentMaterials] = useState<Material[]>([]);
  const [isParsing, setIsParsing] = useState(false);

  const startEdit = (course: Course) => {
    setEditingCourseId(course.id);
    setCourseName(course.name);
    setExamDate(course.examDate);
    setContents([...course.contents]);
  };

  const cancelEdit = () => {
    setEditingCourseId(null);
    setEditingContentId(null);
    setCourseName('');
    setExamDate('');
    setContents([]);
    setContentName('');
    setImportance(5);
    setFamiliarity(3);
    setContentMaterials([]);
  };

  const startEditContent = (content: CourseContent) => {
    setEditingContentId(content.id);
    setContentName(content.name);
    setImportance(content.importance);
    setFamiliarity(content.familiarity);
    setContentMaterials(content.materials || []);
  };

  const saveEditContent = () => {
    if (!contentName.trim()) return;
    setContents(contents.map(c =>
      c.id === editingContentId
        ? { ...c, name: contentName, importance, familiarity, materials: contentMaterials }
        : c
    ));
    setEditingContentId(null);
    setContentName('');
    setImportance(5);
    setFamiliarity(3);
    setContentMaterials([]);
  };

  const addContent = () => {
    if (!contentName.trim()) return;
    setContents([
      ...contents,
      {
        id: generateId(),
        name: contentName,
        importance,
        familiarity,
        completed: false,
        materials: [...contentMaterials],
      },
    ]);
    setContentName('');
    setContentMaterials([]);
  };

  const handleFileSelect = async (files: FileList) => {
    setIsParsing(true);
    
    const newMaterials: Material[] = [];
    for (let i = 0; i < files.length; i++) {
      const extractedText = await extractTextFromFile(files[i]);
      
      const hasError = extractedText.includes('【错误】') || extractedText.includes('【警告】');
      
      let truncatedText = extractedText;
      if (extractedText.length > MAX_TEXT_LENGTH) {
        truncatedText = extractedText.substring(0, MAX_TEXT_LENGTH) + '\n...【文本已截断，仅显示前5000字符】';
      }
      
      newMaterials.push({
        name: files[i].name,
        content: truncatedText,
        error: hasError,
      });
      
      if (!hasError) {
        console.log(`✅ 文件 ${files[i].name} 提取成功，文本长度: ${extractedText.length}`);
      } else {
        console.warn(`⚠️ 文件 ${files[i].name} 提取有问题: ${extractedText}`);
      }
    }
    
    setContentMaterials([...contentMaterials, ...newMaterials]);
    setIsParsing(false);
  };

  const removeMaterial = (index: number) => {
    const newMaterials = contentMaterials.filter((_, i) => i !== index);
    setContentMaterials(newMaterials);
  };

  const getFileTypeIcon = (fileName: string) => {
    const fileType = fileName.split('.').pop()?.toLowerCase();
    switch (fileType) {
      case 'pdf': return '📄';
      case 'docx': return '📝';
      case 'doc': return '📝';
      case 'pptx': return '📊';
      case 'ppt': return '📊';
      case 'txt': return '📄';
      default: return '📁';
    }
  };

  const removeContent = (id: string) => {
    setContents(contents.filter(c => c.id !== id));
  };

  const updateCourse = () => {
    if (!courseName.trim() || !examDate) return;

    let currentContents = [...contents];
    
    if (contentName.trim()) {
      currentContents = [
        ...currentContents,
        {
          id: generateId(),
          name: contentName,
          importance,
          familiarity,
          completed: false,
          materials: [...contentMaterials],
        },
      ];
    }

    if (currentContents.length === 0 || !editingCourseId) return;

    const updatedCourses = courses.map(course =>
      course.id === editingCourseId
        ? { ...course, name: courseName, examDate, contents: currentContents }
        : course
    );

    onSave(updatedCourses);
    cancelEdit();
  };

  const addCourse = () => {
    if (!courseName.trim() || !examDate) return;

    let currentContents = [...contents];
    
    if (contentName.trim()) {
      currentContents = [
        ...currentContents,
        {
          id: generateId(),
          name: contentName,
          importance,
          familiarity,
          completed: false,
          materials: [...contentMaterials],
        },
      ];
    }

    if (currentContents.length === 0) return;

    const newCourse: Course = {
      id: generateId(),
      name: courseName,
      examDate,
      contents: currentContents,
    };

    onSave([...courses, newCourse]);
    setCourseName('');
    setExamDate('');
    setContents([]);
    setContentName('');
    setImportance(5);
    setFamiliarity(3);
  };

  const removeCourse = (id: string) => {
    onSave(courses.filter(c => c.id !== id));
  };

  

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="text-lg font-semibold text-text-dark mb-4">
          📚 {editingCourseId ? '编辑课程' : '添加新课程'}
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">课程名称</label>
            <input
              type="text"
              lang="zh"
              value={courseName}
              onChange={(e) => setCourseName(e.target.value)}
              className="input-field"
              placeholder="例如：高等数学"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">考试日期</label>
            <DatePicker
              value={examDate}
              onChange={setExamDate}
              placeholder="选择考试日期"
            />
          </div>

          <div className="border-t border-gray-100 pt-4 mt-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">课程内容</h3>

            {contents.length > 0 && (
              <div className="space-y-2 mb-3">
                {contents.map(content => (
                  <div
                    key={content.id}
                    className={`flex items-center gap-3 p-3 rounded-lg ${
                      editingContentId === content.id ? 'bg-primary-50 border-2 border-primary-300' : 'bg-gray-50'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 truncate">{content.name}</p>
                      <p className="text-xs text-gray-500">
                        重要性: {content.importance} | 熟悉度: {content.familiarity}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      {editingContentId === content.id ? (
                        <button
                          onClick={saveEditContent}
                          className="p-2 text-green-500 hover:bg-green-50 rounded-lg transition-colors"
                          title="保存"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => startEditContent(content)}
                          className="p-2 text-primary-500 hover:bg-primary-50 rounded-lg transition-colors"
                          title="编辑"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => {
                          removeContent(content.id);
                          if (editingContentId === content.id) {
                            setEditingContentId(null);
                            setContentName('');
                            setImportance(5);
                            setFamiliarity(3);
                          }
                        }}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">内容名称</label>
              <input
                type="text"
                lang="zh"
                value={contentName}
                onChange={(e) => setContentName(e.target.value)}
                className="input-field w-full"
                placeholder="例如：微积分"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  重要性 (1-10)
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={importance}
                  onChange={(e) => setImportance(Number(e.target.value))}
                  className="w-full"
                />
                <span className="text-xs text-gray-500">{importance}</span>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  熟悉度 (1-10)
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={familiarity}
                  onChange={(e) => setFamiliarity(Number(e.target.value))}
                  className="w-full"
                />
                <span className="text-xs text-gray-500">{familiarity}</span>
              </div>
            </div>

            {/* 课件上传 */}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <label className="block text-sm font-bold text-text-dark mb-2">
                📄 上传课件（可选）
              </label>
              
              <div
                onClick={() => document.getElementById('material-input')?.click()}
                className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center hover:border-primary-300 hover:bg-primary-50/50 cursor-pointer transition-all"
              >
                <input
                  id="material-input"
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.ppt,.pptx"
                  onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
                  className="hidden"
                />
                {isParsing ? (
                  <span className="text-sm text-primary-500">正在解析课件...</span>
                ) : (
                  <span className="text-sm text-gray-500 flex items-center justify-center gap-2">
                    <Upload className="w-4 h-4" />
                    点击上传课件（PDF、Word、PPT）
                  </span>
                )}
              </div>

              {/* 已上传的课件列表 */}
              {contentMaterials.length > 0 && (
                <div className="mt-2 space-y-1">
                  {contentMaterials.map((file, index) => (
                    <div
                      key={index}
                      className={`flex items-center gap-2 p-2 rounded-lg ${file.error ? 'bg-red-50' : 'bg-gray-50'}`}
                    >
                      <span className="text-sm">{getFileTypeIcon(file.name)}</span>
                      <span className="flex-1 text-sm text-gray-700 truncate">{file.name}</span>
                      {file.error && <span className="text-xs text-red-500">解析异常</span>}
                      <button
                        onClick={() => removeMaterial(index)}
                        className="text-red-400 hover:text-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={addContent}
              disabled={!contentName.trim()}
              className="mt-3 flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 transition-colors disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              添加内容
            </button>
          </div>

          <div className="flex gap-3">
            {editingCourseId ? (
              <>
                <button
                  onClick={updateCourse}
                  disabled={!courseName || !examDate}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  保存修改
                </button>
                <button
                  onClick={cancelEdit}
                  className="btn-secondary flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  取消
                </button>
              </>
            ) : (
              <button
                onClick={addCourse}
                disabled={!courseName || !examDate}
                className="btn-primary w-full"
              >
                保存课程
              </button>
            )}
          </div>
        </div>
      </div>

      {courses.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">已添加课程</h2>
          <div className="space-y-3">
            {courses.map(course => (
              <div
                key={course.id}
                className={`flex items-center justify-between p-4 rounded-lg ${
                  editingCourseId === course.id ? 'bg-primary-50 border-2 border-primary-300' : 'bg-gray-50'
                }`}
              >
                <div>
                  <h3 className="font-medium text-gray-800">{course.name}</h3>
                  <p className="text-sm text-gray-500">
                    考试: {course.examDate} | {course.contents.length} 个内容
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => startEdit(course)}
                    className="p-2 text-primary-500 hover:bg-primary-100 rounded-lg transition-colors"
                    title="编辑"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => removeCourse(course.id)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="删除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
