const XLSX = require('xlsx')
const path = require('path')

const headers = [
  'Timestamp',
  'Email Address',
  'Participant Name',
  'Contact Number',
  'Rotary Club Name',
  'Participant Type',
  'Category of Dance',
  'Number of People Dancing',
  'Names of Other Participants',
  'Dance Style / Genre',
  'Age',
  'Payment screenshot',
]

const FORMAT = {
  couple: 'Couple Dance',
  group: 'Group Dance',
  single: 'Solo Dance',
  solo: 'Solo Dance',
}

const AGE_FOR = {
  'Tiny Tots': 8,
  Kids: 12,
  'Young Adults': 18,
  Adults: 40,
  Junior: 10,
  Senior: 32,
}

const TYPE_FOR_CATEGORY = {
  Ann: 'Ann',
  Mixed: 'Mixed',
  Annette: 'Annette',
  Rotaractor: 'Rotaractor',
  DPL: 'DPL (Inter-Club Group)',
}

const extras = {
  'Akshay & Lakshmi|couple': { email: 'akshay4rotary@gmail.com', phone: '9900433331', club: 'Rotary Club Of Madras Connemara', age: 44, type: 'Rotarian', members: 'Lakshmipriya' },
  'Reshma, Revathy, Shyama, Sindhu, Saranya, Annam, Priya, Seetha lakshmi|group': { email: 'shyamakalyani175@gmail.com', phone: '9003122164', club: 'RC Aarch City Madras', type: 'Ann', members: 'Reshma, Revathy, Shyama, Sindhu, Saranya, Annam, Priya, Seetha lakshmi' },
  'Mallika|single': { email: 'mallikasethuraman07@gmail.com', phone: '8248720764', club: 'Aarch city', age: 19, type: 'Annette' },
  'Anila K|group': { email: 'anilapril11@gmail.com', phone: '9566178166', club: 'Chennai Maithri', type: 'Mixed', members: 'Rtn Vidyaa Hari Iyer, Rtn Anila, Rtn Rukmini, Rtn Sweta' },
  'Rtn Dr Vidyaa Hari Iyer|single': { email: 'drvidyaasdc@gmail.com', phone: '9840176088', club: 'Chennai Maithri', age: 54, type: 'Rotarian' },
  'Devi Aathira & Team|couple': { email: 'saranyalifeway@gmail.com', phone: '8939040099', club: 'Aarch city Madras', age: 5, type: 'Annette', members: 'Saranya Sathish' },
  'Sudha Bala|couple': { email: 'sudhabalaj@gmail.com', phone: '9840826583', club: 'RC Alandur', age: 43, type: 'Rotarian', members: 'Rtn. Michael Vimalanathan' },
  'V Niranchana|single': { email: 'niranraman@gmail.com', phone: '9600064726', club: 'RC Royapettah', age: 49, type: 'Ann' },
  'Darshika Hemanath|single': { email: 'hemanathradhika@gmail.com', phone: '8754062011', club: 'RCCV Velachery', age: 13, type: 'Annette' },
  'Aadhvik S|single': { email: 'sathishk4u@gmail.com', phone: '9840898704', club: 'Agaram', age: 11, type: 'Ann' },
  'Rithvik S|single': { email: 'sathishk4u@gmail.com', phone: '9840898704', club: 'Agaram', age: 11, type: 'Ann' },
  'Aadhvik S Rithvik S|couple': { email: 'sathishk4u@gmail.com', phone: '9840898704', club: 'AGARAM', age: 11, type: 'Ann', members: 'Aadhvik, Rithvik' },
  'Rtn Dr Vidyaa Hari Iyer|couple': { email: 'drvidyaasdc@gmail.com', phone: '9840176088', club: 'Chennai Maithri', age: 54, type: 'Rotarian', members: 'Rtn Sweta' },
  'Priya Prabhakar|single': { email: 'drpriyaprabhakar@gmail.com', phone: '9840875275', club: 'RC Chennai Sunrise', age: 50, type: 'Rotarian' },
  'J. Aaradhya|single': { email: 'magnetron_99@hotmail.com', phone: '9841573130', club: 'Chennai Golden Galaxy', type: 'Annette' },
  'Shyamili Rajan|single': { email: 'shyamili7494@gmail.com', phone: '8939904999', club: 'Rotary Neidhal', age: 32, type: 'Ann' },
  'Ravinarayanan K R|single': { email: 'keelveedhi.ravi@gmail.com', phone: '7604898658', club: 'Chennai Velachery', age: 68, type: 'Rotarian' },
  'K Anila|couple': { email: 'anilapril11@gmail.com', phone: '9566178166', club: 'Chennai Maithri', age: 11, type: 'Rotarian', members: 'S Irene' },
  'Akshaya Mahathy Maanasa Rakshith Roshini Nanditha|group': { email: 'shyamakalyani175@gmail.com', phone: '9003122164', club: 'RC Aarch City Madras', type: 'Annette', members: 'Akshaya, Mahathy, Maanasa, Rakshith, Roshini, Nanditha' },
  'Shruti|couple': { email: 'shrutikrish7820@gmail.com', phone: '9840047595', club: 'RCC Radiance', age: 25, type: 'Annette', members: 'Arjun' },
  'Sudha Bala|group': { email: 'sudhabalaj@gmail.com', phone: '9840826583', club: 'RC Alandur', type: 'DPL (Inter-Club Group)', members: 'Team DPL' },
  'Eswarirajapriya J|group': { email: 'eswari@example.com', phone: '9000000229', club: 'Chennai', type: 'Mixed', members: 'Eswari, Priya, Team' },
  'Uma Maheshwari & Sanjana|couple': { email: 'uma.sanjana@example.com', phone: '9000000230', club: 'Chennai', type: 'Ann', members: 'Sanjana' },
  'avanthika steffi anamika sandra|couple': { email: 'avanthika@example.com', phone: '9000000231', club: 'Chennai', age: 10, type: 'Annette', members: 'Steffi' },
  'Sanjana|single': { email: 'sanjana@example.com', phone: '9000000232', club: 'Chennai', type: 'Annette' },
  'Uma|single': { email: 'uma@example.com', phone: '9000000233', club: 'Chennai', type: 'Ann' },
  'Darshika Hemanath|couple': { email: 'hemanathradhika@gmail.com', phone: '8754062011', club: 'RCCV Velachery', age: 13, type: 'Annette', members: 'Partner' },
  'Ponezhil.k|single': { email: 'ponezhil@example.com', phone: '9000000235', club: 'Chennai', type: 'Annette' },
  'Joshicca Jaikumar|single': { email: 'amudhanishan@gmail.com', phone: '9787865548', club: 'RCMCC', type: 'Annette' },
  'JUANNA & JOSHICCA|couple': { email: 'rotarianamudha@gmail.com', phone: '9884340175', club: 'RCMCC', type: 'Annette', members: 'JUANNA .N, JOSHICCA JAIKUMAR' },
  'Pushpavathi|couple': { email: 'advocatepushpavathi@gmail.com', phone: '9677282536', club: 'Chennai Coral', age: 47, type: 'Rotarian', members: 'Monicaa' },
  'Prabhu Shankar|single': { email: 'shanprabhu2001@yahoo.co.in', phone: '9884772661', club: 'Chennai Korattur Club', age: 50, type: 'Rotarian' },
  'KALAIMAGAL V ALIAS SHYAMALA|couple': { email: 'Sivashyam5613@gmail.com', phone: '9500050696', club: 'Rotary E-Club of Chennai', age: 41, type: 'Ann', members: 'SHRAVANTHIKA' },
  'Saanvi Vijayaraghavan|single': { email: 'sunevijay@gmail.com', phone: '9841426619', club: 'Rotary club madras downtown', age: 14, type: 'Annette' },
  'Jayachithra|single': { email: 'prajaijaisri@gmail.com', phone: '8939065421', club: 'RC Nanganallur', age: 53, type: 'Annette' },
  'Vedanth Narayanan|single': { email: 'ssathiad@gmail.com', phone: '9841077667', club: 'Rc Aarch city', age: 13, type: 'Annette' },
  'A.L.Agaran|single': { email: 'p.arularasi@gmail.com', phone: '9790800097', club: 'Rc madras Connemara', age: 4, type: 'Annette' },
  'S.A.Vidhyuth|single': { email: 'sathishk4u@gmail.com', phone: '9600151125', club: 'AGARAM', age: 11, type: 'Annette' },
  'S Yazhini|single': { email: 'dhanalakshmisuryaprakash7@gmail.com', phone: '9884096072', club: 'Lake city', age: 8, type: 'Annette' },
  'Rithesh Prayas|single': { email: 'rithesh.prayas@gmail.com', phone: '8122112673', club: 'Octave', age: 22, type: 'Ann' },
  'Sarah Raelyn|single': { email: 'shaminiaslp@gmail.com', phone: '9952946178', club: 'Rotary club of Neithal', age: 7, type: 'Annette' },
  'Carmel|couple': { email: 'lita.carmel12@gmail.com', phone: '9940589222', club: 'Rotary Club Of Chennai Towers', age: 39, type: 'Annette', members: 'Sushmi' },
  'Shyamili Rajan|group': { email: 'shyamili7494@gmail.com', phone: '8939904999', club: 'Rotary Chennai Neidhal', type: 'Annette', members: 'Shyamili Rajan, Shamini Merwin, Gokulraj, Kavinaya, Kanishk, Sarah Raelyn, Hasini' },
  'Shivani Rajguru|single': { email: 'jeetu76@gmail.com', phone: '9840680907', club: 'RC Chennai Sneham', age: 14, type: 'Annette' },
  'Shabeer|single': { email: 'shabeerice@gmail.com', phone: '9940687618', club: 'Madras North', age: 38, type: 'Annette' },
  '1. Jasbrine, 2. Sara ,3. Irfan ,4. Rithik 5., Vignesh, 6. Helan 7,. Abinaya|group': { email: 'mgc7sanjeev24@gmail.com', phone: '9840784671', club: 'Rotary club of MGC', type: 'Rotaractor', members: 'Jasbrine, Sara, Irfan, Rithik, Vignesh, Helan, Abinaya' },
  'Mahalakshmi|couple': { email: 'hrlakshmi78@gmail.com', phone: '9840210102', club: 'Capital', age: 47, type: 'Ann', members: 'Divya DS' },
  'Mahathy Akshaya|couple': { email: 'shyamakalyani175@gmail.com', phone: '9940571151', club: 'Rotary club of Aarch City Madras', age: 13, type: 'Annette', members: 'Mahathy, Akshaya' },
}

