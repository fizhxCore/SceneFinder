import PasswordField from "../../components/PasswordField.jsx";

export const metadata = { title: "Masuk | Scene Finder", robots: { index: false, follow: false } };

export default async function Login({ searchParams }) {
  const sp = await searchParams;
  return (
    <main className="login">
      <form className="login-card" method="post" action="/api/login">
        <div className="login-brand">
          <span className="logo-mark" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 16 16"><path d="M4 2.5v11l9-5.5z" fill="currentColor" /></svg>
          </span>
          SceneFinder
        </div>
        <h1>Masuk</h1>
        <p>Cari scene K-Drama untuk bahan edit. Masukkan sandi untuk lanjut.</p>
        <PasswordField />
        {sp?.salah && <p className="login-err" role="alert">Sandinya salah. Coba lagi.</p>}
        <button type="submit" className="cta cta-ink">Masuk</button>
      </form>
    </main>
  );
}
