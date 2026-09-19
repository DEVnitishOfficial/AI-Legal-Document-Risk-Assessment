import {
  LayoutDashboard,
  FileText,
  Scale,
  LogOut,
  Menu,
  X,
  Landmark,
  ShieldCheck,
  Headset,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { logout } from "../../features/auth/authSlice";
import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import ThemeToggle from "../ThemeToggle";

export default function Sidebar() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useSelector((state: any) => state.auth.user);

  const [isOpen, setIsOpen] = useState(() => {
    return localStorage.getItem("sidebarOpen") === "true";
  });

  // 🔹 Persist state
  useEffect(() => {
    localStorage.setItem("sidebarOpen", String(isOpen));
  }, [isOpen]);

  // 🔹 ESC key to close (mobile UX)
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  const handleLogout = () => {
    // logout() clears the token, so ProtectedRoute redirects the moment it
    // re-renders. It reads the `loggedOut` flag to send people to "/" instead
    // of /login, so that redirect and this navigate agree on the destination.
    // `replace` keeps Back from returning to a protected page.
    dispatch(logout());
    toast.success("Logged out successfully!");
    navigate("/", { replace: true });
  };

  const navItems = [
    { label: "Dashboard", icon: <LayoutDashboard size={17} />, path: "/dashboard" },
    { label: "Documents", icon: <FileText size={17} />, path: "/documents" },
    { label: "Legal Assistant", icon: <Scale size={17} />, path: "/legal-assistant" },
    { label: "Connect Advocate", icon: <Headset size={17} />, path: "/connect-advocate" },
    // Shown only to admins; the server re-checks the role on every admin call.
    ...(user?.role === "ADMIN"
      ? [{ label: "Admin", icon: <ShieldCheck size={17} />, path: "/admin/advocates" }]
      : []),
  ];

  const userInitial = user?.name?.charAt(0)?.toUpperCase() || "U";

  return (
    <>
      {/* 🔹 Mobile Hamburger */}
      <button
        onClick={() => setIsOpen(true)}
        className="md:hidden p-2 m-3 rounded-lg bg-navy-950 text-cream-50 fixed top-0 left-0 z-50 border border-white/10"
      >
        <Menu size={22} />
      </button>

      {/* 🔹 Overlay (mobile only) */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
        />
      )}

      {/* 🔹 Sidebar */}
      <div
        className={`
        fixed md:static top-0 left-0 h-full w-64 bg-navy-950 text-cream-100 p-4 flex flex-col z-50
        transform transition-transform duration-300
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
        md:translate-x-0
      `}
      >
        {/* 🔹 Header */}
        <div className="flex items-center justify-between px-2 mb-8">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-full border border-dashed border-gold-500 flex items-center justify-center text-gold-400">
              <Landmark size={15} />
            </span>
            <span className="font-display text-[15px] font-medium text-white">NyayMitra AI</span>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle className="!bg-transparent !text-cream-100/60 hover:!bg-white/10" />
            <button onClick={() => setIsOpen(false)} className="md:hidden text-cream-100/60">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* 🔹 Nav */}
        <nav className="flex flex-col gap-1 flex-1">
          {navItems.map((item) => {
            // Sub-pages (e.g. /connect-advocate/session/3) keep their section highlighted.
            const isActive = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);

            return (
              <button
                key={item.label}
                onClick={() => {
                  navigate(item.path);
                  setIsOpen(false);
                }}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13.5px] font-medium text-left border-l-2 transition-colors
                  ${
                    isActive
                      ? "bg-gold-500/10 text-white border-gold-500"
                      : "text-cream-100/55 border-transparent hover:text-white hover:bg-white/5"
                  }
                `}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* 🔹 User card */}
        <div className="flex items-center gap-2.5 pt-4 border-t border-white/10 px-1">
          <div className="w-8 h-8 rounded-full bg-gold-500 text-navy-950 font-bold text-[13px] flex items-center justify-center border-2 border-gold-400 shrink-0">
            {userInitial}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-white truncate">{user?.name || "User"}</p>
            <p className="text-[11px] text-cream-100/40">Welcome back</p>
          </div>
          <button
            onClick={handleLogout}
            title="Logout"
            className="text-[#e0a09a] hover:text-[#f0bdb8] transition-colors shrink-0 p-1"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </>
  );
}
