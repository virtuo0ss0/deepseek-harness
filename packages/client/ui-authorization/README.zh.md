---
description: "在公共 Models 页脚中显示通用授权目录和提示。"
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-authorization

[English](README.md) | 中文

## Summary

[Web 授权配套插件](../../credentials/web-authorization/README.zh.md)的浏览器消费者。
它注册到 `settings.models.footer`，显示已注册的方法、进度、通知以及文本、秘密和选择提示。
它不包含 Provider 登录协议或凭据存储。

## Table of Contents

- [Contract](#contract)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)
- [Dev Note](#dev-note)

## Contract

浏览器插件需要 Remote、locale 和 slots，并挂载生成的授权 Remote 贡献。
Host 必须提供由现有 `authorization` 服务支持的 `webAuthorization`。
这是按需启用的插件，不会修改默认配置或现有 API-key 编辑器。

| Config | Default | Meaning |
|---|---|---|
| `pollMs` | `1000` | 观察间隔，250 到 10000 之间的整数毫秒。 |

页脚拥有临时的尝试能力标识。回答同时携带尝试和提示标识。
输入只保存在以提示标识为键的组件中，并在提交、提示替换或卸载时清除。
关闭页脚会清除状态和计时器，并请求取消其对应的尝试。如果卸载请求丢失，则由 Host 租约到期取消。
重新加载页面不会保留标识；短暂断线保留内存中的标识。原始传输错误和凭据值不会进入显示状态。

结束状态报告授权服务的结果。它不表示 Provider 已配置，不会改变 `keyConfigured`、删除凭据或撤销发行方访问权限。

## Model Experience

无。本包只改变浏览器展示。

#### KV Cache effect

无。授权状态不进入模型上下文。

## Known Limitations and Deferred Work

完整浏览器组合、生成的线路验证和打包后的外部安装验证仍未完成。
组件测试不保证安装兼容性。Host 重启会丢失尝试。
对于忽略中止信号的 Provider，取消保留现有服务的语义。

## Dev Note

不发布不变量配套插件：控制器独自拥有临时观察状态。
控制器测试覆盖结果不明确的开始响应、过期标识、陈旧轮询和释放竞争。
组件测试覆盖提示替换、秘密清除、选择回答和用户输出快照。
