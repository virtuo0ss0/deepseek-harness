/** Locale-owned browser authorization copy. */
export const en = {
  title: 'Provider authorization', intro: 'Connect using a registered authorization flow. Closing this panel cancels your current attempt.',
  empty: 'No authorization flows are registered.', refresh: 'Refresh', cancel: 'Cancel authorization',
  submit: 'Submit', dismiss: 'Done', openLink: 'Open authorization page', code: 'Verification code',
  running: 'Authorization in progress', authorized: 'Authorization completed', cancelled: 'Authorization cancelled', failed: 'Authorization failed',
  error: 'Authorization state could not be confirmed. Reconnect or refresh to check it.', busy: 'Waiting for the host…',
  reload: 'Reloading this page abandons the attempt. It will expire on the host if cancellation cannot be delivered.',
} as const
/** Dictionary keys shared by both supported locales. */
export type CopyKey = keyof typeof en
/** Simplified Chinese authorization copy. */
export const zh: Record<CopyKey, string> = {
  title: 'Provider 授权', intro: '使用已注册的授权流程连接。关闭此面板会取消当前尝试。',
  empty: '尚未注册授权流程。', refresh: '刷新', cancel: '取消授权',
  submit: '提交', dismiss: '完成', openLink: '打开授权页面', code: '验证码',
  running: '正在授权', authorized: '授权完成', cancelled: '授权已取消', failed: '授权失败',
  error: '无法确认授权状态。请重新连接或刷新后检查。', busy: '等待 Host…',
  reload: '重新加载页面会放弃此次尝试。如果无法送达取消请求，Host 会在到期后取消。',
}
