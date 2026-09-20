/**
 * Vue esm-bundler 编译期 feature flags。
 *
 * Plasmo 只会把这三个 flag 注入到页面入口（.plasmo/static/common/vue.ts），
 * content script 入口不在其列，因此需要在 Vue 求值前先写入全局，避免
 * vue 报 "Feature flags ... are not explicitly defined" 告警。
 * 必须在 contents/index.ts 的第一个 import 位置引入本模块。
 */
;(globalThis as any).__VUE_OPTIONS_API__ = true
;(globalThis as any).__VUE_PROD_DEVTOOLS__ = false
;(globalThis as any).__VUE_PROD_HYDRATION_MISMATCH_DETAILS__ = false

export {}