// Variant B — "Notion-database" — toolbar + grouped rows + right-side detail pane
const { useState: useStateB, useMemo: useMemoB } = React;

function VariantB({ role = 'leader', density = 'comfortable' }) {
  const [data, setData] = useStateB(window.STATS_DATA);
  const [selected, setSelected] = useStateB(null);
  const [collapsed, setCollapsed] = useStateB({});
  const [filterMissing, setFilterMissing] = useStateB(false);
  const [filterSector, setFilterSector] = useStateB(null);
  const [editing, setEditing] = useStateB(null);
  const [addOpen, setAddOpen] = useStateB(false);

  const canEdit = role === 'leader' || role === 'admin';
  const rowH = density === 'compact' ? 32 : density === 'spacious' ? 46 : 38;

  const sectors = useMemoB(() => data.sectors
    .filter(s => !filterSector || s.id === filterSector)
    .map(s => ({ ...s, bibleTalks: s.bibleTalks.filter(bt => !filterMissing || (bt.missing && bt.missing !== 'None' && bt.missing !== '—')) }))
    .filter(s => s.bibleTalks.length), [data, filterSector, filterMissing]);

  function updateBT(id, patch) {
    setData(d => ({ ...d, sectors: d.sectors.map(s => ({ ...s, bibleTalks: s.bibleTalks.map(bt => bt.id === id ? { ...bt, ...patch } : bt) })) }));
    setSelected(sel => sel && sel.id === id ? { ...sel, ...patch } : sel);
  }

  function addBT(sectorId, bt) {
    const full = { ...bt, id: 'new-' + Date.now(), history: [bt.disciplesJan1, bt.disciplesJan1, bt.disciplesJan1, bt.disciplesJan1, bt.disciplesJan1, bt.disciplesNow] };
    setData(d => ({ ...d, sectors: d.sectors.map(s => s.id === sectorId ? { ...s, bibleTalks: [...s.bibleTalks, full] } : s) }));
  }

  const bgTone = '#f7f7f5';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: '"Inter", -apple-system, system-ui, sans-serif', background: bgTone, color: '#1a1a17' }}>
      {/* Top tabs */}
      <div style={varBStyles.tabBar}>
        <div style={varBStyles.brand}>
          <span style={varBStyles.brandDot} />
          <span style={{ fontWeight: 600, fontSize: 14 }}>Bay Area · Stats</span>
        </div>
        <div style={varBStyles.tabs}>
          <div style={varBStyles.tab(true)}>Weekly table</div>
          <div style={varBStyles.tab(false)}>Board</div>
          <div style={varBStyles.tab(false)}>Timeline</div>
          <div style={varBStyles.tab(false)}>Victories</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={varBStyles.roleChip}><span style={{ width: 6, height: 6, borderRadius: 3, background: '#7c9473' }} />{role}</div>
        </div>
      </div>

      {/* Title */}
      <div style={varBStyles.titleBlock}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 22 }}>📖</span>
          <h1 style={{ fontSize: 26, fontWeight: 600, letterSpacing: -0.6, margin: 0 }}>Bible Talks — {data.weekLabel}</h1>
        </div>
        <div style={{ fontSize: 13, color: '#6b6b66', marginTop: 6, marginLeft: 34 }}>
          {data.totals.btCount} Bible Talks · {data.totals.now} disciples · {data.totals.bt} visitors this week
        </div>
      </div>

      {/* Filter toolbar */}
      <div style={varBStyles.toolbar}>
        <ToolChip active={!filterSector && !filterMissing} onClick={() => { setFilterSector(null); setFilterMissing(false); }}>All</ToolChip>
        {data.sectors.map(s => (
          <ToolChip key={s.id} active={filterSector === s.id} onClick={() => setFilterSector(filterSector === s.id ? null : s.id)} color={sectorColorB(s.id)}>
            {s.name.split(' /')[0]} <span style={{ color: '#a8a8a2', marginLeft: 4 }}>{s.bibleTalks.length}</span>
          </ToolChip>
        ))}
        <div style={{ width: 1, height: 18, background: '#e4e4de', margin: '0 6px' }} />
        <ToolChip active={filterMissing} onClick={() => setFilterMissing(v => !v)}>
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="6" cy="6" r="4.5"/><path d="M6 4v3M6 8.5v.1"/></svg>
          Has missing
        </ToolChip>
        <div style={{ flex: 1 }} />
        {canEdit && <button style={varBStyles.addBtn} onClick={() => setAddOpen(true)}><span style={{ fontSize: 14, lineHeight: '12px' }}>+</span> New BT</button>}
      </div>

      {/* Main area: table + detail pane */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <div style={{ flex: 1, overflow: 'auto', padding: '0 24px 40px' }}>
          {/* header row */}
          <div style={{ ...varBStyles.headRow, height: 32 }}>
            <div style={{ ...varBStyles.hCell, width: 240 }}>Leaders</div>
            <div style={{ ...varBStyles.hCell, width: 110 }}>Disciples</div>
            <div style={{ ...varBStyles.hCell, width: 80 }}>Trend</div>
            <div style={{ ...varBStyles.hCell, width: 64, textAlign: 'right' }}>BT vis</div>
            <div style={{ ...varBStyles.hCell, width: 64, textAlign: 'right' }}>Sun vis</div>
            <div style={{ ...varBStyles.hCell, width: 80, textAlign: 'right' }}>Growth</div>
            <div style={{ ...varBStyles.hCell, flex: 1 }}>Ongoing studies</div>
            <div style={{ ...varBStyles.hCell, width: 130, textAlign: 'right' }}>Contribution</div>
          </div>

          {sectors.map(sector => {
            const isColl = collapsed[sector.id];
            const t = window.sumSector(sector);
            return (
              <div key={sector.id}>
                <div style={varBStyles.groupRow} onClick={() => setCollapsed(c => ({ ...c, [sector.id]: !c[sector.id] }))}>
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.6" style={{ transform: isColl ? 'rotate(0)' : 'rotate(90deg)', transition: 'transform .12s', color: '#6b6b66' }}><path d="M3 2l4 3-4 3"/></svg>
                  <span style={{ width: 6, height: 6, borderRadius: 3, background: sectorColorB(sector.id) }} />
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{sector.name}</span>
                  <span style={{ fontSize: 11, color: '#8e8e88', padding: '1px 6px', background: '#efeeea', borderRadius: 8 }}>{sector.bibleTalks.length}</span>
                  <div style={{ flex: 1 }} />
                  <div style={{ fontSize: 11, color: '#6b6b66', fontVariantNumeric: 'tabular-nums' }}>
                    {t.now} disciples · {t.bt} vis · ${(t.ytd/1000).toFixed(0)}k
                  </div>
                </div>
                {!isColl && sector.bibleTalks.map(bt => (
                  <div key={bt.id} onClick={() => setSelected(bt)} style={{ ...varBStyles.dataRow, height: rowH, background: selected?.id === bt.id ? '#edece6' : 'transparent' }}>
                    <div style={{ ...varBStyles.dCell, width: 240 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 22, height: 22, borderRadius: 4, background: avatarBg(bt.id), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600, flexShrink: 0 }}>
                          {bt.leaders.split(/[&\s]+/).filter(Boolean).slice(0, 2).map(n => n[0]).join('')}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{bt.leaders}</div>
                          {bt.assistants !== '—' && <div style={{ fontSize: 10.5, color: '#8e8e88', marginTop: 1 }}>+ {bt.assistants}</div>}
                        </div>
                      </div>
                    </div>
                    <div style={{ ...varBStyles.dCell, width: 110 }}>
                      <NumChip value={bt.disciplesJan1} dim />
                      <span style={{ color: '#c4c4be', margin: '0 4px' }}>→</span>
                      <InlineB value={bt.disciplesNow} canEdit={canEdit} editing={editing} setEditing={setEditing} id={bt.id} field="disciplesNow" onSave={updateBT} />
                    </div>
                    <div style={{ ...varBStyles.dCell, width: 80 }}>
                      <Sparkline data={bt.history} width={70} height={20} stroke={sectorColorB(sector.id)} fill={sectorColorB(sector.id) + '18'} />
                    </div>
                    <div style={{ ...varBStyles.dCell, width: 64, justifyContent: 'flex-end' }}>
                      <InlineB value={bt.btVisitors} canEdit={canEdit} editing={editing} setEditing={setEditing} id={bt.id} field="btVisitors" onSave={updateBT} />
                    </div>
                    <div style={{ ...varBStyles.dCell, width: 64, justifyContent: 'flex-end' }}>
                      <InlineB value={bt.sundayVisitors} canEdit={canEdit} editing={editing} setEditing={setEditing} id={bt.id} field="sundayVisitors" onSave={updateBT} />
                    </div>
                    <div style={{ ...varBStyles.dCell, width: 80, justifyContent: 'flex-end' }}>
                      <GrowthBar g={bt.growth} />
                    </div>
                    <div style={{ ...varBStyles.dCell, flex: 1, fontSize: 12, color: '#4a4a44', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                      {bt.studies === 'None' || !bt.studies ? <span style={{ color: '#c4c4be' }}>No studies</span> : bt.studies}
                    </div>
                    <div style={{ ...varBStyles.dCell, width: 130, justifyContent: 'flex-end' }}>
                      <RingPct pct={bt.ytd / bt.target * 100} label={`$${(bt.ytd/1000).toFixed(1)}k`} />
                    </div>
                  </div>
                ))}
              </div>
            );
          })}

          {/* Victories as editorial pull-quote row */}
          <div style={{ marginTop: 36, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
            <QuoteBlock title="Victories & Breakthroughs" items={data.victories} />
            <QuoteBlock title="Improvements & Innovations" items={data.improvements} />
          </div>
        </div>

        {/* Detail pane */}
        {selected && <DetailPane bt={selected} onClose={() => setSelected(null)} canEdit={canEdit} onUpdate={updateBT} />}
      </div>

      {addOpen && <AddBTSheet onClose={() => setAddOpen(false)} onAdd={addBT} sectors={data.sectors} />}
    </div>
  );
}

function ToolChip({ children, active, onClick, color }) {
  return (
    <button onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0 10px', height: 28, fontSize: 12.5, fontWeight: 500,
      color: active ? '#1a1a17' : '#6b6b66', background: active ? '#fff' : 'transparent',
      border: active ? '1px solid #d4d3cb' : '1px solid transparent', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit',
      boxShadow: active ? '0 1px 2px rgba(0,0,0,.04)' : 'none',
    }}>
      {color && <span style={{ width: 6, height: 6, borderRadius: 3, background: color }} />}
      {children}
    </button>
  );
}

function NumChip({ value, dim }) {
  return <span style={{ fontSize: 12, fontVariantNumeric: 'tabular-nums', color: dim ? '#a8a8a2' : '#1a1a17' }}>{value}</span>;
}

function InlineB({ value, canEdit, editing, setEditing, id, field, onSave }) {
  const ed = editing && editing.id === id && editing.field === field;
  if (ed) {
    return <input autoFocus defaultValue={value} type="number" onClick={e => e.stopPropagation()}
      onBlur={e => { onSave(id, { [field]: parseInt(e.target.value || 0, 10) }); setEditing(null); }}
      onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); if (e.key === 'Escape') setEditing(null); }}
      style={{ width: 40, fontSize: 13, fontFamily: 'inherit', padding: '2px 4px', border: '1.5px solid #7c9473', borderRadius: 4, outline: 'none', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }} />;
  }
  return <span onClick={e => { if (canEdit) { e.stopPropagation(); setEditing({ id, field }); } }}
    style={{ fontSize: 13, fontVariantNumeric: 'tabular-nums', fontWeight: 500, padding: '1px 4px', borderRadius: 3, cursor: canEdit ? 'text' : 'default' }}>{value}</span>;
}

