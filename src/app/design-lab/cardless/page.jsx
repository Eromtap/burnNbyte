'use client';

import Image from 'next/image';
import { useState } from 'react';
import {
  Activity,
  Apple,
  ArrowUpRight,
  Check,
  ChevronRight,
  Dumbbell,
  Flame,
  Home,
  Lightbulb,
  Minus,
  Plus,
  ShoppingBag,
  Sparkles,
  Target,
  TrendingDown,
  UserRound,
  X,
  Zap,
} from 'lucide-react';
import styles from './page.module.css';

const navItems = [
  { label: 'Today', icon: Home },
  { label: 'Train', icon: Dumbbell },
  { label: 'Fuel', icon: Apple },
  { label: 'Progress', icon: Activity },
];

const days = [
  { day: 'SUN', date: 26, signal: 42 },
  { day: 'MON', date: 27, signal: 76 },
  { day: 'TUE', date: 28, signal: 88 },
  { day: 'WED', date: 29, signal: 68 },
  { day: 'THU', date: 30, signal: 84 },
  { day: 'FRI', date: 31, signal: 55 },
  { day: 'SAT', date: 1, signal: 32 },
];

const rationale = [
  {
    number: '01',
    title: 'Make time the navigation',
    copy: 'Most actions belong to a day. The week rail stays visible and every screen responds to the same selected date.',
  },
  {
    number: '02',
    title: 'One dominant action',
    copy: 'Every view gets one red action. Secondary actions become quiet text links so the user never has to decode priority.',
  },
  {
    number: '03',
    title: 'Replace cards with rhythm',
    copy: 'Rules, whitespace, indentation, and type scale create hierarchy. Containers are reserved for overlays and controls.',
  },
  {
    number: '04',
    title: 'Show direction over data',
    copy: 'A metric earns space only when it answers: what changed, is it good, and what should I do next?',
  },
  {
    number: '05',
    title: 'Design mobile as a field guide',
    copy: 'Now, next, and later collapse into one scroll. The primary action remains reachable without a grid of miniature cards.',
  },
];

function Eyebrow({ children, icon: Icon }) {
  return (
    <div className={styles.eyebrow}>
      {Icon ? <Icon size={14} /> : null}
      <span>{children}</span>
    </div>
  );
}

function SignalRail({ mode }) {
  const signalCopy = {
    Today: ['DAILY SIGNAL', '88', 'Ready to work', 'Your plan and recent recovery are aligned.'],
    Train: ['SESSION SIGNAL', '84', 'Good to push', 'Volume is slightly above last week, recovery is holding.'],
    Fuel: ['FUEL SIGNAL', '76', 'Protein first', 'You are on calories but 37g behind your protein pace.'],
    Progress: ['TREND SIGNAL', '91', 'Direction is clear', 'Four weeks of consistent behavior are producing a stable trend.'],
  }[mode];

  return (
    <aside className={styles.signalRail}>
      <section className={styles.signalPrimary}>
        <Eyebrow icon={Zap}>{signalCopy[0]}</Eyebrow>
        <div className={styles.signalScore}>
          <strong>{signalCopy[1]}</strong>
          <span>/ 100</span>
        </div>
        <h3>{signalCopy[2]}</h3>
        <p>{signalCopy[3]}</p>
        <div className={styles.miniTrend} aria-label="Signal improving">
          <svg viewBox="0 0 280 82" preserveAspectRatio="none">
            <path d="M1 67 C35 61,46 65,73 49 S121 54,151 38 S202 35,224 19 S260 20,279 8" />
            <circle cx="279" cy="8" r="4" />
          </svg>
        </div>
      </section>

      <section className={styles.signalList}>
        <div><span>Training</span><strong>Ready</strong><i style={{ '--fill': '84%' }} /></div>
        <div><span>Nutrition</span><strong>On pace</strong><i style={{ '--fill': '72%' }} /></div>
        <div><span>Recovery</span><strong>Strong</strong><i style={{ '--fill': '89%' }} /></div>
      </section>

      <a className={styles.utilityLink} href="#concept-notes">
        <span><ShoppingBag size={18} /><strong>12 grocery items</strong></span>
        <small>3 already checked</small>
        <ArrowUpRight size={16} />
      </a>
    </aside>
  );
}

