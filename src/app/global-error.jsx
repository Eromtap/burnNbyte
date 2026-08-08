'use client';

export default function GlobalError({ reset }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, color: '#f5f3ef', background: '#080808', fontFamily: 'Arial, sans-serif' }}>
        <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
          <section style={{ width: 'min(620px, 100%)', borderTop: '1px solid #ff453a', paddingTop: 32 }}>
            <small style={{ color: '#ff6b61', fontWeight: 700, letterSpacing: '.14em' }}>BURNNBYTE</small>
            <h1 style={{ margin: '22px 0 12px', fontSize: 'clamp(2.8rem, 8vw, 5rem)', lineHeight: .95 }}>We need to reload the app.</h1>
            <p style={{ maxWidth: 520, color: '#aaa', lineHeight: 1.7 }}>Your saved plan is still safe. Reload the application to reconnect.</p>
            <button type="button" onClick={reset} style={{ marginTop: 24, minHeight: 46, padding: '0 20px', border: 0, borderRadius: 10, color: '#fff', background: '#ff453a', fontWeight: 700, cursor: 'pointer' }}>
              Reload burnNbyte
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