const roster = [
  ['Akshay & Lakshmi', 'couple', 'Senior'],
  ['Reshma, Revathy, Shyama, Sindhu, Saranya, Annam, Priya, Seetha lakshmi', 'group', 'Ann'],
  ['Mallika', 'single', 'Young Adults'],
  ['Anila K', 'group', 'Mixed'],
  ['Rtn Dr Vidyaa Hari Iyer', 'single', 'Unspecified'],
  ['Devi Aathira & Team', 'couple', 'Junior'],
  ['Sudha Bala', 'couple', 'Senior'],
  ['V Niranchana', 'single', 'Adults'],
  ['Darshika Hemanath', 'single', 'Kids'],
  ['Aadhvik S', 'single', 'Kids'],
  ['Rithvik S', 'single', 'Kids'],
  ['Aadhvik S Rithvik S', 'couple', 'Junior'],
  ['Rtn Dr Vidyaa Hari Iyer', 'couple', 'Unspecified'],
  ['Priya Prabhakar', 'single', 'Adults'],
  ['J. Aaradhya', 'single', 'Unspecified'],
  ['Shyamili Rajan', 'single', 'Adults'],
  ['Ravinarayanan K R', 'single', 'Unspecified'],
  ['K Anila', 'couple', 'Junior'],
  ['Akshaya Mahathy Maanasa Rakshith Roshini Nanditha', 'group', 'Annette'],
  ['Shruti', 'couple', 'Senior'],
  ['Sudha Bala', 'group', 'DPL'],
  ['Eswarirajapriya J', 'group', 'Mixed'],
  ['Uma Maheshwari & Sanjana', 'couple', 'Unspecified'],
  ['avanthika steffi anamika sandra', 'couple', 'Junior'],
  ['Sanjana', 'single', 'Unspecified'],
  ['Uma', 'single', 'Unspecified'],
  ['Darshika Hemanath', 'couple', 'Senior'],
  ['Ponezhil.k', 'single', 'Unspecified'],
  ['Joshicca Jaikumar', 'single', 'Unspecified'],
  ['JUANNA & JOSHICCA', 'couple', 'Unspecified'],
  ['Pushpavathi', 'couple', 'Senior'],
  ['Prabhu Shankar', 'single', 'Adults'],
  ['KALAIMAGAL V ALIAS SHYAMALA', 'couple', 'Senior'],
  ['Saanvi Vijayaraghavan', 'single', 'Kids'],
  ['Jayachithra', 'single', 'Unspecified'],
  ['Vedanth Narayanan', 'single', 'Kids'],
  ['A.L.Agaran', 'single', 'Tiny Tots'],
  ['S.A.Vidhyuth', 'single', 'Kids'],
  ['S Yazhini', 'single', 'Tiny Tots'],
  ['Rithesh Prayas', 'single', 'Unspecified'],
  ['Sarah Raelyn', 'single', 'Tiny Tots'],
  ['Carmel', 'couple', 'Senior'],
  ['Shyamili Rajan', 'group', 'Annette'],
  ['Shivani Rajguru', 'single', 'Kids'],
  ['Shabeer', 'single', 'Adults'],
  ['1. Jasbrine, 2. Sara ,3. Irfan ,4. Rithik 5., Vignesh, 6. Helan 7,. Abinaya', 'group', 'Rotaractor'],
  ['Mahalakshmi', 'couple', 'Senior'],
  ['Mahathy Akshaya', 'couple', 'Senior'],
]

