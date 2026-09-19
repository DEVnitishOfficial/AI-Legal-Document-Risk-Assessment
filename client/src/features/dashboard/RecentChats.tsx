import { Link, useNavigate } from "react-router-dom";
import { ChevronRight, MessageSquare } from "lucide-react";
import { timeAgo } from "../../utils/timeAgo";

const RECENT_COUNT = 5;

interface RecentChatsProps {
  chats: any[];
  loading: boolean;
}

export default function RecentChats({ chats, loading }: RecentChatsProps) {
  const navigate = useNavigate();
  const recent = chats.slice(0, RECENT_COUNT);

  return (
    <section className="rounded-xl border border-cream-200 dark:border-white/10 bg-white dark:bg-navy-900">
      <div className="flex items-center justify-between px-5 py-4">
        <div>
          <h2 className="font-display text-lg font-medium">Recent chats</h2>
          <p className="text-xs text-gray-500 dark:text-cream-100/50 mt-0.5">Your latest legal questions</p>
        </div>
        <Link
          to="/legal-assistant"
          className="flex items-center gap-0.5 text-xs font-semibold text-gold-600 dark:text-gold-400 hover:underline"
        >
          View all <ChevronRight size={14} />
        </Link>
      </div>

      {!loading && recent.length === 0 ? (
        <div className="px-5 pb-8 pt-2 text-center">
          <p className="text-sm font-medium">No chats yet</p>
          <p className="text-xs text-gray-500 dark:text-cream-100/50 mt-1 mb-4">
            Describe a legal problem in plain English or Hindi and get your options explained.
          </p>
          <button
            onClick={() => navigate("/legal-assistant?new=1")}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-navy-900 text-cream-50 hover:bg-navy-800 dark:bg-gold-500 dark:text-navy-950 dark:hover:bg-gold-400 transition-colors"
          >
            Ask your first question
          </button>
        </div>
      ) : (
        <ul className="px-2 pb-2">
          {recent.map((chat) => {
            const count = chat._count?.messages ?? 0;
            return (
              <li key={chat.id}>
                <Link
                  to={`/legal-assistant?c=${chat.id}`}
                  className="flex items-start gap-3 rounded-lg px-3 py-2.5 hover:bg-cream-50 dark:hover:bg-navy-800/60 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-500"
                >
                  <MessageSquare size={16} className="mt-0.5 shrink-0 text-gray-400 dark:text-cream-100/40" />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold truncate">{chat.title || "New conversation"}</span>
                    <span className="block text-xs text-gray-500 dark:text-cream-100/50 mt-0.5">
                      {count} {count === 1 ? "message" : "messages"} · {timeAgo(chat.updatedAt)}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
