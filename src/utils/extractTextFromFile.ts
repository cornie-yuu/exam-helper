import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`;

export const extractTextFromFile = async (file: File): Promise<string> => {
  const fileName = file.name;
  const fileType = fileName.split('.').pop()?.toLowerCase();
  
  console.log(`开始解析文件: ${fileName}, 类型: ${fileType}`);
  
  try {
    switch (fileType) {
      case 'txt':
        return await extractFromTxt(file);
      case 'pdf':
        return await extractFromPdf(file);
      case 'docx':
        return await extractFromDocx(file);
      case 'pptx':
        return await extractFromPptx(file);
      default:
        return `【错误】不支持的文件类型: ${fileType}，请上传 .txt, .pdf, .docx 或 .pptx 文件`;
    }
  } catch (error) {
    console.error(`${fileType} 解析失败:`, error);
    return `【错误】无法解析文件 ${fileName}，请检查文件是否损坏或尝试另存为其他格式。`;
  }
};

const extractFromTxt = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      console.log(`TXT 提取成功，长度: ${text.length}`);
      resolve(text);
    };
    reader.onerror = reject;
    reader.readAsText(file, 'UTF-8');
  });
};

const extractFromPdf = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ');
    fullText += `第 ${i} 页:\n${pageText}\n\n`;
  }
  
  if (fullText.trim() === '') {
    return '【警告】该PDF是扫描件，无法提取文字，请上传可复制的PDF版本';
  }
  
  console.log(`PDF 提取成功，共 ${pdf.numPages} 页，文本长度: ${fullText.length}`);
  return fullText;
};

const extractFromDocx = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  
  let text = result.value;
  if (text.trim() === '') {
    console.warn('DOCX 提取的文本为空');
    return '【警告】该 Word 文件未检测到文本内容，请确保文档中有文字。';
  }
  
  console.log(`DOCX 提取成功，长度: ${text.length}`);
  return text;
};

const extractFromPptx = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  
  let text = result.value;
  if (text.trim() === '') {
    console.warn('PPTX 提取的文本为空');
    return '【警告】该 PPT 文件未检测到文本内容，请确保幻灯片中有文字。';
  }
  
  text = text.replace(/\n{3,}/g, '\n\n');
  
  console.log(`PPTX 提取成功，长度: ${text.length}`);
  return text;
};