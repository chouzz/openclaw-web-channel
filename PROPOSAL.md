# openclaw-web-channel 项目计划书

## 概述

**项目名称：** `openclaw-web-channel`
**项目位置：** `~/src/openclaw/openclaw-web-channel/`
**类型：** OpenClaw Channel Plugin + 独立 Web 前端
**目标：** 通过 Web 页面访问 OpenClaw，使用 RESTful API + SSE 实现实时通信，适用于受限网络环境（无需 WebSocket）

### 与 Skyzi000/openclaw-open-webui-channels 的区别

| 维度 | 参考项目 (open-webui-channels) | 本项目 (web-channel) |
|------|------|------|
| 目标平台 | 连接已有的 Open WebUI | 自建独立 Web UI |
| 实时通信 | Socket.IO (WebSocket) | SSE (Server-Sent Events) |
| 前端 | 依赖 Open WebUI 前端 | 自建 ChatGPT 风格前端 |
| 后端 | 依赖 Open WebUI 后端 API | 自建 REST API（OpenClaw Plugin） |
| 复杂度 | Plugin only | Plugin + 独立前端服务 |

## 技术选型

### 后端（OpenClaw Plugin）

- **运行时：** OpenClaw Channel Plugin（TypeScript ESM）
- **通信方式：** Plugin 通过 `api.registerHttpRoute()` 在 Gateway 上注册 HTTP 路由
  - `POST /api/web-channel/chat` — 发送消息，返回 SSE 流
  - `GET /api/web-channel/sse` — SSE 端点，接收流式响应
  - `GET /api/web-channel/sessions` — 获取会话列表
  - `POST /api/web-channel/sessions` — 创建/切换会话
  - `DELETE /api/web-channel/sessions/:id` — 删除会话
  - `GET /api/web-channel/config` — 获取前端配置（模型列表、Agent 信息等）
- **SSE 协议：** 标准 EventSource，使用 `text/event-stream` Content-Type
  - `event: message` — AI 回复文本片段（流式）
  - `event: tool_call` — 工具调用通知
  - `event: tool_result` — 工具执行结果
  - `event: done` — 回复完成
  - `event: error` — 错误信息
- **认证：** Bearer Token（通过 OpenClaw Gateway 配置的 API Key 或自定义 Token）

### 前端（独立 SPA）

- **框架：** React 19 + TypeScript
- **构建工具：** Vite
- **UI 库：** Tailwind CSS v4 + shadcn/ui
- **状态管理：** Zustand
- **Markdown 渲染：** react-markdown + remark-gfm（代码高亮用 highlight.js）
- **SSE 客户端：** 原生 EventSource（兼容受限网络，无需 WebSocket）
- **部署：** Plugin 构建后将前端静态文件嵌入，通过 Gateway HTTP 路由提供服务

### 为什么用 SSE 而不是 WebSocket

1. **受限网络兼容：** SSE 基于 HTTP，无需升级协议，代理/防火墙友好
2. **实现简单：** 单向流式传输刚好满足 AI 回复推送需求
3. **浏览器原生支持：** EventSource API 无需额外依赖
4. **断线重连：** 浏览器原生支持自动重连

## 项目结构

