<template>
  <div style="padding: 20px;">
    <el-page-header @back="router.back()" :title="'返回'" style="margin-bottom: 20px;">
      <template #content>
        <span style="font-size: 18px; font-weight: bold;">{{ isEdit ? '编辑曲谱' : '添加曲谱' }}</span>
      </template>
    </el-page-header>

    <el-form :model="form" label-width="100px" style="max-width: 600px;">
      <el-form-item label="曲名">
        <el-input v-model="form.name" />
      </el-form-item>
      <el-form-item label="别名">
        <el-input v-model="form.aliasesText" placeholder="多个别名用逗号分隔" />
      </el-form-item>
      <el-form-item label="作者">
        <el-input v-model="form.author" />
      </el-form-item>
      <el-form-item label="作品来源">
        <el-input v-model="form.source" />
      </el-form-item>
      <el-form-item label="类型">
        <el-radio-group v-model="form.type">
          <el-radio value="number">数字谱</el-radio>
          <el-radio value="image">图片</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item v-if="form.type === 'number'" label="曲谱">
        <el-input v-model="form.content" type="textarea" :rows="12" />
      </el-form-item>
      <el-form-item v-else label="图片">
        <el-upload
          action="#"
          :auto-upload="false"
          :on-change="handleFileChange"
          :show-file-list="true"
          accept="image/*"
        >
          <el-button>选择图片</el-button>
        </el-upload>
        <div v-if="imagePreview" style="margin-top: 8px; position: relative; display: inline-block;">
          <img :src="imagePreview" style="max-width: 200px; border-radius: 4px;" />
        </div>
        <span v-if="isEdit && existingImage && !isNewImage" style="margin-left: 12px; color: #909399; font-size: 13px;">
          使用原图片（上传新图片将替换原图片）
        </span>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="handleSubmit">保存</el-button>
        <el-button @click="router.back()">取消</el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getScore, createScore, updateScore } from '../api/score.js'

const router = useRouter()
const route = useRoute()
const isEdit = computed(() => !!route.params.id)

const form = reactive({
  name: '',
  aliasesText: '',
  author: '',
  source: '',
  type: 'number',
  content: '',
  imageBlob: null,
})

const imagePreview = ref('')
const isNewImage = ref(false)
const existingImage = ref(false)

function handleFileChange(file) {
  form.imageBlob = file.raw
  imagePreview.value = URL.createObjectURL(file.raw)
  isNewImage.value = true
}

async function handleSubmit() {
  if (!form.name) {
    ElMessage.warning('曲名不能为空')
    return
  }
  if (form.type === 'image' && !form.imageBlob && !existingImage) {
    ElMessage.warning('请上传图片')
    return
  }
  const aliases = form.aliasesText.split(/[,，]/).map(s => s.trim()).filter(Boolean)
  const data = {
    name: form.name,
    aliases,
    author: form.author,
    source: form.source,
    type: form.type,
  }

  if (form.type === 'number') {
    data.content = form.content
  } else if (form.imageBlob) {
    data.content = form.imageBlob
  }
  // If image type and no new upload, content is omitted to preserve existing

  try {
    if (isEdit.value) {
      await updateScore(route.params.id, data)
      ElMessage.success('更新成功')
    } else {
      await createScore(data)
      ElMessage.success('添加成功')
    }
  } catch (e) {
    ElMessage.error('保存失败: ' + e.message)
    return
  }

  router.back()
}

onMounted(async () => {
  if (isEdit.value) {
    const s = await getScore(route.params.id)
    form.name = s.name
    form.aliasesText = s.aliases.join(', ')
    form.author = s.author
    form.source = s.source
    form.type = s.type
    if (s.type === 'image' && s.content) {
      existingImage.value = true
      if (s.content instanceof Blob) {
        form.imageBlob = s.content
        imagePreview.value = URL.createObjectURL(s.content)
      } else if (typeof s.content === 'string' && s.content.startsWith('data:')) {
        imagePreview.value = s.content
      } else {
        imagePreview.value = `/api/images/${s.content}`
      }
    } else {
      form.content = s.content
    }
  }
})
</script>
