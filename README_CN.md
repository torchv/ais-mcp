# `@torchv-team/ais-mcp`

[English](README.md) | [中文](README_CN.md)

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)  ![MCP](https://img.shields.io/badge/MCP-Compatible-green)


🚀 **TorchV AIS 知识库 MCP Server**

提供 **读 / 写 / 修改 / 文件传输** 四类工具，直接操作 AIS 企业知识库。

![img.png](resource/img.png)

---

## ✨ 特性

* 📚 统一访问 AIS 知识库
* 🛠️ 完整 MCP 工具链（读 / 写 / 管理）
* ⚡ 支持 `npx` 一键启动
* 🔌 同时支持 **STDIO / HTTP** 两种模式
* 🔐 权限分级（readonly / write / admin）

---

## 🚀 安装与运行

```bash
npx -y @torchv-team/ais-mcp
```

---

## 🔑 必填配置

启动前需要设置以下环境变量：

```bash
export KB_EXECUTE_URL="https://bot.torchv.com"
export KB_TOKEN="your-token"
```

---

### 🌐 获取 `KB_EXECUTE_URL`

📌 获取方式：

1. 打开你正在使用的 AIS 页面
2. 从浏览器地址栏复制网址

👉 示例：

```text
https://bot.torchv.com
```

---

### 🔐 获取 `KB_TOKEN`

推荐方式：

```
AIS → 管理中心 → 开放密钥 → 创建密钥
```

临时方式（不推荐长期使用）：

```
浏览器开发者工具 → Network → 找到请求 → 复制 token
```

---

## ⚙️ 可选配置

```bash
export KB_MODE="readonly"   # readonly | write | admin
export KB_TIMEOUT_SECONDS="30"
export KB_DEFAULT_REPO_CODE="TEAM_DOCS"
export KB_EXTRA_HEADERS_JSON='{"x-foo":"bar"}'
```

### 🛡️ 权限说明

* 🟢 `readonly`：只读
* 🟡 `write`：允许写入 / 上传 / 发布
* 🔴 `admin`：允许移动 / 删除（最高权限）

---

## 🧩 启动方式

### 🖥️ STDIO 模式（本地客户端）

```bash
npm run build
node dist/cli.js
```

或：

```bash
npm run dev
npm run start
```

---

### 🌍 Streamable HTTP 模式

```bash
npm run build
node dist/cli.js --transport streamable-http --host 127.0.0.1 --port 3000 --path /mcp
```

或：

```bash
npm run dev:http
npm run start:http
```

📌 参数说明：

```bash
--transport streamable-http
--host 127.0.0.1
--port 3000
--path /mcp
```

---

## 🔌 Claude / Codex 配置示例

### STDIO

```json
{
  "mcpServers": {
    "ais": {
      "command": "npx",
      "args": ["-y", "@torchv-team/ais-mcp"],
      "env": {
        "KB_EXECUTE_URL": "https://https://bot.torchv.com",
        "KB_TOKEN": "your-token",
        "KB_MODE": "readonly"
      }
    }
  }
}
```

---

### HTTP 模式

```json
{
  "mcpServers": {
    "ais-http": {
      "type": "streamable-http",
      "url": "http://127.0.0.1:3000/mcp"
    }
  }
}
```

---

## 🛠️ 工具列表

### 📖 Readonly

* `kb_list_repos`
* `kb_list_path`
* `kb_tree`
* `kb_search`
* `kb_read_document`
* `kb_render_link`
* `kb_download_file`
* `kb_get_download_link`

### ✏️ Write

* `kb_write_document`
* `kb_patch_document`
* `kb_create_directory`
* `kb_copy_document`
* `kb_publish_document`
* `kb_upload_file`

### 🔧 Admin

* `kb_move_document`
* `kb_delete_document`

---

## 🧠 关于 AIS

TorchV 的核心产品是 **AIS（AI 知识引擎）**。

它不是传统知识库，而是：

> 🧠 **企业级 AI 知识引擎系统**

核心能力：

* 🔄 将分散数据 → 转化为结构化知识
* 🔍 可检索（Searchable）
* 🧩 可治理（Governable）
* ⚡ 可调用（Composable）
* 📈 可优化（Optimizable）

---

## 🎁 试用 AIS

📲 扫码联系（CEO微信）：

![img.png](resource/wechat.png)
