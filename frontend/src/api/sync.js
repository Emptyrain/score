import { db } from '../db'
import { SYNC_SERVER_URL, SYNC_TOKEN } from '../config'

async function apiRequest(url, token, method = 'GET', body = null) {
  const res = await fetch(url, {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '请求失败' }))
    throw new Error(err.error || '请求失败')
  }
  return res.json()
}

/**
 * 推送本地变更到服务器
 * - 推送未同步的新增/修改记录
 * - 推送已同步后删除的记录 ID
 */
export async function push() {
  if (!SYNC_SERVER_URL || !SYNC_TOKEN) {
    throw new Error('请先在 config.js 中配置同步服务器')
  }

  const baseUrl = SYNC_SERVER_URL.replace(/\/+$/, '')
  const token = SYNC_TOKEN
  const all = await db.scores.toArray()
  const unsynced = all.filter(s => s.synced === false)

  let pushResults = []
  // Push unsynced records
  if (unsynced.length > 0) {
    const records = await Promise.all(unsynced.map(async s => ({
      id: s.id,
      name: s.name,
      aliases: JSON.stringify(s.aliases),
      author: s.author,
      source: s.source,
      type: s.type,
      content: s.content instanceof Blob ? await blobToBase64(s.content) : s.content,
      created_at: s.created_at || s.updated_at,
      updated_at: s.updated_at,
    })))

    pushResults = (await apiRequest(`${baseUrl}/api/sync/push`, token, 'POST', { records })).results

    for (const r of pushResults) {
      if (r.action === 'created' || r.action === 'updated') {
        await db.scores.update(r.id, { synced: true })
      }
    }
  }

  // Push deleted IDs
  const deleted = await db.deletedIds.toArray()
  if (deleted.length > 0) {
    const deleteResult = await apiRequest(
      `${baseUrl}/api/sync/push/delete`,
      token,
      'POST',
      { ids: deleted.map(d => d.serverId) }
    )
    // Remove successfully deleted entries
    const pushedIds = deleteResult.ids || []
    for (const d of deleted) {
      if (pushedIds.includes(d.serverId)) {
        await db.deletedIds.delete(d.id)
      }
    }
  }

  return {
    pushed: pushResults.filter(r => r.action !== 'skipped').length,
    skipped: pushResults.filter(r => r.action === 'skipped').length,
    deleted: deleted.length,
  }
}

/**
 * 从服务器拉取数据
 * - 强制更新本地已同步的数据
 * - 未同步的数据保持原样
 */
export async function pull() {
  if (!SYNC_SERVER_URL || !SYNC_TOKEN) {
    throw new Error('请先在 config.js 中配置同步服务器')
  }

  const baseUrl = SYNC_SERVER_URL.replace(/\/+$/, '')
  const token = SYNC_TOKEN
  const pullData = await apiRequest(`${baseUrl}/api/sync/pull`, token)

  for (const rec of pullData.records) {
    const existing = await db.scores.get(rec.id)
    // Force update if synced locally, skip if unsynced
    if (existing && existing.synced) {
      await db.scores.update(rec.id, {
        name: rec.name,
        aliases: rec.aliases,
        author: rec.author,
        source: rec.source,
        type: rec.type,
        content: rec.content,
        updated_at: rec.updated_at,
        synced: true,
      })
    } else if (!existing) {
      await db.scores.add({
        id: rec.id,
        name: rec.name,
        aliases: rec.aliases,
        author: rec.author,
        source: rec.source,
        type: rec.type,
        content: rec.content,
        updated_at: rec.updated_at,
        synced: true,
      })
    }
    // If existing but not synced, keep local version as-is
  }

  // Handle server-side deletions
  const serverDeleted = pullData.deletedIds || []
  for (const id of serverDeleted) {
    const existing = await db.scores.get(id)
    if (existing && existing.synced) {
      await db.scores.delete(id)
    }
  }

  await saveLastSyncTime()

  return {
    pulled: pullData.records.length,
    deleted: serverDeleted.length,
  }
}

/**
 * 兼容旧版同步接口 (push + pull)
 */
export async function sync() {
  const pushResult = await push()
  const pullResult = await pull()
  return {
    ...pushResult,
    ...pullResult,
  }
}

async function blobToBase64(blob) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result)
    reader.readAsDataURL(blob)
  })
}

async function getLastSyncTime() {
  const val = localStorage.getItem('last_sync_time')
  return val || '1970-01-01T00:00:00'
}

async function saveLastSyncTime() {
  localStorage.setItem('last_sync_time', new Date().toISOString())
}
