# My OS · 个人工作台

> 前端工程师的个人「学习 + 创作 + 人生」控制台
> 逻辑在代码，内容在 Markdown，状态在浏览器，资产在 Git

基于 Vue 3，管理 AI Agent 学习、自研项目与技术短视频创作。可扩展至健康 / 理财 / 写作。

## 快速开始

```bash
pnpm install
pnpm dev      # http://localhost:5173
```

```bash
pnpm build    # 类型检查 + 产出 dist/
pnpm preview  # 预览构建产物
```

## 五个页面

| 路由 | 页面 | 用途 |
| --- | --- | --- |
| `/` | 看板 | 本周三件事、周进度、连续输出、视频概览、最近踩坑、教练提示 |
| `/agent` | Agent 路线 | 26 周学习计划，阶段 0–5，周卡（目标/概念/架构/交付物） |
| `/projects` | 项目 | 自研项目卡：状态/技术栈/能讲啥/缺啥，绑 README |
| `/creator` | 创作 | 视频流水线：脚本 → 录制 → 剪辑 → 发布，口播稿在 md 里 |
| `/notes` | 日志 | 每日一句 / 踩坑本 / 点子本 |

## 数据怎么放

```
data/
├─ agent/week-01.md ... week-26.md   # 26 周计划（frontmatter + 分节正文）
├─ projects/*.md                     # 项目卡 + README 内容
├─ creator/video-*.md                # 视频状态 + 口播稿
├─ notes/bugs.md · ideas.md          # 踩坑本 / 点子本（## 日期 · 标题 分条）
├─ daily/2026-10-09.md               # 每天一句话（驱动连续天数 🔥）
└─ config.json                       # 开始日期、月度目标、教练提示
```

- **加内容 = 加一个 md 文件**，构建时由 `import.meta.glob` 自动收录，不用改代码
- **改完 md 刷新即可**，无需重启
- 勾选状态、周状态、视频状态存 `localStorage`（换机器靠 Git 存 md）

## 周计划 md 的写法

```md
---
week: 3
stage: 0
stageTitle: 阶段 0 · 认知与工具链
title: TypeScript 强化
focus: 为 Agent 工程打底
status: active        # todo | active | done
progress: 45
hours: 7
deliverable: typed 的工具调用与事件类型定义
---

# 第 3 周 · TypeScript 强化

## 目标
## 核心概念
## 架构
## 交付物
## 本周三件事          ← 看板页会读这一节
- [x] 完成泛型练习 10 题
- [ ] 手写一个 typed event emitter
```

`scripts/generate-weeks.mjs` 是一次性铺骨架用的，之后直接改 md。

## 技术栈

Vue 3 + Vite + TypeScript · Vue Router · markdown-it + highlight.js · 原生 CSS（零 UI 库）

## 规划中（v1 不做）

登录、多人协作、数据库、后端服务、移动 App、AI 自动写 md。
下一步：页面「保存」→ GitHub API 改 md。
