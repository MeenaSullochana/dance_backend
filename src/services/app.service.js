import { competingCategories } from './taxonomy.service.js'
import { AUDIENCE_ONCE, criteriaForClassification, maxTotalOf, PASS_PERCENT, publicMaxMarks, scoringMetaFrom, splitScores } from './scoring.service.js'
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
    club: user.club || null,
    role: user.role,
    active: user.active !== false,
    approved: user.approved !== false,
  }
}

function lookupName(list, id) {
  return list.find((item) => item.id === id)?.name || null
}

function voteState(db, player, voter, audience = 'judge') {
  const live = db.settings?.livePlayerId === player.id
  const votingOpen = live && Boolean(db.settings?.votingOpen)
  const alreadyVoted = Boolean(voter && audience === 'public' && db.scores.some((score) => score.playerId === player.id && score.judgeId === voter.id))
  return {
    live,
    performing: live,
    votingOpen,
    alreadyVoted,
    canVote: audience === 'public' ? votingOpen && !alreadyVoted : votingOpen,
    voteOnceMessage: alreadyVoted ? AUDIENCE_ONCE : null,
  }
}

function liveCard(db, showScore, audience = 'judge', voter = null) {
  const player = db.players.find((item) => item.id === db.settings?.livePlayerId)
  return player ? playerCard(db, player, { showScore, audience, voter }) : null
}

export function playerCard(db, player, { showScore = false, myScore = null, audience = 'judge', voter = null } = {}) {
  const stats = playerStats(db, player)
  const vote = voteState(db, player, voter, audience)
  return {
    id: player.id,
    name: player.name,
    chestNo: player.chestNo,
    registeredId: player.registeredId || null,
    arrivalNo: player.arrivalNo || null,
    arrived: Boolean(player.arrived),
    ...vote,
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
    parameters: audience === 'public'
      ? [{ id: 'overall', key: 'overall', name: 'Overall', maxMarks: publicMaxMarks(db) }]
      : criteriaForClassification(db, player.classificationId).map((item) => ({
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
          publicMaxMarks: publicMaxMarks(db),
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
        audience: 'judge',
        voter: judge,
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
    livePlayer: liveCard(db, false, 'judge', judge),
    players,
  }
}

export function judgePlayerDetail(db, judge, player) {
  const score = db.scores.find((item) => item.playerId === player.id && item.judgeId === judge.id) || null
  return {
    ...playerCard(db, player, {
      showScore: false,
      audience: 'judge',
      voter: judge,
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
  const categories = competingCategories(db.classifications)
  const mine = (playerId) => db.scores.find((score) => score.playerId === playerId && score.judgeId === user.id) || null

  return {
    user: profile(user),
    resultsPublished: published,
    type,
    ...scoringMeta(db),
    publicMaxMarks: publicMaxMarks(db),
    criteria: [{ id: 'overall', key: 'overall', name: 'Overall', label: 'Overall', maxMarks: publicMaxMarks(db) }],
    livePlayer: liveCard(db, published, 'public', user),
    winners: winners.map((player) => playerCard(db, player, { showScore: true, audience: 'public', voter: user })),
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
        winner: winner ? playerCard(db, winner, { showScore: true, audience: 'public' }) : null,
        places: places.flatMap((place) => {
          const person = db.players.find((player) => player.id === place.playerId)
          if (!person) return []
          return [{ place: place.place, average: place.average, player: playerCard(db, person, { showScore: true, audience: 'public' }) }]
        }),
      }
    }),
    players: ranked.map((player) => {
      const score = mine(player.id)
      return playerCard(db, player, {
        showScore: published,
        audience: 'public',
        voter: user,
        myScore: score
          ? { id: score.id, criteria: score.criteria, total: score.total, comment: score.comment || '', maxTotal: publicMaxMarks(db) }
          : null,
      })
    }),
  }
}

export function userPlayerDetail(db, player, user = null) {
  const published = Boolean(db.settings?.resultsPublished)
  const score = user
    ? db.scores.find((item) => item.playerId === player.id && item.judgeId === user.id) || null
    : null
  return {
    resultsPublished: published,
    player: playerCard(db, player, {
      showScore: published,
      audience: 'public',
      voter: user,
      myScore: score
        ? { id: score.id, criteria: score.criteria, total: score.total, comment: score.comment || '', maxTotal: publicMaxMarks(db) }
        : null,
    }),
    publicMaxMarks: publicMaxMarks(db),
    voteOnceMessage: score ? AUDIENCE_ONCE : null,
  }
}
