---
title: My OS 个人工作台
emoji: 🪐
status: 未开始
stack: [Vue 3, Vite, TypeScript, Markdown, localStorage]
pitch: Git 当硬盘、md 当数据库的个人控制台，管理学习/项目/健康/笔记四条线
missing: 还没动手，先定下五条线的数据格式
progress: 0
period: 2026.09 — 至今
link: ''
---

# My OS 个人工作台

## 一句话

一个不依赖后端、不依赖登录的个人控制台：逻辑在代码，内容在 Markdown，状态在浏览器，资产在 Git。

## 能讲啥

- 用 Vite 的 `import.meta.glob` 把 md 当数据库：加一个文件就是加一条内容
- 数据分层：内容（md）/ 界面状态（ref）/ 用户操作（localStorage）三类分开
- 零 UI 库实现苹果风设计系统：圆角 20/24，fade + 8px 位移，勾选弹一下

## 缺啥

- 「保存」回 GitHub 还没做（v1.3 规划）
- 移动端只做了单栏适配，没有专门的触控优化
- 健康 / 理财模块只留了目录，没内容

## 架构

```text
data/           内容（md + json）
  ├─ agent/     26 周学习计划
  ├─ projects/  自研项目
  ├─ notes/     踩坑本 / 点子
  └─ daily/     每天一句话
src/lib/        解析 + 渲染 + 状态
src/views/      五个页面
```

## 下一步

1. 页面「保存」→ 调 GitHub API 改 md
2. 加速度热力图
