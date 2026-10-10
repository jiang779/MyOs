# LLM基础

├── **传统 AI 应用（深度学习时代）**

 │   ├── 图像识别（人脸识别、质检）

 │   ├── 语音识别（ASR）

 │   └── 推荐系统（抖音/淘宝推荐）

 │ 

└── **大模型应用（LLM 时代）**

​    ├── 纯对话类（直接调大模型 API，比如 ChatGPT）

​    ├── RAG 应用（接知识库，检索增强生成）

   ├── Agent 应用（能自主调用工具、多步执行任务） 

   ├── 微调应用（用私有数据重新训练模型） 

   └── 多模态应用（图文/视频理解与生成）



## 一、AI 辅助开发

---

### 目录

1. 什么是 Skill
2. 项目结构
3. 如何被 AI 发现和加载
4. frontmatter 格式说明
5. references 参考文件的作用
6. 面试话术

---

### 1. 什么是 Skill

Skill 是给 AI 编程工具（如 Trae）读的**项目编码规范文档**。让 AI 在本项目中生成代码时，遵循团队约定的命名、架构、组件复用等规则，而不是用 AI 的默认风格乱写。

一句话：**人写规范，AI 读规范，AI 按规范写代码。**

---

### 2. 项目结构

```
skills/
└── tz-admin-frontend/          ← 一个技能 = 一个文件夹
    ├── SKILL.md                ← 唯一入口，有 frontmatter
    └── references/              ← 附属参考文档
        ├── architecture.md     ← 架构说明（无 frontmatter）
        ├── components.md        ← 组件库说明
        ├── page-patterns.md     ← 页面模板
        └── api-utils.md        ← API 写法
```

---

### 3. 如何被 AI 发现和加载

分三个阶段，不是每次全项目扫描：

| 阶段 | 时机 | 做什么 | 读多少 |
|------|------|--------|--------|
| 注册 | 项目打开时（一次性） | 扫描 `skills/` 目录，读每个 SKILL.md 的 frontmatter（name + description） | 几行 |
| 匹配 | 用户每次提问时 | 拿用户问题和已注册技能的 description 触发词做匹配 | 不读文件 |
| 加载 | 触发词命中时 | 读完整 SKILL.md 正文，正文引用了 references 再按需读 | 按需 |

举例：

```
用户说"帮我新建一个页面"
  → AI 扫技能列表，tz-admin-frontend 的 description 有触发词"新建页面"
  → 命中 → 加载完整 SKILL.md → 看到"模板见 references/page-patterns.md"
  → 读 page-patterns.md → 按模板生成代码

用户说"帮我调 CSS"
  → 没有技能匹配 → 不加载任何 skill，直接用默认能力回答
```

---

### 4. frontmatter 格式说明

SKILL.md 开头的 `---` 包围的 YAML 块：

```yaml
---
name: tz-admin-frontend        # 技能唯一标识
description: >-                 # 触发说明（AI 靠这个判断什么时候用）
  项目开发规范。
  触发词：新建页面、新建组件、新建接口、
  core/business 划分、组件库...
---
```

| 字段 | 作用 |
|------|------|
| `name` | 技能唯一标识，不能重复 |
| `description` | 告诉 AI 这个技能解决什么问题、什么场景触发。触发词写在这里 |

**关键**：AI 只看 description 判断要不要加载。description 写得好，AI 才能在对的时候触发。

---

### 5. references 参考文件的作用

references 里的 md 文件**不是独立技能**，没有 frontmatter，不单独注册。

它们是 SKILL.md 的**附属附件**，只在主技能被触发后按需加载：

```
SKILL.md 正文写着"模板见 references/page-patterns.md"
  → AI 这时才去读 page-patterns.md
```

| 文件 | 内容 |
|------|------|
| `architecture.md` | 项目架构、core/business 划分、路由/Store 机制 |
| `components.md` | 组件库三层体系、已有组件清单、创建规范 |
| `page-patterns.md` | 列表页/表单完整代码模板 |
| `api-utils.md` | 请求封装、API 写法、响应格式 |

---

### 6. 面试话术

> "我在项目里用了 AI 辅助开发。团队在 `skills/` 目录下维护了一个 SKILL.md，里面定义了项目的编码规范——比如接口判断用 `res.err === 0`、变量用 snake_case、回调用 `_that` 模式、列表页按标准模板开发等。
>
> 这个文件开头有 YAML frontmatter，AI 工具打开项目时会扫描 skills 目录，读 frontmatter 里的 name 和 description 注册成技能。用户提问时 AI 拿问题和 description 里的触发词做匹配，命中才加载完整规范和 references 下的参考文档，不是每次全项目扫描。
>
> 这样 AI 生成的代码能直接符合团队规范，不用人工再调风格。"



