import {
  AgeBand,
  CategoryParameter,
  Classification,
  Format,
  LegacyAppData,
  MarkCriterion,
  ParticipantType,
  Player,
  Score,
  Session,
  Settings,
  User,
} from '../models/index.js'
import { ensureMarkCriteria } from '../services/scoring.service.js'
import { ensureCategoryRules, ensureTaxonomy } from '../services/taxonomy.service.js'
import { createSeed } from './seed.js'

function withId(doc) {
  if (!doc) return null
  const { _id, __v, ...rest } = doc
  return { id: _id, ...rest }
}

function normalizePlayer(player) {
  return {
    danceStyle: player.danceStyle || player.category,
    age: player.age ?? null,
    email: player.email ?? null,
    phone: player.phone ?? null,
    club: player.club ?? null,
    participantTypeId: player.participantTypeId ?? null,
    formatKey:
      player.formatKey ||
      (player.type === 'group' ? 'group' : player.type === 'couple' ? 'couple' : 'solo'),
    classificationId: player.classificationId ?? null,
    members: player.members || [],
    photo: player.photo ?? null,
    winner: Boolean(player.winner),
    ...player,
    id: player.id || player._id,
  }
}

function toDoc(item) {
  const { id, ...rest } = item
  return { _id: id, ...rest }
}

async function replaceCollection(Model, items) {
  await Model.deleteMany({})
  if (!items.length) return
  await Model.insertMany(items.map(toDoc), { ordered: false })
}

async function loadFromCollections() {
  const [users, players, scores, settingsDoc, sessions, ageBands, participantTypes, formats, classifications, markCriteria, categoryParameters] =
    await Promise.all([
      User.find().lean(),
      Player.find().lean(),
      Score.find().lean(),
      Settings.findById('main').lean(),
      Session.find().lean(),
      AgeBand.find().lean(),
      ParticipantType.find().lean(),
      Format.find().lean(),
      Classification.find().lean(),
      MarkCriterion.find().lean(),
      CategoryParameter.find().lean(),
    ])

  const sessionMap = {}
  for (const session of sessions) {
    sessionMap[session._id] = session.userId
  }

  const state = {
    users: users.map(withId),
    players: players.map((player) => normalizePlayer(withId(player))),
    scores: scores.map(withId),
    settings: settingsDoc
      ? {
          resultsPublished: Boolean(settingsDoc.resultsPublished),
          livePlayerId: settingsDoc.livePlayerId || null,
          categoryDefaultsApplied: Boolean(settingsDoc.categoryDefaultsApplied),
        }
      : { resultsPublished: false, livePlayerId: null, categoryDefaultsApplied: false },
    sessions: sessionMap,
    ageBands: ageBands.map(withId),
    participantTypes: participantTypes.map(withId),
    formats: formats.map(withId),
    classifications: classifications.map(withId),
    markCriteria: markCriteria.map(withId),
    categoryParameters: categoryParameters.map(withId),
  }
  ensureTaxonomy(state)
  const missingCriteria = !state.markCriteria.length
  ensureMarkCriteria(state)
  const rulesChanged = ensureCategoryRules(state)
  if (missingCriteria || rulesChanged) await saveCollections(state)
  return state
}

async function saveCollections(state) {
  const sessionDocs = Object.entries(state.sessions || {}).map(([token, userId]) => ({
    id: token,
    userId,
  }))

  await Promise.all([
    replaceCollection(User, state.users || []),
    replaceCollection(Player, (state.players || []).map(normalizePlayer)),
    replaceCollection(Score, state.scores || []),
    Settings.findByIdAndUpdate(
      'main',
      {
        _id: 'main',
        resultsPublished: Boolean(state.settings?.resultsPublished),
        livePlayerId: state.settings?.livePlayerId || null,
        categoryDefaultsApplied: Boolean(state.settings?.categoryDefaultsApplied),
      },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
    ),
    replaceCollection(Session, sessionDocs),
    replaceCollection(AgeBand, state.ageBands || []),
    replaceCollection(ParticipantType, state.participantTypes || []),
    replaceCollection(Format, state.formats || []),
    replaceCollection(Classification, state.classifications || []),
    replaceCollection(MarkCriterion, state.markCriteria || []),
    replaceCollection(CategoryParameter, state.categoryParameters || []),
  ])
}

async function migrateLegacyIfNeeded() {
  const userCount = await User.countDocuments()
  if (userCount > 0) return false

  const legacy = await LegacyAppData.findById('main').lean()
  if (!legacy) return false

  const state = {
    users: legacy.users || [],
    players: (legacy.players || []).map(normalizePlayer),
    scores: legacy.scores || [],
    settings: legacy.settings || { resultsPublished: false },
    sessions: legacy.sessions || {},
    ageBands: legacy.ageBands || [],
    participantTypes: legacy.participantTypes || [],
    formats: legacy.formats || [],
    classifications: legacy.classifications || [],
  }
  ensureTaxonomy(state)
  ensureMarkCriteria(state)
  await saveCollections(state)
  await LegacyAppData.deleteMany({})
  try {
    await LegacyAppData.collection.drop()
  } catch {
    // collection may already be gone
  }
  console.log('Migrated app_data into separate collections')
  return true
}

export async function createStore() {
  await migrateLegacyIfNeeded()

  let db = await loadFromCollections()
  const empty =
    !db.users.length &&
    !db.players.length &&
    !db.ageBands.length &&
    !db.participantTypes.length &&
    !db.formats.length

  if (empty) {
    db = createSeed()
    ensureTaxonomy(db)
    await saveCollections(db)
    console.log('Seeded separate Mongo collections')
    db = await loadFromCollections()
  }

  return {
    read: () => db,
    async refresh() {
      db = await loadFromCollections()
      return db
    },
    async update(mutator) {
      // Always reload from Mongo first so Compass deletes are not overwritten
      db = await loadFromCollections()
      mutator(db)
      ensureTaxonomy(db)
      ensureMarkCriteria(db)
      ensureCategoryRules(db)
      db = {
        ...db,
        players: (db.players || []).map(normalizePlayer),
        sessions: db.sessions || {},
      }
      await saveCollections(db)
      db = await loadFromCollections()
      return db
    },
    async reset() {
      db = createSeed()
      ensureTaxonomy(db)
      ensureMarkCriteria(db)
      ensureCategoryRules(db)
      await saveCollections(db)
      db = await loadFromCollections()
      return db
    },
  }
}

export function newId(prefix) {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
}
