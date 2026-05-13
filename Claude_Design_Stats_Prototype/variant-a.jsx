// Variant A — "Linear" data-dense workspace
// Sidebar + dense table with inline editing, sparklines, expandable rows

const { useState, useMemo } = React;

function VariantA({ role = 'leader', density = 'comfortable' }) {
  const [data, setData] = useState(window.STATS_DATA);
  const [expanded, setExpanded] = useState(null);
  const [selSector, setSelSector] = useState('all');
  const [search, setSearch] = useState('');
  const [missingOnly, setMissingOnly] = useState(false);
  const [editing, setEditing] = useState(null); // { id, field }
  const [addOpen, setAddOpen] = useState(false);

  const canEdit = role === 'leader' || role === 'admin';
  const rowH = density === 'compact' ? 34 : density === 'spacious' ? 52 : 42;
  const cellY = density === 'compact' ? 6 : density === 'spacious' ? 14 : 10;

  const rowsByDisplay = useMemo(() => {
    return data.sectors
      .filter(s => selSector === 'all' || s.id === selSector)
      .map(s => ({
        ...s,
        bibleTalks: s.bibleTalks.filter(bt => {
          if (missingOnly && (bt.missing === 'None' || bt.missing === '—' || !bt.missing)) return false;
          if (!search) return true;
          const q = search.toLowerCase();
          return (bt.leaders + bt.assistants + bt.studies + bt.missing + bt.targets).toLowerCase().includes(q);
        }),
      }))
      .filter(s => s.bibleTalks.length);
  }, [data, selSector, search, missingOnly]);

  const totalBTs = data.sectors.reduce((a, s) => a + s.bibleTalks.length, 0);
  const visibleBTs = rowsByDisplay.reduce((a, s) => a + s.bibleTalks.length, 0);

  function updateBT(id, field, value) {
    setData(d => ({
      ...d,
      sectors: d.sectors.map(s => ({
        ...s,
        bibleTalks: s.bibleTalks.map(bt => bt.id === id ? { ...bt, [field]: value } : bt),
      })),
    }));
  }

  function addBT(sectorId, bt) {
    setData(d => ({
      ...d,
      sectors: d.sectors.map(s => s.id === sectorId ? { ...s, bibleTalks: [...s.bibleTalks, { ...bt, id: 'new-' + Date.now(), history: [bt.disciplesJan1, bt.disciplesJan1, bt.disciplesJan1, bt.disciplesJan1, bt.disciplesJan1, bt.disciplesNow] }] } : s),
    }));
  }

  return (
    <div style={varAStyles.root}>
      {/* Sidebar */}
      <aside style={varAStyles.sidebar}>
        <div style={varAStyles.sbBrand}>
          <div style={varAStyles.sbLogo}>◆</div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, color: '#0b0b0f' }}>Stats</div>
            <div style={{ fontSize: 11, color: '#71717a' }}>Bay Area Region</div>
          </div>
        </div>
        <div style={varAStyles.sbSection}>WORKSPACE</div>
        <div style={varAStyles.sbItem(true)}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="3" width="12" height="10" rx="1"/><path d="M2 7h12M6 3v10"/></svg>
          Weekly Report
        </div>
        <div style={varAStyles.sbItem(false)}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="6" cy="5" r="2.2"/><circle cx="11" cy="6" r="1.7"/><path d="M2 13c.5-2.5 2-3.5 4-3.5s3.5 1 4 3.5M8.5 13c.3-1.8 1.3-2.6 2.5-2.6s2.2.8 2.5 2.6"/></svg>
          Members
        </div>
        <div style={varAStyles.sbItem(false)}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 13V3M2 13h12M5 11V7M8 11V4M11 11V9"/></svg>
          Analytics
        </div>
        <div style={varAStyles.sbItem(false)}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 2L2 5v3c0 3 2.5 5.5 6 6.5 3.5-1 6-3.5 6-6.5V5L8 2z"/></svg>
          Victories
        </div>
        <div style={varAStyles.sbSection}>SECTORS</div>
        <div style={varAStyles.sbFilter(selSector === 'all')} onClick={() => setSelSector('all')}>
          <span>All sectors</span><span style={varAStyles.sbCount}>{totalBTs}</span>
        </div>
        {data.sectors.map(s => (
          <div key={s.id} style={varAStyles.sbFilter(selSector === s.id)} onClick={() => setSelSector(s.id)}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 6, height: 6, borderRadius: 3, background: sectorColor(s.id) }} />
              {s.name.split(' /')[0]}
            </span>
            <span style={varAStyles.sbCount}>{s.bibleTalks.length}</span>
          </div>
        ))}
        <div style={{ flex: 1 }} />
        <div style={varAStyles.sbUser}>
          <div style={varAStyles.sbAvatar}>JM</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, color: '#0b0b0f', fontWeight: 500 }}>Jordan Mun</div>
            <div style={{ fontSize: 11, color: '#71717a', textTransform: 'capitalize' }}>{role}</div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main style={varAStyles.main}>
        {/* Top bar */}
        <header style={varAStyles.topbar}>
          <div>
            <div style={varAStyles.crumbs}>Weekly Report <span style={{ opacity: .4 }}>/</span> {data.weekLabel}</div>
            <h1 style={varAStyles.h1}>Bible Talk performance</h1>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button style={varAStyles.btnGhost}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 3h10v10H3zM3 7h10M7 3v10"/></svg>
              Export
            </button>
            {canEdit && (
              <button style={varAStyles.btnPrimary} onClick={() => setAddOpen(true)}>
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3v10M3 8h10"/></svg>
                New Bible Talk
              </button>
            )}
          </div>
        </header>

        {/* KPI strip */}
        <div style={varAStyles.kpis}>
          <Kpi label="Total disciples" value={data.totals.now} delta={`+${data.totals.now - data.totals.jan1} YTD`} />
          <Kpi label="BT visitors this week" value={data.totals.bt} delta={`${data.totals.btCount} BTs`} />
          <Kpi label="Sunday visitors" value={data.totals.sun} />
          <Kpi label="Contribution progress" value={`${Math.round(data.totals.ytd / data.totals.tgt * 100)}%`} delta={`$${(data.totals.ytd/1000).toFixed(0)}k of $${(data.totals.tgt/1000).toFixed(0)}k`} barPct={data.totals.ytd / data.totals.tgt * 100} />
        </div>

        {/* Filter bar */}
        <div style={varAStyles.filterBar}>
          <div style={varAStyles.searchWrap}>
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="#71717a" strokeWidth="1.5"><circle cx="7" cy="7" r="4"/><path d="M10.5 10.5L14 14"/></svg>
            <input placeholder="Search leaders, studies, missing..." value={search} onChange={e => setSearch(e.target.value)} style={varAStyles.searchInput} />
          </div>
          <button style={varAStyles.chip(missingOnly)} onClick={() => setMissingOnly(v => !v)}>
            <span style={{ width: 6, height: 6, borderRadius: 3, background: missingOnly ? '#ef4444' : '#d4d4d8' }} />
            Has missing
          </button>
          <div style={{ flex: 1 }} />
          <div style={{ fontSize: 12, color: '#71717a' }}>{visibleBTs} of {totalBTs}</div>
        </div>

        {/* Table */}
        <div style={varAStyles.tableWrap}>
          <div style={{ ...varAStyles.tableHead, height: rowH, padding: `0 16px` }}>
            <div style={{ ...varAStyles.th, width: 220 }}>Bible Talk</div>
            <div style={{ ...varAStyles.th, width: 60, textAlign: 'right' }}>Jan 1</div>
            <div style={{ ...varAStyles.th, width: 60, textAlign: 'right' }}>Now</div>
            <div style={{ ...varAStyles.th, width: 90 }}>Trend</div>
            <div style={{ ...varAStyles.th, width: 60, textAlign: 'right' }}>BT</div>
            <div style={{ ...varAStyles.th, width: 60, textAlign: 'right' }}>Sun</div>
            <div style={{ ...varAStyles.th, width: 76, textAlign: 'right' }}>Growth</div>
            <div style={{ ...varAStyles.th, flex: 1 }}>Missing</div>
            <div style={{ ...varAStyles.th, width: 140, textAlign: 'right' }}>Contribution</div>
            <div style={{ ...varAStyles.th, width: 24 }} />
          </div>

          {rowsByDisplay.map(sector => (
            <div key={sector.id}>
              <div style={varAStyles.sectorRow}>
                <span style={{ width: 6, height: 6, borderRadius: 3, background: sectorColor(sector.id) }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: '#52525b', letterSpacing: 0.4, textTransform: 'uppercase' }}>{sector.name}</span>
                <span style={{ fontSize: 11, color: '#a1a1aa' }}>{sector.bibleTalks.length}</span>
                <div style={{ flex: 1, height: 1, background: '#eeeef0', marginLeft: 8 }} />
              </div>
              {sector.bibleTalks.map(bt => {
                const isOpen = expanded === bt.id;
                const pct = bt.ytd / bt.target * 100;
                return (
                  <React.Fragment key={bt.id}>
                    <div style={{ ...varAStyles.tr, height: rowH, padding: `0 16px` }} onClick={() => setExpanded(isOpen ? null : bt.id)}>
                      <div style={{ ...varAStyles.td, width: 220, paddingTop: cellY, paddingBottom: cellY }}>
                        <div style={{ fontSize: 13, color: '#0b0b0f', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{bt.leaders}</div>
                        {bt.assistants !== '—' && <div style={{ fontSize: 11, color: '#a1a1aa', marginTop: 1 }}>+ {bt.assistants}</div>}
                      </div>
                      <EditNumCell value={bt.disciplesJan1} w={60} align="right" canEdit={canEdit} editing={editing} setEditing={setEditing} id={bt.id} field="disciplesJan1" onSave={updateBT} />
                      <EditNumCell value={bt.disciplesNow} w={60} align="right" canEdit={canEdit} editing={editing} setEditing={setEditing} id={bt.id} field="disciplesNow" onSave={updateBT} bold />
                      <div style={{ ...varAStyles.td, width: 90, color: sectorColor(sector.id) }}>
                        <Sparkline data={bt.history} width={70} height={18} stroke={sectorColor(sector.id)} />
                      </div>
                      <EditNumCell value={bt.btVisitors} w={60} align="right" canEdit={canEdit} editing={editing} setEditing={setEditing} id={bt.id} field="btVisitors" onSave={updateBT} />
                      <EditNumCell value={bt.sundayVisitors} w={60} align="right" canEdit={canEdit} editing={editing} setEditing={setEditing} id={bt.id} field="sundayVisitors" onSave={updateBT} />
                      <div style={{ ...varAStyles.td, width: 76, justifyContent: 'flex-end' }}>
                        <span style={varAStyles.growthPill(bt.growth)}>{bt.growth > 0 ? '↑' : bt.growth < 0 ? '↓' : '—'} {bt.growth}%</span>
                      </div>
                      <div style={{ ...varAStyles.td, flex: 1, fontSize: 12, color: bt.missing === 'None' || bt.missing === '—' ? '#a1a1aa' : '#0b0b0f', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {bt.missing === 'None' || bt.missing === '—' ? '—' : bt.missing}
                      </div>
                      <div style={{ ...varAStyles.td, width: 140, justifyContent: 'flex-end', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
                        <div style={{ fontSize: 11, color: '#71717a', fontVariantNumeric: 'tabular-nums' }}>${(bt.ytd/1000).toFixed(1)}k / ${(bt.target/1000).toFixed(0)}k</div>
                        <div style={{ width: 100, height: 3, background: '#f4f4f5', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: pct >= 80 ? '#22c55e' : pct >= 40 ? '#6366f1' : '#e4e4e7' }} />
                        </div>
                      </div>
                      <div style={{ ...varAStyles.td, width: 24, color: '#a1a1aa' }}>
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }}><path d="M4 2l3 3-3 3"/></svg>
                      </div>
                    </div>
                    {isOpen && (
                      <div style={varAStyles.expanded}>
                        <div style={varAStyles.expGrid}>
                          <ExpCell label="Ongoing studies" value={bt.studies} />
                          <ExpCell label="Targets this week" value={bt.targets} accent />
                          <ExpCell label="Contact goal" value={bt.contactGoal} suffix="/ couple" />
                          <ExpCell label="Assistants" value={bt.assistants} />
                        </div>
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          ))}
        </div>

        {/* Victories side-section */}
        <div style={{ marginTop: 32, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <VictoryPanel title="Victories & Breakthroughs" items={data.victories} accent="#6366f1" />
          <VictoryPanel title="Improvements & Innovations" items={data.improvements} accent="#22c55e" />
        </div>
      </main>

      {addOpen && <AddBTModal onClose={() => setAddOpen(false)} onAdd={addBT} sectors={data.sectors} />}
    </div>
  );
}

function EditNumCell({ value, w, align, canEdit, editing, setEditing, id, field, onSave, bold }) {
  const isEd = editing && editing.id === id && editing.field === field;
  return (
    <div style={{ ...varAStyles.td, width: w, justifyContent: align === 'right' ? 'flex-end' : 'flex-start' }}
      onClick={e => { if (canEdit) { e.stopPropagation(); setEditing({ id, field }); } }}>
      {isEd ? (
        <input autoFocus defaultValue={value} type="number" onBlur={e => { onSave(id, field, parseInt(e.target.value || 0, 10)); setEditing(null); }}
          onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); if (e.key === 'Escape') setEditing(null); }}
          style={{ width: w - 8, textAlign: align, fontSize: 13, padding: '2px 4px', border: '1.5px solid #6366f1', borderRadius: 4, outline: 'none', background: '#fff', fontFamily: 'inherit', fontVariantNumeric: 'tabular-nums' }} />
      ) : (
        <span style={{ fontSize: 13, fontVariantNumeric: 'tabular-nums', fontWeight: bold ? 600 : 400, color: '#0b0b0f', cursor: canEdit ? 'text' : 'default' }}>{value}</span>
      )}
    </div>
  );
}

function Kpi({ label, value, delta, barPct }) {
  return (
    <div style={varAStyles.kpi}>
      <div style={{ fontSize: 11, color: '#71717a', fontWeight: 500, letterSpacing: 0.2 }}>{label.toUpperCase()}</div>
      <div style={{ fontSize: 26, fontWeight: 600, color: '#0b0b0f', marginTop: 6, letterSpacing: -0.5, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      {delta && <div style={{ fontSize: 11, color: '#52525b', marginTop: 2 }}>{delta}</div>}
      {barPct !== undefined && (
        <div style={{ height: 3, background: '#f4f4f5', borderRadius: 2, marginTop: 10, overflow: 'hidden' }}>
          <div style={{ width: `${Math.min(barPct, 100)}%`, height: '100%', background: '#6366f1' }} />
        </div>
      )}
    </div>
  );
}

function ExpCell({ label, value, suffix, accent }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 13, color: accent ? '#6366f1' : '#0b0b0f', marginTop: 4, fontWeight: accent ? 500 : 400 }}>{value === 'None' || value === '—' || !value ? <span style={{ color: '#d4d4d8' }}>—</span> : value}{suffix && <span style={{ color: '#a1a1aa', marginLeft: 4 }}>{suffix}</span>}</div>
    </div>
  );
}

function VictoryPanel({ title, items, accent }) {
  return (
    <div style={{ border: '1px solid #eeeef0', borderRadius: 8, background: '#fff', padding: '14px 16px' }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#52525b', letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 10 }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.map((v, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, fontSize: 12.5, lineHeight: 1.5 }}>
            <div style={{ width: 2, background: accent, borderRadius: 1, flexShrink: 0 }} />
            <div>
              <span style={{ fontWeight: 600, color: '#0b0b0f' }}>{v.leader}</span>
              <span style={{ color: '#52525b' }}> — {v.description}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AddBTModal({ onClose, onAdd, sectors }) {
  const [sectorId, setSectorId] = useState(sectors[0].id);
  const [leaders, setLeaders] = useState('');
  const [assistants, setAssistants] = useState('');
  const [jan1, setJan1] = useState('');
  const [now, setNow] = useState('');

  function submit() {
    if (!leaders) return;
    const j1 = parseInt(jan1 || 0, 10), nw = parseInt(now || 0, 10);
    onAdd(sectorId, {
      leaders, assistants: assistants || '—', disciplesJan1: j1, disciplesNow: nw,
      btVisitors: 0, sundayVisitors: 0, growth: j1 ? Math.round(((nw - j1) / j1) * 100) : 0,
      missing: 'None', studies: 'None', targets: 'None', target: 10000, ytd: 0, contactGoal: 0,
    });
    onClose();
  }

  return (
    <div style={varAStyles.overlay} onClick={onClose}>
      <div style={varAStyles.modal} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid #eeeef0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#0b0b0f' }}>New Bible Talk</div>
            <div style={{ fontSize: 12, color: '#71717a', marginTop: 2 }}>Add a BT to this week's report</div>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', color: '#71717a', cursor: 'pointer', fontSize: 18, padding: 4 }}>×</button>
        </div>
        <div style={{ padding: '18px 22px', display: 'grid', gap: 14 }}>
          <Field label="Sector">
            <select value={sectorId} onChange={e => setSectorId(e.target.value)} style={varAStyles.input}>
              {sectors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="Leaders"><input value={leaders} onChange={e => setLeaders(e.target.value)} placeholder="e.g. Chris & Dana" style={varAStyles.input} /></Field>
          <Field label="Assistants"><input value={assistants} onChange={e => setAssistants(e.target.value)} style={varAStyles.input} /></Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Disciples Jan 1"><input value={jan1} onChange={e => setJan1(e.target.value)} type="number" style={varAStyles.input} /></Field>
            <Field label="Disciples now"><input value={now} onChange={e => setNow(e.target.value)} type="number" style={varAStyles.input} /></Field>
          </div>
        </div>
        <div style={{ padding: '14px 22px', borderTop: '1px solid #eeeef0', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} style={varAStyles.btnGhost}>Cancel</button>
          <button onClick={submit} style={varAStyles.btnPrimary}>Create BT</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label style={{ display: 'block' }}>
      <div style={{ fontSize: 11, fontWeight: 500, color: '#52525b', marginBottom: 6, letterSpacing: 0.2 }}>{label.toUpperCase()}</div>
      {children}
    </label>
  );
}

function sectorColor(id) {
  return id === 'students' ? '#6366f1' : id === 'singles' ? '#8b5cf6' : '#0ea5e9';
}

const varAStyles = {
  root: { display: 'flex', fontFamily: 'Inter, -apple-system, system-ui, sans-serif', color: '#0b0b0f', background: '#fbfbfc', minHeight: '100%', height: '100%' },
  sidebar: { width: 220, flexShrink: 0, borderRight: '1px solid #eeeef0', background: '#fafafb', padding: '14px 10px', display: 'flex', flexDirection: 'column', fontSize: 13 },
  sbBrand: { display: 'flex', alignItems: 'center', gap: 10, padding: '4px 8px 14px' },
  sbLogo: { width: 26, height: 26, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 },
  sbSection: { fontSize: 10, fontWeight: 600, color: '#a1a1aa', letterSpacing: 0.6, padding: '12px 8px 6px' },
  sbItem: (active) => ({ display: 'flex', alignItems: 'center', gap: 9, padding: '6px 8px', fontSize: 12.5, color: active ? '#0b0b0f' : '#52525b', background: active ? '#eeeef0' : 'transparent', borderRadius: 5, cursor: 'pointer', fontWeight: active ? 500 : 400 }),
  sbFilter: (active) => ({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 8px', fontSize: 12, color: active ? '#0b0b0f' : '#52525b', background: active ? '#eeeef0' : 'transparent', borderRadius: 5, cursor: 'pointer', fontWeight: active ? 500 : 400 }),
  sbCount: { fontSize: 11, color: '#a1a1aa', fontVariantNumeric: 'tabular-nums' },
  sbUser: { display: 'flex', alignItems: 'center', gap: 9, padding: 8, borderTop: '1px solid #eeeef0', marginTop: 8 },
  sbAvatar: { width: 26, height: 26, background: '#0b0b0f', color: '#fff', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600 },

  main: { flex: 1, padding: '22px 28px 48px', overflow: 'auto' },
  topbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 22 },
  crumbs: { fontSize: 12, color: '#71717a', marginBottom: 4 },
  h1: { fontSize: 22, fontWeight: 600, letterSpacing: -0.5, margin: 0 },

  btnGhost: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 11px', fontSize: 12.5, fontWeight: 500, color: '#0b0b0f', background: '#fff', border: '1px solid #e4e4e7', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit' },
  btnPrimary: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', fontSize: 12.5, fontWeight: 500, color: '#fff', background: '#0b0b0f', border: '1px solid #0b0b0f', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit' },

  kpis: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 22 },
  kpi: { padding: '14px 16px', background: '#fff', border: '1px solid #eeeef0', borderRadius: 8 },

  filterBar: { display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 },
  searchWrap: { display: 'flex', alignItems: 'center', gap: 7, padding: '0 10px', background: '#fff', border: '1px solid #e4e4e7', borderRadius: 6, width: 260, height: 30 },
  searchInput: { border: 'none', outline: 'none', fontSize: 12.5, background: 'transparent', width: '100%', fontFamily: 'inherit' },
  chip: (active) => ({ display: 'flex', alignItems: 'center', gap: 6, padding: '0 10px', height: 30, fontSize: 12.5, color: active ? '#0b0b0f' : '#52525b', background: active ? '#fff' : '#fff', border: active ? '1px solid #0b0b0f' : '1px solid #e4e4e7', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit' }),

  tableWrap: { border: '1px solid #eeeef0', borderRadius: 8, background: '#fff', overflow: 'hidden' },
  tableHead: { display: 'flex', alignItems: 'center', background: '#fafafb', borderBottom: '1px solid #eeeef0', fontSize: 11, color: '#71717a', fontWeight: 500, letterSpacing: 0.3 },
  th: { display: 'flex', alignItems: 'center', textTransform: 'uppercase' },
  sectorRow: { display: 'flex', alignItems: 'center', gap: 8, padding: '14px 16px 6px', background: '#fff' },
  tr: { display: 'flex', alignItems: 'center', borderTop: '1px solid #f4f4f5', cursor: 'pointer', transition: 'background .1s' },
  td: { display: 'flex', alignItems: 'center', fontSize: 13, color: '#0b0b0f' },
  growthPill: (g) => ({ display: 'inline-flex', alignItems: 'center', gap: 2, padding: '2px 6px', fontSize: 11, fontWeight: 500, borderRadius: 3, color: g > 15 ? '#15803d' : g > 0 ? '#4f46e5' : '#71717a', background: g > 15 ? '#dcfce7' : g > 0 ? '#eef2ff' : '#f4f4f5', fontVariantNumeric: 'tabular-nums' }),
  expanded: { background: '#fafafb', borderTop: '1px solid #f4f4f5', padding: '14px 16px 14px 24px' },
  expGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 },

  overlay: { position: 'absolute', inset: 0, background: 'rgba(11,11,15,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 },
  modal: { width: 440, background: '#fff', borderRadius: 10, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' },
  input: { width: '100%', fontSize: 13, padding: '7px 10px', border: '1px solid #e4e4e7', borderRadius: 6, outline: 'none', background: '#fff', fontFamily: 'inherit', boxSizing: 'border-box' },
};

window.VariantA = VariantA;
