---
tags: [决策, Littlebird, AI助手, 工具, macOS]
date: 2026-08-06
status: 已决定
---

# 重新安装并设置 Littlebird

**日期**：2026-08-06
**状态**：已决定

## 背景

> 用户于 2026-08-05 卸载 Littlebird 后，2026-08-06 重新下载并使用。本记录替代《2026-08-05-卸载Littlebird》，记录重新安装、登录和例行任务配置的结论。

## 决策

> 重新启用 Littlebird，保留已有账号登录态，并完成每日晨间简报 Routine 设置。免费 Basic 版只允许 1 条 Routine，暂不升级。

## 影响范围

- **应用位置**：`/Applications/Littlebird.app`
- **版本**：0.83.5（arm64，Electron）
- **账号**：`weiqing kang`，Basic 免费版
- **数据目录**：`~/Library/Application Support/Littlebird`
- **权限状态**：日历权限已授权，屏幕上下文已启用，开机自启已开启
- **例行任务**：每日晨间简报，每天 07:00，自动汇总当天会议、待办、邮件和项目进展，并列出最值得先处理的 3 件事
- **免费额度限制**：Basic 版仅 1 条 Routine；如需新增每日收尾、每周回顾等 Routine，需升级

## 验证结果

> Littlebird 正常启动，Routine 创建成功，第一份简报已生成并触发通知。

## 后续行动

- [ ] 如需要 Littlebird 读取 Outlook/企业邮箱，在 `Littlebird → Settings → Integrations` 登录授权
- [ ] 如需要更多 Routine，评估是否升级 Littlebird Plus
- [ ] 如系统提示权限异常，再检查辅助功能、屏幕录制、麦克风权限

## 回顾

> 使用 1-2 周后回顾：每日晨间简报是否真的省时、内容是否准确、是否需要连接邮件或升级。
