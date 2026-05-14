<template>
  <div style="padding: 20px;">
    <el-page-header @back="router.back()" :title="'返回'" style="margin-bottom: 20px;">
      <template #content>
        <span style="font-size: 18px; font-weight: bold;">{{ score?.name }}</span>
      </template>
    </el-page-header>

    <el-card style="margin-bottom: 16px;">
      <template #header><span style="font-weight: bold;">基本信息</span></template>
      <el-descriptions :column="2" border>
        <el-descriptions-item label="曲名">{{ score?.name }}</el-descriptions-item>
        <el-descriptions-item label="别名">{{ score?.aliases?.join(', ') || '-' }}</el-descriptions-item>
      </el-descriptions>
    </el-card>

    <el-card style="margin-bottom: 16px;">
      <template #header><span style="font-weight: bold;">分类信息</span></template>
      <el-descriptions :column="2" border>
        <el-descriptions-item label="作者">{{ score?.author || '-' }}</el-descriptions-item>
        <el-descriptions-item label="作品来源">{{ score?.source || '-' }}</el-descriptions-item>
        <el-descriptions-item label="类型">{{ score?.type === 'image' ? '图片' : '数字谱' }}</el-descriptions-item>
      </el-descriptions>
    </el-card>

    <div v-if="score?.type === 'number'">
      <h4 style="margin-bottom: 12px;">曲谱内容</h4>
      <div style="white-space: pre-wrap; font-family: monospace; font-size: 16px; background: #f5f7fa; padding: 16px; border-radius: 4px;">
        {{ score?.content || '无内容' }}
      </div>
    </div>

    <div v-else-if="imageUrl">
      <div style="overflow: auto; max-height: 70vh; background: #f5f7fa; border-radius: 4px;" @wheel="handleWheelZoom">
        <img
          ref="imageRef"
          :src="imageUrl"
          :style="{ transform: `scale(${currentScale})`, transition: 'transform 0.2s', cursor: 'zoom-in', display: 'block', margin: '0 auto' }"
          @load="currentScale = 1"
          @dblclick="showFullscreen = true"
        />
      </div>
      <div style="margin-top: 10px; display: flex; align-items: center;">
        <el-button size="small" @click="zoomImage(1.2)">放大</el-button>
        <el-button size="small" @click="zoomImage(0.8)">缩小</el-button>
        <el-button size="small" @click="zoomImage(1)">重置</el-button>
        <el-button size="small" @click="showFullscreen = true">全屏查看</el-button>
        <span style="margin-left: 12px; color: #909399; font-size: 13px;">{{ Math.round(currentScale * 100) }}%</span>
      </div>

      <el-dialog v-model="showFullscreen" :show-close="false" fullscreen style="background: rgba(0,0,0,0.9);" @opened="fullScale = 1">
        <div style="display: flex; flex-direction: column; height: 100%;">
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 16px; color: #fff;">
            <span style="font-size: 14px;">{{ score?.name }}</span>
            <div>
              <el-button size="small" text style="color: #fff;" @click="zoomImageFull(1.2)">放大</el-button>
              <el-button size="small" text style="color: #fff;" @click="zoomImageFull(0.8)">缩小</el-button>
              <el-button size="small" text style="color: #fff;" @click="zoomImageFull(1)">重置</el-button>
              <span style="margin-left: 8px; color: #ccc; font-size: 12px;">{{ Math.round(fullScale * 100) }}%</span>
              <el-button size="small" text style="color: #fff;" @click="showFullscreen = false">关闭</el-button>
            </div>
          </div>
          <div
            style="flex: 1; overflow: auto; display: flex; align-items: center; justify-content: center;"
            @wheel="handleWheelZoomFull"
          >
            <img
              ref="fullImageRef"
              :src="imageUrl"
              :style="{ transform: `scale(${fullScale})`, transition: 'transform 0.2s', cursor: 'grab', maxWidth: '100%' }"
              @dblclick="showFullscreen = false"
            />
          </div>
        </div>
      </el-dialog>
    </div>

    <el-button type="primary" style="margin-top: 20px;" @click="router.push(`/scores/${id}/edit`)">编辑</el-button>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { getScore } from '../api/score.js'

const router = useRouter()
const props = defineProps(['id'])

const score = ref(null)
const imageRef = ref(null)
const fullImageRef = ref(null)
const currentScale = ref(1)
const fullScale = ref(1)
const showFullscreen = ref(false)

const imageUrl = computed(() => {
  const content = score.value?.content
  if (!content) return ''
  if (content instanceof Blob) {
    return URL.createObjectURL(content)
  }
  if (typeof content === 'string') {
    return content.startsWith('data:') ? content : `/api/images/${content}`
  }
  return ''
})

onUnmounted(() => {
  if (imageUrl.value && imageUrl.value.startsWith('blob:')) {
    URL.revokeObjectURL(imageUrl.value)
  }
})

function zoomImage(scale) {
  if (scale === 1) {
    currentScale.value = 1
  } else {
    currentScale.value = Math.max(0.1, Math.min(5, currentScale.value * scale))
  }
}

function handleWheelZoom(e) {
  if (!e.ctrlKey) return
  e.preventDefault()
  const delta = e.deltaY > 0 ? 0.9 : 1.1
  zoomImage(delta)
}

function zoomImageFull(scale) {
  if (scale === 1) {
    fullScale.value = 1
  } else {
    fullScale.value = Math.max(0.1, Math.min(5, fullScale.value * scale))
  }
}

function handleWheelZoomFull(e) {
  if (!e.ctrlKey) return
  e.preventDefault()
  const delta = e.deltaY > 0 ? 0.9 : 1.1
  zoomImageFull(delta)
}

onMounted(async () => {
  score.value = await getScore(props.id)
})
</script>
