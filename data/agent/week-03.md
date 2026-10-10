---
week: 3
stage: 0
stageTitle: 阶段 0 · Python 工程与后端基础
title: FastAPI 基础，后端接口开发
focus: 先吃透后端，接口能跑通再谈前端（原版 Week2 拆分而来）
status: todo
progress: 0
hours: 24
deliverable: 纯后端 FastAPI 项目（Postman 可调聊天接口）
---

# 第 3 周 · FastAPI 基础，后端接口开发

> 先吃透后端，接口能跑通再谈前端（原版 Week2 拆分而来）

**说明**：原版 Week2 直接 Vue + FastAPI 联调，现在拆分，先吃透后端，不急于前端。

## 每日安排

- Day1：FastAPI 路由、GET / POST；Pydantic 模型、请求体；状态码
- Day2：跨域 CORS 中间件；全局异常处理器；统一返回体格式 `{code,msg,data}`
- Day3：写接口：`POST /api/chat`，调用大模型，返回 reply、tokens；增加接口日志
- Day4：学习 StreamingResponse；SSE 基础原理；实现普通非流式接口
- Day5：接口测试，Postman 调试；处理接口各种报错场景
- Day6：交付：后端项目，可 Postman 调用聊天接口

## 交付物

- 纯后端 FastAPI 项目，暂不做 Vue 前端
- POST /api/chat 接口，返回 reply + tokens

## 本周三件事

- [ ] 搭 FastAPI 骨架 + 统一返回体 {code,msg,data}
- [ ] 写 POST /api/chat 并加接口日志
- [ ] Postman 跑通各种报错场景
