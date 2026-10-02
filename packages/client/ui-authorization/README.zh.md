---
description: "在 Models 设置中通过临时浏览器提示完成已注册的授权方法。"
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-authorization

[English](README.md) | 中文

## 概述

在 Models 设置中选择已注册授权方法，跟随通知并回答文本、秘密或选择提示。[Host 配套插件](../../credentials/web-authorization/README.zh.md)运行流程，凭据保留在 Host。页脚不包含提供方登录协议或凭据存储，也不改变现有 API-key 编辑器。

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

在现有 Web 组合中，将这个按需启用的浏览器消费方与 [Host 配套插件](../../credentials/web-authorization/README.zh.md#use-this-package)一起挂载。必须提供 Remote、locale、slots 与公开的 `settings.models.footer` 声明。默认配置不会自动启用配套插件。

| 字段 | 默认值 | 含义 |
|---|---|---|
| `pollMs` | `1000` | 观察间隔，250 到 10000 之间的整数毫秒。 |

[配置目录](../../../docs/config-catalog.zh.md#deepseek-aidsh-client-ui-authorization)拥有受支持字段的完整说明。Host 租约应长于预期重连间隔与本轮询间隔。

-----

<a id="understand-the-implementation"></a>
## 了解实现

<details>
<summary>实现内部细节——点击展开</summary>

[Host 入口](src/index.ts)通过 Webserver 的结构化页面引导数据只发布经过验证的 `pollMs`。浏览器入口不会收到 Host Loader 的配置参数。缺少页面数据时使用 schema 默认值；提供的数据无效时无法挂载。Host 配置变更在重载页面后生效；在已打开的页面中稍后挂载插件时，使用该页面已有的值。

[浏览器入口](src/client/index.ts)挂载生成的授权 Remote 贡献，为每个页脚声明生命周期注册一个控制器。顺序轮询在短暂断线期间保留内存中的尝试，并忽略前代控制器的迟到响应。关闭页脚或 dispose（资源释放）其插件时，清除状态与计时器并请求取消所拥有的精确尝试。卸载请求丢失时由 Host 租约兜底。重载不保留能力标识。

答案携带尝试和提示标识。输入保存在以提示标识为键的组件中，提交、提示替换或卸载时清除。控制器快照和浏览器存储不含答案。清除 UI 引用不能保证 JavaScript 堆擦除。原始传输错误和凭据值从不进入显示状态。

结束状态报告授权服务的结果。它不表示提供方已配置，不会重新解释 `keyConfigured`、删除凭据或撤销发行方访问权限。不发布 invariant 配套组件：控制器独自拥有临时观察状态。

</details>

-----

<a id="further-exploration"></a>
## 进一步探索

- [Host 配套插件](../../credentials/web-authorization/README.zh.md)——挂载、租约与有界状态。
- [授权服务](../../credentials/authorization/README.zh.md)——已注册流程与持久写入。
- [Slots 参考](../../../docs/subsystems/slots.zh.md)——声明拥有者与 dispose。
- [Web Client 架构](../../../docs/subsystems/web-client.zh.md)——浏览器启动与生成的 Remote 通信。

-----

<a id="model-experience"></a>
## Model Experience

无。本包只改变浏览器展示。

#### KV Cache effect

无。授权状态不进入模型上下文。

## Known Limitations and Deferred Work

页脚拥有临时对话，不负责提供方初始化或凭据管理。

- Host 重启会丢失尝试。取消会保留已获准的写入，不代表回滚。
- 需要提供方私有初始化的流程必须使用其所属 UI。

<a id="dev-note"></a>
### 开发备注

<details>
<summary>维护者的工作上下文——点击展开</summary>

[Host 配套插件的开发备注](../../credentials/web-authorization/README.zh.md#dev-note)记录了已完成的 0.2.0-rc.2 针对性测试、上游集成测试、部署后浏览器场景和全新打包 Gateway/Loader 检查。

当前移植也已通过此通用消费方完成真实 `llm-pi-ai/openai-codex` OAuth，由用户手动登录并授权。匹配的结束事件报告 `authorized`，元数据确认已配置的可写 grant。提示和活动尝试已清除；手动页面重载以及 Host 正常重启后的 grant 持久保存均通过验收，无需再次登录。清理仅删除了隔离测试凭据，确认其未配置，并正常关闭隔离 Host。

基于 0.1.7 的历史 OAuth 验收仍是独立结果。未测试模型推理、token 刷新或发行方撤销。

完整的关闭保证依赖 PR-A 中修复后的 AuthorizationService，未经修改的上游 0.2.0-rc.2 不包含该修复。已安装包的 Gateway/Loader 验证仍与部署后浏览器验收不同。

</details>
