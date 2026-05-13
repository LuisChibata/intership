// Real stats data from the church's week-end report
const DATA = {
  weekLabel: 'Week of Apr 12',
  sectors: [
    {
      id: 'students',
      name: 'Students',
      bibleTalks: [
        { id: 'charles-ysa', leaders: 'Charles & Ysa', assistants: 'Alan', disciplesJan1: 3, disciplesNow: 6, btVisitors: 10, sundayVisitors: 5, growth: 100, missing: 'None', studies: 'Eddy, Harrison, Tyrone', targets: 'Harrison, Tyrone', target: 10500, ytd: 8728, contactGoal: 40 },
        { id: 'luis-min', leaders: 'Luis & Min', assistants: '—', disciplesJan1: 7, disciplesNow: 7, btVisitors: 8, sundayVisitors: 3, growth: 0, missing: 'Takeshi', studies: 'Noureen, Riri, Erick, Cayden', targets: 'None', target: 12000, ytd: 9105, contactGoal: 50 },
        { id: 'jordan-jt', leaders: 'Jordan & JT', assistants: 'Devinas, Eddy', disciplesJan1: 6, disciplesNow: 7, btVisitors: 6, sundayVisitors: 1, growth: 17, missing: 'Jordan', studies: 'Julian, Jack, Liana, Anna, Mel', targets: 'None', target: 10500, ytd: 7720, contactGoal: 50 },
        { id: 'keanu-shantel', leaders: 'Keanu & Shantel', assistants: 'Celeste', disciplesJan1: 6, disciplesNow: 7, btVisitors: 5, sundayVisitors: 2, growth: 17, missing: 'Heisenberg', studies: 'Lydia', targets: 'None', target: 13500, ytd: 4500, contactGoal: 32 },
      ],
    },
    {
      id: 'singles',
      name: 'Singles / Marrieds no kids',
      bibleTalks: [
        { id: 'shareef-chloe', leaders: 'Shareef & Chloe', assistants: 'Charlotte', disciplesJan1: 6, disciplesNow: 7, btVisitors: 11, sundayVisitors: 1, growth: 17, missing: '—', studies: 'Sharon', targets: 'None', target: 15000, ytd: 8650, contactGoal: 10 },
        { id: 'ricky-yvette', leaders: 'Ricky & Yvette', assistants: 'Finn', disciplesJan1: 12, disciplesNow: 12, btVisitors: 5, sundayVisitors: 1, growth: 0, missing: 'Jeremy, Finn', studies: 'Alysia, Rei, Stephen, Raf, Deen, Dylan', targets: 'None', target: 33000, ytd: 22506, contactGoal: 20 },
        { id: 'emmanuel-effie', leaders: 'Emmanuel & Effie', assistants: 'Sara', disciplesJan1: 6, disciplesNow: 7, btVisitors: 4, sundayVisitors: 3, growth: 17, missing: '—', studies: 'John, Andreus, Tejas', targets: 'John', target: 16500, ytd: 12500, contactGoal: 30 },
        { id: 'brandon-aj', leaders: 'Brandon & AJ', assistants: 'Jan', disciplesJan1: 6, disciplesNow: 7, btVisitors: 1, sundayVisitors: 1, growth: 17, missing: 'Jan, AJ', studies: 'Delano, Daniel, Olah, Alesha', targets: 'Delano', target: 19500, ytd: 12500, contactGoal: 10 },
      ],
    },
    {
      id: 'marrieds',
      name: 'Marrieds with kids',
      bibleTalks: [
        { id: 'leongs', leaders: "Leong's", assistants: 'Ralph, Vicky', disciplesJan1: 5, disciplesNow: 6, btVisitors: 5, sundayVisitors: 2, growth: 20, missing: 'None', studies: 'Allie', targets: 'None', target: 15000, ytd: 9000, contactGoal: 5 },
        { id: 'jeremy-ros', leaders: 'Jeremy & Ros', assistants: 'Ash, Molly', disciplesJan1: 7, disciplesNow: 8, btVisitors: 4, sundayVisitors: 2, growth: 14, missing: 'Ash, Molly', studies: 'Christian, Laurent, June, Stephian', targets: 'None', target: 19500, ytd: 9288, contactGoal: 0 },
        { id: 'obaid-bonnie', leaders: 'Obaid & Bonnie', assistants: 'Edgar, Sarah', disciplesJan1: 8, disciplesNow: 8, btVisitors: 2, sundayVisitors: 2, growth: 0, missing: 'Sarah', studies: 'Brittany', targets: 'None', target: 22500, ytd: 11500, contactGoal: 5 },
        { id: 'wades', leaders: 'Wades', assistants: 'Simon', disciplesJan1: 4, disciplesNow: 4, btVisitors: 0, sundayVisitors: 0, growth: 0, missing: 'None', studies: 'None', targets: 'None', target: 15000, ytd: 3624, contactGoal: 2 },
        { id: 'lenox-keira', leaders: 'Lenox & Keira', assistants: '—', disciplesJan1: 2, disciplesNow: 2, btVisitors: 0, sundayVisitors: 0, growth: 0, missing: 'None', studies: 'None', targets: 'None', target: 6000, ytd: 6000, contactGoal: 0 },
        { id: 'willis', leaders: 'Willis', assistants: '—', disciplesJan1: 3, disciplesNow: 3, btVisitors: 0, sundayVisitors: 0, growth: 0, missing: 'None', studies: 'None', targets: 'None', target: 6000, ytd: 6000, contactGoal: 20 },
      ],
    },
  ],
  victories: [
    { leader: 'Shareef', description: 'Kevin led his first BT and had 11 visitors.' },
    { leader: 'Chloe T', description: 'Childhood best friend came to church, will stay in Sydney for two years. Did her first Bible study, enjoyed church. Wants to do more!' },
    { leader: 'Joe', description: 'Good crowd of visitors, used Galatians 5:19 to stir discussion and helped unbelievers. Harrison and Tyrone may become Christians next week.' },
    { leader: 'Tanu', description: 'Brought sister out to church, loved it. Delano, his brother, did cross study.' },
  ],
  improvements: [
    { leader: 'Morby', description: 'Did Salsa night Thursday and had 6 visitors come out, doing activities outside of Bible talk, will do pickleball next.' },
    { leader: 'Luis', description: 'Soccer evangelism, got 10 visitors on the first try.' },
    { leader: 'Ralph', description: "Five visitors at BT, tried door knocking, and found Charlie, who came through and brought board games. Also studied the Bible with Kodi, who's going to Seattle." },
    { leader: 'Ricky', description: 'Sharing for an hour before board game night, and did follow up — had a visitor Rafael come out through board game.' },
  ],
};

