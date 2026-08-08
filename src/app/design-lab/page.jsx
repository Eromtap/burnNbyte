'use client';

import Image from 'next/image';
import { useState } from 'react';
import {
  Activity,
  Apple,
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronRight,
  Dumbbell,
  Flame,
  Home,
  LockKeyhole,
  Medal,
  Plus,
  ShoppingBag,
  Sparkles,
  Target,
  Trophy,
  TrendingDown,
  UserRound,
  Zap,
} from 'lucide-react';
import styles from './page.module.css';

const days = [
  { day: 'M', date: 27 },
  { day: 'T', date: 28 },
  { day: 'W', date: 29 },
  { day: 'T', date: 30 },
  { day: 'F', date: 31 },
  { day: 'S', date: 1 },
  { day: 'S', date: 2 },
];

const navItems = [
  { label: 'Today', icon: Home },
  { label: 'Train', icon: Dumbbell },
  { label: 'Fuel', icon: Apple },
  { label: 'Progress', icon: Activity },
];

const screenTitles = {
  Today: 'Good morning, Jordan.',
  Train: 'Your training week.',
  Fuel: 'Fuel the work.',
  Progress: 'Proof you’re moving.',
};

const quests = [
  { label: 'Complete 3 workouts', progress: '2 / 3', done: false },
  { label: 'Hit protein target 4 days', progress: '3 / 4', done: false },
  { label: 'Log a new personal best', progress: '+75 XP', done: true },
];

