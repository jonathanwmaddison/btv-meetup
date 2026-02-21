import { requireRole } from "@/lib/auth";
import { RoleForm } from "@/components/role-form";

export default async function AdminUsersPage() {
  const { supabase } = await requireRole(["admin"]);
  const { data: users } = await supabase
    .from("profiles")
    .select("id,name,email,role")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <section className="card">
      <h1>User Roles</h1>
      <p>
        <a href="/admin/email-jobs">Open Email Ops</a>
      </p>
      <table className="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {users?.map((u) => (
            <tr key={u.id}>
              <td>{u.name}</td>
              <td>{u.email}</td>
              <td>{u.role}</td>
              <td>
                <RoleForm userId={u.id} currentRole={u.role} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
