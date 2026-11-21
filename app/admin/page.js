import AdminForm from "../../components/AdminForm.jsx";
import AdminRequests from "../../components/AdminRequests.jsx";

export const metadata = { title: "Admin | Scene Finder", robots: { index: false, follow: false } };

export default function AdminPage() {
  return (
    <main className="login">
      <div className="admin-stack">
        <AdminForm />
        <AdminRequests />
      </div>
    </main>
  );
}
