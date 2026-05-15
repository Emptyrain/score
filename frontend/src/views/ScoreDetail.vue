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
      <div
        ref="inlineContainerRef"
        style="overflow: hidden; max-height: 70vh; background: #f5f7fa; border-radius: 4px; touch-action: none;"
        @wheel="onInlineWheel"
        @mousedown="onMouseDown($event, 'inline')"
        @touchstart="onTouchStart($event, 'inline')"
        @touchmove="onTouchMove($event, 'inline')"
        @touchend="onTouchEnd($event, 'inline')"
        @touchcancel="onTouchEnd($event, 'inline')"
      >
        <img
          :src="imageUrl"
          :style="[inlineImgStyle, { display: 'block', margin: '0 auto' }]"
          @load="inlineScale = 1; inlineTx = 0; inlineTy = 0"
          @dblclick="showFullscreen = true"
        />
      </div>
      <div style="margin-top: 10px; display: flex; align-items: center;">
        <el-button size="small" @click="zoomInline(1.2)">放大</el-button>
        <el-button size="small" @click="zoomInline(0.8)">缩小</el-button>
        <el-button size="small" @click="zoomInline(1)">重置</el-button>
        <el-button size="small" @click="showFullscreen = true">全屏查看</el-button>
        <span style="margin-left: 12px; color: #909399; font-size: 13px;">{{ Math.round(inlineScale * 100) }}%</span>
      </div>

      <el-dialog v-model="showFullscreen" :show-close="false" fullscreen destroy-on-close style="background: rgba(0,0,0,0.9);" @opened="fullScale = 1; fullTx = 0; fullTy = 0">
        <div style="display: flex; flex-direction: column; height: 100%;">
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 16px; color: #fff;">
            <span style="font-size: 14px;">{{ score?.name }}</span>
            <div>
              <el-button size="small" text style="color: #fff;" @click="zoomFull(1.2)">放大</el-button>
              <el-button size="small" text style="color: #fff;" @click="zoomFull(0.8)">缩小</el-button>
              <el-button size="small" text style="color: #fff;" @click="zoomFull(1)">重置</el-button>
              <span style="margin-left: 8px; color: #ccc; font-size: 12px;">{{ Math.round(fullScale * 100) }}%</span>
              <el-button size="small" text style="color: #fff;" @click="showFullscreen = false">关闭</el-button>
            </div>
          </div>
          <div
            ref="fullContainerRef"
            style="flex: 1; overflow: hidden; touch-action: none;"
            @wheel="onFullWheel"
            @mousedown="onMouseDown($event, 'full')"
            @touchstart="onTouchStart($event, 'full')"
            @touchmove="onTouchMove($event, 'full')"
            @touchend="onTouchEnd($event, 'full')"
            @touchcancel="onTouchEnd($event, 'full')"
          >
            <img
              :src="imageUrl"
              :style="[fullImgStyle, { display: 'block', margin: '0 auto' }]"
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
const showFullscreen = ref(false)
const inlineContainerRef = ref(null)
const fullContainerRef = ref(null)

// inline state
const inlineScale = ref(1)
const inlineTx = ref(0)
const inlineTy = ref(0)
const inlineGesturing = ref(false)

// fullscreen state
const fullScale = ref(1)
const fullTx = ref(0)
const fullTy = ref(0)
const fullGesturing = ref(false)

const inlineImgStyle = computed(() => {
  const t = `translate(${inlineTx.value}px, ${inlineTy.value}px) scale(${inlineScale.value})`
  const trans = inlineGesturing.value ? 'none' : 'transform 0.2s'
  return { transform: t, transition: trans, cursor: inlineScale.value > 1 ? 'grab' : 'zoom-in' }
})

const fullImgStyle = computed(() => {
  const t = `translate(${fullTx.value}px, ${fullTy.value}px) scale(${fullScale.value})`
  const trans = fullGesturing.value ? 'none' : 'transform 0.2s'
  return { transform: t, transition: trans, cursor: fullScale.value > 1 ? 'grab' : 'zoom-in' }
})

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

function clamp(v) {
  return Math.max(0.1, Math.min(5, v))
}

// --- Inline zoom ---
function zoomInline(factor) {
  if (factor === 1) {
    inlineScale.value = 1
    inlineTx.value = 0
    inlineTy.value = 0
  } else {
    inlineScale.value = clamp(inlineScale.value * factor)
  }
}

function onInlineWheel(e) {
  if (!e.ctrlKey) return
  e.preventDefault()
  inlineScale.value = clamp(inlineScale.value * (e.deltaY > 0 ? 0.9 : 1.1))
}

// --- Fullscreen zoom ---
function zoomFull(factor) {
  if (factor === 1) {
    fullScale.value = 1
    fullTx.value = 0
    fullTy.value = 0
  } else {
    fullScale.value = clamp(fullScale.value * factor)
  }
}

