/**
 * 小红书 closed Shadow DOM 提前开口（document_start / MAIN world）。
 *
 * 背景：小红书发布条 <xhs-publish-btn> 使用 <template shadowrootmode="closed">，
 * closed shadow 使宿主 .shadowRoot 不可读，且该环境的 elementFromPoint 也不穿透
 * closed shadow（命中返回宿主本身），因此必须在小红书组件挂载前，把
 * Element.prototype.attachShadow 强制为 mode:'open'。
 *
 * 必须在 document_start + MAIN world 注入，确保早于小红书 Vue 应用创建发布条；
 * open 是节点内在属性，注入后隔离 world 的发布器代码同样能读 host.shadowRoot。
 */
import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: [
    "https://creator.xiaohongshu.com/*",
    "https://edith.xiaohongshu.com/*",
    "https://*.xiaohongshu.com/*",
  ],
  run_at: "document_start",
  world: "MAIN",
}

export default (): void => {
  try {
    const w = window as any
    if (w.__xhsOpenShadowPatched) return
    const orig = Element.prototype.attachShadow
    if (typeof orig !== "function") return
    Element.prototype.attachShadow = function (this: Element, option: ShadowRootInit): ShadowRoot {
      return orig.call(this, Object.assign({}, option || {}, { mode: "open" }))
    }
    w.__xhsOpenShadowPatched = true
    console.log("[XhsPublisher] 已强制 Shadow DOM open（document_start/MAIN）")
  } catch (e) {
    console.warn("[XhsPublisher] open-shadow 提前注入失败", e)
  }
}
