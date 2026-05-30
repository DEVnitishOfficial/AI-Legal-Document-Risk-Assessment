import Sidebar from "../components/layout/Sidebar";
import UploadPanel from "../features/document/UploadPanel";
import { useState } from "react";
import API from "../services/api";
import DocumentList from "./DocumentList";
import ResultPanel from "./ResultPanel";
import { useSelector } from "react-redux";

export default function Dashboard() {
  // const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [result, setResult] = useState<any>(null);

  const user = useSelector((state: any) => state.auth.user);

  // const runAnalysis = async (doc: any) => {
  //   const res = await API.post("/analysis/run", {
  //     documentId: doc.id,
  //   });

  //   setResult(res.data.data);
  // };

  const userInitial = user?.name?.charAt(0)?.toUpperCase() || "U";

  return (
    <div className="flex h-screen bg-gray-950 text-white">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        {/* 🔹 Top Bar */}
        <div className="flex justify-end items-center p-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center font-bold text-white">
              {userInitial}
            </div>

            {/* Name */}
            <div className="text-sm">
              <p className="font-semibold">{user?.name || "User"}</p>
              <p className="text-gray-400 text-xs">Welcome back</p>
            </div>
          </div>
        </div>

        {/* 🔹 Main Content */}
        <div className="flex-1 p-6 grid grid-cols-2 gap-6">
          <div>
            <UploadPanel />
            <DocumentList
              onSelect={(doc: any) => {
                setSelectedDoc(doc);
                // runAnalysis(doc);
              }}
            />
          </div>

          <ResultPanel result={result} />
        </div>
      </div>
    </div>
  );
}