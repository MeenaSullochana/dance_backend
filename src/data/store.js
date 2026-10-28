import {
  AgeBand,
  CategoryParameter,
  Classification,
  ClubLeader,
  Format,
  LegacyAppData,
  MarkCriterion,
  PanelJudge,
  ParticipantType,
  Player,
  Score,
  Session,
  Settings,
  User,
} from '../models/index.js'
import { ensureArrivalIds, ensureLiveEligibility, ensureRegisteredIds } from '../services/player.service.js'
import { ensureMarkCriteria } from '../services/scoring.service.js'
import { ensureSitePeople } from '../services/siteContent.service.js'
import { ensureCategoryRules, ensureTaxonomy } from '../services/taxonomy.service.js'
import { createSeed } from './seed.js'

function withId(doc) {
  if (!doc) return null
  const { _id, __v, ...rest } = doc
  return { id: _id, ...rest }
}

function normalizePlayer(player) {
  const normalized = {
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
    members: (player.members || []).map((member) =>
      typeof member === 'string' ? { name: member, age: null } : { name: member?.name || '', age: member?.age ?? null },
    ),
    registrationStatus: player.registrationStatus || 'registered',
    feeStatus: player.feeStatus || 'pending',
    pendriveStatus: player.pendriveStatus || null,
    arrived: Boolean(player.arrived),
    arrivalNo: player.arrivalNo || null,
    registeredId: player.registeredId || null,
    photo: player.photo ?? null,
    winner: Boolean(player.winner),
    ...player,
    id: player.id || player._id,
  }
  const imported = normalized.source === 'google-form' || normalized.source === 'excel'
  if (imported && (!normalized.feeStatus || normalized.feeStatus === 'pending')) {
    normalized.feeStatus = 'received'
  }
  if (!['received', 'not_received', 'doubt'].includes(normalized.pendriveStatus)) {
    normalized.pendriveStatus = null
  }
  return normalized
}

function toDoc(item) {
  const { id, ...rest } = item
  return { _id: id, ...rest }
}

async function replaceCollection(Model, items) {
  const docs = (items || []).map(toDoc).filter((doc) => doc._id)
  if (!docs.length) {
    await Model.deleteMany({})
    return
  }
  await Model.bulkWrite(
    docs.map((doc) => ({
      replaceOne: { filter: { _id: doc._id }, replacement: doc, upsert: true },
    })),
    { ordered: false },
  )
  await Model.deleteMany({ _id: { $nin: docs.map((doc) => doc._id) } })
}

async function loadFromCollections() {
  const [
    users,
    players,
    scores,
    settingsDoc,
    sessions,
    ageBands,
    participantTypes,
    formats,
    classifications,
    markCriteria,
    categoryParameters,
    panelJudges,
    clubLeaders,
  ] = await Promise.all([
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
    PanelJudge.find().lean(),
    ClubLeader.find().lean(),
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
          votingOpen: Boolean(settingsDoc.votingOpen),
          categoryDefaultsApplied: Boolean(settingsDoc.categoryDefaultsApplied),
          podium: settingsDoc.podium || null,
          publicMaxMarks: Number(settingsDoc.publicMaxMarks) || 10,
          sitePeopleSeeded: Boolean(settingsDoc.sitePeopleSeeded),
          judgeProfilesSeeded: Boolean(settingsDoc.judgeProfilesSeeded),
        }
      : { resultsPublished: false, livePlayerId: null, votingOpen: false, categoryDefaultsApplied: false, podium: null, publicMaxMarks: 10, sitePeopleSeeded: false, judgeProfilesSeeded: false },
    sessions: sessionMap,
    ageBands: ageBands.map(withId),
    participantTypes: participantTypes.map(withId),
    formats: formats.map(withId),
    classifications: classifications.map(withId),
    markCriteria: markCriteria.map(withId),
    categoryParameters: categoryParameters.map(withId),
    panelJudges: panelJudges.map(withId),
    clubLeaders: clubLeaders.map(withId),
  }
  ensureTaxonomy(state)
  const missingCriteria = !state.markCriteria.length
  ensureMarkCriteria(state)
  const rulesChanged = ensureCategoryRules(state)
  const peopleChanged = ensureSitePeople(state)
  const idsChanged = ensureRegisteredIds(state)
  const arrivalChanged = ensureArrivalIds(state)
  const liveChanged = ensureLiveEligibility(state)
  if (missingCriteria || rulesChanged || peopleChanged || idsChanged || arrivalChanged || liveChanged) await saveCollections(state)
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
        votingOpen: Boolean(state.settings?.votingOpen) && Boolean(state.settings?.livePlayerId),
        categoryDefaultsApplied: Boolean(state.settings?.categoryDefaultsApplied),
        podium: state.settings?.podium || null,
        publicMaxMarks: Number(state.settings?.publicMaxMarks) || 10,
        sitePeopleSeeded: Boolean(state.settings?.sitePeopleSeeded),
        judgeProfilesSeeded: Boolean(state.settings?.judgeProfilesSeeded),
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
    replaceCollection(PanelJudge, state.panelJudges || []),
    replaceCollection(ClubLeader, state.clubLeaders || []),
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
      ensureSitePeople(db)
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