function MomentumPanel() {
  return (
    <aside className={styles.momentum}>
      <section className={styles.levelPanel}>
        <div className={styles.levelTop}>
          <span className={styles.levelNumber}>12</span>
          <div>
            <span className={styles.eyebrow}>LEVEL</span>
            <strong>Consistent</strong>
          </div>
          <Zap size={21} />
        </div>
        <div className={styles.xpTrack}><span style={{ width: '72%' }} /></div>
        <div className={styles.xpMeta}><span>1,440 XP</span><span>560 to level 13</span></div>
      </section>

      <section className={styles.questPanel}>
        <div className={styles.sectionHeading}>
          <div>
            <span className={styles.eyebrow}>THIS WEEK</span>
            <h3>Quests</h3>
          </div>
          <strong className={styles.questReward}>+300 XP</strong>
        </div>
        <div className={styles.questRows}>
          {quests.map((quest) => (
            <div key={quest.label} className={quest.done ? styles.questDone : ''}>
              <i>{quest.done ? <Check size={14} /> : null}</i>
              <span><strong>{quest.label}</strong><small>{quest.progress}</small></span>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.streakPanel}>
        <Flame size={21} />
        <div><strong>11 day streak</strong><span>One action keeps it alive</span></div>
        <ChevronRight size={17} />
      </section>
    </aside>
  );
}

function TrainScreen() {
  const sessions = [
    { day: 'TUE', name: 'Upper body strength', meta: '42 min · 8 movements', state: 'Today' },
    { day: 'THU', name: 'Lower body power', meta: '48 min · 7 movements', state: 'Ready' },
    { day: 'SAT', name: 'Conditioning + core', meta: '32 min · 6 movements', state: 'Locked' },
  ];

  return (
    <div className={styles.featureLayout}>
      <section className={styles.featureMain}>
        <div className={styles.featureHero}>
          <div>
            <div className={styles.status}><Dumbbell size={15} /><span>WEEK 6 · BUILD PHASE</span></div>
            <h2>Three sessions.<br />One clear objective.</h2>
            <p>Build strength without burying recovery. Your next session is adjusted from last week’s performance.</p>
          </div>
          <div className={styles.weekScore}>
            <span className={styles.eyebrow}>WEEK SCORE</span>
            <strong>86</strong>
            <small>Strong pace</small>
          </div>
        </div>

        <section className={styles.openSection}>
          <div className={styles.sectionHeading}>
            <div><span className={styles.eyebrow}>PROGRAM</span><h3>This week</h3></div>
            <button type="button"><CalendarDays size={17} /> Calendar</button>
          </div>
          <div className={styles.sessionRows}>
            {sessions.map((session, index) => (
              <button key={session.day} type="button">
                <time>{session.day}</time>
                <span className={styles.sessionIndex}>0{index + 1}</span>
                <span><strong>{session.name}</strong><small>{session.meta}</small></span>
                <i className={session.state === 'Today' ? styles.sessionToday : ''}>
                  {session.state === 'Locked' && <LockKeyhole size={13} />}
                  {session.state}
                </i>
                <ChevronRight size={18} />
              </button>
            ))}
          </div>
        </section>

        <section className={styles.recordBand}>
          <Trophy size={24} />
          <div><span className={styles.eyebrow}>PERSONAL RECORD</span><strong>Bench press · 165 lb</strong></div>
          <span>+5 lb this month</span>
        </section>
      </section>
      <MomentumPanel />
    </div>
  );
}

function FuelScreen() {
  const macros = [
    { label: 'Protein', value: '128 / 165g', width: '78%' },
    { label: 'Carbs', value: '142 / 220g', width: '65%' },
    { label: 'Fat', value: '48 / 68g', width: '71%' },
  ];

  return (
    <div className={styles.featureLayout}>
      <section className={styles.featureMain}>
        <div className={`${styles.featureHero} ${styles.fuelHero}`}>
          <div>
            <div className={styles.status}><Apple size={15} /><span>ADAPTIVE NUTRITION</span></div>
            <h2>Eat for the day<br />you’re having.</h2>
            <p>Your targets flex with training and recovery. Today needs more protein, not more restriction.</p>
          </div>
          <div className={styles.fuelTotal}>
            <span className={styles.eyebrow}>REMAINING</span>
            <strong>620</strong>
            <small>calories</small>
          </div>
        </div>

        <section className={styles.openSection}>
          <div className={styles.sectionHeading}>
            <div><span className={styles.eyebrow}>DAILY TARGETS</span><h3>Macro balance</h3></div>
            <button type="button">Adjust targets <ArrowUpRight size={16} /></button>
          </div>
          <div className={styles.macroLines}>
            {macros.map((macro) => (
              <div key={macro.label}>
                <span><strong>{macro.label}</strong><small>{macro.value}</small></span>
                <i><b style={{ width: macro.width }} /></i>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.openSection}>
          <div className={styles.sectionHeading}>
            <div><span className={styles.eyebrow}>TONIGHT</span><h3>Salmon, rice & greens</h3></div>
            <button type="button"><Plus size={17} /> Swap meal</button>
          </div>
          <div className={styles.recipeLine}>
            <span><strong>34g</strong><small>protein</small></span>
            <span><strong>52g</strong><small>carbs</small></span>
            <span><strong>18g</strong><small>fat</small></span>
            <button type="button">Start cooking <ChevronRight size={17} /></button>
          </div>
        </section>
      </section>
      <MomentumPanel />
    </div>
  );
}

function ProgressScreen() {
  const wins = [
    { icon: Medal, label: 'Consistency', detail: 'Logged 5 days in a row', xp: '+50 XP' },
    { icon: Dumbbell, label: 'Strength gain', detail: '3 new personal records', xp: '+120 XP' },
    { icon: Target, label: 'Protein pro', detail: 'Target hit 80% this month', xp: '+75 XP' },
  ];

  return (
    <div className={styles.featureLayout}>
      <section className={styles.featureMain}>
        <div className={styles.progressHero}>
          <div>
            <div className={styles.status}><Activity size={15} /><span>LAST 30 DAYS</span></div>
            <h2>Small actions.<br />Visible change.</h2>
          </div>
          <div className={styles.progressStats}>
            <span><strong>14</strong><small>workouts</small></span>
            <span><strong>82%</strong><small>nutrition</small></span>
            <span><strong>−4.2</strong><small>pounds</small></span>
          </div>
        </div>

        <section className={styles.trendSection}>
          <div className={styles.sectionHeading}>
            <div><span className={styles.eyebrow}>WEIGHT TREND</span><h3>Moving sustainably</h3></div>
            <button type="button">Last 30 days <ChevronRight size={16} /></button>
          </div>
          <div className={styles.largeChart}>
            <div className={styles.chartLabels}><span>184</span><span>181</span><span>178</span></div>
            <svg viewBox="0 0 720 190" preserveAspectRatio="none" aria-label="Weight trending down">
              <defs>
                <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ff453a" stopOpacity=".22" />
                  <stop offset="100%" stopColor="#ff453a" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path className={styles.chartArea} d="M0 30 C80 20,125 58,205 48 S330 80,395 88 S510 110,570 128 S665 130,720 160 L720 190 L0 190Z" />
              <path className={styles.chartPath} d="M0 30 C80 20,125 58,205 48 S330 80,395 88 S510 110,570 128 S665 130,720 160" />
            </svg>
          </div>
        </section>

        <section className={styles.openSection}>
          <div className={styles.sectionHeading}>
            <div><span className={styles.eyebrow}>RECENTLY EARNED</span><h3>Milestones</h3></div>
          </div>
          <div className={styles.winRows}>
            {wins.map(({ icon: Icon, label, detail, xp }) => (
              <div key={label}><Icon size={20} /><span><strong>{label}</strong><small>{detail}</small></span><b>{xp}</b></div>
            ))}
          </div>
        </section>
      </section>
      <MomentumPanel />
    </div>
  );
}

export default function DesignLabPage() {
  const [selectedDay, setSelectedDay] = useState(1);
  const [water, setWater] = useState(5);
  const [activeNav, setActiveNav] = useState('Today');

  return (
    <main className={styles.viewport}>
      <div className={styles.watermark} aria-hidden>
        <Image src="/logo.png" alt="" fill sizes="720px" priority />
      </div>

      <aside className={styles.rail}>
        <div className={styles.brand}>
          <Image src="/logo.png" alt="burnNbyte" width={46} height={46} priority />
          <span>burnNbyte</span>
        </div>

        <nav aria-label="Concept navigation">
          {navItems.map(({ label, icon: Icon }) => (
            <button
              key={label}
              className={activeNav === label ? styles.navActive : ''}
              onClick={() => setActiveNav(label)}
              type="button"
            >
              <Icon size={20} strokeWidth={1.8} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <button className={styles.profile} type="button" aria-label="Open profile">
          <span>JD</span>
          <div>
            <strong>Jordan</strong>
            <small>Week 6</small>
          </div>
          <ChevronRight size={16} />
        </button>
      </aside>

      <section className={styles.canvas}>
        <header className={styles.topbar}>
          <div>
            <span className={styles.eyebrow}>TUESDAY · JUL 28</span>
            <h1>{screenTitles[activeNav]}</h1>
          </div>
          <button className={styles.avatar} type="button" aria-label="Open profile">
            <UserRound size={20} />
          </button>
        </header>

        <div className={styles.dayStrip} aria-label="Choose day">
          {days.map((item, index) => (
            <button
              key={`${item.day}-${item.date}`}
              type="button"
              className={selectedDay === index ? styles.dayActive : ''}
              onClick={() => setSelectedDay(index)}
            >
              <span>{item.day}</span>
              <strong>{item.date}</strong>
            </button>
          ))}
        </div>

        {activeNav === 'Today' && <div className={styles.layout}>
          <section className={styles.primary}>
            <div className={styles.hero}>
              <div className={styles.heroCopy}>
                <div className={styles.status}>
                  <Sparkles size={15} />
                  <span>ON TRACK TODAY</span>
                </div>
                <h2>Build the day.<br />Keep the streak.</h2>
                <p>
                  You’re 620 calories from target with one strength session ready.
                  The hard thinking is already done.
                </p>
              </div>

              <div className={styles.energy}>
                <div className={styles.energyRing}>
                  <div>
                    <strong>1,480</strong>
                    <span>of 2,100 kcal</span>
                  </div>
                </div>
                <div className={styles.energyLegend}>
                  <span><i className={styles.redDot} /> eaten</span>
                  <span><i /> remaining</span>
                </div>
              </div>
            </div>

            <section className={styles.nextSection}>
              <div className={styles.sectionHeading}>
                <div>
                  <span className={styles.eyebrow}>UP NEXT</span>
                  <h3>Upper body strength</h3>
                </div>
                <button type="button">View workout <ArrowUpRight size={16} /></button>
              </div>

              <div className={styles.workoutLine}>
                <div>
                  <Dumbbell size={22} />
                  <span><strong>42</strong><small>minutes</small></span>
                </div>
                <div>
                  <Flame size={22} />
                  <span><strong>360</strong><small>estimated burn</small></span>
                </div>
                <div>
                  <Activity size={22} />
                  <span><strong>8</strong><small>movements</small></span>
                </div>
                <button className={styles.startButton} type="button">
                  Start session <ChevronRight size={18} />
                </button>
              </div>
            </section>

            <section className={styles.meals}>
              <div className={styles.sectionHeading}>
                <div>
                  <span className={styles.eyebrow}>TODAY’S FUEL</span>
                  <h3>Meals</h3>
                </div>
                <button type="button"><Plus size={17} /> Add food</button>
              </div>

              <div className={styles.mealRows}>
                <button type="button">
                  <time>8:10</time>
                  <span><strong>Protein oats & berries</strong><small>Breakfast · 410 kcal</small></span>
                  <i className={styles.complete}>✓</i>
                </button>
                <button type="button">
                  <time>12:30</time>
                  <span><strong>Chicken harvest bowl</strong><small>Lunch · 560 kcal</small></span>
                  <ChevronRight size={18} />
                </button>
                <button type="button">
                  <time>6:45</time>
                  <span><strong>Salmon, rice & greens</strong><small>Dinner · 610 kcal</small></span>
                  <ChevronRight size={18} />
                </button>
              </div>
            </section>
          </section>

          <aside className={styles.insights}>
            <section className={styles.insightIntro}>
              <span className={styles.eyebrow}>WEEKLY SIGNAL</span>
              <div className={styles.signalValue}>
                <TrendingDown size={22} />
                <strong>1.8</strong>
                <span>lb</span>
              </div>
              <p>Your trend is moving at a sustainable pace.</p>
              <div className={styles.sparkline} aria-label="Weight trending down">
                <svg viewBox="0 0 260 84" role="img">
                  <path d="M2 15 C38 10, 45 31, 78 27 S119 38, 145 43 S190 47, 216 63 S246 61, 258 73" />
                  <circle cx="258" cy="73" r="4" />
                </svg>
              </div>
            </section>

            <section className={styles.hydration}>
              <div className={styles.sectionHeading}>
                <div>
                  <span className={styles.eyebrow}>HYDRATION</span>
                  <h3>{water} of 8 glasses</h3>
                </div>
                <button type="button" onClick={() => setWater((value) => Math.min(8, value + 1))}>
                  <Plus size={17} /> Log
                </button>
              </div>
              <div className={styles.waterTrack}>
                {Array.from({ length: 8 }, (_, index) => (
                  <span key={index} className={index < water ? styles.waterFilled : ''} />
                ))}
              </div>
            </section>

            <button className={styles.groceryLink} type="button">
              <span><ShoppingBag size={19} /><strong>Grocery list</strong></span>
              <small>12 items · 3 checked</small>
              <ArrowUpRight size={17} />
            </button>
          </aside>
        </div>}
        {activeNav === 'Train' && <TrainScreen />}
        {activeNav === 'Fuel' && <FuelScreen />}
        {activeNav === 'Progress' && <ProgressScreen />}
      </section>

      <nav className={styles.mobileNav} aria-label="Mobile concept navigation">
        {navItems.map(({ label, icon: Icon }) => (
          <button
            key={label}
            className={activeNav === label ? styles.navActive : ''}
            onClick={() => setActiveNav(label)}
            type="button"
          >
            <Icon size={20} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </main>
  );
}
