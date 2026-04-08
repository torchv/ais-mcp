# `@torchv/ais-mcp`

TorchV AIS 知识库的 MCP Server。

提供 读/写/修改/文件传输 4类工具用于直接操作AIS

![img.png](resource/img.png)

## 安装与运行

```bash
npx -y @torchv/ais-mcp
```

## 必填配置

启动前至少需要两个环境变量：

```bash
export KB_EXECUTE_URL="https://bot.torchv.com"
export KB_TOKEN="your-token"
```

### 如何获取 `KB_EXECUTE_URL`

`KB_EXECUTE_URL` 是 AIS 知识库执行接口地址。

常见获取方式：

1. 先确认你平时访问 AIS 的域名，例如 `https://ais.xxx.com`
2. 在这个域名后拼上固定路径 `/kb/atomix/execute`
3. 得到的完整地址就是：

```text
https://ais.xxx.com/kb/atomix/execute
```

示例：

```text
https://aisdevserver.dev.torchv.com/kb/atomix/execute
```

如果你不确定域名，直接在浏览器打开你正在使用的 AIS 页面，复制地址栏里的站点域名即可。

### 如何获取 `KB_TOKEN`

推荐方式：

```text
AIS -> 管理中心 -> 开放密钥 -> 创建密钥
```

临时方式：

```text
在已登录 AIS 的浏览器里打开开发者工具，找到知识库相关请求，复制请求头里的 token 或 Authorization 值
```

## 可选配置

```bash
export KB_MODE="readonly"   # readonly | write | admin
export KB_TIMEOUT_SECONDS="30"
export KB_DEFAULT_REPO_CODE="TEAM_DOCS"
export KB_EXTRA_HEADERS_JSON='{"x-foo":"bar"}'
```

权限说明：

- `readonly`：只读
- `write`：允许写入、补丁、上传、发布
- `admin`：在 `write` 基础上额外允许移动和删除

## 启动方式

### STDIO 模式

适合本地 MCP 客户端直接拉起：

```bash
npm run build
node dist/cli.js
```

也可以直接用脚本：

```bash
npm run dev
npm run start
```

### Streamable HTTP 模式

适合通过网络访问：

```bash
npm run build
node dist/cli.js --transport streamable-http --host 127.0.0.1 --port 3000 --path /mcp
```

也可以直接用脚本：

```bash
npm run dev:http
npm run start:http
```

HTTP 模式支持以下参数：

```bash
--transport streamable-http
--host 127.0.0.1
--port 3000
--path /mcp
```

## Claude / Codex 配置示例

### STDIO

```json
{
  "mcpServers": {
    "ais": {
      "command": "npx",
      "args": ["-y", "@torchv/ais-mcp"],
      "env": {
        "KB_EXECUTE_URL": "https://your-ais-domain/kb/atomix/execute",
        "KB_TOKEN": "your-token",
        "KB_MODE": "readonly"
      }
    }
  }
}
```

### Streamable HTTP

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

## 工具列表

- `kb_list_repos`
- `kb_list_path`
- `kb_tree`
- `kb_search`
- `kb_read_document`
- `kb_render_link`
- `kb_download_file`
- `kb_get_download_link`
- `kb_write_document`
- `kb_patch_document`
- `kb_create_directory`
- `kb_copy_document`
- `kb_publish_document`
- `kb_upload_file`
- `kb_move_document`
- `kb_delete_document`

模式对应关系：

- `readonly`：`kb_list_repos`、`kb_list_path`、`kb_tree`、`kb_search`、`kb_read_document`、`kb_render_link`、`kb_download_file`、`kb_get_download_link`
- `write`：在 `readonly` 基础上增加 `kb_write_document`、`kb_patch_document`、`kb_create_directory`、`kb_copy_document`、`kb_publish_document`、`kb_upload_file`
- `admin`：在 `write` 基础上增加 `kb_move_document`、`kb_delete_document`

## AIS企业知识库试用
TorchV 以 TorchV AIS 为核⼼主产品。AIS 的定位不是传统知识库，也不是简单的知识协作系统，⽽是企业级 AI 知识引擎系统。它负责将企业分散、异构的原始资料持续转化为可检索、可治理、可优化、可调⽤的⾼质量知识资产。
CEO微信：
![img.png](img.png)