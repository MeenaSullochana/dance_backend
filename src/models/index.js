import mongoose from 'mongoose'

const base = { versionKey: false, minimize: false }

const UserSchema = new mongoose.Schema(
  {
    _id: { type: String },
    name: String,
    email: { type: String, index: true },
    phone: { type: String, default: null },
    club: { type: String, default: null },
    passwordHash: String,
    role: String,
    active: { type: Boolean, default: true },
    approved: { type: Boolean, default: true },
    registeredAt: String,
    panelRole: { type: String, default: '' },
    photo: { type: String, default: null },
    imageKey: { type: String, default: null },
    sortOrder: { type: Number, default: 0 },
    showOnPanel: { type: Boolean, default: false },
  },
  { ...base, collection: 'users' },
)

const PlayerSchema = new mongoose.Schema(
  {
    _id: { type: String },
    name: String,
    type: String,
    category: String,
    danceStyle: String,
    members: { type: [mongoose.Schema.Types.Mixed], default: [] },
    registrationStatus: { type: String, default: 'registered' },
    feeStatus: { type: String, default: 'pending' },
    pendriveStatus: { type: String, default: null },
    arrived: { type: Boolean, default: false },
    arrivalNo: { type: String, default: null },
    registeredId: { type: String, default: null },
    photo: { type: String, default: null },
    chestNo: Number,
    winner: { type: Boolean, default: false },
    age: { type: Number, default: null },
    email: { type: String, default: null },
    phone: { type: String, default: null },
    club: { type: String, default: null },
    participantTypeId: { type: String, default: null },
    formatKey: String,
    classificationId: { type: String, default: null },
    peopleCount: Number,
    paymentUrl: String,
    source: String,
  },
  { ...base, collection: 'players' },
)

const ScoreSchema = new mongoose.Schema(
  {
    _id: { type: String },
    playerId: { type: String, index: true },
    judgeId: { type: String, index: true },
    audience: { type: String, default: 'judge' },
    criteria: { type: mongoose.Schema.Types.Mixed, default: {} },
    total: Number,
    comment: { type: String, default: '' },
    createdAt: String,
  },
  { ...base, collection: 'scores' },
)

const SettingsSchema = new mongoose.Schema(
  {
    _id: { type: String, default: 'main' },
    resultsPublished: { type: Boolean, default: false },
    livePlayerId: { type: String, default: null },
    votingOpen: { type: Boolean, default: false },
    categoryDefaultsApplied: { type: Boolean, default: false },
    podium: { type: mongoose.Schema.Types.Mixed, default: null },
    publicMaxMarks: { type: Number, default: 10 },
    sitePeopleSeeded: { type: Boolean, default: false },
    judgeProfilesSeeded: { type: Boolean, default: false },
  },
  { ...base, collection: 'settings' },
)

const MarkCriterionSchema = new mongoose.Schema(
  {
    _id: { type: String },
    name: String,
    key: { type: String, index: true },
    maxMarks: { type: Number, default: 10 },
    active: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { ...base, collection: 'mark_criteria' },
)

const SessionSchema = new mongoose.Schema(
  {
    _id: { type: String },
    userId: { type: String, index: true },
  },
  { ...base, collection: 'sessions' },
)

const AgeBandSchema = new mongoose.Schema(
  {
    _id: { type: String },
    name: String,
    minAge: Number,
    maxAge: Number,
    active: { type: Boolean, default: true },
    formatKeys: { type: [String], default: [] },
  },
  { ...base, collection: 'age_bands' },
)

const ParticipantTypeSchema = new mongoose.Schema(
  {
    _id: { type: String },
    name: String,
    key: { type: String, index: true },
    active: { type: Boolean, default: true },
    formatKeys: { type: [String], default: [] },
  },
  { ...base, collection: 'participant_types' },
)

const FormatSchema = new mongoose.Schema(
  {
    _id: { type: String },
    name: String,
    key: { type: String, index: true },
    active: { type: Boolean, default: true },
  },
  { ...base, collection: 'formats' },
)

const ClassificationSchema = new mongoose.Schema(
  {
    _id: { type: String },
    name: String,
    ageBandId: { type: String, index: true },
    participantTypeId: { type: String, index: true },
    formatId: { type: String, index: true },
    active: { type: Boolean, default: true },
    price: { type: Number, default: 0 },
    prefix: { type: String, default: '' },
    kind: { type: String, default: '' },
    parentId: { type: String, default: null, index: true },
    parametersSeeded: { type: Boolean, default: false },
  },
  { ...base, collection: 'classifications' },
)

const PanelJudgeSchema = new mongoose.Schema(
  {
    _id: { type: String },
    name: String,
    role: { type: String, default: '' },
    photo: { type: String, default: null },
    imageKey: { type: String, default: null },
    sortOrder: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { ...base, collection: 'panel_judges' },
)

const ClubLeaderSchema = new mongoose.Schema(
  {
    _id: { type: String },
    name: String,
    title: { type: String, default: '' },
    role: { type: String, default: '' },
    lines: { type: [String], default: [] },
    photo: { type: String, default: null },
    imageKey: { type: String, default: null },
    icon: { type: String, default: 'users' },
    sortOrder: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { ...base, collection: 'club_leaders' },
)

const CategoryParameterSchema = new mongoose.Schema(
  {
    _id: { type: String },
    classificationId: { type: String, index: true },
    name: String,
    key: String,
    maxMarks: { type: Number, default: 10 },
    sortOrder: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { ...base, collection: 'category_parameters' },
)

// Legacy single-document store (used only to migrate once)
const LegacyAppDataSchema = new mongoose.Schema(
  {
    _id: { type: String },
    users: Array,
    players: Array,
    scores: Array,
    settings: Object,
    sessions: Object,
    ageBands: Array,
    participantTypes: Array,
    formats: Array,
    classifications: Array,
  },
  { ...base, collection: 'app_data' },
)

export const User = mongoose.models.User || mongoose.model('User', UserSchema)
export const Player = mongoose.models.Player || mongoose.model('Player', PlayerSchema)
export const Score = mongoose.models.Score || mongoose.model('Score', ScoreSchema)
export const Settings = mongoose.models.Settings || mongoose.model('Settings', SettingsSchema)
export const MarkCriterion =
  mongoose.models.MarkCriterion || mongoose.model('MarkCriterion', MarkCriterionSchema)
export const Session = mongoose.models.Session || mongoose.model('Session', SessionSchema)
export const AgeBand = mongoose.models.AgeBand || mongoose.model('AgeBand', AgeBandSchema)
export const ParticipantType =
  mongoose.models.ParticipantType || mongoose.model('ParticipantType', ParticipantTypeSchema)
export const Format = mongoose.models.Format || mongoose.model('Format', FormatSchema)
export const Classification =
  mongoose.models.Classification || mongoose.model('Classification', ClassificationSchema)
export const CategoryParameter =
  mongoose.models.CategoryParameter || mongoose.model('CategoryParameter', CategoryParameterSchema)
export const PanelJudge = mongoose.models.PanelJudge || mongoose.model('PanelJudge', PanelJudgeSchema)
export const ClubLeader = mongoose.models.ClubLeader || mongoose.model('ClubLeader', ClubLeaderSchema)
export const LegacyAppData =
  mongoose.models.LegacyAppData || mongoose.model('LegacyAppData', LegacyAppDataSchema)
