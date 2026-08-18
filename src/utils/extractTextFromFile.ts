import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import JSZip from 'jszip';
import { describeImageWithVL } from './aiService';

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
      case 'ppt':
        return '【错误】暂不支持旧版 .ppt 格式，请在 PowerPoint 中「另存为」.pptx 后重新上传。';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'webp':
        return await extractFromImage(file);
      default:
        return `【错误】不支持的文件类型: ${fileType}，请上传 .txt, .pdf, .docx, .pptx 或图片(.jpg/.jpeg/.png/.webp)`;
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

const decodeXmlEntities = (s: string): string =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(parseInt(d, 10)));

// PPTX 本质是 Office Open XML 的 zip 包：每张幻灯片的文字在 ppt/slides/slideN.xml 的 <a:t> 标签里
const extractFromPptx = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);

  const slideEntries = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/i.test(name))
    .sort((a, b) => {
      const na = parseInt(a.match(/\d+/)![0], 10);
      const nb = parseInt(b.match(/\d+/)![0], 10);
      return na - nb;
    });

  if (slideEntries.length === 0) {
    return '【警告】该 PPT 文件未检测到幻灯片内容，请确保是有效的 .pptx 文件。';
  }

  let fullText = '';
  for (let i = 0; i < slideEntries.length; i++) {
    const xml = await zip.files[slideEntries[i]].async('string');
    const texts: string[] = [];
    const re = /<a:t>([\s\S]*?)<\/a:t>/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(xml)) !== null) {
      texts.push(decodeXmlEntities(m[1]));
    }
    const slideText = texts.join(' ').trim();
    fullText += `第 ${i + 1} 张幻灯片:\n${slideText}\n\n`;
  }

  if (fullText.replace(/\s/g, '').length === 0) {
    return '【警告】该 PPT 幻灯片中未检测到文字内容（可能是纯图片幻灯片），建议把对应页导出为图片后单独上传。';
  }

  console.log(`PPTX 提取成功，共 ${slideEntries.length} 张，文本长度: ${fullText.length}`);
  return fullText.trim();
};

// 图片课件：先压缩再交给百炼通义千问视觉模型(qwen-vl)识别文字，替代 tesseract OCR
const compressImage = (file: File, maxSize = 1600, quality = 0.85): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('无法创建 canvas 上下文'));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        // 统一导出为 jpeg（去掉透明通道、减小体积），再取 base64
        resolve(canvas.toDataURL('image/jpeg', quality).split(',')[1]);
      };
      img.onerror = () => reject(new Error('图片加载失败'));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsDataURL(file);
  });

const extractFromImage = async (file: File): Promise<string> => {
  try {
    const base64 = await compressImage(file);
    const text = await describeImageWithVL(base64, 'image/jpeg');
    if (!text || text.trim().length === 0) {
      return '【警告】图片未识别出文字，已作为参考资料保留，建议你手动补充重点。';
    }
    return text;
  } catch (e) {
    console.error('图片识别失败:', e);
    return '【警告】图片识别失败（百炼视觉模型调用异常），已作为参考资料保留。';
  }
};
