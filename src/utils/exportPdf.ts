import { markdownToHtml, escapeHtml } from './markdown';

// 零依赖导出 PDF：新窗口渲染试卷 HTML 后调用浏览器打印（用户可选"另存为 PDF"）
export const exportPaperPdf = (title: string, markdown: string): void => {
  const body = markdownToHtml(markdown);
  const win = window.open('', '_blank');
  if (!win) {
    alert('请允许弹出窗口以导出 PDF');
    return;
  }
  win.document.write(`<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; padding: 32px; color: #1A1A1A; line-height: 1.7; max-width: 800px; margin: 0 auto; }
  h1 { font-size: 22px; color: #1F316D; border-bottom: 2px solid #1F316D; padding-bottom: 8px; }
  h2 { font-size: 18px; color: #1F316D; margin-top: 20px; }
  h3 { font-size: 15px; margin-top: 14px; }
  p { margin: 8px 0; white-space: pre-wrap; }
  ul, ol { margin: 8px 0; padding-left: 22px; }
  li { margin: 4px 0; }
  code { background: #F0F0F0; padding: 1px 5px; border-radius: 4px; font-size: 13px; }
  .md-space { height: 8px; }
  @media print { body { padding: 16px; } }
</style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  ${body}
  <script>window.onload = function () { window.print(); };</script>
</body>
</html>`);
  win.document.close();
};
