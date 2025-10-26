'use client';
import { useState } from 'react';
import { useTheme } from '@/components/ThemeProvider';

export default function MobileAppShell() {
  const { toggle } = useTheme();
  const [tab, setTab] = useState('dashboard');
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div id="app">
      <header className="app-header">
        <div className="header-main">
          <h1 className="brand">
            <span className="logo-dot" />
            burnNbyte
          </h1>
          <div className="header-actions">
            <button className="btn btn-ghost" aria-label="Toggle theme" onClick={toggle}>
              <span className="icon" aria-hidden>
                <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                  <path d="M12 3a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0V4a1 1 0 0 1 1-1Zm7.071 2.929a1 1 0 0 1 0 1.414l-.707.707a1 1 0 0 1-1.414-1.414l.707-.707a1 1 0 0 1 1.414 0ZM21 11a1 1 0 1 1 0 2h-1a1 1 0 1 1 0-2h1ZM5.05 5.636a1 1 0 0 1 1.414 0l.707.707A1 1 0 1 1 5.757 7.757l-.707-.707a1 1 0 0 1 0-1.414ZM4 11a1 1 0 1 1 0 2H3a1 1 0 1 1 0-2h1Zm2.05 6.364a1 1 0 0 1 1.414 0l.707.707A1 1 0 1 1 6.757 20.5l-.707-.707a1 1 0 0 1 0-1.414ZM12 18a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0v-1a1 1 0 0 1 1-1Zm7.071-2.071a1 1 0 0 1-1.414 1.414l-.707-.707A1 1 0 1 1 18.95 14.5l.707.707a1 1 0 0 1 0 1.414Z"/>
                </svg>
              </span>
              <span className="label">Theme</span>
            </button>
          </div>
        </div>
        <div className="header-sub">
          <div className="chip chip-success">On track</div>
          <div className="chip">Goal: Recomp</div>
          <div className="chip">Week 12</div>
        </div>
      </header>

      <main className="app-main">
        {/* Dashboard */}
        <section className={`page ${tab === 'dashboard' ? 'page-active' : ''}`} aria-labelledby="dashTitle">
          <h2 id="dashTitle" className="sr-only">Dashboard</h2>
          <div className="grid">
            <article className="card span-2">
              <header className="card-head">
                <h3>Today</h3>
                <div className="sub">Mon • 8 Apr</div>
              </header>
              <div className="stats">
                <Stat label="Calories" value="1,420" unit="/ 2,200" pct={64} />
                <Stat label="Protein" value="92" unit="g" pct={48} />
                <Stat label="Water" value="1.8" unit="L" pct={60} />
              </div>
            </article>

            <CardList title="Meals" subtitle="Logged" items={[
              { left:"08:10", mid:"Overnight oats", right:"312 kcal" },
              { left:"12:40", mid:"Chicken salad", right:"510 kcal" },
              { left:"16:30", mid:"Greek yogurt", right:"180 kcal" },
            ]} pill />

            <CardList title="Workout" subtitle="Upper body" items={[
              { mid:"Bench press", right:"5x5" },
              { mid:"Rows", right:"4x8" },
              { mid:"Face pulls", right:"3x15" },
            ]} />
          </div>
        </section>

        {/* Log */}
        <section className={`page ${tab === 'log' ? 'page-active' : ''}`} aria-labelledby="logTitle">
          <h2 id="logTitle" className="sr-only">Log</h2>
          <div className="stack">
            <article className="card">
              <header className="card-head">
                <h3>Add Quick Entry</h3>
                <div className="sub">Meal • Water • Workout</div>
              </header>
              <div className="quick-actions">
                <button className="btn btn-primary" onClick={() => setModalOpen(true)}>Add Meal</button>
                <button className="btn btn-outline">Add Water</button>
                <button className="btn btn-outline">Add Workout</button>
              </div>
            </article>

            <CardList title="Recent" subtitle="Today" items={[
              { left:"Meal", mid:"Turkey wrap", right:"430 kcal" },
              { left:"Water", mid:"250 ml", right:"+" },
            ]} pill />
          </div>
        </section>

        {/* Meals */}
        <section className={`page ${tab === 'meals' ? 'page-active' : ''}`} aria-labelledby="mealsTitle">
          <h2 id="mealsTitle" className="sr-only">Meals</h2>
          <div className="stack">
            <article className="card">
              <header className="card-head">
                <h3>Planner</h3>
                <div className="sub">Macros and suggestions</div>
              </header>
              <div className="planner">
                <PlannerCol label="Breakfast" />
                <PlannerCol label="Lunch" />
                <PlannerCol label="Dinner" />
              </div>
            </article>
          </div>
        </section>

        {/* Profile */}
        <section className={`page ${tab === 'profile' ? 'page-active' : ''}`} aria-labelledby="profileTitle">
          <h2 id="profileTitle" className="sr-only">Profile</h2>
          <div className="stack">
            <article className="card">
              <header className="card-head">
                <h3>User</h3>
                <div className="sub">Goals & Settings</div>
              </header>
              <div className="form">
                <label>
                  <span>Daily Calorie Goal</span>
                  <input type="number" placeholder="2200" inputMode="numeric" />
                </label>
                <label>
                  <span>Protein Target (g)</span>
                  <input type="number" placeholder="160" inputMode="numeric" />
                </label>
                <label>
                  <span>Units</span>
                  <select>
                    <option>Metric</option>
                    <option>Imperial</option>
                  </select>
                </label>
                <button className="btn btn-primary">Save</button>
              </div>
            </article>
          </div>
        </section>
      </main>

      <button className="fab" aria-label="Add entry" onClick={() => setModalOpen(true)}>
        <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor" aria-hidden>
          <path d="M12 5a1 1 0 0 1 1 1v5h5a1 1 0 1 1 0 2h-5v5a1 1 0 1 1-2 0v-5H6a1 1 0 1 1 0-2h5V6a1 1 0 0 1 1-1Z"/>
        </svg>
      </button>

      <nav className="tabbar" aria-label="Primary">
        <Tab label="Dashboard" active={tab==='dashboard'} onClick={() => setTab('dashboard')}>
          <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M11 4a1 1 0 0 1 2 0v7a1 1 0 0 1-2 0V4Zm6.657 2.343a1 1 0 1 1 1.414 1.414l-4.95 4.95a1 1 0 0 1-1.414-1.414l4.95-4.95ZM4 11a1 1 0 0 1 1-1h7a1 1 0 1 1 0 2H5a1 1 0 0 1-1-1Zm6.343 4.95a1 1 0 0 1 1.414 0l4.95 4.95a1 1 0 0 1-1.414 1.414l-4.95-4.95a1 1 0 0 1 0-1.414Z"/></svg>
        </Tab>
        <Tab label="Log" active={tab==='log'} onClick={() => setTab('log')}>
          <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M6 4a2 2 0 0 0-2 2v11.5A2.5 2.5 0 0 0 6.5 20H18a2 2 0 0 0 2-2V8.828a2 2 0 0 0-.586-1.414l-3.828-3.828A2 2 0 0 0 14.172 3H6Zm8 1.828a1 1 0 0 1 1.707-.707l3.172 3.172a1 1 0 0 1 .293.707V18a1 1 0 0 1-1 1H6.5a1.5 1.5 0 0 1-1.5-1.5V6a1 1 0 0 1 1-1h8Z"/></svg>
        </Tab>
        <Tab label="Meals" active={tab==='meals'} onClick={() => setTab('meals')}>
          <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M6 3a1 1 0 0 0-1 1v8a2 2 0 1 0 4 0V4a1 1 0 0 0-2 0v3H7V4a1 1 0 0 0-1-1Zm7 1a1 1 0 0 0-1 1v8a4 4 0 1 0 8 0V5a1 1 0 1 0-2 0v4h-1V5a1 1 0 1 0-2 0v4h-1V5a1 1 0 0 0-1-1Z"/></svg>
        </Tab>
        <Tab label="Profile" active={tab==='profile'} onClick={() => setTab('profile')}>
          <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm-7 8a7 7 0 0 1 14 0 1 1 0 0 1-1 1H6a1 1 0 0 1-1-1Z"/></svg>
        </Tab>
      </nav>

      {/* Modal */}
      <div className="modal" aria-hidden={!modalOpen} role="dialog" aria-modal="true" aria-labelledby="addModalTitle">
        <div className="modal-backdrop" onClick={() => setModalOpen(false)} />
        <div className="modal-dialog">
          <header className="modal-head">
            <h3 id="addModalTitle">Add Entry</h3>
            <button className="btn btn-ghost" onClick={() => setModalOpen(false)} aria-label="Close">✕</button>
          </header>
          <div className="modal-body">
            <div className="quick-actions">
              <button className="btn btn-primary">Meal</button>
              <button className="btn btn-outline">Water</button>
              <button className="btn btn-outline">Workout</button>
            </div>
            <label className="sr-only" htmlFor="quickNote">Note</label>
            <input id="quickNote" className="input" placeholder="Optional note" />
          </div>
          <footer className="modal-foot">
            <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={() => setModalOpen(false)}>Save</button>
          </footer>
        </div>
      </div>
    </div>
  );
}

function Tab({ label, active, onClick, children }){
  return (
    <button className={`tab ${active ? 'tab-active' : ''}`} onClick={onClick}>
      <span className="icon" aria-hidden>{children}</span>
      <span className="label">{label}</span>
    </button>
  );
}

function Stat({ label, value, unit, pct }){
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}<span className="unit">{unit}</span></div>
      <div className="progress"><span style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

function CardList({ title, subtitle, items, pill }){
  return (
    <article className="card">
      <header className="card-head">
        <h3>{title}</h3>
        <div className="sub">{subtitle}</div>
      </header>
      <ul className="list">
        {items.map((it, idx) => (
          <li className="list-row" key={idx}>
            {it.left && <span className={pill ? 'pill' : ''}>{it.left}</span>}
            <span>{it.mid}</span>
            {it.right && <span className="muted">{it.right}</span>}
          </li>
        ))}
      </ul>
    </article>
  );
}

function PlannerCol({ label }){
  return (
    <div className="planner-col">
      <div className="planner-head">{label}</div>
      <button className="btn btn-ghost">+ Add</button>
    </div>
  );
}

