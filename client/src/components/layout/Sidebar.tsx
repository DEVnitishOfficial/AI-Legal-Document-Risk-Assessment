import { LayoutDashboard, FileText, LogOut } from "lucide-react";
import { useDispatch } from "react-redux";
import { logout } from "../../features/auth/authSlice";

export default function Sidebar() {
  const dispatch = useDispatch();

  return (
    <div className="w-64 bg-gray-900 p-5 flex flex-col justify-between">
      <div>
        <h1 className="text-xl font-bold mb-10">LegalAI</h1>

        <nav className="space-y-4">
          <NavItem icon={<LayoutDashboard />} label="Dashboard" />
          <NavItem icon={<FileText />} label="Documents" />
        </nav>
      </div>

      <button
        onClick={() => dispatch(logout())}
        className="flex items-center gap-2 text-red-400"
      >
        <LogOut size={18} /> Logout
      </button>
    </div>
  );
}

function NavItem({ icon, label }: any) {
  return (
    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-800 cursor-pointer">
      {icon}
      <span>{label}</span>
    </div>
  );
}