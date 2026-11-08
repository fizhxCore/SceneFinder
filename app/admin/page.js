import AdminForm from "../../components/AdminForm.jsx";

export const metadata = { title: "Admin | Scene Finder", robots: { index: false, follow: false } };

export default function AdminPage() {
  return (
    <main className="login">
      <AdminForm />
    </main>
  );
}
