# 考期助手 - 设计规范

## 1. 配色

### 色彩系统

| 用途 | 名称 | 色值 | 说明 |
|------|------|------|------|
| 背景色 | Cream | `#FAF8F5` | 奶油色，全局背景 |
| 主色 | Sage | `#8AB8B0` | 蓝绿色/薄荷绿，用于主要按钮、进度条、选中状态 |
| 辅助色 | Coral | `#E8967A` | 珊瑚色，用于强调、已完成状态点缀 |
| 深色文字 | Text Dark | `#1A1A1A` | 近黑色，用于标题、正文 |
| 浅色文字 | Text Light | `#6B6B6B` | 中灰色，用于次要信息、说明文字 |
| 白色 | White | `#FFFFFF` | 卡片背景、输入框背景 |

### 色彩使用规则

- **主色调占比**：主色 (Sage) 占页面视觉的 20-30%
- **背景**：全局使用 Cream (#FAF8F5)
- **卡片**：白色背景 + 深色边框
- **文字层级**：Text Dark > Text Light，重要信息用粗体
- **状态色**：
  - 完成状态：Sage 背景
  - 选中状态：Sage 背景 + 深色边框
  - 错误/警告：Coral 色调

---

## 2. 字体

### 字号层级

| 元素 | 字号 | 字重 | 行高 | 示例 |
|------|------|------|------|------|
| 页面大标题 | 24px (text-3xl) | Bold (700) | 1.2 | "考期助手" |
| 卡片标题 | 18px (text-lg) | Bold (700) | 1.4 | "今日学习" |
| 任务标题 | 16px (text-lg) | Bold (700) | 1.6 | 任务内容 |
| 正文内容 | 14px (text-sm) | Normal (400) | 1.6 | 说明文字 |
| 辅助信息 | 12px (text-xs) | Normal (400) | 1.5 | 标签、小字 |

### 字体使用规则

- **标题**：统一使用 Bold，强调重要信息
- **正文**：使用 Normal 或 Medium，保持可读性
- **行高**：正文建议 1.6，标题建议 1.2-1.4
- **字体族**：系统字体 `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto`

---

## 3. 间距系统

### 间距层级

| 名称 | 数值 | Tailwind 类 | 使用场景 |
|------|------|-------------|----------|
| xs | 4px | gap-1 / space-y-1 | 紧凑元素间的微调 |
| sm | 8px | gap-2 / space-y-2 | 标签内元素、小间距 |
| md | 12px | gap-3 | 卡片内元素、小组件 |
| lg | 16px | gap-4 / space-y-4 | 常用间距、模块内元素 |
| xl | 24px | gap-6 / space-y-6 | 模块间主间距 |
| 2xl | 32px | gap-8 / space-y-8 | 大模块间、页面级间距 |

### 组件内边距

| 组件 | 内边距 | 说明 |
|------|--------|------|
| 卡片 | 24px (p-6) | 标准卡片内容区 |
| 按钮 | 16px 32px (py-4 px-8) | 主按钮 |
| 小按钮 | 12px 24px (py-3 px-6) | 次要按钮 |
| 输入框 | 12px 16px (py-3 px-4) | 表单输入 |
| 弹窗 | 24px (p-6) | Modal 内容区 |

### 模块间距

- **页面级间距**：上下 24px (space-y-6)
- **卡片间距**：16px-24px
- **元素间距**：8px-16px

---

## 4. 组件样式

### 4.1 按钮

#### 主按钮 (Primary Button)
```css
/* 样式规则 */
背景色: Sage (#8AB8B0)
文字色: Text Dark (#1A1A1A)
字重: Bold
圆角: 2xl (1.5rem)
边框: 2px solid Text Dark
阴影: 0 4px 0 #1A1A1A (底部实线阴影)

/* 悬停状态 */
transform: translateY(2px)
阴影: 0 2px 0 #1A1A1A

/* 按下状态 */
transform: translateY(4px)
阴影: none
```

#### 次要按钮 (Secondary Button)
```css
背景色: Cream (#FAF8F5)
文字色: Text Dark (#1A1A1A)
字重: Bold
圆角: xl (1rem)
边框: 2px solid Text Dark
阴影: 0 3px 0 #1A1A1A
```

### 4.2 卡片

#### 标准卡片
```css
背景色: White (#FFFFFF)
圆角: 2xl (1.5rem)
边框: 2px solid Text Dark (#1A1A1A)
阴影: 0 4px 0 #1A1A1A
内边距: 24px (p-6)
```

#### 悬停卡片 (Card Hover)
```css
transform: translateY(-2px)
阴影: 0 6px 0 #1A1A1A
```

### 4.3 任务卡片 (Task Card)

```css
背景色: White (#FFFFFF)
圆角: xl (1rem)
边框: 2px solid Text Dark
阴影: 0 3px 0 #1A1A1A
内边距: 20px (p-5)

/* 悬停状态 */
transform: translateY(-1px)
阴影: 0 5px 0 #1A1A1A

/* 完成状态 */
背景色: Coral/10 (rgba(232, 150, 122, 0.1))
边框色: Coral (#E8967A)
阴影: 0 3px 0 #E8967A
```

### 4.4 输入框

```css
背景色: Cream (#FAF8F5)
圆角: xl (1rem)
边框: 2px solid Text Dark
内边距: 12px 16px
聚焦状态: ring-2 ring-sage/50
```

### 4.5 弹窗 (Modal)

```css
背景色: White (#FFFFFF)
圆角: 2xl (1.5rem)
边框: 2px solid Text Dark
阴影: 0 8px 0 #1A1A1A
内边距: 24px (p-6)
遮罩: rgba(0, 0, 0, 0.3)
动画: fadeIn + slideUp (0.3s ease-out)
```

### 4.6 复选框/单选框

```css
/* 单选框 */
尺寸: 24px (w-6 h-6)
圆角: full (圆形)
边框: 3px solid Text Dark

/* 选中状态 */
背景色: Sage (#8AB8B0)
内部圆点: 12px 白色圆点

/* 多选框 */
尺寸: 24px (w-6 h-6)
圆角: xl (0.75rem, 圆角方形)
边框: 3px solid Text Dark

/* 选中状态 */
背景色: Sage (#8AB8B0)
对勾图标: 白色 ✓
```

### 4.7 标签/徽章 (Chip)

```css
背景色: Cream (#FAF8F5)
圆角: full (胶囊形)
边框: 2px solid Text Dark
内边距: 4px 12px
字重: Bold
字号: 12px (text-xs)

/* 激活状态 */
背景色: Sage (#8AB8B0)
文字色: White
```

### 4.8 进度条

```css
背景色: Cream (#FAF8F5)
圆角: xl (1rem)
边框: 2px solid Text Dark
高度: 16px (h-4)

填充色: Sage (#8AB8B0)
圆角: lg (0.5rem)
```

---

## 5. 设计原则总结

1. **简洁干净**：大量留白，呼吸感强
2. **圆润可爱**：大圆角设计，友好亲切
3. **厚实边框**：粗黑边框增加层次感和现代感
4. **立体阴影**：底部实线阴影（类似iOS拟物风格）
5. **色彩克制**：主色占比小，突出内容
6. **一致性**：所有组件遵循同一套圆角+边框+阴影规则
