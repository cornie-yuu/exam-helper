export const escapeHtml = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// 轻量 Markdown -> HTML（仅覆盖标题/加粗/斜体/行内代码/列表/段落，满足试卷与答疑渲染）
const inline = (s: string): string =>
  s
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code class="md-code">$1</code>');

export const markdownToHtml = (md: string): string => {
  const lines = escapeHtml(md).split('\n');
  const html: string[] = [];
  let inList = false;

  const closeList = () => {
    if (inList) {
      html.push('</ul>');
      inList = false;
    }
  };

  for (const raw of lines) {
    const h = raw.match(/^(#{1,3})\s+(.*)$/);
    if (h) {
      closeList();
      const level = h[1].length;
      html.push(`<h${level} class="md-h${level}">${inline(h[2])}</h${level}>`);
      continue;
    }
    const hr = raw.match(/^\s*(?:[-*_]){3,}\s*$/);
    if (hr) {
      closeList();
      html.push('<hr class="md-hr" />');
      continue;
    }
    const li = raw.match(/^[-*]\s+(.*)$/);
    if (li) {
      if (!inList) {
        html.push('<ul class="md-ul">');
        inList = true;
      }
      html.push(`<li>${inline(li[1])}</li>`);
      continue;
    }
    const oli = raw.match(/^\d+\.\s+(.*)$/);
    if (oli) {
      if (!inList) {
        html.push('<ol class="md-ol">');
        inList = true;
      }
      html.push(`<li>${inline(oli[1])}</li>`);
      continue;
    }
    closeList();
    if (raw.trim() === '') {
      html.push('<div class="md-space"></div>');
    } else {
      html.push(`<p class="md-p">${inline(raw)}</p>`);
    }
  }
  closeList();
  return html.join('\n');
};
