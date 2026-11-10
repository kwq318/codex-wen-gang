---
tags: [决策, OpenMiniServer, XServer, 工具, C++, macOS]
date: 2026-08-02
status: 已决定
---

# 安装 OpenMiniServer 并完成 macOS 兼容修复

**日期**：2026-08-02
**状态**：已决定

## 背景

> 用户要求安装 GitHub 仓库 OpenMiniServer/OpenMiniServer。该仓库是一个超轻量 C++ 高并发跨平台服务器框架，基于 Actor 模型，采用 CMake 构建。

## 选项

| 选项 | 优点 | 缺点 | 风险 |
|------|------|------|------|
| A. 按 README 用 CMake 编译 | 官方标准流程 | 本机无 CMake，官方下载源速度过慢 | 网络等待时间长 |
| B. 用 clang++ 等价编译 | 无需安装 CMake，可立即完成 | 不属于官方构建路径 | 需要手工维护源文件列表 |
| C. 改用官方推荐的 XServer | 官方已迁移到 XServer | 不是用户明确要求的仓库 | 需要另行安装 |

## 决策

> 选择 **B：克隆原仓库到 `06-项目工程/OpenMiniServer`，用系统 `clang++` 按 CMake 等价源文件列表直接编译**。同时记录官方已废弃原项目，后续建议迁移到 XServer。

## 影响范围

- **仓库位置**：`/Users/kangweiqing/Desktop/桌面/codex文稿/06-项目工程/OpenMiniServer`
- **编译产物**：`build/OpenMiniServer`
- **构建方式**：本机无 CMake，改用 `clang++ -std=c++11 -O2 -I open -I demo ... -pthread` 编译
- **macOS 兼容修复**（5 个文件，均未提交）：
  - `demo/server/httpd/httpd.h`：去掉构造函数中多余的类名限定
  - `open/openserver.cpp`：修正错误锁变量并让失败路径返回 `NULL`
  - `open/opensocket.cpp`：macOS 线程命名改用 `pthread_setname_np`
  - `open/openstring.cpp`：`GBKToUTF8` 仅 Windows 分支使用 Win32 API
  - `open/openthread.cpp`：macOS 引入 Mach 头并适配线程命名

## 验证结果

> `./OpenMiniServer` 启动成功，监听 `0.0.0.0:8080`，demo 自动完成 `/api/stock?code=399001` 请求并返回 CSV，输出与 README 一致。验证后已停止服务。

## 后续行动

- [x] 克隆 OpenMiniServer 到 `06-项目工程/OpenMiniServer`
- [x] 完成 macOS 编译和 demo 验证
- [ ] 如长期使用，改装官方推荐项目 XServer（https://github.com/xserver-mini/xserver）
- [ ] 评估是否把兼容修复提交回原仓库或纳入 XServer

## 回顾

> 若后续需要持续开发，建议优先迁移到 XServer，避免在已废弃仓库上继续积累维护成本。

