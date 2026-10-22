import { criteriaForClassification, maxTotalOf, PASS_PERCENT, scoringMetaFrom, splitScores } from './scoring.service.js'
import { categoryPrice } from './taxonomy.service.js'

export function scoringMeta(db, classificationId) {
  return scoringMetaFrom(db || { markCriteria: [], settings: {} }, classificationId)
}

function playerStats(db, player) {
  const { judgeScores, publicScores, judgeAverage, publicAverage } = splitScores(db, player.id)
  const activeJudges = db.users.filter((user) => user.role === 'judge' && user.active !== false)
  const maxTotal = maxTotalOf(criteriaForClassification(db, player.classificationId))
  const percent = (judgeAverage / maxTotal) * 100
  const allJudged = activeJudges.length > 0 && activeJudges.every((judge) => judgeScores.some((score) => score.judgeId === judge.id))
  let status = 'pending'
  if (player.winner) status = 'winner'
  else if (allJudged) status = percent >= PASS_PERCENT ? 'qualified' : 'rejected'
  else if (judgeScores.length) status = 'judged'
  return {
    average: Number(judgeAverage.toFixed(1)),
    percent: Number(percent.toFixed(0)),
    judgeCount: judgeScores.length,
    publicAverage: Number(publicAverage.toFixed(1)),
    publicCount: publicScores.length,
    status,
  }
}

export function profile(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email || null,
    phone: user.phone || null,
    role: user.role,
    active: user.active !== false,
    approved: user.approved !== false,
  }
}

function lookupName(list, id) {
  return list.find((item) => item.id === id)?.name || null
}

function liveCard(db, showScore) {
  const player = db.players.find((item) => item.id === db.settings?.livePlayerId)
  return player ? playerCard(db, player, { showScore }) : null
}

export function playerCard(db, player, { showScore = false, myScore = null } = {}) {
  const stats = playerStats(db, player)
  return {
    id: player.id,
    name: player.name,
    chestNo: player.chestNo,
    type: player.type,
    format: player.formatKey || (player.type === 'group' ? 'group' : player.type === 'couple' ? 'couple' : 'solo'),
    category: player.category,
    danceStyle: player.danceStyle || player.category,
    members: player.members || [],
    age: player.age ?? null,
    club: player.club || null,
    participantType: lookupName(db.participantTypes || [], player.participantTypeId),
    classification: lookupName(db.classifications || [], player.classificationId),
    price: categoryPrice(db, player.classificationId),
    parameters: criteriaForClassification(db, player.classificationId).map((item) => ({
      id: item.id,
      key: item.key,
      name: item.name,
      maxMarks: Number(item.maxMarks),
    })),
    photo: player.photo || null,
    winner: showScore ? Boolean(player.winner) : false,
    status: showScore ? stats.status : 'hidden',
    score: showScore
      ? {
          average: stats.average,
          percent: stats.percent,
          judgeCount: stats.judgeCount,
          publicAverage: stats.publicAverage,
          publicCount: stats.publicCount,
          maxTotal: maxTotalOf(criteriaForClassification(db, player.classificationId)),
        }
      : null,
    myScore,
  }
}

export function judgeHome(db, judge, { type = 'single', filter = 'all' } = {}) {
  const mine = (playerId) => db.scores.find((score) => score.playerId === playerId && score.judgeId === judge.id) || null
  const ofType = db.players.filter((player) => player.type === type)
  const done = ofType.filter((player) => mine(player.id)).length
  const players = ofType
    .filter((player) => {
      const scored = Boolean(mine(player.id))
      if (filter === 'todo') return !scored
      if (filter === 'done') return scored
      return true
    })
    .map((player) => {
      const score = mine(player.id)
      return playerCard(db, player, {
        showScore: false,
        myScore: score
          ? { id: score.id, criteria: score.criteria, total: score.total, comment: score.comment || '', maxTotal: maxTotalOf(criteriaForClassification(db, player.classificationId)) }
          : null,
      })
    })

  return {
    judge: profile(judge),
    type,
    filter,
    progress: { done, total: ofType.length },
    ...scoringMeta(db),
    livePlayer: liveCard(db, false),
    players,
  }
}

export function judgePlayerDetail(db, judge, player) {
  const score = db.scores.find((item) => item.playerId === player.id && item.judgeId === judge.id) || null
  return {
    ...playerCard(db, player, {
      showScore: false,
      myScore: score
        ? { id: score.id, criteria: score.criteria, total: score.total, comment: score.comment || '', maxTotal: maxTotalOf(criteriaForClassification(db, player.classificationId)) }
        : null,
    }),
    ...scoringMeta(db, player.classificationId),
  }
}

export function userHome(db, user, { type = 'single' } = {}) {
  const published = Boolean(db.settings?.resultsPublished)
  const ofType = db.players.filter((player) => player.type === type)
  const ranked = published
    ? [...ofType].sort((a, b) => playerStats(db, b).average - playerStats(db, a).average)
    : ofType
  const winners = published ? db.players.filter((player) => player.winner) : []
  const categories = (db.classifications || []).filter((item) => item.kind === 'category' && item.active !== false)

  return {
    user: profile(user),
    resultsPublished: published,
    type,
    ...scoringMeta(db),
    livePlayer: liveCard(db, published),
    winners: winners.map((player) => playerCard(db, player, { showScore: true })),
    podium: published ? db.settings?.podium || null : null,
    winnersByCategory: categories.map((item) => {
      const places = published
        ? (db.settings?.podium?.categories || []).find((row) => row.classificationId === item.id)?.places || []
        : []
      const winner = published ? db.players.find((player) => player.winner && player.classificationId === item.id) : null
      return {
        id: item.id,
        name: item.name,
        price: item.price ?? null,
        winner: winner ? playerCard(db, winner, { showScore: true }) : null,
        places: places.flatMap((place) => {
          const person = db.players.find((player) => player.id === place.playerId)
          if (!person) return []
          return [{ place: place.place, average: place.average, player: playerCard(db, person, { showScore: true }) }]
        }),
      }
    }),
    players: ranked.map((player) => playerCard(db, player, { showScore: published })),
  }
}

export function userPlayerDetail(db, player) {
  const published = Boolean(db.settings?.resultsPublished)
  return {
    resultsPublished: published,
    player: playerCard(db, player, { showScore: published }),
  }
}
