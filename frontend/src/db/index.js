import Dexie from 'dexie'

export const db = new Dexie('ScoreDB')

db.version(1).stores({
  scores: '++id, name, author, source, type, synced, updated_at',
  deletedIds: '++id, serverId, deleted_at',
})