## 二、大模型基础

---

### 目录

1. 大模型 API 调用
2. 提示词工程-Prompt Engineering
3. Token概念
4. 工具调用-Function Calling
5. 多模态调用

---

### 1. 大模型 API 调用

1. 大模型云平台：注册账号、获取密钥、开通模型。*在火山引擎、阿里云百炼等平台注册账号，生成API密钥，手动开通需要使用的大模型权限。*
2. Python 环境：安装通用大模型 SDK 依赖库。*执行pip install openai，使用通用openai SDK，即可调用国内绝大多数兼容协议的大模型。*
3. 项目配置：使用环境变量保存密钥、模型参数。*在项目.env文件中配置API_KEY、MODEL_NAME等参数，通过工具读取配置信息。*
4. 代码开发：发起请求、接收模型返回结果。*代码读取环境变量，配置接口地址与密钥，传入用户提问，接收并打印大模型回答内容。*
   1. `OpenAI(api_key=..., base_url="...")` 实例化 SDK 客户端。*创建 HTTP 请求客户端对象；`base_url`指定大模型 MaaS 平台网关地址，`api_key`带上身份凭证。*
   2. `client.chat.completions.create(...)` 调用对话补全接口。*向远程大模型服务发送网络请求，返回响应对象；开启流式后返回可迭代事件流。参数如下*
      1. `model`：MaaS 平台的模型 ID。
      2. `temperature`：控制生成随机性。
      3. `max_tokens`：限制最大输出长度。
      4. `stream=True`：开启流式分片返回模式。
      5. `messages=messages`：组装协议标准消息体。
   3. 迭代流响应对象，读取 `event.choices[0].delta.content`。*流式 API 专属字段 `delta`，代表**本次返回的增量片段文本 piece**。循环读取接口源源不断推送回来的分片数据；非流式接口使用 `message.content`，流式只能使用 `delta.content`。*
   4. 拼接所有增量片段 `"".join(parts)`。*把流式每一小段增量，在内存拼接为完整回答字符串。*

```python
import os
from pathlib import Path

from openai import OpenAI

DEFAULT_MODEL = "deepseek-v4-pro-ga-260813"

# 加载环境配置
def load_env_file():
    """从项目根目录 .env 中加载环境变量。"""
    env_file = Path(__file__).resolve().parents[2] / ".env"
    if env_file.exists():
        for line in env_file.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            os.environ.setdefault(key, value)
    return env_file

#构建客户端实例
def build_client():
    load_env_file()
    api_key = os.getenv("DOUBAO_API_KEY")
    if not api_key:
        raise RuntimeError("未找到 DOUBAO_API_KEY，请先在项目根目录 .env 中配置。")

    return OpenAI(
        api_key=api_key,
        base_url="https://ark.cn-beijing.volces.com/api/v3",
    )

#解析要使用的模型
def resolve_model(model: str | None = None) -> str:
    selected = (model or os.getenv("DOUBAO_MODEL") or DEFAULT_MODEL).strip()
    if not selected:
        raise RuntimeError(
            "未找到 DOUBAO_MODEL。请在 .env 中填写火山引擎中已开通的文本聊天模型 ID，"
            "例如：DeepSeek-V4-pro 或 doubao-1-5-pro-32k"
        )
    return selected

#流式输出
def chat_stream(prompt: str, model: str | None = None, system_prompt: str | None = None):
    """
    流式输出示例（增量打印并返回完整结果）。

    功能节点（带序号）：
    1) 加载配置：通过 build_client() -> load_env_file() 加载 `.env` 并校验 API Key。
    2) 创建客户端：使用 OpenAI SDK（兼容接口），并设置 `base_url` 指向豆包/Ark。
    3) 确定模型：resolve_model() 会优先使用函数参数、其次环境变量、最后 DEFAULT_MODEL。
    4) 准备 messages：支持 `system` + `user` 两层消息。
    5) 发起流式调用：调用 `client.chat.completions.create(..., stream=True)`。
    6) 解析返回：逐事件解析增量内容并实时打印，同时累积完整文本并在结束时返回。

    注意：不同 SDK/版本返回的流事件结构可能不同，代码尝试兼容多种结构（dict 或对象）。
    """
    # (1)(2) 创建客户端（同时确保 .env 已加载）
    client = build_client()
    # (3) 决定模型
    model_name = resolve_model(model)

    # (4) 构建 messages
    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": prompt})

    # (5) 发起流式请求
    try:
        stream_resp = client.chat.completions.create(
            model=model_name,
            messages=messages,
            temperature=0.7,
            max_tokens=512,
            stream=True,
        )
    except Exception as e:
        raise RuntimeError(
            "流式调用失败。请确认 DOUBAO_API_KEY/DOUBAO_MODEL 是否正确，以及模型是否支持 Chat Completions。\n"
            f"当前 model={model_name}\n错误信息：{e}"
        ) from e

    # (6) 解析流式事件并实时打印
    parts = []
    for event in stream_resp:
        # 当前主流openai SDK，event是对象，不是字典
        delta = event.choices[0].delta
        piece = delta.content
        if piece:
            print(piece, end="", flush=True)
            parts.append(piece)

    print()
    full_text = "".join(parts)
    return full_text



if __name__ == "__main__":
    print("正在调用文本聊天大模型...")
    print(f"当前模型：{resolve_model()}")
    answer = chat_stream(
        prompt="请用中文简要介绍什么是大模型。",
        system_prompt="你是一个专业的技术助手，回答要简洁、准确、中文。",
    )
```

