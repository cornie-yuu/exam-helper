import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';

// 设置PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export interface ParsedFile {
  name: string;
  type: 'pdf' | 'word' | 'ppt' | 'unknown';
  content: string;
  error?: string;
}

// 解析PDF文件
const parsePDF = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ');
    fullText += pageText + '\n';
  }
  
  return fullText;
};

// 解析Word文件
const parseWord = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
};

// 解析PPT文件（简化版，提取文本）
const parsePPT = async (file: File): Promise<string> => {
  // PPT解析比较复杂，这里使用简化方案
  // 读取文件为文本，提取可读内容
  const arrayBuffer = await file.arrayBuffer();
  const text = new TextDecoder('utf-8').decode(arrayBuffer);
  
  // 简单提取PPT中的文本内容
  const textMatches = text.match(/[\u4e00-\u9fa5a-zA-Z0-9\s，。！？、；：""''（）【】《》\-\+\=\*\&\%\$\#\@\!]+/g);
  if (textMatches) {
    return textMatches.filter(t => t.length > 3).join('\n');
  }
  
  return 'PPT内容解析受限，建议转换为PDF格式上传';
};

// 主解析函数
export const parseFile = async (file: File): Promise<ParsedFile> => {
  const extension = file.name.split('.').pop()?.toLowerCase();
  
  try {
    let content = '';
    let type: 'pdf' | 'word' | 'ppt' | 'unknown' = 'unknown';
    
    if (extension === 'pdf') {
      type = 'pdf';
      content = await parsePDF(file);
    } else if (extension === 'docx' || extension === 'doc') {
      type = 'word';
      content = await parseWord(file);
    } else if (extension === 'pptx' || extension === 'ppt') {
      type = 'ppt';
      content = await parsePPT(file);
    } else {
      return {
        name: file.name,
        type: 'unknown',
        content: '',
        error: '不支持的文件格式，请上传PDF、Word或PPT文件'
      };
    }
    
    // 限制内容长度，避免超过AI token限制
    const maxLength = 8000;
    if (content.length > maxLength) {
      content = content.substring(0, maxLength) + '\n...(内容过长，已截断)';
    }
    
    return {
      name: file.name,
      type,
      content
    };
  } catch (error) {
    return {
      name: file.name,
      type: 'unknown',
      content: '',
      error: `解析失败: ${error instanceof Error ? error.message : '未知错误'}`
    };
  }
};

// 批量解析文件
export const parseFiles = async (files: FileList): Promise<ParsedFile[]> => {
  const results: ParsedFile[] = [];
  
  for (let i = 0; i < files.length; i++) {
    const result = await parseFile(files[i]);
    results.push(result);
  }
  
  return results;
};
