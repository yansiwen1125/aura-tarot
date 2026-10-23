# Aura 技术文档

版本：2.0.0-preview.21。本文描述随仓库交付的当前实现。

## 1. 架构

原生 JavaScript ES Modules + HTML / CSS，Node.js 内置 HTTP 服务。无需前端构建、数据库或第三方生产依赖。

浏览器界面 → client AI 客户端 → 同源 Node 路由 → 工作流编排 → DeepSeek 适配器。抽牌规则与牌义由本地代码维护，模型只生成受约束文本。

| 模块 | 职责 |
| --- | --- |
| index.html / style.css | 页面结构、393×852 视觉基线和适配 |
| app.js | 页面组装、事件、会话与请求状态、结果展示 |
| core.js | 牌组、随机抽牌、校验和领域规则 |
| content.js | 主题、角色及展示文案 |
| simulator.js | 本地演示回复 |
| client/ai-client.js | fetch、SSE、错误映射 |
| client/demo-fallback.js | AI 故障后的演示回退策略 |
| client/storage.js | v2 存储与旧数据读取 |
| shared/contracts.js | 输入输出结构、引用及审核门槛 |
| shared/tarot-catalog.js | 22 张正逆位基础牌义与 ID |
| shared/language.js / followups.js / sse.js | 语言、推荐追问和事件解析 |
| server/router.mjs | HTTP、校验、限流、预算、静态允许列表 |
| server/service.mjs | 事实提取、生成、审核及修订 |
| server/reading-plan.mjs | 按问题组织解读目标与检查 |
| server/deepseek.mjs | Responses 接口适配、流式与结构化请求 |

## 2. 启动及配置

Node.js 22+，执行 `npm run dev`。server.mjs 读取项目 `.env`，监听 `127.0.0.1`，默认端口 4196。修改配置后重启。模型名沿用原实现，并非对供应商当前可用性的保证。

| 环境变量 | 默认值 / 作用 |
| --- | --- |
| PORT | 4196，本机端口 |
| DEEPSEEK_API_KEY | 空；仅服务端持有 |
| DEEPSEEK_MODEL_READING | deepseek-v4-pro |
| DEEPSEEK_MODEL_REVIEW | deepseek-v4-pro |
| DEEPSEEK_MODEL_CONTEXT | deepseek-flash |
| AI_MAX_OUTPUT_TOKENS | 16000，允许 1000–32000 |
| AI_TOTAL_TIMEOUT_MS | 180000，允许 1000–600000 |
| AI_DAILY_TOKEN_LIMIT | 1000000，按 UTC 日期计数 |

实际单阶段输出上限由适配器进一步控制。所有模型配置来自服务端，浏览器不能传入上游地址或任意模型。

## 3. HTTP 接口

`GET /api/config` 返回 aiAvailable、provider、consentVersion、localOnly，不包含密钥。

`POST /api/generations` 要求同源 Origin、application/json 及有效的发送同意版本。核心字段为：

```text
schemaVersion: 2
requestId, sessionId: 8–80 位字母数字、下划线或连字符
task: guide | chat | reading | followup
topic: general | career | love | wellness | dream
guideId: 上述主题 ID 或 magician
question, frozenQuestion
messages: [{ id, role: user | assistant, text }]
spread: [{ cardId, position: past | now | future, reversed }]
reading: null 或既有报告对象
clarificationCount: 0 | 1
consentVersion: shared/contracts.js 中的 CONSENT_VERSION
```

输入是顶层字段，不采用旧设计稿的 input 嵌套结构。reading / followup 必须包含三张不同有效牌及非空冻结问题，followup 必须带原报告。服务端只提取允许字段。

返回统一为 `text/event-stream`，事件包含阶段、聊天增量、完成结果或错误。成功由合法 done 事件确认，不能仅凭网络结束判断。SSE 正常事件含 requestId 和递增 seq；错误载荷按 router 中 error 分支处理。

取消依靠 fetch AbortController 与响应连接关闭传递，无 DELETE 取消端点。重复请求 ID 在进程内短期拒绝，未实现成功结果重放。API 错误包括 INVALID_INPUT、CONSENT_REQUIRED、AI_UNAVAILABLE、REQUEST_IN_PROGRESS、RATE_LIMITED、BUDGET_EXCEEDED、UPSTREAM_TIMEOUT、QUALITY_CHECK_FAILED 等；流开始前返回 JSON，开始后发送 error 事件。

## 4. 约束与预算

- 请求体最多 65,536 字节；最多 40 条消息，单条最多 6,000 字符，总文本最多 20,000。
- 最新用户消息最多 500 字符，question 最多 500，frozenQuestion 最多 1,000。
- 全局同时一个请求；60 秒内最多接纳 10 个请求。
- 请求 ID 内存表约保留五分钟；重启不保留。
- 单工作流最多五次上游调用，共用超时与取消信号。
- `.aura-budget.json` 原子写入每日保守 token 预留；有效且自洽的 usage 结算未用部分，取消或未知用量保持预留。
- 预算不是美元账单。文件损坏或写入失败会阻止调用，不能通过删文件把真实费用视为清零。

## 5. AI 与界面行为

普通 chat 传递真实文本增量；guide 用结构化回复传递 nextAction。reading / followup 在审核后发布完整结果，避免提前呈现待拒绝的候选内容。事实、牌阵、语言、建议追问及输出结构由共享校验与工作流共同检查。

默认每次优先 AI。密钥、连接等符合条件的失败由 demo-fallback 决定是否演示；取消与质量失败不被自动回退掩盖。具体门槛及修订见 AI-WORKFLOW.md。

## 6. 存储与恢复

浏览器 localStorage 为主存储。v2 外壳 schemaVersion=2，内层保留原有 version=1 领域结构，读取旧记录时不破坏原始数据。详细解读另行校验，历史保留生成来源。

浏览器存储按协议、主机与端口隔离。新目录若使用相同来源启动，会看到该来源已有的浏览器记录；文件目录本身不承载用户历史。测试使用隔离浏览器及临时服务，不触碰日常浏览器记录。

## 7. 静态服务与边界

允许公开的只有前端入口及 assets/、client/、shared/ 下受支持扩展名的文件。点文件、路径穿越、server/、tests/、docs/ 和源素材目录不开放。校验本地地址、Host 与同源请求。

当前适用于本机单进程。GitHub 托管代码与公网运行应用是两件事；现有服务没有账号、共享预算、多实例请求控制或公网访问设计。

## 8. 维护和验证

```sh
npm run check
npm test
npm run test:browser
```

check 包含运行模块语法与实际素材路径检查；tests 包含抽牌、演示、AI 编排、SSE、语言、存储和 HTTP 边界回归。浏览器脚本用模拟上游覆盖核心路径、取消恢复和三个移动端宽度。

浏览器脚本已将原作者机器的绝对 Playwright 路径改为标准模块解析，支持 PLAYWRIGHT_PATH 覆盖；应用代码未改。浏览器测试仍按原脚本使用本机 Chrome。测试产物写入 docs/previews/，已加入忽略规则。

修改界面前先确认 app.js / style.css，修改领域规则检查 core.js 与 tests，替换素材同步 assets 来源说明与资源检查。不要将环境文件、预算状态或测试报告加入提交。
