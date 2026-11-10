---
title: "Awesome GPT-Image-2-Prompts"
tags: [AI, GPTImage, 提示词, 图像生成, 学习笔记]
date: 2026-08-02
---

# Awesome GPT-Image-2-Prompts

> 一套可直接复制、按场景拆解的 GPT Image 2 / gpt-image 系列提示词精选集。每条模板都以「主体、场景、光线、镜头、风格、构图、细节、约束」为骨架，方便替换变量后快速出图。

## 一、快速使用

1. 先定用途：产品图、海报、插画、角色、UI、还是编辑旧图。
2. 从下面选一条模板，替换 `{}` 里的变量。
3. 先给主体和画面，再给光线/镜头/风格，最后给负面约束。
4. 不满意就只改一个变量，不要一次性改掉全部描述。

## 二、提示词结构公式

```text
[主体] + [场景/环境] + [动作/状态] + [光线] + [镜头/透视] +
[风格] + [构图] + [关键细节] + [文字/排版要求] + [负面约束]
```

优先级：**主体 > 动作 > 光线 > 镜头 > 风格 > 构图 > 细节**。模型越往后越可能忽略，所以最重要的信息放最前面。

## 三、可直接复制模板

### 1. 写实摄影

```text
Photorealistic image of {主体，例如：一杯冷萃咖啡放在深色木质桌面上}.
{场景，例如：靠窗的咖啡店角落，背景有柔和虚化的绿植和暖色灯光}.
{动作/状态，例如：杯壁挂着冷凝水，桌面有一片细小水渍}.
Soft window light from the left, warm highlights, gentle shadows, shallow depth of field.
Shot on 85mm lens, eye-level angle, slightly centered composition, natural film grain.
Keep details sharp on the cup, texture visible, no watermark, no text overlay.
```

### 2. 电商产品图

```text
Professional e-commerce product photo of {产品}.
Pure light gray seamless studio background, softbox lighting, soft shadow under product.
Front three-quarter angle, product occupies 60% of frame, centered with breathing space.
High detail on material texture, clean reflections, color accurate, sharp edges.
No text, no logo, no human hand, no busy props, no harsh shadow.
```

### 3. 品牌海报

```text
Minimalist brand poster for {品牌/主题}.
Main subject: {主体}.
Layout: large headline at top, product in center, small supporting copy at bottom.
Color palette: {主色} as dominant, {辅助色} for accent, white space at least 40%.
Typography: bold sans-serif headline, clean hierarchy, no decorative clutter.
Studio lighting, slight texture, professional magazine quality.
Do not add random English text; use only the text provided below.
```

### 4. 插画 / 漫画

```text
Editorial illustration, {画风，例如：clean flat vector, ink and watercolor, 1990s storybook}.
Main character: {角色}.
Action: {角色正在做什么}.
Background: {场景}.
Use {主色}, {辅助色}, {强调色}.
Keep composition simple, character occupies about 50% of frame, clear focal point.
No realistic faces, no complex texture, no more than 6 visual elements.
```

### 5. UI / App 截图

```text
High-fidelity mobile app screenshot mockup for {应用类型}.
Screen state: {页面状态，例如：首页、设置页、空状态、支付成功}.
Layout: top status bar, one clear primary action button, cards aligned to 8px grid.
Style: {深色/浅色}, rounded corners, restrained shadows, clear visual hierarchy.
UI text in {语言}: {需要出现的真实文案}.
Font size hierarchy: title 24px, body 16px, caption 12px.
No placeholder Latin gibberish, no marketing copy, no browser frame, no hand.
```

### 6. 角色 / 风格一致性

```text
Using the reference image as the character bible, regenerate {新场景}.
Keep the same character design, face shape, hair, clothing, color palette, and art style.
Only change: {允许变化的点，例如：表情、动作、环境、时间}.
Do not age the character, do not change costume details, do not shift art style.
Character should be the clear focal point, background secondary.
```

### 7. 精确文字排版

```text
Poster with exact text.
Main headline: "{标题文字}".
Subheadline: "{副标题文字}".
Place headline in the upper third, subheadline below it, no other text.
Font: {字体方向，例如：modern geometric sans-serif}.
Style: {风格}.
Preserve spelling and punctuation exactly. Do not add extra words or letters.
```

### 8. 图像编辑 / 迭代

```text
Edit the provided image.
Change only: {要改的具体元素}.
Keep everything else identical: composition, lighting, color, character, background, aspect ratio, and style.
Do not add new objects, do not move existing elements, do not change resolution.
```

## 四、负面提示词清单

不是所有模型都支持负面提示词，但把约束写进正文通常有效：

```text
No watermark, no logo, no signature, no gibberish text, no extra fingers,
no distorted hands, no duplicated face, no warped geometry, no oversaturated colors,
no lens flare, no busy background, no stock-photo clichés, no uncanny realism.
```

建议按画面类型裁剪，不要一次全堆进去。

## 五、迭代工作流

1. **初稿**：只写主体、场景、光线、风格，先看大方向。
2. **收窄**：固定满意的元素，逐项加入镜头、构图、细节。
3. **修正**：一次只提一个修改点，例如「只改背景」。
4. **锁定**：确定风格后，把参考图或完整描述作为一致性基线。
5. **交付**：检查文字、边缘、主体比例、品牌元素后进入后期。

## 六、出图后检查清单

- [ ] 文字拼写和标点是否完全正确？
- [ ] 主体是否占画面主要位置，视觉层级是否清楚？
- [ ] 手脚、五官、材质边缘是否有明显变形？
- [ ] 颜色是否符合品牌/用途，而不是过度饱和？
- [ ] 构图是否留出安全边距，是否方便加 Logo 或正文？
- [ ] 是否需要二次裁切或放大，原图分辨率是否够用？

## 七、常见问题

| 问题 | 原因 | 改法 |
|------|------|------|
| 文字乱码 | 文本太长、字体要求太模糊 | 减少文字数量，明确字号、位置和字体方向 |
| 风格漂移 | 风格词太宽泛 | 给参考图，或指定媒介、材质、年代、画派 |
| 主体太小 | 描述顺序重场景轻主体 | 把主体放到第一句，并写明占比 |
| 画面太满 | 元素清单过长 | 保留 3-6 个关键元素，删掉非必要细节 |
| 光线不统一 | 混用多个光源词 | 只保留一个主光源和一个辅助光源 |
| 编辑不彻底 | 没写清哪些不能动 | 同时写「改什么」和「保持什么不变」 |

## 八、提示词质量加分项

- 用具体媒介代替模糊风格：胶片、水彩、丝网印刷、3D 渲染、铅笔线稿。
- 用具体光线代替「好看」：清晨侧光、霓虹灯、窗边柔光、顶光棚拍。
- 用具体镜头代替「专业」：85mm 人像、广角建筑、微距材质、俯拍产品。
- 用比例约束构图：主体占 60%、留白 40%、三分法、中心对称。
- 用可验证的细节制造真实感：水渍、磨损、反光、阴影边缘。

---

*本笔记按 Obsidian 规范存放在学习笔记目录，后续补充示例图和实测结果时继续追加。*
