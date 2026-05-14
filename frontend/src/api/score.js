import { db } from '../db'

export function getScores(keyword = '') {
  let collection = db.scores.orderBy('name')
  if (keyword) {
    return collection.toArray().then(scores =>
      scores.filter(s =>
        s.name.includes(keyword) ||
        s.aliases.some(a => a.includes(keyword)) ||
        (s.author && s.author.includes(keyword)) ||
        (s.source && s.source.includes(keyword))
      )
    )
  }
  return collection.toArray()
}

export function getScore(id) {
  return db.scores.get(Number(id))
}

export function createScore(data) {
  return db.scores.add({
    name: data.name,
    aliases: data.aliases || [],
    author: data.author || '',
    source: data.source || '',
    type: data.type || 'number',
    content: data.content,
    synced: false,
    updated_at: new Date().toISOString(),
  })
}

export function updateScore(id, data) {
  const clean = {}
  for (const [key, val] of Object.entries(data)) {
    if (val !== undefined) clean[key] = val
  }
  if (Object.keys(clean).length === 0) return Promise.resolve()
  clean.synced = false
  clean.updated_at = new Date().toISOString()
  return db.scores.update(Number(id), clean)
}

export function deleteScore(id) {
  return db.transaction('rw', db.scores, db.deletedIds, async () => {
    const score = await db.scores.get(Number(id))
    if (!score) return
    // If already synced, record deletion for sync server
    if (score.synced) {
      await db.deletedIds.add({ serverId: Number(id), deleted_at: new Date().toISOString() })
    }
    await db.scores.delete(Number(id))
  })
}