```
openclaw-web-channel/
├── openclaw.plugin.json          # OpenClaw plugin manifest
├── package.json                  # 包配置
├── tsconfig.json                 # TypeScript 配置
├── README.md                     # 项目文档
├── src/
│   ├── index.ts                  # Plugin 入口 (defineChannelPluginEntry)
│   ├── setup-entry.ts            # 轻量 setup 入口
│   ├── channel.ts                # ChannelPlugin 定义
│   ├── api.ts                    # REST API 路由处理器
│   ├── sse.ts                    # SSE 流管理
│   ├── auth.ts                   # 认证中间件
│   ├── session.ts                # 会话管理
│   ├── runtime.ts                # PluginRuntime 存储
│   └── types.ts                  # 类型定义
├── web/                          # 前端 SPA
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── src/
│   │   ├── main.tsx              # 入口
│   │   ├── App.tsx               # 根组件
│   │   ├── api/
│   │   │   └── client.ts         # API + SSE 客户端
│   │   ├── components/
│   │   │   ├── ChatInput.tsx     # 消息输入框
│   │   │   ├── ChatMessage.tsx   # 单条消息（支持 Markdown）
│   │   │   ├── MessageList.tsx   # 消息列表
│   │   │   ├── SessionList.tsx   # 会话列表侧边栏
│   │   │   ├── ToolCall.tsx      # 工具调用展示
│   │   │   └── Header.tsx        # 顶部栏
│   │   ├── hooks/
│   │   │   ├── useChat.ts        # 聊天逻辑 + SSE
│   │   │   └── useSession.ts     # 会话管理
│   │   ├── stores/
│   │   │   └── chatStore.ts      # Zustand store
│   │   └── styles/
│   │       └── global.css        # Tailwind 入口
│   └── dist/                     # 构建产物（嵌入 Plugin）
└── dist/                         # Plugin 构建产物
    ├── index.js
    └── web/                      # 前端静态文件（从 web/dist/ 复制）
```

## 核心架构

### Plugin 端

```
用户请求 → Gateway HTTP Server
                ↓
    api.registerHttpRoute() 注册的路由
                ↓
    auth.ts (Token 验证)
                ↓
    session.ts (会话映射到 OpenClaw session-key)
                ↓
    sse.ts (SSE 流管理，监听 session 事件)
                ↓
    OpenClaw Core (session dispatch → LLM → tools)
                ↓
    SSE 流推送回前端
```

### 数据流

1. 用户发送消息：`POST /api/web-channel/chat` → body: `{ sessionId, message }`
2. Plugin 通过 OpenClaw 内部 API 将消息 dispatch 到对应 session
3. Plugin 注册 SSE 监听，当 session 产生回复时推送事件
4. 前端通过 EventSource 接收流式回复

### 与 OpenClaw Session 的映射

- 每个 Web 会话 → 一个 OpenClaw session-key（格式：`web:{sessionId}`）
- OpenClaw 自动管理 session 生命周期
- Plugin 通过 `api.runtime` 访问 session 相关能力
- 使用 `api.on(...)` hook 监听 session 事件以驱动 SSE 推送

## UI 设计

参考 ChatGPT 界面风格：

```
┌──────────────────────────────────────────────┐
│  🐾 OpenClaw Web   [Model: ▼]    [⚙️]       │
├─────────────┬────────────────────────────────┤
│ Sessions    │                                │
│             │   🧑 Message 1                 │
│ ● Session 1 │                                │
│   Session 2 │   🤖 Response 1 (streaming...)  │
│   Session 3 │   ┌─────────────────────┐      │
│             │   │ 🔧 tool_call: ...   │      │
│             │   │ ✓ result: ...       │      │
│             │   └─────────────────────┘      │
│             │   🤖 Response 1 (continued)    │
│             │                                │
│             │ ┌──────────────────────────┐   │
│             │ │ 输入消息...          [Send]│   │
│             │ └──────────────────────────┘   │
└─────────────┴────────────────────────────────┘
```

### 关键 UI 功能

- **会话管理：** 创建/切换/删除/重命名会话
- **流式回复：** SSE 实时显示 AI 回复，支持 Markdown 渲染
- **工具调用展示：** 显示正在调用的工具和结果
- **代码高亮：** 支持 TypeScript/Python/Bash 等语言的语法高亮
- **响应式布局：** 桌面端侧边栏 + 移动端抽屉
- **主题切换：** 亮色/暗色模式
- **停止生成：** 中断当前 AI 回复

## 分阶段实施计划

### Phase 1：基础骨架（Plugin + 最小前端）

**目标：** 能通过 Web 页面发送消息并收到回复

