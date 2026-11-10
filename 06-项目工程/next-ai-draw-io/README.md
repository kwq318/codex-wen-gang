# next-ai-draw-io

一个类似 draw.io 的 AI 图表画布，基于 Next.js、React Flow 和 Tailwind CSS 构建。

## 功能

- 拖拽添加矩形、圆角、决策菱形、椭圆、数据库、备注、平行四边形、六边形节点
- 双击节点就地编辑文字，节点之间直接拖拽连线
- AI 生成：输入文字描述自动生成流程图，支持分组、分支、数据源
- 本地智能解析：不配置 API Key 也能用，数据不出本机
- 云端模型：兼容 OpenAI Chat Completions 接口（可配 Base URL）
- 撤销 / 重做、快捷键（⌘Z、⌘⇧Z、⌘S、⌘D、Delete）
- 本地自动保存、导出 PNG / JSON、复制 Mermaid、下载 .mmd、导入 JSON 工程
- 深浅色主题、小地图、缩放控制、属性面板

## 本地运行

```bash
npm install
npm run dev
```

打开 http://localhost:3000。

## AI 配置

两种方式：

1. 在右侧 AI 面板点击设置按钮，填入 API Key、Base URL 和模型，设置只保存在浏览器本地。
2. 在 `.env.local` 配置：

```bash
OPENAI_API_KEY=
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini
```

不配置任何 Key 时，AI 面板使用本地规则解析，可识别 `->`、`--标签-->`、`## 分组`、`(决策)`、`{数据库}`、`[开始]` / `[结束]` 等写法。

## 目录

```text
src/app/                 Next.js 页面与 API 路由
src/components/          画布、工具栏、面板组件
src/lib/                 解析器、布局、存储、导出逻辑
```
