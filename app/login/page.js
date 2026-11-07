import PasswordField from "../../components/PasswordField.jsx";

export const metadata = { title: "Masuk | Scene Finder", robots: { index: false, follow: false } };

export default async function Login({ searchParams }) {
  const sp = await searchParams;
  return (
    <main className="login">
      <form className="login-card" method="post" action="/api/login">
        <div className="login-head">
          <img className="login-logo" src="/logo-sm.png" alt="SceneFinder" width="92" height="77" />
          <h1>Masuk</h1>
        </div>
        <p>Cari scene K-Drama untuk bahan edit. Masukkan sandi untuk lanjut.</p>
        <PasswordField />
        {sp?.salah && <p className="login-err" role="alert">Sandinya salah. Coba lagi.</p>}
        <button type="submit" className="cta cta-ink">Masuk</button>
      </form>
    </main>
  );
}
