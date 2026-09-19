import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Plus, Bot, UserRound, BadgeCheck } from "lucide-react";
import Sidebar from "../../components/layout/Sidebar";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import AdvocateProfileForm from "../../features/admin/AdvocateProfileForm";
import CredentialsEditor from "../../features/admin/CredentialsEditor";
import AiConfigEditor from "../../features/admin/AiConfigEditor";
import { advocateAdminApi, apiErrorMessage } from "../../features/admin/advocateApi";
import { BTN_DANGER, BTN_PRIMARY, Section } from "../../features/admin/formControls";

const STATUS_STYLE: Record<string, string> = {
  ACTIVE: "bg-risk-low-bg text-risk-low-fg dark:bg-risk-low-bg-dark dark:text-risk-low-fg-dark",
  DRAFT: "bg-cream-100 text-gray-500 dark:bg-navy-800 dark:text-cream-100/50",
  DISABLED: "bg-risk-high-bg text-risk-high-fg dark:bg-risk-high-bg-dark dark:text-risk-high-fg-dark",
};

type Selection = number | "new" | null;

export default function AdvocatesAdminPage() {
  const [advocates, setAdvocates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selection, setSelection] = useState<Selection>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);

  useEffect(() => {
    advocateAdminApi
      .list()
      .then(setAdvocates)
      .catch((err) => toast.error(apiErrorMessage(err, "Couldn't load advocates")))
      .finally(() => setLoading(false));
  }, []);

  const selected = typeof selection === "number" ? advocates.find((a) => a.id === selection) : null;

  // Replace (or add) an advocate after any editor returns the fresh record.
  const upsert = (advocate: any) => {
    setAdvocates((list) =>
      list.some((a) => a.id === advocate.id) ? list.map((a) => (a.id === advocate.id ? advocate : a)) : [...list, advocate]
    );
    setSelection(advocate.id);
  };

  const remove = async () => {
    if (!selected) return;
    setDeleteBusy(true);
    try {
      await advocateAdminApi.remove(selected.id);
      setAdvocates((list) => list.filter((a) => a.id !== selected.id));
      setSelection(null);
      setConfirmDelete(false);
      toast.success("Advocate deleted");
    } catch (err) {
      toast.error(apiErrorMessage(err, "Couldn't delete advocate"));
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <div className="flex h-screen bg-cream-50 dark:bg-navy-950 text-navy-950 dark:text-cream-50">
      <Sidebar />

      <main className="flex-1 min-w-0 overflow-y-auto">
        <div className="p-6 max-w-7xl mx-auto">
          <div className="mb-6">
            <span className="font-mono text-[11px] tracking-[0.1em] uppercase text-gold-600 dark:text-gold-400">Admin</span>
            <h1 className="font-display text-2xl font-medium mt-1">Advocates</h1>
            <p className="text-sm text-gray-600 dark:text-cream-100/60 mt-1 max-w-3xl">
              Manage the advocates clients can connect with. Human advocates and the AI advocate share one profile structure;
              humans must be verified before they are published, and the AI's model and behaviour are set here.
            </p>
          </div>

          <div className="grid lg:grid-cols-[320px_minmax(0,1fr)] gap-6 items-start">
            {/* List */}
            <div className="space-y-3">
              <button className={`${BTN_PRIMARY} w-full inline-flex items-center justify-center gap-1.5`} onClick={() => setSelection("new")}>
                <Plus size={15} /> New advocate
              </button>

              {loading && <p className="text-sm text-gray-400 dark:text-cream-100/40 px-1">Loading…</p>}

              <ul className="space-y-2">
                {advocates.map((a) => (
                  <li key={a.id}>
                    <button
                      onClick={() => setSelection(a.id)}
                      aria-pressed={selection === a.id}
                      className={`w-full text-left rounded-xl border p-3.5 flex items-center gap-3 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-500 ${
                        selection === a.id
                          ? "border-gold-500 bg-gold-500/5 dark:bg-navy-800"
                          : "border-cream-200 dark:border-white/10 bg-white dark:bg-navy-900 hover:border-gold-500/50"
                      }`}
                    >
                      <span className="w-10 h-10 rounded-full overflow-hidden bg-cream-100 dark:bg-navy-800 flex items-center justify-center shrink-0 text-gray-500 dark:text-cream-100/60">
                        {a.photoUrl ? (
                          <img src={a.photoUrl} alt="" className="w-full h-full object-cover" />
                        ) : a.kind === "AI" ? (
                          <Bot size={18} />
                        ) : (
                          <UserRound size={18} />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5 text-sm font-semibold">
                          <span className="truncate">{a.displayName}</span>
                          {a.verificationStatus === "VERIFIED" && (
                            <BadgeCheck size={14} className="shrink-0 text-risk-low-fg dark:text-risk-low-fg-dark" aria-label="Verified" />
                          )}
                        </span>
                        <span className="flex items-center gap-1.5 mt-1">
                          <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-navy-900 text-cream-50 dark:bg-gold-500 dark:text-navy-950">
                            {a.kind === "AI" ? "AI" : "Human"}
                          </span>
                          <span className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded ${STATUS_STYLE[a.status]}`}>
                            {a.status}
                          </span>
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Editor */}
            <div className="min-w-0">
              {selection === null && (
                <div className="rounded-xl border border-dashed border-cream-200 dark:border-white/15 py-16 text-center">
                  <p className="font-display text-lg font-medium">Select an advocate</p>
                  <p className="text-sm text-gray-500 dark:text-cream-100/50 mt-1">or create a new one to get started.</p>
                </div>
              )}

              {selection === "new" && (
                <div className="space-y-5">
                  <h2 className="font-display text-xl font-medium">New advocate</h2>
                  <AdvocateProfileForm key="new" advocate={null} onSaved={upsert} />
                </div>
              )}

              {selected && (
                <div className="space-y-5">
                  <h2 className="font-display text-xl font-medium">{selected.displayName}</h2>
                  <AdvocateProfileForm key={`p-${selected.id}`} advocate={selected} onSaved={upsert} />
                  <CredentialsEditor key={`c-${selected.id}`} advocate={selected} onChange={upsert} />
                  {selected.kind === "AI" && selected.aiConfig && (
                    <AiConfigEditor key={`a-${selected.id}`} advocate={selected} onChange={upsert} />
                  )}
                  <Section title="Delete advocate" description="Removes the profile, credentials and photo permanently. Prefer Disabled if you may want them back.">
                    <button className={BTN_DANGER} onClick={() => setConfirmDelete(true)}>
                      Delete this advocate
                    </button>
                  </Section>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {confirmDelete && selected && (
        <ConfirmDialog
          danger
          busy={deleteBusy}
          title="Delete this advocate?"
          message={`“${selected.displayName}” will be permanently deleted. This can't be undone.`}
          confirmLabel="Delete advocate"
          onConfirm={remove}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </div>
  );
}
