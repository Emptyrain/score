import { createRouter, createWebHistory } from 'vue-router'
import ScoreList from '../views/ScoreList.vue'
import ScoreDetail from '../views/ScoreDetail.vue'
import ScoreEdit from '../views/ScoreEdit.vue'

const routes = [
  { path: '/', component: ScoreList },
  { path: '/scores/:id', component: ScoreDetail, props: true },
  { path: '/scores/:id/edit', component: ScoreEdit, props: true },
  { path: '/scores/new', component: ScoreEdit },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

export default router