// Synthetic 6-week history per BT for sparklines (anchored to current disciplesNow)
function makeHistory(bt) {
  const end = bt.disciplesNow;
  const start = bt.disciplesJan1;
  const arr = [];
  for (let i = 0; i < 6; i++) {
    const t = i / 5;
    const base = start + (end - start) * t;
    const jitter = ((bt.id.charCodeAt(0) + i * 7) % 5 - 2) * 0.3;
    arr.push(Math.max(0, Math.round((base + jitter) * 10) / 10));
  }
  arr[5] = end;
  return arr;
}
DATA.sectors.forEach(s => s.bibleTalks.forEach(bt => { bt.history = makeHistory(bt); }));

// Totals
function sumSector(s) {
  return s.bibleTalks.reduce((a, b) => ({
    jan1: a.jan1 + b.disciplesJan1,
    now: a.now + b.disciplesNow,
    bt: a.bt + b.btVisitors,
    sun: a.sun + b.sundayVisitors,
    tgt: a.tgt + b.target,
    ytd: a.ytd + b.ytd,
  }), { jan1: 0, now: 0, bt: 0, sun: 0, tgt: 0, ytd: 0 });
}
DATA.totals = DATA.sectors.reduce((a, s) => {
  const t = sumSector(s);
  return { jan1: a.jan1 + t.jan1, now: a.now + t.now, bt: a.bt + t.bt, sun: a.sun + t.sun, tgt: a.tgt + t.tgt, ytd: a.ytd + t.ytd, btCount: a.btCount + s.bibleTalks.length };
}, { jan1: 0, now: 0, bt: 0, sun: 0, tgt: 0, ytd: 0, btCount: 0 });

window.STATS_DATA = DATA;
window.sumSector = sumSector;

// Sparkline SVG helper
window.Sparkline = function Sparkline({ data, width = 64, height = 20, stroke = 'currentColor', fill }) {
  if (!data || !data.length) return null;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return [x, y];
  });
  const path = pts.map(([x, y], i) => (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1)).join(' ');
  const area = fill ? path + ` L ${width} ${height} L 0 ${height} Z` : null;
  return (
    <svg width={width} height={height} style={{ display: 'block', overflow: 'visible' }}>
      {fill && <path d={area} fill={fill} />}
      <path d={path} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="2" fill={stroke} />
    </svg>
  );
};
