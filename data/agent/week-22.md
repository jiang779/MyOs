---
week: 22
stage: 4
stageTitle: 阶段 4 · 工程化、安全与部署
title: SSE 流式输出，前端打字机效果
focus: 让用户等的时候有反馈：token 一个一个往外冒
status: todo
progress: 0
hours: 24
deliverable: 流式聊天前后端完整 demo
---

# 第 22 周 · SSE 流式输出，前端打字机效果

> 让用户等的时候有反馈：token 一个一个往外冒

**说明**：原版 Week16-20；降低公网部署理想化；部署设为可选。

## 每日安排

- Day1：SSE 协议；FastAPI StreamingResponse；异步 astream
- Day2：后端接口改造为流式接口；支持 token 逐块推送
- Day3：Vue 前端实现打字机渲染效果
- Day4：实现停止中断生成功能
- Day5：完整联调测试
- Day6：交付：流式聊天前后端完整 demo

## 交付物

- 后端 SSE 流式接口（token 逐块推送）
- Vue 打字机效果 + 停止中断生成

## 本周三件事

- [ ] 后端改造为 StreamingResponse 流式接口
- [ ] Vue 实现打字机渲染
- [ ] 实现停止中断生成 + 完整联调
