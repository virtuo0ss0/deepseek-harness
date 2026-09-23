# Web 授权配套插件设计

[English](provider-editor-design.md) | 中文

## 结论和证据

不引入 Provider Editor API。Models 已有公共卡片和页脚插槽；有价值的缺口是现有授权服务的通用 Web 消费者。已接受的第一阶段调查保存在本文的 Git 历史中，包含仓库版本、Discussion #1491、#208、#5740 以及已检查的实现。本文记录功能分支的较窄实现，不表示包已发布。

[Discussion #4626](https://github.com/deepseek-ai/deepseek-harness/discussions/4626) 展示了通用流程目录、轮询、通知、提示和取消交互。其旧 apiproxy 传输不是当前 Gateway。本实现复用这些概念和现有授权服务，不复用旧传输或按凭据键寻址尝试的方式。[dsh-codex-connect](https://github.com/franksong2702/dsh-codex-connect) 和 [pi2dsh](https://github.com/weijiafu14/pi2dsh) 提供 Provider 集成，不能据此确认本基线已有受支持的等价通用消费者。研究记录包含检查过的准确源码引用和兼容性限制。

后续源码调查发现 [account-authorization](https://github.com/lxy271713/dsh-account-authorization) 依赖本基线缺少的 target 元数据并拒绝文本和秘密提示；[Codex Web Bridge](https://github.com/Gluking81/dsh-openai-codex-web-bridge) 面向较早的 alpha 和自定义 HTTP 路由。两者均未证明等价的当前 Remote、生命周期及外部安装保证。这是源码观察，不是这些项目的运行时认证。

## 当前架构和缺失的消费者

授权服务拥有已注册流程、按凭据加锁、执行和凭据写入后的结束判断。Provider 拥有 OAuth 回调、PKCE、grant 和凭据写入。Models 拥有 API-key 配置并暴露公共展示插槽。Remote/Gateway 提供带类型的 Host 方法、浏览器描述符和连接传输。默认组合没有将这些部件连接为通用 Web 授权驱动。

本功能添加两个按需启用的包：[Host 配套插件](../packages/credentials/web-authorization/README.zh.md)和[浏览器消费者](../packages/client/ui-authorization/README.zh.md)。浏览器仅贡献 settings.models.footer，不访问 Models 私有编辑器，也不修补现有 Provider。不需要核心修改。组合必须提供唯一的现有授权服务、凭据提供者、Gateway 和这两个插件。默认配置不变；它们是普通 Cordis 插件，不是可通过 CLI 新增的 bundle。

## 最小公共传输

| 方法 | 输入 | 输出 |
|---|---|---|
| list | 无 | 已注册键、标签、方法和运行标志 |
| begin | 浏览器生成的随机尝试能力标识、键、方法 | 投影尝试视图 |
| status | 尝试能力标识 | 视图；续期运行租约 |
| answer | 尝试能力标识、提示标识、临时答案 | 不含凭据载荷 |
| cancel | 尝试能力标识 | 不含凭据载荷 |

视图包含尝试标识、running/authorized/cancelled/failed 状态、有界通知，以及最多一个文本、秘密或选择提示。生成的验证器检查必需字段和类型，并移除未知对象字段。管理器验证 UUID 能力标识、流程选择、答案大小、选项成员资格和提示标识。以相同的保留标识及选择重复 begin 可恢复不明确的响应。目录不会暴露其他客户端的尝试标识。

## 安全和凭据

令牌、grant、PKCE verifier 和凭据存储内容保留在现有 Host 拥有者中。秘密提示输入必须临时经过浏览器，但不会进入控制器快照或状态响应。提示组件在提交、替换和卸载时清除输入。Provider 通知按约定不得包含秘密；字段允许列表无法识别放入合法文本字段的秘密。已安装的 Host 插件和同源脚本仍受信任。部署必须保留 Gateway 身份验证及适当的传输保护。

Host 最多保留 32 次尝试，每次最多 16 条通知。完整序列化视图最多 32768 个 UTF-8 字节。链接只允许 HTTPS 或无内嵌凭据的回环 HTTP。能力标识只保存在浏览器内存，不进入 URL、持久化存储或日志。错误只显示通用原因代码，不暴露 Provider 异常。取消仅中止对应尝试控制器，不调用 authorization.cancel(key)。不提供本地删除或发行方撤销操作。

## 生命周期和竞争

Cordis 拥有 Host 管理器、Remote 贡献、字典和页脚注册。声明作用域控制器在页脚消失时清理计时器和 UI，并请求取消其准确标识。Host 释放会中止拥有的请求、撤回待处理提示并等待结束。Provider 释放遵循现有授权生命周期。提示自己的信号只撤回该提示，不视为用户拒绝。

浏览器操作和轮询使用代次检查，防止迟到响应恢复旧 UI。短暂断线保留内存标识。重新加载会丢失标识，由有界 Host 租约取消被遗弃的尝试，不依赖卸载请求送达。结束视图到期且不续期。忽略中止的 Provider 仍可能按现有服务语义稍后提交，因此取消不等于回滚。并发提示明确失败；支持顺序提示。

## 兼容性和验证

API-key 编辑器、凭据引用、Provider 配置和 keyConfigured 保持原义。授权成功表示服务观察到了凭据提交，不表示模型路由已经配置。这两个包不添加工具、模型可见状态、账户池、配额或 Provider OAuth 逻辑。

测试覆盖合成流程、使用虚拟凭据的已注册 pi-ai DeepSeek API-key 流程、提示关联、陈旧取消、Provider 释放、通知、结束、重载到期、浏览器竞争、提示渲染和声明替换。独立的纯 Node 产物测试验证生成的 Gateway 校验。23 个本地 DSH/框架包打包并安装到仓库外后，Host 测试也通过。没有使用真实凭据。完整实际浏览器安装仍是独立验证范围；组件和产物测试不认证真实 OAuth 或部署后的浏览器会话。

## 建议和停止条件

MVP 保持两个按需启用插件，保留现有服务和 Models 插槽。在考虑默认组合前完成分支剩余验证。不开发 Provider Editor 替代品。如果维护中的通用消费者已证明等价的当前传输、安全、生命周期和外部安装保证，应优先向其贡献测试和兼容性修复。下一项候选架构调查是 Discussion #6199 的共享模型行草稿，但需要先确认实际消费者需求。

[继续工作检查点](../work/web-authorization-continuation.md)记录准确命令、未完成检查和恢复说明。
