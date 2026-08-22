import {
  LayoutDashboard,
  FileText,
  Scale,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useDispatch } from "react-redux";
import { logout } from "../../features/auth/authSlice";
import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import ThemeToggle from "../ThemeToggle";

export default function Sidebar() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

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
    dispatch(logout());
    toast.success("Logged out successfully!");
    navigate("/login");
  };

  const navItems = [
    { label: "Dashboard", icon: <LayoutDashboard />, path: "/dashboard" },
    { label: "Documents", icon: <FileText />, path: "/documents" },
    { label: "Legal Assistant", icon: <Scale />, path: "/legal-assistant" },
  ];

  return (
    <>
      {/* 🔹 Mobile Hamburger */}
      <button
        onClick={() => setIsOpen(true)}
        className="md:hidden p-2 m-3 rounded-lg bg-white text-gray-900 dark:bg-gray-900 dark:text-white fixed top-0 left-0 z-50 border border-gray-200 dark:border-transparent"
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
        fixed md:static top-0 left-0 h-full w-64 bg-white text-gray-900 border-r border-gray-200 dark:bg-gray-900 dark:text-white dark:border-transparent p-5 flex flex-col justify-between z-50
        transform transition-transform duration-300
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
        md:translate-x-0
      `}
      >
        {/* 🔹 Top */}
        <div>
          {/* Header */}
          <div className="flex items-center justify-between mb-10">
            <h1 className="text-xl font-bold">LegalAI</h1>

            <div className="flex items-center gap-2">
              <ThemeToggle />

              {/* Close (mobile only) */}
              <button
                onClick={() => setIsOpen(false)}
                className="md:hidden"
              >
                <X className="cursor-pointer" />
              </button>
            </div>
          </div>

          {/* Nav */}
          <nav className="space-y-2">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;

              return (
                <div
                  key={item.label}
                  onClick={() => navigate(item.path)}
                  className={`
                    flex items-center gap-3 p-2 rounded-lg cursor-pointer transition
                    ${
                      isActive
                        ? "bg-gray-200 text-gray-900 dark:bg-gray-800 dark:text-white"
                        : "text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
                    }
                  `}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </div>
              );
            })}
          </nav>
        </div>

        {/* 🔹 Bottom */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-600 transition"
        >
          <LogOut size={18} /> Logout
        </button>
      </div>
    </>
  );
}
