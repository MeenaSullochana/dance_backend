function presentUser(user, viewer) {
  const showPrivate = viewer && (viewer.role === 'admin' || viewer.id === user.id)
  const view = {
    id: user.id,
    name: user.name,
    role: user.role,
    active: user.active !== false,
    approved: user.approved !== false,
  }
  if (showPrivate) {
    view.email = user.email || null
    view.phone = user.phone || null
    view.club = user.club || null
    if (user.registeredAt) view.registeredAt = user.registeredAt
  }
  return view
}

export function present(db, viewer) {
  return {
    user: viewer ? presentUser(viewer, viewer) : null,
    users: db.users.map((user) => presentUser(user, viewer)),
    players: db.players,
    scores: db.scores,
    settings: db.settings,
    ageBands: db.ageBands || [],
    participantTypes: db.participantTypes || [],
    formats: db.formats || [],
    classifications: db.classifications || [],
    markCriteria: db.markCriteria || [],
    categoryParameters: db.categoryParameters || [],
  }
}
