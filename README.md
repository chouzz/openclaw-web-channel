# OpenClaw Web Channel

一个 OpenClaw Channel Plugin，提供独立的 Web UI 界面来访问 OpenClaw。使用 RESTful API + SSE 实现实时通信，适用于受限网络环境。

## 特性

- 🌐 独立 Web UI，ChatGPT 风格界面
- 📡 基于 SSE (Server-Sent Events) 的实时流式通信
- 🔒 Bearer Token 认证
- 💬 多会话管理
- 🔧 工具调用展示
- 📝 Markdown 渲染 + 代码高亮
- 🌗 亮色/暗色主题
- 📱 响应式布局
- 🚀 前端嵌入 Plugin，无需额外 Web 服务器

## 安装

```bash
# 克隆仓库
git clone https://github.com/chouzz/openclaw-web-channel.git

# 安装到 OpenClaw
openclaw plugins install ./openclaw-web-channel
```

## 配置

在 OpenClaw 配置中添加：

```json5
{
  channels: {
    "web-channel": {
      enabled: true,
      token: "your-secret-token-here",  // 必填：Web 访问 Token
      defaultModel: ""  // 可选：默认模型
    }
  }
}
```

## 使用

1. 启动 OpenClaw Gateway
2. 访问 `http://localhost:3015/plugins/web-channel/`
3. 输入配置的 Token
4. 开始聊天！

## 技术栈

- **后端：** OpenClaw Plugin SDK (TypeScript)
- **前端：** React 19 + Vite + Tailwind CSS v4 + shadcn/ui
- **通信：** REST API + SSE
- **状态管理：** Zustand

## 开发

```bash
# 安装依赖
pnpm install

# 构建前端
cd web && pnpm install && pnpm build

# 构建 Plugin
pnpm build
```

## License

MIT