function GrowthBar({ g }) {
  const pos = g > 0;
  const color = g > 15 ? '#5a8a5f' : g > 0 ? '#7c9473' : '#bcbcb6';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 500, fontVariantNumeric: 'tabular-nums', color }}>
      {pos ? '▲' : g < 0 ? '▼' : '—'} {g}%
    </span>
  );
}

function RingPct({ pct, label }) {
  const p = Math.min(pct, 100);
  const r = 8, c = 2 * Math.PI * r;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
      <svg width="22" height="22" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="11" cy="11" r={r} fill="none" stroke="#e4e4de" strokeWidth="2.5" />
        <circle cx="11" cy="11" r={r} fill="none" stroke={p >= 80 ? '#5a8a5f' : p >= 40 ? '#7c9473' : '#c4c4be'} strokeWidth="2.5" strokeDasharray={`${c * p / 100} ${c}`} strokeLinecap="round" />
      </svg>
      <span style={{ fontSize: 11.5, color: '#4a4a44', fontVariantNumeric: 'tabular-nums' }}>{label}</span>
    </span>
  );
}

function DetailPane({ bt, onClose, canEdit, onUpdate }) {
  return (
    <div style={varBStyles.detailPane}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 10.5, color: '#8e8e88', fontWeight: 500, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 4 }}>Bible Talk</div>
          <div style={{ fontSize: 18, fontWeight: 600 }}>{bt.leaders}</div>
          <div style={{ fontSize: 12, color: '#6b6b66', marginTop: 2 }}>Assistants: {bt.assistants}</div>
        </div>
        <button onClick={onClose} style={{ border: 'none', background: 'transparent', color: '#8e8e88', cursor: 'pointer', fontSize: 18, padding: 0, lineHeight: 1 }}>×</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
        <MiniStat label="Disciples" value={bt.disciplesNow} sub={`from ${bt.disciplesJan1} on Jan 1`} />
        <MiniStat label="Growth" value={`${bt.growth}%`} sub="YTD" />
        <MiniStat label="BT visitors" value={bt.btVisitors} sub="this week" />
        <MiniStat label="Sunday visitors" value={bt.sundayVisitors} sub="this week" />
      </div>

      <div style={{ marginBottom: 18 }}>
        <div style={varBStyles.sectionLabel}>Trend · 6 weeks</div>
        <div style={{ padding: '12px 0', background: '#fafaf7', borderRadius: 6, display: 'flex', justifyContent: 'center' }}>
          <Sparkline data={bt.history} width={260} height={56} stroke="#5a8a5f" fill="#5a8a5f22" />
        </div>
      </div>

      <DetailRow label="Ongoing studies" value={bt.studies} />
      <DetailRow label="Weekly targets" value={bt.targets} highlight />
      <DetailRow label="Missing" value={bt.missing} warn={bt.missing && bt.missing !== 'None' && bt.missing !== '—'} />
      <DetailRow label="Contact goal / couple" value={bt.contactGoal} />

      <div style={{ marginTop: 18 }}>
        <div style={varBStyles.sectionLabel}>Contribution</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: -0.4 }}>${(bt.ytd/1000).toFixed(1)}k</div>
          <div style={{ fontSize: 12, color: '#6b6b66' }}>of ${(bt.target/1000).toFixed(0)}k target</div>
        </div>
        <div style={{ height: 4, background: '#e4e4de', borderRadius: 2, marginTop: 8, overflow: 'hidden' }}>
          <div style={{ width: `${Math.min(bt.ytd/bt.target*100, 100)}%`, height: '100%', background: '#7c9473' }} />
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value, sub }) {
  return (
    <div style={{ padding: '10px 12px', background: '#fafaf7', borderRadius: 6 }}>
      <div style={{ fontSize: 10.5, color: '#8e8e88', fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: -0.4, marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      {sub && <div style={{ fontSize: 10.5, color: '#8e8e88', marginTop: 1 }}>{sub}</div>}
    </div>
  );
}

function DetailRow({ label, value, highlight, warn }) {
  const empty = !value || value === 'None' || value === '—';
  return (
    <div style={{ display: 'flex', padding: '8px 0', borderBottom: '1px solid #efeeea', fontSize: 12.5 }}>
      <div style={{ width: 140, color: '#8e8e88', flexShrink: 0 }}>{label}</div>
      <div style={{ flex: 1, color: empty ? '#c4c4be' : highlight ? '#5a8a5f' : warn ? '#b6664a' : '#1a1a17', fontWeight: highlight ? 500 : 400 }}>
        {empty ? '—' : value}
      </div>
    </div>
  );
}

function QuoteBlock({ title, items }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#8e8e88', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 12 }}>{title}</div>
      {items.map((v, i) => (
        <div key={i} style={{ padding: '12px 0', borderTop: '1px solid #e4e4de', fontSize: 13.5, lineHeight: 1.55, color: '#2a2a26' }}>
          <div style={{ fontFamily: 'Fraunces, Georgia, serif', fontStyle: 'italic', fontSize: 16, lineHeight: 1.45 }}>"{v.description}"</div>
          <div style={{ fontSize: 11, color: '#8e8e88', marginTop: 6, letterSpacing: 0.3 }}>— {v.leader}</div>
        </div>
      ))}
    </div>
  );
}

function AddBTSheet({ onClose, onAdd, sectors }) {
  const [sectorId, setSectorId] = useStateB(sectors[0].id);
  const [leaders, setLeaders] = useStateB('');
  const [assistants, setAssistants] = useStateB('');
  const [jan1, setJan1] = useStateB('');
  const [now, setNow] = useStateB('');

  function submit() {
    if (!leaders) return;
    const j1 = parseInt(jan1 || 0, 10), nw = parseInt(now || 0, 10);
    onAdd(sectorId, { leaders, assistants: assistants || '—', disciplesJan1: j1, disciplesNow: nw, btVisitors: 0, sundayVisitors: 0, growth: j1 ? Math.round(((nw-j1)/j1)*100) : 0, missing: 'None', studies: 'None', targets: 'None', target: 10000, ytd: 0, contactGoal: 0 });
    onClose();
  }

  return (
    <div style={varBStyles.sheetOverlay} onClick={onClose}>
      <div style={varBStyles.sheet} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid #efeeea' }}>
          <div style={{ fontSize: 16, fontWeight: 600 }}>New Bible Talk</div>
          <div style={{ fontSize: 12, color: '#8e8e88', marginTop: 2 }}>Add a BT to this week's report</div>
        </div>
        <div style={{ padding: 22, display: 'grid', gap: 14 }}>
          <FieldB label="Sector">
            <select value={sectorId} onChange={e => setSectorId(e.target.value)} style={varBStyles.input}>
              {sectors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </FieldB>
          <FieldB label="Leaders"><input value={leaders} onChange={e => setLeaders(e.target.value)} placeholder="e.g. Chris & Dana" style={varBStyles.input} /></FieldB>
          <FieldB label="Assistants"><input value={assistants} onChange={e => setAssistants(e.target.value)} style={varBStyles.input} /></FieldB>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FieldB label="Disciples Jan 1"><input value={jan1} onChange={e => setJan1(e.target.value)} type="number" style={varBStyles.input} /></FieldB>
            <FieldB label="Disciples now"><input value={now} onChange={e => setNow(e.target.value)} type="number" style={varBStyles.input} /></FieldB>
          </div>
        </div>
        <div style={{ padding: '14px 22px', borderTop: '1px solid #efeeea', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} style={varBStyles.btnGhost}>Cancel</button>
          <button onClick={submit} style={varBStyles.btnPrimary}>Add BT</button>
        </div>
      </div>
    </div>
  );
}

function FieldB({ label, children }) {
  return <label style={{ display: 'block' }}><div style={{ fontSize: 11, fontWeight: 500, color: '#6b6b66', marginBottom: 6, letterSpacing: 0.2, textTransform: 'uppercase' }}>{label}</div>{children}</label>;
}

function sectorColorB(id) {
  return id === 'students' ? '#7c9473' : id === 'singles' ? '#9a8a5c' : '#6b7f8f';
}
function avatarBg(id) {
  const pal = ['#7c9473', '#9a8a5c', '#6b7f8f', '#8b6b73', '#6b8a8a'];
  let h = 0; for (const c of id) h = (h * 31 + c.charCodeAt(0)) | 0;
  return pal[Math.abs(h) % pal.length];
}

const varBStyles = {
  tabBar: { display: 'flex', alignItems: 'center', gap: 18, padding: '10px 24px', borderBottom: '1px solid #e4e4de', background: '#fafaf7' },
  brand: { display: 'flex', alignItems: 'center', gap: 8 },
  brandDot: { width: 20, height: 20, borderRadius: 5, background: 'linear-gradient(135deg, #7c9473, #5a8a5f)' },
  tabs: { display: 'flex', gap: 2, marginLeft: 14 },
  tab: (active) => ({ padding: '6px 11px', fontSize: 12.5, fontWeight: 500, color: active ? '#1a1a17' : '#6b6b66', borderBottom: active ? '2px solid #1a1a17' : '2px solid transparent', cursor: 'pointer' }),
  roleChip: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 9px', fontSize: 11, color: '#4a4a44', background: '#fff', border: '1px solid #d4d3cb', borderRadius: 10, textTransform: 'capitalize', fontWeight: 500 },

  titleBlock: { padding: '22px 24px 10px' },

  toolbar: { display: 'flex', alignItems: 'center', gap: 6, padding: '8px 24px', borderBottom: '1px solid #e4e4de' },
  addBtn: { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '0 11px', height: 28, fontSize: 12.5, fontWeight: 500, color: '#fff', background: '#1a1a17', border: 'none', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit' },

  headRow: { display: 'flex', alignItems: 'center', padding: '0 10px', fontSize: 11, color: '#8e8e88', fontWeight: 500, letterSpacing: 0.3, textTransform: 'uppercase', borderBottom: '1px solid #e4e4de', marginTop: 14 },
  hCell: { display: 'flex', alignItems: 'center', paddingRight: 8 },

  groupRow: { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 10px 8px', marginTop: 14, cursor: 'pointer' },
  dataRow: { display: 'flex', alignItems: 'center', padding: '0 10px', borderBottom: '1px solid #efeeea', cursor: 'pointer' },
  dCell: { display: 'flex', alignItems: 'center', paddingRight: 8 },

  detailPane: { width: 360, flexShrink: 0, background: '#fff', borderLeft: '1px solid #e4e4de', padding: '20px 22px', overflow: 'auto' },
  sectionLabel: { fontSize: 11, fontWeight: 600, color: '#8e8e88', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 },

  sheetOverlay: { position: 'absolute', inset: 0, background: 'rgba(26,26,23,.35)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  sheet: { width: 440, background: '#fff', borderRadius: 10, boxShadow: '0 20px 60px rgba(0,0,0,.2)' },
  input: { width: '100%', fontSize: 13, padding: '8px 10px', border: '1px solid #d4d3cb', borderRadius: 6, outline: 'none', fontFamily: 'inherit', background: '#fafaf7', boxSizing: 'border-box' },
  btnGhost: { padding: '6px 12px', fontSize: 12.5, fontWeight: 500, background: 'transparent', border: '1px solid #d4d3cb', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit' },
  btnPrimary: { padding: '6px 14px', fontSize: 12.5, fontWeight: 500, color: '#fff', background: '#7c9473', border: 'none', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit' },
};

window.VariantB = VariantB;
