<template>
  <div style="padding: 20px;">
    <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
      <el-input
        v-model="keyword"
        placeholder="搜索曲名、别名、作者、作品来源"
        clearable
        style="width: 360px"
        @keyup.enter="handleSearch"
      >
        <template #prefix><el-icon><Search /></el-icon></template>
      </el-input>
      <el-radio-group v-model="groupBy" size="small" @change="handleGroupChange">
        <el-radio-button value="">全部</el-radio-button>
        <el-radio-button value="author">按作者</el-radio-button>
        <el-radio-button value="source">按来源</el-radio-button>
      </el-radio-group>
      <el-button type="primary" @click="handleSearch">搜索</el-button>
      <el-button type="success" @click="handleAdd">添加曲谱</el-button>
      <el-button @click="handlePush" :loading="pushing">推送数据</el-button>
      <el-button @click="handlePull" :loading="pulling">拉取数据</el-button>
    </div>

    <div v-if="selectedIds.size > 0" style="margin-top: 12px;">
      <el-popconfirm title="确定删除选中的曲谱?" @confirm="handleBatchDelete" width="200px">
        <template #reference>
          <el-button type="danger" size="small">删除选中 ({{ selectedIds.size }})</el-button>
        </template>
      </el-popconfirm>
    </div>

    <!-- Flat table -->
    <el-table
      v-if="!groupBy"
      :data="scores"
      style="width: 100%; margin-top: 16px;"
      @selection-change="handleSelectionChange"
      @row-click="handleRowClick"
      :row-style="{ cursor: 'pointer' }"
    >
      <el-table-column type="selection" width="55" @click.stop />
      <el-table-column prop="name" label="曲名" width="200" />
      <el-table-column label="别名" width="200">
        <template #default="{ row }">{{ row.aliases.join(', ') }}</template>
      </el-table-column>
      <el-table-column prop="author" label="作者" width="150" />
      <el-table-column prop="source" label="作品来源" />
      <el-table-column prop="type" label="类型" width="100">
        <template #default="{ row }">{{ row.type === 'image' ? '图片' : '数字谱' }}</template>
      </el-table-column>
    </el-table>

    <!-- Grouped by category -->
    <div v-else v-for="(group, key) in groupedScores" :key="key" style="margin-top: 16px;">
      <div
        @click="toggleGroup(key)"
        :style="{ padding: '8px 12px', background: '#e6f7ff', borderRadius: collapsedGroups.has(key) ? '4px' : '4px 4px 0 0', fontWeight: 'bold', fontSize: '14px', border: '1px solid #91d5ff', borderBottom: collapsedGroups.has(key) ? '1px solid #91d5ff' : 'none', cursor: 'pointer', userSelect: 'none' }"
      >
        <span style="display: inline-block; width: 16px; transition: transform 0.2s;" :style="{ transform: collapsedGroups.has(key) ? 'rotate(-90deg)' : '' }">▼</span>
        {{ key || '未分类' }}
        <span style="font-weight: normal; color: #909399; margin-left: 8px; font-size: 13px;">({{ group.length }} 首)</span>
      </div>
      <el-table
        v-show="!collapsedGroups.has(key)"
        :data="group"
        style="width: 100%;"
        @selection-change="handleSelectionChange"
        @row-click="handleRowClick"
        :row-style="{ cursor: 'pointer' }"
      >
        <el-table-column type="selection" width="55" @click.stop />
        <el-table-column prop="name" label="曲名" width="200" />
        <el-table-column label="别名" width="200">
          <template #default="{ row }">{{ row.aliases.join(', ') }}</template>
        </el-table-column>
        <el-table-column prop="author" label="作者" width="150" />
        <el-table-column prop="source" label="作品来源" />
        <el-table-column prop="type" label="类型" width="100">
          <template #default="{ row }">{{ row.type === 'image' ? '图片' : '数字谱' }}</template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getScores, deleteScore } from '../api/score.js'
import { push, pull } from '../api/sync.js'

const router = useRouter()
const scores = ref([])
const keyword = ref('')
const selectedIds = ref(new Set())
const pushing = ref(false)
const pulling = ref(false)
const groupBy = ref('source')
const collapsedGroups = ref(new Set())

const groupedScores = computed(() => {
  if (!groupBy.value) return {}
  const groups = {}
  for (const s of scores.value) {
    const k = groupBy.value === 'author' ? s.author : s.source
    const key = k || ''
    if (!groups[key]) groups[key] = []
    groups[key].push(s)
  }
  // Sort groups by key, but put empty (未分类) at the end
  const sorted = {}
  const keys = Object.keys(groups).sort((a, b) => {
    if (!a) return 1
    if (!b) return -1
    return a.localeCompare(b, 'zh')
  })
  for (const k of keys) {
    sorted[k] = groups[k]
  }
  return sorted
})

async function fetchScores(keyword = '') {
  scores.value = await getScores(keyword)
}

function handleSearch() {
  fetchScores(keyword.value)
}

function handleAdd() {
  router.push('/scores/new')
}

function handleRowClick(row) {
  router.push(`/scores/${row.id}`)
}

function handleSelectionChange(rows) {
  selectedIds.value = new Set(rows.map(r => r.id))
}

function handleGroupChange() {
  selectedIds.value.clear()
  collapsedGroups.value.clear()
}

function toggleGroup(key) {
  if (collapsedGroups.value.has(key)) {
    collapsedGroups.value.delete(key)
  } else {
    collapsedGroups.value.add(key)
  }
  collapsedGroups.value = new Set(collapsedGroups.value)
}

// Collapse all groups when data changes
watch(groupedScores, (groups) => {
  collapsedGroups.value = new Set(Object.keys(groups))
})

async function handleBatchDelete() {
  const ids = [...selectedIds.value]
  try {
    await Promise.all(ids.map(id => deleteScore(id)))
    ElMessage.success('删除成功')
    selectedIds.value.clear()
    fetchScores()
  } catch {
    ElMessage.error('删除失败')
  }
}

async function handlePush() {
  pushing.value = true
  try {
    const result = await push()
    ElMessage.success(`推送完成: 推送 ${result.pushed} 条, 跳过 ${result.skipped} 条, 删除 ${result.deleted} 条`)
    fetchScores()
  } catch (e) {
    ElMessage.error(`推送失败: ${e.message}`)
  } finally {
    pushing.value = false
  }
}

async function handlePull() {
  pulling.value = true
  try {
    const result = await pull()
    ElMessage.success(`拉取完成: 拉取 ${result.pulled} 条, 删除 ${result.deleted} 条`)
    fetchScores()
  } catch (e) {
    ElMessage.error(`拉取失败: ${e.message}`)
  } finally {
    pulling.value = false
  }
}

onMounted(() => fetchScores())
</script>
