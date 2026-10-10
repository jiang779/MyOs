# 模型的创建与调用

## 一、实例化方法

### 1、原生 SDK

`openai.OpenAI () ｜OpenAI 原生 SDK 客户端（之后调用 .chat.completions.create ()）`

### 2、LangChain 厂商专用 ChatXXX 类

- ChatOpenAI｜OpenAI 兼容适配器 
- ChatDeepSeek｜DeepSeek 模型 
- ChatZhipuAI｜智谱 AI‑GLM 系列 
- ChatTongyi｜阿里通义千问 
- ChatOpenRouter｜OpenRouter 中转平台 
- ChatOllama｜本地 Ollama 模型 
- ChatAnthropic｜Claude 系列模型 
- ChatGoogleGenerativeAI｜谷歌 Gemini 模型 
- ChatHunyuan｜腾讯混元模型 
- ChatBaiduQianfan｜百度千帆平台 
- ChatVolcEngineArk｜火山引擎 Ark 
- ChatGroq｜Groq 推理平台 
- ChatMistralAI｜MistralAI 模型 
- ChatCohere｜Cohere 大模型 
- AzureChatOpenAI｜Azure 托管 OpenAI
- ChatVLLM｜对接 vLLM 推理服务
- ChatHuggingFace｜对接 HuggingFace 
- FakeListChatModel｜测试模拟模型

### 3、LangChain 统一工厂函数

`init_chat_model ()｜动态模型工厂函数`

> 备注：废弃不要使用：langchain‑classic 包下 init_chat_model ()

## 二、实例化初始化参数

- model｜指定模型名称 

- api_key｜模型服务密钥 

- base_url /api_base｜API 请求地址 

- temperature｜输出随机性控制 

- max_tokens｜最大输出 token 数量 

- top_p｜核采样参数 

- timeout｜请求超时时间 

- max_retries｜请求最大重试次数 

- model_kwargs｜透传 

- OpenAI 协议扩展字段 extra_body｜透传厂商自定义扩展字段 

- tags｜对象标签，用于追踪 metadata｜对象附加元数据 

- callbacks｜回调处理器 

- verbose｜是否开启详细日志 

- configurable_fields｜声明允许运行时动态覆盖的参数

> 工具：`类.model_fields.keys()`｜查看模型完整参数字段

## 三、模型实例调用方法

### 3.1 同步调用方法

- .invoke ()｜单次完整阻塞调用 
- .stream ()｜流式迭代输出 
- .batch ()｜批量调用，按输入顺序返回 
- .batch_as_completed ()｜批量调用，完成即返回、结果乱序

### 3.2 异步调用方法

- .ainvoke ()｜异步单次调用 
- .astream ()｜异步流式调用 
- .abatch ()｜异步批量调用

### 3.3 输入消息格式（调用方法的入参）

- 纯字符串｜简单问答输入 
- 消息字典列表｜[{"role":"xxx","content":"xxx"}]，生产常用 
- SystemMessage / HumanMessage / AIMessage｜LangChain 消息对象

### 3.4 返回对象 AIMessage 核心字段

- .content｜模型输出文本 
- .tool_calls｜工具调用参数列表 
- .invalid_tool_calls｜格式错误工具调用 
- .additional_kwargs ["refusal"]｜模型拒绝回答标识 
- .response_metadata｜API 原始元数据 
- .usage_metadata｜标准化 token 消耗统计

### 3.5 调用时运行时配置（invoke 传入 config，**单次调用生效，优先级高于实例化参数**）

- run_name｜链路追踪名称 
- tags｜本次运行标签 
- metadata｜本次运行业务元数据 
- callbacks｜本次运行回调 
- max_concurrency｜限制最大并发 
- recursion_limit｜递归深度限制，防死循环 
- configurable｜动态覆盖模型实例参数

### 3.6 调用异常处理

try‑except｜捕获网络、鉴权、超时等异常

## 四、配套拓展工具与工程知识点

- .pretty_print ()｜AIMessage 对象美化打印 
- rich.print ()｜第三方库美化打印对象 
- model.profile｜模型能力画像，部分模型为空 
- .env｜存放密钥环境变量 
- gitignore｜避免密钥、缓存提交版本库
- token｜大模型分词计费单元 
- Ollama‑cli｜ollama 系列命令行工具 
- requirements.txt｜项目依赖版本锁定