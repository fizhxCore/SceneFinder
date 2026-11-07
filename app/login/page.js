import PasswordField from "../../components/PasswordField.jsx";

export const metadata = { title: "Masuk | Scene Finder", robots: { index: false, follow: false } };

export default async function Login({ searchParams }) {
  const sp = await searchParams;
  return (
    <main className="login">
      <img className="login-logo" src="/logo.png" alt="SceneFinder" width="640" height="539" />
      <form className="login-card" method="post" action="/api/login">
        <h1>Masuk</h1>
        <p>Cari scene K-Drama untuk bahan edit. Masukkan sandi untuk lanjut.</p>
        <PasswordField />
        {sp?.salah && <p className="login-err" role="alert">Sandinya salah. Coba lagi.</p>}
        <button type="submit" className="cta cta-ink">Masuk</button>
      </form>
    </main>
  );
}
