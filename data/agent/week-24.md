---
week: 24
stage: 4
stageTitle: 阶段 4 · 工程化、安全与部署
title: Agent 安全：Prompt 注入、权限最小化
focus: 先知道怎么被攻击，才知道怎么防
status: todo
progress: 0
hours: 24
deliverable: prompt_injection.py（含防护策略注释）
---

# 第 24 周 · Agent 安全：Prompt 注入、权限最小化

> 先知道怎么被攻击，才知道怎么防

**说明**：原版只有现象，缺少策略；本周补齐防护策略。

## 每日安排

- Day1：复现 prompt 注入攻击案例，看现象
- Day2：学习防护策略：输入过滤、工具最小权限、禁止前端直接传递 prompt 模板（原版只有现象，缺少策略）
- Day3：密钥安全：key 只保存在后端，前端永远不能接触密钥
- Day4：工具权限管控：限制文件读写范围，防止越权读取文件
- Day5：测试注入案例，验证防护效果
- Day6：交付：`prompt_injection.py`，附带防护策略注释

## 交付物

- prompt_injection.py：复现注入 + 防护策略
- 一份工具权限最小化清单

## 本周三件事

- [ ] 复现 prompt 注入攻击案例
- [ ] 实现输入过滤 + 工具最小权限
- [ ] 密钥只留后端 + 限制文件读写范围