### 2. 提示词工程

1. **系统提示词**：system 角色，全局约束规则
2. **角色设定**：system 内定义模型身份立场
3. **Few‑shot**：给输入输出样例，模仿输出格式逻辑
4. **CoT**：要求分步推理，解决复杂逻辑问题
5. **JSON 结构化输出**：提示词定义字段 + response_format 参数，代码解析 json
6. **综合组合**：多种技术叠加，落地真实业务，配合 temperature 调参

```python
import os
import json
from dotenv import load_dotenv
from openai import OpenAI

# --------------------------
# 加载环境变量
# --------------------------
load_dotenv()
client = OpenAI(
    api_key=os.getenv("DOUBAO_API_KEY"),
    base_url="https://ark.cn-beijing.volces.com/api/v3"
)
MODEL_NAME = os.getenv("DOUBAO_MODEL", "deepseek-v4-pro-ga-260813")


def run_demo():
    print("===== 1. 系统提示词 System Prompt =====")
    """
    【系统提示词 System Prompt】
    作用：全局约束，整个对话生效，放在 messages 的 system 角色
    功能：设定输出语言、约束规则、禁止幻觉等
    """
    resp1 = client.chat.completions.create(
        model=MODEL_NAME,
        messages=[
            {"role": "system", "content": "你是渔船业务助手，回答简洁，不要编造不存在的数据，只用中文回答。"},
            {"role": "user", "content": "简单介绍渔船作业"}
        ],
        temperature=0.3
    )
    print(resp1.choices[0].message.content, "\n")


    print("===== 2. 角色设定 Role Setting =====")
    """
    【角色设定 Role Setting】
    属于系统提示词的高级用法，给模型定义身份、专业背景、工作立场
    """
    resp2 = client.chat.completions.create(
        model=MODEL_NAME,
        messages=[
            {"role": "system", "content": "你是一名资深前端开发工程师，擅长移动端H5页面问题排查。回答要给出可落地的技术建议，不要空话。"},
            {"role": "user", "content": "移动端列表卡片出现样式错位，该怎么排查？"}
        ],
        temperature=0.3
    )
    print(resp2.choices[0].message.content, "\n")


    print("===== 3. 少样本提示 Few‑shot =====")
    """
    【少样本提示 Few‑shot】
    提供少量【输入-输出】示例，让模型模仿示例的格式、逻辑
    不需要训练模型，通过示例引导输出
    """
    few_shot_prompt = """
任务：判断文本属于渔船业务还是普通业务。
示例1：
输入：渔船出海捕捞
输出：渔船业务

示例2：
输入：超市商品售卖
输出：普通业务

示例3：
输入：渔船设备检修
输出：渔船业务

现在请判断下面输入：
输入：海上渔业补给
输出：
"""
    resp3 = client.chat.completions.create(
        model=MODEL_NAME,
        messages=[
            {"role": "user", "content": few_shot_prompt}
        ],
        temperature=0.0
    )
    print(resp3.choices[0].message.content, "\n")


    print("===== 4. 思维链 CoT Chain‑of‑Thought =====")
    """
    【思维链 CoT】
    强制模型分步推理思考，再输出最终答案。
    适合逻辑、计算、复杂判断，会消耗更多token。
    """
    cot_prompt = """
问题：一艘渔船上午出海，上午捕捞200斤鱼，下午比上午多捕捞80斤，晚上返航。请问全天一共捕捞多少斤鱼？
请一步步思考，先写推理过程，最后给出最终答案。
"""
    resp4 = client.chat.completions.create(
        model=MODEL_NAME,
        messages=[
            {"role": "user", "content": cot_prompt}
        ],
        temperature=0.0
    )
    print(resp4.choices[0].message.content, "\n")


    print("===== 5. 结构化输出 JSON模式 =====")
    """
    【结构化输出 JSON模式】
    1. API参数 response_format={"type":"json_object"} 开启JSON模式
    2. system提示词明确规定JSON字段，模型返回标准json字符串
    3. 程序使用 json.loads() 解析为python字典，方便业务代码使用
    """
    json_system_prompt = """
你需要返回严格JSON格式，字段定义：
{
    "task_type": "字符串，任务分类",
    "content": "字符串，任务描述",
    "priority": "数字，1高优先级，2中，3低"
}
不要输出除json以外的任何文字。
"""
    resp5 = client.chat.completions.create(
        model=MODEL_NAME,
        messages=[
            {"role": "system", "content": json_system_prompt},
            {"role": "user", "content": "渔船移动端页面样式优化，需要调整卡片间距"}
        ],
        temperature=0.0,
        response_format={"type": "json_object"}
    )
    json_str = resp5.choices[0].message.content
    data = json.loads(json_str)
    print("原始返回JSON字符串：", json_str)
    print("解析后Python字典：", data, "\n")


    print("===== 6. 综合组合示例：角色+Few‑shot+CoT+JSON =====")
    """
    综合实战：把以上全部技术组合在一起
    """
    combine_system = """
你是渔船业务分析师。
要求：
1. 先分步推理（CoT）
2. 参考下面示例输出逻辑
示例：
输入：渔船需要检修发动机
推理：这是渔船设备维护工作，属于设备类任务
输出：{"task":"设备维护","level":2}

输入：渔船出海捕捞作业
推理：属于生产作业任务
输出：{"task":"生产作业","level":1}

最终必须返回JSON，字段：task, level
"""
    resp6 = client.chat.completions.create(
        model=MODEL_NAME,
        messages=[
            {"role": "system", "content": combine_system},
            {"role": "user", "content": "渔船需要补给燃油"}
        ],
        temperature=0.0,
        response_format={"type": "json_object"}
    )
    combine_data = json.loads(resp6.choices[0].message.content)
    print("综合组合结果：", combine_data)


if __name__ == "__main__":
    run_demo()

```

