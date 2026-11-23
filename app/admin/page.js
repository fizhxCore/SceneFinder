import { cookies } from "next/headers";
import PasswordField from "../../components/PasswordField.jsx";
import AdminDashboard from "../../components/AdminDashboard.jsx";
import { ADMIN_COOKIE, verifyAdminToken } from "../../lib/adminSession.js";

export const metadata = { title: "Admin | Scene Finder", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const PESAN = {
  salah: "Kuncinya salah. Coba lagi.",
  terkunci: "Terlalu banyak percobaan. Coba lagi dalam 15 menit.",
  belum: "Admin belum diatur di server (ADMIN_KEY belum diisi).",
};

export default async function AdminPage({ searchParams }) {
  const sp = await searchParams;
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  const exp = await verifyAdminToken(token, process.env.ADMIN_KEY);

  if (exp) {
    return (
      <main className="ad-main">
        <AdminDashboard expiresAt={exp} />
      </main>
    );
  }

  const pesan = PESAN[Object.keys(PESAN).find((k) => sp?.[k])];
  return (
    <main className="login">
      <form className="login-card" method="post" action="/api/admin/login">
        <div className="login-head">
          <img className="login-logo" src="/logo-sm.png" alt="SceneFinder" width="92" height="77" />
          <h1>Admin</h1>
        </div>
        <p>Masukkan kunci admin. Cukup sekali, sesi bertahan 7 hari di perangkat ini.</p>
        <PasswordField label="Kunci admin" placeholder="Masukkan kunci admin" autoComplete="off" />
        {pesan && (
          <p className="login-err" role="alert">
            {pesan}
          </p>
        )}
        <button type="submit" className="cta cta-ink">
          Masuk
        </button>
        <a className="admin-back" href="/">← Kembali ke beranda</a>
      </form>
    </main>
  );
}
