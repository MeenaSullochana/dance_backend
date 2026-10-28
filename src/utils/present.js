function presentUser(user, viewer) {
  const showPrivate = viewer && (viewer.role === 'admin' || viewer.id === user.id)
  const view = {
    id: user.id,
    name: user.name,
    role: user.role,
    active: user.active !== false,
    approved: user.approved !== false,
  }
  if (user.role === 'judge') {
    view.panelRole = user.panelRole || ''
    view.photo = user.photo || null
    view.imageKey = user.imageKey || null
    view.sortOrder = Number(user.sortOrder) || 0
    view.showOnPanel = Boolean(user.showOnPanel)
  }
  if (showPrivate) {
    view.email = user.email || null
    view.phone = user.phone || null
    view.club = user.club || null
    if (user.registeredAt) view.registeredAt = user.registeredAt
  }
  return view
}

function presentPlayer(player, viewer) {
  const staff = viewer && (viewer.role === 'admin' || viewer.role === 'judge')
  if (staff) return player
  return {
    id: player.id,
    name: player.name,
    type: player.type,
    formatKey: player.formatKey || (player.type === 'group' ? 'group' : player.type === 'couple' ? 'couple' : 'solo'),
    category: player.category,
    danceStyle: player.danceStyle || player.category,
    registeredId: player.registeredId || null,
    arrivalNo: player.arrivalNo || null,
    chestNo: player.chestNo,
    photo: player.photo || null,
    classificationId: player.classificationId || null,
    winner: Boolean(player.winner),
  }
}

export function present(db, viewer) {
  return {
    user: viewer ? presentUser(viewer, viewer) : null,
    users: db.users.map((user) => presentUser(user, viewer)),
    players: (db.players || []).map((player) => presentPlayer(player, viewer)),
    scores: db.scores,
    settings: db.settings,
    ageBands: db.ageBands || [],
    participantTypes: db.participantTypes || [],
    formats: db.formats || [],
    classifications: db.classifications || [],
    markCriteria: db.markCriteria || [],
    categoryParameters: db.categoryParameters || [],
    panelJudges: db.panelJudges || [],
    clubLeaders: db.clubLeaders || [],
  }
}
