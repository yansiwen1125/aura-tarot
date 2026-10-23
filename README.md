# Aura · AI 塔罗反思伙伴

Aura 是一个移动端优先的 AI 塔罗应用设计项目，使用 AI 进行了主要功能实现。围绕用户的实际困惑，将主题引导、三张牌抽取、个性化解读、连续追问和本地历史串成完整体验。

完整设计作品：[Aura · 完整设计作品](https://www.behance.net/gallery/238470787/Aura-Your-next-AI-Tarot-APP/modules/1372366327)。

当前版本：`2.0.0-preview.21`。本仓库保留现有界面与完整应用代码，是可本地运行的开发预览作品；不将其标记为正式上线版。

## 体验与功能

- 五个主题：General、Career、Love、Wellness、Dream；保留 Queen / Magician 角色体验。
- 自由提问、首次发送说明、抽牌前的问题确认与编辑。
- 22 张大阿卡纳，Past / Now / Future 三牌位，包含正逆位；第三张选满后自动分析。
- DeepSeek 对话、事实核验、结构化解读、独立审核及最多一次修订。
- 信息总结 → 三张牌各自的解答 → 行动建议；支持依据展开与推荐追问。
- 停止、重试、重新生成、保留牌阵的重新解读、本地历史与旧存档兼容。
- 默认优先使用 AI；未配置密钥或连接不可用时，提示后提供本地演示内容。

## 本地启动

需要 Node.js 22 或更新版本。应用无第三方运行依赖，无需构建。

```sh
cp .env.example .env
npm run dev
```

打开 [http://127.0.0.1:4196](http://127.0.0.1:4196)。未填密钥可体验演示回退；使用真实 AI 时，在本地 `.env` 填入 `DEEPSEEK_API_KEY`，保存并重启。模型配置沿用原作品，需确认自己的账户支持相应模型与接口。密钥不包含在仓库中。

服务只监听本机。不要直接双击 HTML，也不要使用 GitHub Pages 代替 Node 后端。更换端口可运行 `PORT=4197 npm run dev`；浏览器历史按来源隔离，更换端口不会自动带入原端口历史。

## 验证

```sh
npm run check
npm test
```

以上检查不调用真实 AI。浏览器集成测试另需 Playwright 和本机 Chrome：

```sh
npm install --no-save --package-lock=false playwright
npm run test:browser
```

已有 Playwright 时可用 `PLAYWRIGHT_PATH` 指向模块。浏览器测试使用模拟上游及隔离浏览器，不读取用户会话。`npm run test:live` 需要事先启动、配置服务，会调用真实 API 并产生费用；本次整理未运行该命令。

## 目录

```text
index.html / app.js / style.css  页面入口、交互与视觉
core.js / content.js             抽牌领域规则与主题文案
simulator.js                     本地演示生成
client/                          AI 客户端、回退和存储
server.mjs / server/             本机 HTTP 服务与 AI 工作流
shared/                          牌义、契约、语言与 SSE
assets/                          实际运行素材及字体许可
scripts/ / tests/                检查和回归测试
docs/                           产品、技术、资源及交付文档
```

只保留当前网页实际使用的 22 张大阿卡纳高清牌面（1000×1510）、牌背（200×302）、头像、桌布等素材，每份资源保留一套。

## 文档导航

- [产品说明](docs/PRODUCT.md)：作品定位、使用路径与范围。
- [详细 PRD](docs/PRD.md)：功能、状态、异常和验收要求。
- [技术文档](docs/TECHNICAL.md)：架构、接口、配置、存储和维护。
- [AI 解读工作流](docs/AI-WORKFLOW.md)：事实、牌义、审核及修订。
- [资源说明](docs/RESOURCES.md)：实际用图、尺寸、许可与维护。
- [GitHub 上传说明](docs/GITHUB.md)：本地上传与命令行上传步骤。
- [整理与验证说明](docs/DELIVERY.md)：保留、排除与本次验证结果。

视觉基线为 393×852；现有头像、牌背、桌布及样式保持原样。

代码及美术资源尚未统一声明开源许可；上传仓库不等于授予第三方复用授权。已随附的字体和资源来源说明继续保留。
