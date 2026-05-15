import Sidebar from "../components/layout/Sidebar";
import UploadPanel from "../features/document/UploadPanel";

export default function Dashboard() {
  return (
    <div className="flex h-screen bg-gray-950 text-white">
      <Sidebar />

      <div className="flex-1 p-6 overflow-y-auto">
        <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

        <UploadPanel />
      </div>
    </div>
  );
}