export const metadata = { title: "Masuk | Scene Finder", robots: { index: false, follow: false } };

export default async function Login({ searchParams }) {
  const sp = await searchParams;
  return (
    <main className="login">
      <form className="login-card" method="post" action="/api/login">
        <span className="logo-mark" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 16 16"><path d="M4 2.5v11l9-5.5z" fill="currentColor" /></svg>
        </span>
        <h1>Masuk</h1>
        <p>Cari scene K-Drama untuk bahan edit. Masukkan sandi untuk lanjut.</p>
        <label className="login-field">
          <span>Sandi</span>
          <input type="password" name="password" required autoFocus autoComplete="current-password" />
        </label>
        {sp?.salah && <p className="login-err" role="alert">Sandinya salah. Coba lagi.</p>}
        <button type="submit" className="cta cta-ink">Masuk</button>
      </form>
    </main>
  );
}
