import { hashPassword } from '../utils/passwords.js'
import { defaultMarkCriteria } from '../services/scoring.service.js'
import { defaultSitePeople } from '../services/siteContent.service.js'
import { defaultTaxonomy } from '../services/taxonomy.service.js'

const user = (id, name, email, password, role) => ({
  id,
  name,
  email,
  passwordHash: hashPassword(password),
  role,
  active: true,
  approved: true,
})

const player = (id, name, type, category, chestNo, members = [], extra = {}) => ({
  id,
  name,
  type,
  category,
  danceStyle: category,
  members,
  photo: null,
  chestNo,
  winner: false,
  age: null,
  email: null,
  phone: null,
  club: null,
  participantTypeId: null,
  formatKey: type === 'group' ? 'group' : type === 'couple' ? 'couple' : 'solo',
  classificationId: null,
  ...extra,
})

const score = (id, playerId, judgeId, technique, expression, timing, costume, comment) => ({
  id,
  playerId,
  judgeId,
  criteria: { technique, expression, timing, costume },
  total: technique + expression + timing + costume,
  comment,
  createdAt: '2026-10-12T10:00:00.000Z',
})

export function createSeed() {
  return {
    users: [
      user('u1', 'Priya Admin', 'admin@dance.com', 'admin123', 'admin'),
      user('j1', 'Rahul Mehra', 'judge1@dance.com', 'judge123', 'judge'),
      user('j2', 'Anita Desai', 'judge2@dance.com', 'judge123', 'judge'),
      user('j3', 'Vikram Rao', 'judge3@dance.com', 'judge123', 'judge'),
      user('m1', 'Neha Verma', 'user@dance.com', 'user123', 'user'),
    ],
    players: [
      player('p1', 'Aarav Sharma', 'single', 'Hip-Hop Dance', 101),
      player('p2', 'Diya Patel', 'single', 'Classical Dance', 102),
      player('p3', 'Kabir Singh', 'single', 'Freestyle Dance', 103),
      player('p4', 'Meera Nair', 'single', 'Western Dance', 104),
      player('p5', 'Rohan Gupta', 'single', 'Folk Dance', 105),
      player('p6', 'Sara Khan', 'single', 'Hip-Hop Dance', 106),
      player('g1', 'Street Kings', 'group', 'Hip-Hop Dance', 201, ['Arjun', 'Neel', 'Dev', 'Ishaan']),
      player('g2', 'Natya Sangam', 'group', 'Classical Dance', 202, ['Lakshmi', 'Kavya', 'Pooja']),
      player('g3', 'Bolly Beats', 'group', 'Folk Dance', 203, ['Riya', 'Aman', 'Tara', 'Kunal', 'Zoya']),
      player('g4', 'Flow Motion', 'group', 'Western Dance', 204, ['Nisha', 'Yash', 'Ira']),
    ],
    scores: [
      score('s1', 'p1', 'j1', 9, 8, 9, 8, 'Sharp moves, great energy!'),
      score('s2', 'p1', 'j2', 8, 9, 8, 9, 'Loved the expressions.'),
      score('s3', 'p1', 'j3', 9, 9, 8, 8, 'Excellent control.'),
      score('s4', 'p2', 'j1', 7, 8, 7, 9, 'Graceful performance.'),
      score('s5', 'p2', 'j2', 8, 8, 7, 8, ''),
      score('s6', 'p3', 'j1', 5, 6, 5, 6, 'Needs more practice on timing.'),
      score('s7', 'p3', 'j2', 6, 5, 5, 5, ''),
      score('s8', 'p3', 'j3', 5, 6, 6, 5, 'Good attempt.'),
      score('s9', 'g1', 'j1', 9, 9, 10, 9, 'Perfect sync!'),
      score('s10', 'g1', 'j2', 9, 8, 9, 9, ''),
      score('s11', 'g1', 'j3', 10, 9, 9, 8, 'Crowd favourite.'),
      score('s12', 'g3', 'j1', 7, 8, 8, 9, 'Colourful and fun.'),
    ],
    settings: { resultsPublished: false, livePlayerId: null, votingOpen: false, sitePeopleSeeded: true, judgeProfilesSeeded: false },
    sessions: {},
    markCriteria: defaultMarkCriteria(),
    ...defaultTaxonomy(),
    ...defaultSitePeople(),
  }
}
