import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import { App as CapacitorApp } from '@capacitor/app'
import App from './App.vue'
import router from './router'

const app = createApp(App)

for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.use(ElementPlus, { locale: zhCn })
app.use(router)
app.mount('#app')

// Android 返回按钮：有历史时回退页面，无历史时退出应用
CapacitorApp.addListener('backButton', ({ canGoBack }) => {
  if (canGoBack) {
    window.history.back()
  } else {
    CapacitorApp.exitApp()
  }
})
