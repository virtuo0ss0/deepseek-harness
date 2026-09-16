---
description: "在已注册授权流程之上提供 Web Remote 交互，使用私有尝试标识和有界临时状态。"
kind: "package-reference"
---

# @deepseek-ai/dsh-web-authorization

[English](README.md) | 中文

## Summary

`dsh-authorization` 的 Host 配套插件，通过当前 Remote/Gateway 提供通用流程目录和临时交互。Provider 负责登录协议、回调和凭据写入。配套插件不读取凭据值。浏览器消费者应注册到公开的 Models 页脚，不替换 Models 编辑器。

## Table of Contents

- [Contract](#contract)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)
- [Dev Note](#dev-note)

## Contract

插件要求 `authorization`；应用须组合该服务及凭据 Provider。插件提供 `webAuthorization`，包含生成的 `list`、`begin`、`status`、`answer` 和 `cancel` Remote 方法。Gateway 负责传输信任和线上数据验证。配套插件验证操作标识，逐字段投影 Provider 通知和提示。

| Config | Default | Meaning |
|---|---|---|
| `leaseMs` | `60000` | 没有观察请求时的宽限期；1000 至 3600000 的整数毫秒数。 |

调用方开始前生成随机 UUID 能力标识。同一保留标识和选择可以恢复响应不明确的开始请求。目录不公开能力标识。只有持有者可以观察、回答或取消相应尝试。标识仅保存在浏览器内存中，不应进入 URL 或日志。这是单个可信 Harness Host 的边界，不隔离已安装的 Host 插件或浏览器同源脚本。

每个答案必须匹配当前提示标识。选择答案必须属于已提供值；文本和秘密答案仅临时传递。提示不回显答案。结束结果只包含 `authorized`、`cancelled` 或 `failed`，不包含原始 Provider 异常。秘密提示仍要求浏览器将用户输入发送到 Host；掩码不是加密。

状态观察续期活动租约。浏览器重载丢失能力标识；Host 在到期时取消被遗弃的尝试。短暂断线后可凭内存中保留的标识继续观察。结束视图到期且不续期。作用域销毁会中止拥有的尝试、拒绝待处理提示、移除计时器并等待授权结束。

Host 最多保留 32 次尝试，每次最多 16 条通知。完整序列化尝试视图限制为 32768 个 UTF-8 字节；文本字段限制为 2048 字节，提交的答案限制为 16384 字节。超大选择提示会失败，不会修改 Provider 标识。链接允许 HTTPS 和回环 HTTP，且不得嵌入用户凭据。并发提示会失败；支持顺序的文本、秘密及选择提示。

## Model Experience

无。本包不注册工具、提示词或会话事件。

#### KV Cache effect

无。授权交互不进入模型上下文。

## Known Limitations and Deferred Work

此功能分支尚待实现浏览器 UI、真实 Loader/Gateway 组合及打包验证。状态机测试本身不代表安装兼容性认证。Host 重启会丢失尝试。取消保留授权服务原有行为：忽略中止的 Provider 仍可能稍后提交；取消不承诺回滚或颁发者撤销。不提供凭据删除，也不重新解释 API-key 就绪状态。

## Dev Note

不发布 invariant 配套组件：尝试及投影视图由同一拥有者更新，没有需要协调的独立运行时观察。状态机测试覆盖过期操作、有界通知、提示撤回、销毁、租约到期以及 API-key 引用保持不变。
