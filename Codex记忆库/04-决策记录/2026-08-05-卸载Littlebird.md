---
tags: [决策, Littlebird, 卸载, 工具, macOS]
date: 2026-08-05
status: 已重新安装
---

# 卸载 Littlebird

**日期**：2026-08-05
**状态**：已重新安装

## 背景

> 用户要求清除 Littlebird 软件及相应文件。Littlebird 是 Electron 桌面助手，Bundle ID 为 `com.genos.littlebird`，安装于 `/Applications/Littlebird.app`，版本 0.83.5。

> 更新：2026-08-06 已重新下载并设置，详见《2026-08-06-重新设置Littlebird》。

## 选项

| 选项 | 优点 | 缺点 | 风险 |
|------|------|------|------|
| A. 仅删除应用 | 操作简单 | 数据、缓存、登录态、录音缓存残留 | 残留隐私数据及磁盘占用 |
| B. 删除应用及全部关联文件（已选择） | 彻底清理 | 删除后不可恢复 | 应用内录音/会议数据会一并删除 |

## 决策

> 选择 B：删除应用、用户数据、缓存、登录态、录音缓存、偏好设置、HTTPStorages、日志、下载安装包、临时文件及诊断日志。执行前确认无运行进程、无 LaunchAgent/LaunchDaemon。`tccutil reset` 返回无对应 Bundle ID，未发现残留权限记录。

## 影响范围

- 应用主体：`/Applications/Littlebird.app`
- 用户数据：`~/Library/Application Support/Littlebird`、`@littlebird`、`com.genos.contextkit-cli`
- 偏好/缓存/日志：`~/Library/Preferences`、`Caches`、`HTTPStorages`、`Logs` 下对应 Genos/Littlebird 项
- 下载文件：`~/Downloads/Littlebird-Mac-arm64-0.82.12-Installer.dmg`
- 释放空间：约 2 GB

## 后续行动

- [ ] 如后续重新使用，需重新下载并重新授权
- [ ] 观察是否有其他软件仍引用 Littlebird 或 Genos ContextKit

## 回顾

> 暂无需回顾；若系统提示存在 Littlebird 残留，可再按此记录检查。