function slug(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.|\.$/g, '')
    .slice(0, 24) || 'entry'
}

const rows = roster.map(([name, type, category], index) => {
  const extra = extras[`${name}|${type}`] || {}
  const format = FORMAT[type]
  const people = type === 'group' ? Math.max(3, String(extra.members || '').split(',').filter(Boolean).length) : type === 'couple' ? 2 : 1
  const participantType = extra.type || TYPE_FOR_CATEGORY[category] || (type === 'group' ? 'Mixed' : 'Annette')
  const age = extra.age != null ? extra.age : category === 'Unspecified' || type === 'group' ? '' : AGE_FOR[category] || ''
  const day = 13 + Math.floor(index / 20)
  const hour = 10 + (index % 10)
  const stamp = `9/${day}/2026 ${hour}:${String((index * 3) % 60).padStart(2, '0')}:00`
  return [
    stamp,
    extra.email || `${slug(name)}.${index + 1}@example.com`,
    name,
    extra.phone || String(9000000100 + index),
    extra.club || 'Rotary Club of Madras North',
    participantType,
    format,
    people,
    extra.members || '',
    extra.danceStyle || 'Unspecified',
    age,
    extra.payment || '',
  ]
})

const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
ws['!cols'] = headers.map((header) => ({ wch: Math.max(18, Math.min(40, header.length + 10)) }))

