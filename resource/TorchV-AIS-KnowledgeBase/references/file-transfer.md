# 文件上传/下载能力说明

这些能力与普通 `kb ...` 命令不同，原因是它们需要处理二进制文件、本地文件系统，或返回可直接下载的临时链接。

## 1. Agent 入参

### 上传

- `localPath`：MCP server / Python 脚本所在机器上的真实文件路径
- `pathName`：AIS 知识库中的目标目录
- `fileName`：可选；若不传，程序会取 `localPath` 的文件名

### 下载

- `code`：远端文件或文档的稳定标识
- `localPath`：MCP server / Python 脚本所在机器上的真实保存路径
- `extractIs`：可选；是否下载提取后的 markdown 内容
- `overwrite`：可选；默认不覆盖已有文件

### 生成下载链接

- `code`：远端文件或文档的稳定标识
- `extractIs`：可选；是否生成提取后 markdown 内容的下载链接

## 2. 程序行为

### 上传

- 程序读取 `localPath` 对应文件的原始字节
- 以 `multipart/form-data` 调用 `/openapi/partner/sage/file/upload`
- 实际提交字段：
  - `file`
  - `fileName`
  - `pathName`

### 下载

- 程序调用 `/openapi/partner/sage/file/download?code=...`
- 如果传了 `extractIs`，会一并作为 query 参数发送
- 将返回的二进制内容写入 `localPath`
- 如果 `localPath` 指向目录，则程序会优先使用响应头里的文件名

### 生成下载链接

- 程序调用 `/openapi/partner/sage/file/downloadLink?code=...`
- 如果传了 `extractIs`，会一并作为 query 参数发送
- 返回 JSON，其中 `data.downloadUrl` 可直接用于 `wget` 等工具

## 3. 设计原因

- Agent 很难稳定读取 PDF、PPT、图片等二进制文件内容
- 即便能读，二进制内容也不适合塞进 MCP 上下文
- 因此由 Node / Python 程序负责本地文件读写和 HTTP 二进制传输，Agent 只负责决定路径和目标位置

## 4. 实际调用建议

- 本地 MCP 场景优先使用这套路径式方案
- 若 MCP server 不在用户本机运行，则不要传用户电脑路径，应改造为附件 ID、预签名 URL 或其它旁路上传方案
