---
week: 25
stage: 4
stageTitle: 阶段 4 · 工程化、安全与部署
title: 部署（分优先级，降低理想化）
focus: 重点放本地容器化，公网部署不强求
status: todo
progress: 0
hours: 24
deliverable: Dockerfile + 本地可部署包（公网链接可选）
---

# 第 25 周 · 部署（分优先级，降低理想化）

> 重点放本地容器化，公网部署不强求

**说明**：公网平台 Render / Railway / Vercel 国内访问坑很多，不作为硬性交付。

## 每日安排

- Day1：项目环境配置：`.env`、requirements、依赖锁定；本地 docker 打包（优先掌握）
- Day2：本地容器运行三个 Agent 项目
- Day3：【可选】尝试公网托管部署；遇到网络问题可以跳过，不要死磕
- Day4：静态前端打包；区分开发环境、生产环境配置
- Day5：处理部署常见报错
- Day6：交付：Dockerfile，本地可部署包；公网链接可选

## 交付物

- Dockerfile 与本地可运行的容器
- 开发 / 生产环境配置分离

## 本周三件事

- [ ] 写 Dockerfile，本地 docker 打包三个项目
- [ ] 静态前端打包 + 区分开发 / 生产配置
- [ ] 处理部署常见报错（公网部署可选）
