# Web 授权配套插件

[English](provider-editor-design.md) | 中文

## 架构

两个按需启用的包将现有授权服务连接到公共 Models 页脚：[Host 配套插件](../packages/credentials/web-authorization/README.zh.md)和[浏览器消费者](../packages/client/ui-authorization/README.zh.md)。base profile 已提供 authorization；部署时复用其拥有者。不新增核心 API、Provider Editor 替代品、Provider 专属 OAuth 引擎或凭据存储。[兼容性审查](../work/web-authorization-compatibility-audit.md)记录了与 0.1.7-rc.1 基线的比较。

上游 DeepSeek 账户 UI 和 account-controller 属于 Provider 专属实现，不是通用注册 flow 消费者。其 Platform flow 需要账户服务的私有初始化。注册本身不保证 flow 可在此独立使用；配套插件不复制该初始化，也不覆盖账户 UI。

## 公共传输

| 方法 | 输入 | 结果 |
|---|---|---|
| list | 无 | 已注册 flow 元数据、方法和忙碌标志 |
| begin | 随机尝试能力标识、key、method | 尝试状态投影 |
| status | 尝试能力标识 | 状态投影及运行租约续期 |
| answer | 尝试能力标识、提示标识、瞬时答案 | 不返回凭据载荷 |
| cancel | 精确的尝试能力标识 | 撤回请求，不返回凭据载荷 |

Host 投影有界通知和 text/secret/select 提示。浏览器仅在内存中保存随机能力标识。使用同一保留标识和选择重复 begin 可恢复响应不明确的请求。顺序提示有独立标识。Provider 错误和结算均不暴露凭据载荷。现有 API-key 配置和 keyConfigured 保持原意；授权成功不会配置模型路由。

## 安全与生命周期

Provider 和 authorization 拥有协议、回调、PKCE、凭据提交和锁。凭据不进入浏览器快照或状态响应。人工输入的机密仅短暂存在于提示组件和请求中，在提交或替换时清除。Provider 通知文本必须遵守服务的非机密契约。Gateway 认证及传输保护仍由部署负责；同源脚本和已安装的 Host 插件仍被信任。

管理器分别将保留视图和活动尝试限制为 32 个，通知限制为 16 条，每个完整序列化视图限制为 32768 UTF-8 字节。它校验提示标识、提供的选项和答案大小。浏览器代次检查丢弃过期响应。声明拥有的注册在销毁时移除控制器、计时器、语言字典注册和 Remote 贡献。短暂重连保留内存句柄；重载丢失句柄，租约撤回被遗弃的尝试。

已获准的 session.commit 可以在取消和租约到期后继续执行。Host 移除过期浏览器视图，但仍拥有未结算工作直到 authorization 结束。销毁等待该工作，且视图到期后活动尝试容量仍有界。取消不代表回滚、凭据删除或发行方撤销。直接写入的 Provider 仍负责自身取消顺序。

## 验证与下一步

合成 flow 在无真实凭据情况下测试共享交互协议；现有 pi-ai 目录 API-key flow 测试 Loader/Gateway 组合和 API-key 引用保持不变。阻塞凭据写入的同步屏障测试取消、Provider 移除以及租约到期后的销毁。生成的 Remote 校验和打包后的外部安装独立于源码测试验证公共包导出。

[受版本控制的检查点](../work/web-authorization-continuation.md)记录已执行检查和待办。部署后的浏览器冒烟测试仍是独立验收步骤。本次移植不包含真实 OAuth、包发布或 PR。如果存在提供等效生命周期和安全保证的受维护通用消费者，应向其贡献，而非维护重复实现。
