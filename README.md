# AI 你画我猜

一个基于 Next.js 的在线你画我猜小游戏。玩家在前端画布上作画，服务端将画布 PNG 提交给 AI REST API，让 AI 猜测画的是什么。

## 技术栈

- Next.js App Router
- 原生 Canvas 画板
- 服务端 `fetch` 调用 AI API
- 不使用任何 AI SDK

## 启动

1. 复制环境变量模板并填入密钥：

```bash
cp .env.example .env.local
```

2. 安装依赖：

```bash
npm install
```

3. 启动开发环境：

```bash
npm run dev
```

4. 打开 `http://localhost:3003`

## 环境变量

- `AI_API_KEY`: AI API Key
- `AI_MODEL`: 可选，默认 `AI-2.5-flash`
