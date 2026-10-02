---
description: "通过 Web 提示完成已注册的授权流程，凭据始终保留在 Host。"
kind: "package-reference"
---

# @deepseek-ai/dsh-web-authorization

[English](README.md) | 中文

## 概述

用户可通过[模型页脚消费方](../../client/ui-authorization/README.zh.md)在浏览器中完成已注册的授权流程。提供方保留其登录协议、回调和凭据写入。浏览器只接收有界的通知、提示与结果；配套插件从不读取凭据值。现有 API-key 编辑器仍可使用。

## 目录

- [使用本包](#use-this-package)
- [了解实现](#understand-the-implementation)
- [进一步探索](#further-exploration)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)
- [开发备注](#dev-note)

-----

<a id="use-this-package"></a>
## 使用本包

当已注册流程可通过通用通知及文本、秘密或选择提示运行时，选择此配套插件。需要提供方私有初始化的流程（包括 DeepSeek Platform 账户流程）使用其所属账户 UI。

### 最小配置

Web 组合必须已提供凭据提供方、`authorization` 和 Gateway。保留 base profile 的现有授权拥有者，两个配套插件各挂载一次。这些包是普通插件，不是通过 `dsh plugin add` 添加的组合包。

```yaml
- name: '@deepseek-ai/dsh-web-authorization'
  config:
    leaseMs: 60000
- name: '@deepseek-ai/dsh-client-ui-authorization'
  config:
    pollMs: 1000
```

| 字段 | 默认值 | 含义 |
|---|---|---|
| `leaseMs` | `60000` | 没有观察请求时的宽限期；1000 至 3600000 的整数毫秒数。 |

[配置目录](../../../docs/config-catalog.zh.md#deepseek-aidsh-web-authorization)拥有受支持字段的完整说明。租约应长于预期重连间隔与浏览器轮询间隔。

-----

<a id="understand-the-implementation"></a>
## 了解实现

<details>
<summary>实现内部细节——点击展开</summary>

配套插件通过生成的 Remote/Gateway 方法投影已注册流程。Gateway 负责传输信任与线上数据验证。授权服务拥有流程执行与每键锁；提供方拥有凭据及协议。[服务](src/index.ts)提供传输接口；[尝试管理器](src/attempts.ts)拥有临时交互。

调用方开始前生成随机 UUID 能力标识。同一保留标识和选择可恢复响应不明确的开始请求。目录不公开能力标识。只有持有者可以观察、回答或取消相应尝试。标识只保存在浏览器内存中，不应进入 URL 或日志。已安装的 Host 插件与浏览器同源脚本仍属于可信范围。

每个答案必须匹配当前提示标识。选择答案必须属于已提供值；文本和秘密答案只临时传递，从不回显。结束结果只包含 `authorized`、`cancelled` 或 `failed`，不包含原始提供方异常。提供方必须确保通知和提示元数据不含凭据。秘密掩码不会加密浏览器到 Host 的请求。

状态观察续期活动租约。重载丢失能力标识；到期撤回被遗弃的工作。短暂断线保留内存中的标识。结束视图到期且不续期。作用域 dispose（资源释放）会拒绝待处理提示、移除计时器并等待授权结束，包括视图已到期后的已获准写入。获准点是凭据提供方进入 mutation 回调；此后取消不会回滚持久化。

Host 最多保留 32 次尝试，每次最多 16 条通知。完整序列化尝试视图限制为 32768 个 UTF-8 字节；文本字段限制为 2048 字节，提交的答案限制为 16384 字节。超大选择提示会失败，不会修改标识。链接允许 HTTPS 和回环 HTTP，且不得嵌入用户凭据。并发提示会失败；支持顺序提示。

不发布 invariant 配套组件：尝试和投影视图由同一拥有者更新，没有需要协调的独立观察。

</details>

-----

<a id="further-exploration"></a>
## 进一步探索

- [授权服务](../authorization/README.zh.md)——注册、获准点与关闭时的结束语义。
- [浏览器消费方](../../client/ui-authorization/README.zh.md)——公开 Models 页脚与轮询配置。
- [凭据参考](../../../docs/subsystems/credentials.zh.md)——凭据与授权 API。
- [API Gateway](../../../docs/api-gateway.zh.md)——生成的 Remote 传输。

-----

<a id="model-experience"></a>
## Model Experience

无。本包不注册工具、提示词或会话事件。

#### KV Cache effect

无。授权交互不进入模型上下文。

## Known Limitations and Deferred Work

配套插件传递交互；提供方就绪状态与凭据管理仍归各自拥有者负责。

- Host 重启会丢失尝试。直接通过凭据适配器写入的提供方仍负责其取消顺序。
- 取消不承诺回滚或发行方撤销。配套插件不会删除凭据或重新解释 API-key 就绪状态。

<a id="dev-note"></a>
### 开发备注

<details>
<summary>维护者的工作上下文——点击展开</summary>

当前 0.2.0-rc.2 移植已通过 94/94 项针对性测试、442/442 项相关上游集成测试和 12/12 个部署后浏览器 E2E 场景，且没有跳过场景。全新打包安装及两个纯 Node Gateway/Loader 检查均已通过。已安装包的 Gateway/Loader 检查验证包组合；部署后浏览器场景验证浏览器行为。

当前 0.2.0-rc.2 移植已通过通用 Web 配套插件完成真实 `llm-pi-ai/openai-codex` OAuth，由用户手动登录并授权。匹配的结束事件报告 `authorized`；`describeRecord()` 确认 `configured: true`、`kind: grant` 和 `writable: true`。

提示和活动尝试已清除，用户确认页面成功重载且没有保留交互。Host 正常重启后 grant 仍持久保存，无需再次登录。清理仅删除了隔离测试凭据，通过 `describeRecord()` 确认 `configured: false`，并正常关闭隔离 Host；3080/1455 端口已释放。

未测试模型推理、token 刷新或发行方撤销。验证仅使用凭据描述信息，未检查凭据内容。

基于 0.1.7-rc.1 的历史实现 `feat/web-authorization-v017` 也独立成功完成了真实 OpenAI Codex OAuth（`llm-pi-ai/openai-codex`）。元数据确认凭据在页面重载和 Host 正常重启后仍持久保存，随后已删除该隔离凭据。

完整的关闭保证依赖 PR-A 中修复后的 AuthorizationService（`eee38bf001c41f62be109d01dab5687ab8744eef`）。未经修改的上游 0.2.0-rc.2 不包含该修复；单凭版本范围无法确立这一保证。

</details>