function TodayView() {
  const timeline = [
    {
      phase: 'NOW',
      time: '6:20',
      icon: Dumbbell,
      title: 'Upper body strength',
      meta: '42 min · 8 movements · Build phase',
      action: 'Start session',
      active: true,
    },
    {
      phase: 'NEXT',
      time: '7:30',
      icon: Apple,
      title: 'Salmon, rice & greens',
      meta: '610 kcal · 34g protein',
      action: 'View meal',
    },
    {
      phase: 'LATER',
      time: '9:15',
      icon: Target,
      title: 'Close the day',
      meta: 'Log weight and review today’s plan',
      action: 'Review',
    },
  ];

  return (
    <div className={styles.contentLayout}>
      <section className={styles.mainColumn}>
        <header className={styles.hero}>
          <Eyebrow icon={Sparkles}>TUESDAY · ON TRACK</Eyebrow>
          <h2>Do the next<br /><em>right thing.</em></h2>
          <p>Your plan is already resolved into the next useful action. Everything else can wait.</p>
        </header>

        <section className={styles.timeline}>
          <div className={styles.sectionHeading}>
            <div><Eyebrow>THE DAY</Eyebrow><h3>Now, next, later</h3></div>
            <button type="button">Edit the plan <ArrowUpRight size={15} /></button>
          </div>
          <div className={styles.timelineRows}>
            {timeline.map(({ phase, time, icon: Icon, title, meta, action, active }) => (
              <div key={phase} className={active ? styles.timelineActive : ''}>
                <span className={styles.phase}>{phase}</span>
                <time>{time}</time>
                <i><Icon size={19} /></i>
                <span className={styles.timelineCopy}><strong>{title}</strong><small>{meta}</small></span>
                <button type="button" className={active ? styles.primaryAction : ''}>
                  {action} <ChevronRight size={16} />
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.evidenceBand}>
          <div><Eyebrow>WHY THIS PLAN</Eyebrow><h3>Built around today’s capacity.</h3></div>
          <p>Training volume is up 6%, calories match the session, and your weight trend remains inside the target pace.</p>
          <button type="button">See the reasoning <ArrowUpRight size={16} /></button>
        </section>
      </section>
      <SignalRail mode="Today" />
    </div>
  );
}

function TrainView() {
  const movements = [
    { index: '01', name: 'Barbell bench press', prescription: '4 × 6', load: '165 lb', state: 'Ready' },
    { index: '02', name: 'Chest-supported row', prescription: '4 × 8', load: '120 lb', state: 'Ready' },
    { index: '03', name: 'Seated shoulder press', prescription: '3 × 10', load: '45 lb', state: 'Ready' },
    { index: '04', name: 'Cable fly + face pull', prescription: '3 × 12', load: 'Moderate', state: 'Later' },
  ];

  return (
    <div className={styles.contentLayout}>
      <section className={styles.mainColumn}>
        <header className={styles.hero}>
          <Eyebrow icon={Dumbbell}>UPPER STRENGTH · 42 MIN</Eyebrow>
          <h2>The session is<br /><em>the interface.</em></h2>
          <p>Only the movement you are doing now needs emphasis. The rest becomes a quiet, legible sequence.</p>
        </header>

        <section className={styles.movementSection}>
          <div className={styles.sectionHeading}>
            <div><Eyebrow>WORKING PLAN</Eyebrow><h3>Eight movements</h3></div>
            <button type="button">Adjust session <ArrowUpRight size={15} /></button>
          </div>
          <div className={styles.movementRows}>
            {movements.map((movement, index) => (
              <button type="button" key={movement.index} className={index === 0 ? styles.movementActive : ''}>
                <span>{movement.index}</span>
                <i>{index === 0 ? <Flame size={17} /> : null}</i>
                <span><strong>{movement.name}</strong><small>{movement.prescription} · {movement.load}</small></span>
                <em>{movement.state}</em>
                <ChevronRight size={17} />
              </button>
            ))}
          </div>
        </section>

        <section className={styles.inlineAction}>
          <span><Flame size={20} /><strong>Estimated burn</strong><small>360 kcal</small></span>
          <button type="button" className={styles.primaryAction}>Start movement one <ChevronRight size={17} /></button>
        </section>
      </section>
      <SignalRail mode="Train" />
    </div>
  );
}

function FuelView({ servings, setServings }) {
  const meals = [
    { time: '8:10', name: 'Protein oats & berries', meta: '410 kcal · 31g protein', state: 'Done' },
    { time: '12:30', name: 'Chicken harvest bowl', meta: '560 kcal · 46g protein', state: 'Done' },
    { time: '6:45', name: 'Salmon, rice & greens', meta: `${610 * servings} kcal · ${34 * servings}g protein`, state: 'Next' },
  ];

  return (
    <div className={styles.contentLayout}>
      <section className={styles.mainColumn}>
        <header className={styles.hero}>
          <Eyebrow icon={Apple}>ADAPTIVE NUTRITION</Eyebrow>
          <h2>Feed the work.<br /><em>Hide the math.</em></h2>
          <p>Lead with meals and decisions. Keep macros nearby, but do not make people operate a spreadsheet.</p>
        </header>

        <section className={styles.mealTimeline}>
          <div className={styles.sectionHeading}>
            <div><Eyebrow>TODAY’S FUEL</Eyebrow><h3>Three meals planned</h3></div>
            <button type="button">Add food <Plus size={15} /></button>
          </div>
          <div className={styles.mealRows}>
            {meals.map((meal) => (
              <button type="button" key={meal.time}>
                <time>{meal.time}</time>
                <span><strong>{meal.name}</strong><small>{meal.meta}</small></span>
                <em className={meal.state === 'Done' ? styles.done : ''}>
                  {meal.state === 'Done' ? <Check size={13} /> : null}{meal.state}
                </em>
                <ChevronRight size={17} />
              </button>
            ))}
          </div>
        </section>

        <section className={styles.servingBand}>
          <div><Eyebrow>DINNER PORTION</Eyebrow><h3>Salmon, rice & greens</h3></div>
          <div className={styles.stepper}>
            <button type="button" onClick={() => setServings((value) => Math.max(1, value - 1))}><Minus size={16} /></button>
            <span><strong>{servings}</strong><small>serving{servings === 1 ? '' : 's'}</small></span>
            <button type="button" onClick={() => setServings((value) => Math.min(3, value + 1))}><Plus size={16} /></button>
          </div>
          <button type="button" className={styles.primaryAction}>Log dinner <ChevronRight size={17} /></button>
        </section>
      </section>
      <SignalRail mode="Fuel" />
    </div>
  );
}

function ProgressView() {
  const evidence = [
    ['CONSISTENCY', '23 of 28 days', 'You are showing up often enough for the plan to work.'],
    ['STRENGTH', '+15 lb', 'Bench press has moved in three consecutive training blocks.'],
    ['NUTRITION', '81%', 'Protein adherence is the strongest predictor in your current trend.'],
  ];

  return (
    <div className={styles.contentLayout}>
      <section className={styles.mainColumn}>
        <header className={styles.hero}>
          <Eyebrow icon={TrendingDown}>LAST 28 DAYS</Eyebrow>
          <h2>Show direction.<br /><em>Hide the noise.</em></h2>
          <p>Progress should answer whether the system is working—not expose every number the system has collected.</p>
        </header>

        <section className={styles.chartSection}>
          <div className={styles.sectionHeading}>
            <div><Eyebrow>WEIGHT TREND</Eyebrow><h3>Moving at a sustainable pace</h3></div>
            <strong>−4.2 <small>lb</small></strong>
          </div>
          <div className={styles.chart}>
            <span>184</span><span>181</span><span>178</span>
            <svg viewBox="0 0 720 210" preserveAspectRatio="none">
              <defs>
                <linearGradient id="cardless-chart" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#70dca7" stopOpacity=".18" />
                  <stop offset="100%" stopColor="#70dca7" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path className={styles.chartFill} d="M0 35 C75 20,125 59,204 48 S325 82,395 91 S510 115,570 137 S664 140,720 174 L720 210 L0 210Z" />
              <path className={styles.chartLine} d="M0 35 C75 20,125 59,204 48 S325 82,395 91 S510 115,570 137 S664 140,720 174" />
            </svg>
          </div>
        </section>

        <section className={styles.evidenceRows}>
          <div className={styles.sectionHeading}><div><Eyebrow>WHAT MATTERS</Eyebrow><h3>Evidence, not trophies</h3></div></div>
          {evidence.map(([label, value, copy]) => (
            <div key={label}><span>{label}</span><strong>{value}</strong><p>{copy}</p><ArrowUpRight size={15} /></div>
          ))}
        </section>
      </section>
      <SignalRail mode="Progress" />
    </div>
  );
}

export default function CardlessDesignLabPage() {
  const [activeView, setActiveView] = useState('Today');
  const [selectedDay, setSelectedDay] = useState(2);
  const [notesOpen, setNotesOpen] = useState(false);
  const [servings, setServings] = useState(1);

  return (
    <main className={styles.viewport}>
      <div className={styles.watermark} aria-hidden>
        <Image src="/logo.png" alt="" fill sizes="680px" priority />
      </div>

      <aside className={styles.rail}>
        <div className={styles.brand}>
          <Image src="/logo.png" alt="burnNbyte" width={42} height={42} priority />
          <span>burnNbyte</span>
        </div>
        <nav aria-label="Concept pages">
          {navItems.map(({ label, icon: Icon }) => (
            <button
              key={label}
              type="button"
              className={activeView === label ? styles.navActive : ''}
              onClick={() => setActiveView(label)}
            >
              <Icon size={19} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <button className={styles.notesTrigger} type="button" onClick={() => setNotesOpen(true)}>
          <Lightbulb size={18} />
          <span>Concept notes</span>
        </button>
        <button className={styles.profile} type="button">
          <span>JD</span>
          <div><strong>Jordan</strong><small>Week 6</small></div>
          <ChevronRight size={15} />
        </button>
      </aside>

      <section className={styles.canvas}>
        <header className={styles.topbar}>
          <div>
            <span>CONCEPT 02 · CARDLESS FIELD GUIDE</span>
            <h1>{activeView === 'Today' ? 'Good evening, Jordan.' : {
              Train: 'The work in front of you.',
              Fuel: 'Eat for the day you’re having.',
              Progress: 'Proof the system is working.',
            }[activeView]}</h1>
          </div>
          <button type="button" onClick={() => setNotesOpen(true)}>
            <Lightbulb size={17} /><span>Why this direction</span>
          </button>
          <i><UserRound size={18} /></i>
        </header>

        <nav className={styles.dayRail} aria-label="Select a day">
          {days.map((day, index) => (
            <button
              type="button"
              key={`${day.day}-${day.date}`}
              className={selectedDay === index ? styles.dayActive : ''}
              onClick={() => setSelectedDay(index)}
            >
              <span>{day.day}</span>
              <strong>{day.date}</strong>
              <i><b style={{ height: `${day.signal}%` }} /></i>
            </button>
          ))}
        </nav>

        {activeView === 'Today' ? <TodayView /> : null}
        {activeView === 'Train' ? <TrainView /> : null}
        {activeView === 'Fuel' ? <FuelView servings={servings} setServings={setServings} /> : null}
        {activeView === 'Progress' ? <ProgressView /> : null}
      </section>

      <nav className={styles.mobileNav} aria-label="Concept pages">
        {navItems.map(({ label, icon: Icon }) => (
          <button
            key={label}
            type="button"
            className={activeView === label ? styles.navActive : ''}
            onClick={() => setActiveView(label)}
          >
            <Icon size={19} /><span>{label}</span>
          </button>
        ))}
      </nav>

      <div className={`${styles.notes} ${notesOpen ? styles.notesOpen : ''}`} aria-hidden={!notesOpen}>
        <button className={styles.notesBackdrop} type="button" onClick={() => setNotesOpen(false)} aria-label="Close notes" />
        <aside id="concept-notes">
          <header>
            <div><span>DESIGN RATIONALE</span><h2>What changes next.</h2></div>
            <button type="button" onClick={() => setNotesOpen(false)} aria-label="Close notes"><X size={19} /></button>
          </header>
          <div className={styles.noteRows}>
            {rationale.map((note) => (
              <section key={note.number}>
                <span>{note.number}</span>
                <div><h3>{note.title}</h3><p>{note.copy}</p></div>
              </section>
            ))}
          </div>
          <footer>
            <Flame size={18} />
            <p><strong>Recommendation:</strong> use this system for Today, Train, Fuel, and Progress first. Let utility pages inherit the typography and rules without forcing the timeline metaphor.</p>
          </footer>
        </aside>
      </div>
    </main>
  );
}