const notes = XLSX.utils.aoa_to_sheet([
  ['Column', 'What to enter', 'Used by import'],
  ['Timestamp', 'Google Form timestamp', 'Ignored'],
  ['Email Address', 'Registrant email', 'Yes'],
  ['Participant Name', 'Solo name, couple names, or group name', 'Yes — required'],
  ['Contact Number', '10-digit mobile', 'Yes'],
  ['Rotary Club Name', 'Club name', 'Yes'],
  ['Participant Type', 'Rotarian / Ann / Annette / Rotaractor / DPL (Inter-Club Group) / Mixed', 'Yes — Group category uses this'],
  ['Category of Dance', 'Solo Dance / Couple Dance / Group Dance', 'Yes — required'],
  ['Number of People Dancing', '1 solo, 2 couple, 3+ group', 'Yes'],
  ['Names of Other Participants', 'Partner or group members, comma separated', 'Yes'],
  ['Dance Style / Genre', 'Bharatanatyam, Hip-Hop Dance, Folk Dance, etc.', 'Yes'],
  ['Age', 'Years. Solo uses this age. Couple uses the oldest age. Group can be blank', 'Yes — creates Registered ID'],
  ['Payment screenshot', 'Drive / file URL', 'Stored if present'],
])
notes['!cols'] = [{ wch: 32 }, { wch: 78 }, { wch: 36 }]

const wb = XLSX.utils.book_new()
XLSX.utils.book_append_sheet(wb, ws, 'Form Responses 1')
XLSX.utils.book_append_sheet(wb, notes, 'Column guide')

const root = path.resolve(__dirname, '../..')
const files = [
  path.join(root, 'frontend/public/DOD-Season-14-Sample-Registrations.xlsx'),
  path.join(root, 'frontend/public/DOD-Season-14-Registrations.xlsx'),
  path.join(root, 'DOD-Season-14-Sample-Registrations.xlsx'),
]
for (const file of files) {
  try {
    XLSX.writeFile(wb, file)
    console.log('wrote', file)
  } catch (error) {
    console.log('locked, skipped', file, error.code || error.message)
  }
}
console.log(`rows ${rows.length}`)