### 3. Token概念

- Token
  - 解释：大模型处理文本的最小单位，不等于汉字；输入输出文本都会转为 token。
  - 要点：中文 1 汉字≈1.3‑1.5token，标点空格同样占用。
- 上下文窗口 Context Window
  - 解释：模型可处理的最大总 token 上限，= 输入 token + 输出 token。
  - 要点：多轮对话历史全部计入；超过上限会报错、截断内容。
- Token 计费
  - 解释：API 按 token 收费，分为输入 token（传给模型）、输出 token（模型返回）。
  - 要点：输出 token 单价通常高于输入；few‑shot 示例会增加输入成本。
- 控制输入输出长度
  - 输出侧：使用 API 参数`max_tokens`限制模型最大生成 token 数。
  - 输入侧：精简 system 提示词、控制 few‑shot 示例数量、裁剪对话历史、长文本分块。
  - 要点：max_tokens 只能限制输出，无法解决输入超限问题。

### 4.工具调用-Function Calling

1. **定义函数 schema**，给大模型看的元数据，描述工具：函数名称、功能说明、入参字段、字段类型、是否必填。
2. **模型返回要调用的工具和调用参数**，当模型判断需要调用工具，不会返回普通文本回答，返回 `tool_calls` 对象。
3. **本地代码执行工具**，我们解析 `tool_calls`，拿到函数名和参数，调用我们写好的 Python 函数，拿到真实结果。
4. **将工具结果喂回模型**，把工具执行结果作为一条`tool`角色消息，追加进 messages，再次发起 API 请求。

### 5.多模态调用

- **Vision 图片理解**：模型 “看图片”，输入图片 + 文字，输出文字；
- **Whisper ASR 语音转文字**：模型 “听音频”，音频→文字；
- **TTS 文字转语音**：模型 “说话”，文字→音频。