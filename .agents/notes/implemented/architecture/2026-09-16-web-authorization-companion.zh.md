# Agent Note: Web 授权配套插件

Status: implemented

[English](2026-09-16-web-authorization-companion.md) | 中文

## Problem

本基线已注册的授权流程缺少通用默认浏览器消费者。虽然已有授权服务和 Models 页脚扩展，Provider 专用面板仍重复实现交互传输。

## Decision

使用当前生成的 Remote 方法连接由尝试拥有的交互管理器，再由通用 Models 页脚消费者展示。凭据和 OAuth 执行保留在现有拥有者中。通过尝试请求信号取消，不通过凭据键取消，避免迟到的取消影响新尝试。采用随机浏览器能力标识和 Host 提示标识，不持久化浏览器状态。有界观察租约在重载后释放被遗弃的尝试，不要求卸载请求送达。

## Alternatives considered

**Provider Editor API：**现有公共插槽已能支持此消费者；替换编辑器不会增加必要能力。

**旧 apiproxy 传输：**Discussion #4626 展示交互语义，但早于当前 Remote/Gateway。复用其基于键的尝试寻址会保留陈旧取消风险。

**现有消费者：**account-authorization 依赖缺失的模型目标元数据，且拒绝必需的文本和秘密提示；Codex Web Bridge 面向较旧的 alpha 并使用自定义 HTTP 路由。两者均未证明与本基线要求等价。

## Verification

无真实凭据的测试覆盖 Gateway 和 Loader 组合、合成及目录流程、API-key 保持不变、提示和尝试关联、Provider 和消费者释放、重连与重载到期以及浏览器输出。独立产物测试验证生成的校验器和外部 Host tarball。配套插件使用公共扩展点，不需要核心运行时 API 修改。

## Consequences

租约到期会有意放弃重载连续性，并可能中断缓慢重连。Host 插件和同源脚本仍受信任。忽略中止的 Provider 仍可能按现有授权语义稍后提交。支持顺序提示，并发提示明确失败。生成的 Gateway 和仓库外安装的 Host tarball 已通过无真实凭据的冒烟测试。完整部署的浏览器行为和真实 OAuth 尚未验证。
