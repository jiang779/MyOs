---
week: 8
stage: 1
stageTitle: 阶段 1 · 单 Agent 与工具调用
title: 项目一：Vue 报错自助 Agent
focus: 第一个完整项目：把报错喂进去，把修复建议吐回来
status: todo
progress: 0
hours: 24
deliverable: vue-error-agent 完整可运行仓库
---

# 第 8 周 · 项目一：Vue 报错自助 Agent

> 第一个完整项目：把报错喂进去，把修复建议吐回来

**说明**：原版 Week6：去掉当周录制视频，视频 / 架构图放到作品集阶段 Week28-30。

## 每日安排

- Day1：梳理需求：接收报错文本、检索本地笔记、给出修复建议；梳理消息上下文
- Day2：FastAPI 后端集成 AgentExecutor；接入之前写好的 2 个工具
- Day3：编写接口接收报错，返回 Agent 回答；增加异常捕获
- Day4：简单 Vue 输入框页面，对接后端接口，完成基础联调
- Day5：整体端到端测试：粘贴报错，跑完整链路；修复 bug
- Day6：交付：`vue-error-agent` 完整可运行仓库；架构图、60s 视频延后，本周不做

## 交付物

- vue-error-agent 仓库（前后端可跑通）
- 架构图、60s 视频留到作品集阶段再做

## 本周三件事

- [ ] FastAPI 集成 AgentExecutor + 接入 2 个工具
- [ ] 写报错接口 + Vue 输入框页面对接
- [ ] 端到端跑通并修复 bug