function onFullWheel(e) {
  if (!e.ctrlKey) return
  e.preventDefault()
  fullScale.value = clamp(fullScale.value * (e.deltaY > 0 ? 0.9 : 1.1))
}

// --- Mouse drag (shared) ---
let dragView = null
let dragStartX = 0
let dragStartY = 0
let dragStartTx = 0
let dragStartTy = 0

function stateFor(view) {
  if (view === 'inline') return { scale: inlineScale, tx: inlineTx, ty: inlineTy, gesturing: inlineGesturing }
  return { scale: fullScale, tx: fullTx, ty: fullTy, gesturing: fullGesturing }
}

function onMouseDown(e, view) {
  if (e.button !== 0) return
  const s = stateFor(view)
  e.preventDefault()
  dragView = view
  dragStartX = e.clientX
  dragStartY = e.clientY
  dragStartTx = s.tx.value
  dragStartTy = s.ty.value
  s.gesturing.value = true
  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
}

function onMouseMove(e) {
  if (!dragView) return
  const s = stateFor(dragView)
  s.tx.value = dragStartTx + (e.clientX - dragStartX)
  s.ty.value = dragStartTy + (e.clientY - dragStartY)
}

function onMouseUp() {
  if (dragView) {
    stateFor(dragView).gesturing.value = false
    dragView = null
  }
  document.removeEventListener('mousemove', onMouseMove)
  document.removeEventListener('mouseup', onMouseUp)
}

// --- Touch pinch + drag (shared) ---
let touchView = null
let isPinching = false
let isDragging = false
let pinchStartDist = 0
let pinchStartScale = 1
let pinchStartTx = 0
let pinchStartTy = 0
let pinchCenterX = 0
let pinchCenterY = 0
let touchLastX = 0
let touchLastY = 0
let touchStartTx = 0
let touchStartTy = 0

function onTouchStart(e, view) {
  const s = stateFor(view)
  if (e.touches.length === 2) {
    isPinching = true
    isDragging = false
    touchView = view
    const dx = e.touches[0].clientX - e.touches[1].clientX
    const dy = e.touches[0].clientY - e.touches[1].clientY
    pinchStartDist = Math.hypot(dx, dy)
    pinchStartScale = s.scale.value
    pinchStartTx = s.tx.value
    pinchStartTy = s.ty.value
    pinchCenterX = (e.touches[0].clientX + e.touches[1].clientX) / 2
    pinchCenterY = (e.touches[0].clientY + e.touches[1].clientY) / 2
    s.gesturing.value = true
    e.preventDefault()
  } else if (e.touches.length === 1) {
    isDragging = true
    isPinching = false
    touchView = view
    touchLastX = e.touches[0].clientX
    touchLastY = e.touches[0].clientY
    touchStartTx = s.tx.value
    touchStartTy = s.ty.value
    s.gesturing.value = true
  }
}

function onTouchMove(e, view) {
  if (view !== touchView) return
  const s = stateFor(view)

  if (isPinching && e.touches.length >= 2) {
    const dx = e.touches[0].clientX - e.touches[1].clientX
    const dy = e.touches[0].clientY - e.touches[1].clientY
    const dist = Math.hypot(dx, dy)
    const scaleRatio = dist / pinchStartDist
    const newScale = clamp(pinchStartScale * scaleRatio)
    const actualRatio = newScale / pinchStartScale

    // Measure from image center (transform-origin: center)
    const img = view === 'inline' ? inlineContainerRef.value?.querySelector('img') : fullContainerRef.value?.querySelector('img')
    if (img) {
      const rect = img.getBoundingClientRect()
      const imgCenterX = rect.left + rect.width / 2
      const imgCenterY = rect.top + rect.height / 2
      const ddx = pinchCenterX - imgCenterX
      const ddy = pinchCenterY - imgCenterY
      s.tx.value = pinchStartTx + ddx * (1 - actualRatio)
      s.ty.value = pinchStartTy + ddy * (1 - actualRatio)
    }
    s.scale.value = newScale
    e.preventDefault()
  } else if (isDragging && e.touches.length === 1) {
    s.tx.value = touchStartTx + (e.touches[0].clientX - touchLastX)
    s.ty.value = touchStartTy + (e.touches[0].clientY - touchLastY)
  }
}

function onTouchEnd(e, view) {
  if (view !== touchView) return
  const s = stateFor(view)
  if (e.touches.length < 2) {
    isPinching = false
  }
  if (e.touches.length === 0) {
    isDragging = false
    touchView = null
    s.gesturing.value = false
  }
  if (e.touches.length === 1) {
    // Transition from pinch to single-finger drag
    isDragging = true
    isPinching = false
    touchLastX = e.touches[0].clientX
    touchLastY = e.touches[0].clientY
    touchStartTx = s.tx.value
    touchStartTy = s.ty.value
  }
}

onMounted(async () => {
  score.value = await getScore(props.id)
})
</script>