1. 初始化项目结构、package.json、tsconfig
2. 创建 `openclaw.plugin.json` manifest
3. 实现 Plugin 入口（`index.ts` + `setup-entry.ts`）
4. 实现 `auth.ts`（Bearer Token 认证）
5. 实现基础 REST API（chat + sessions）
6. 实现 SSE 流推送
7. 搭建前端骨架（Vite + React + Tailwind）
8. 实现基础聊天 UI（输入框 + 消息列表 + SSE 接收）
9. 本地测试 Plugin 安装和基本通信

### Phase 2：完善功能

**目标：** 达到日常可用水平

1. 完善 Markdown 渲染（代码高亮、表格、LaTeX）
2. 实现工具调用展示（调用中/结果展示）
3. 会话管理（创建/切换/删除/重命名）
4. 主题切换（亮色/暗色）
5. 响应式布局优化
6. 停止生成功能
7. 消息重新生成
8. 错误处理和重连机制

### Phase 3：增强体验

**目标：** 接近 ChatGPT 的使用体验

1. 消息编辑（编辑已发送的消息并重新生成）
2. 文件/图片上传支持
3. 代码块一键复制
4. 快捷键支持（Enter 发送、Shift+Enter 换行）
5. 消息搜索
6. 会话导出（Markdown/JSON）
7. 自动滚动优化
8. 移动端适配优化

### Phase 4：发布

1. 前端构建产物嵌入 Plugin
2. 完善 README 和使用文档
3. GitHub 仓库创建和推送
4. 可选：发布到 ClawHub

## 关键技术决策

### 1. SSE 事件格式

```typescript
interface SSEEvent {
  event: 'message' | 'tool_call' | 'tool_result' | 'done' | 'error';
  data: {
    id: string;
    sessionId: string;
    // message 事件
    content?: string;           // 文本片段
    role?: 'user' | 'assistant';
    // tool_call 事件
    toolName?: string;
    toolInput?: object;
    // tool_result 事件
    toolOutput?: string;
    // error 事件
    error?: string;
  };
}
```

### 2. 认证方案

- Plugin 配置中设置 `webToken`（自定义访问 Token）
- 前端请求时携带 `Authorization: Bearer <token>` 头
- 首次访问时弹出 Token 输入框，存入 localStorage
- 可选：通过 OpenClaw 的 `authorizedSenders` 机制做额外鉴权

### 3. 前端部署策略

- 构建时将 Vite 产物复制到 `dist/web/`
- Plugin 通过 `api.registerHttpRoute()` 注册静态文件服务
- 所有前端路由指向 `index.html`（SPA fallback）
- 无需额外 Web 服务器，完全由 OpenClaw Gateway 托管

## 配置 Schema

```json
{
  "type": "object",
  "properties": {
    "enabled": { "type": "boolean", "default": true },
    "token": { "type": "string", "description": "Web 访问 Token" },
    "defaultModel": { "type": "string", "description": "默认模型 ID" },
    "port": { "type": "number", "description": "（预留）独立部署时的端口" }
  },
  "required": ["token"]
}
```

## 风险和注意事项

1. **Session 事件监听：** 需要确认 OpenClaw plugin SDK 是否提供了监听 session 回复的 hook。如果没有，可能需要通过 `api.registerHook()` 监听 `message_sending` 事件或使用其他方式获取流式输出。
2. **SSE 与 Gateway 集成：** `api.registerHttpRoute()` 是否支持流式响应（SSE）需要实际测试。如果 Gateway 的路由层不支持，可能需要用独立的 HTTP 服务器。
3. **前端嵌入：** Plugin 的文件大小限制 — 如果前端构建产物较大，可能需要优化打包或使用 CDN。

## 依赖清单

### Plugin 后端
- `openclaw` (peerDependency，提供 plugin-sdk)
- TypeScript 5.x

### Web 前端
- `react` + `react-dom` 19.x
- `vite` 6.x
- `tailwindcss` 4.x
- `zustand` 5.x
- `react-markdown` + `remark-gfm`
- `highlight.js` (代码高亮)
- `lucide-react` (图标)
- `@radix-ui/*` (通过 shadcn/ui)
