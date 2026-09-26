import { useState } from "react";
import toast from "react-hot-toast";
import { Loader2, Link2, Unlink, CheckCircle2 } from "lucide-react";
import FormError from "../../components/ui/FormError";
import { advocateAdminApi, apiErrorMessage } from "./advocateApi";
import { BTN_DANGER, BTN_PRIMARY, Field, INPUT, Section } from "./formControls";

interface Props {
  advocate: any;
  onChange: (advocate: any) => void;
}

// Links a human advocate's profile to their own NyayMitra login. Only with a linked
// account can they open the Advocate Desk, go available and receive requests — and they
// stay offline until they choose to switch "Available now" on themselves.
export default function AccountLinkEditor({ advocate, onChange }: Props) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const account = advocate.account as { id: number; email: string; name: string } | null;

  const run = async (fn: () => Promise<any>, ok: string, fail: string) => {
    setBusy(true);
    setError(null);
    try {
      onChange(await fn());
      toast.success(ok);
      setEmail("");
    } catch (err) {
      setError(apiErrorMessage(err, fail));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Section
      title="Advocate login"
      description="The account this advocate signs in with to reach their Advocate Desk. They must register on NyayMitra first."
    >
      {account ? (
        <div className="space-y-4">
          <p className="flex items-start gap-2 text-sm">
            <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-risk-low-fg dark:text-risk-low-fg-dark" />
            <span>
              Linked to <strong>{account.name}</strong> ({account.email}). They see an <strong>Advocate Desk</strong> in their sidebar and appear to
              clients only while they have switched <em>Available now</em> on.
            </span>
          </p>
          <button
            type="button"
            className={`${BTN_DANGER} inline-flex items-center gap-1.5`}
            disabled={busy}
            onClick={() => run(() => advocateAdminApi.unlinkAccount(advocate.id), "Account unlinked", "Couldn't unlink the account")}
          >
            <Unlink size={14} /> Unlink account
          </button>
          <FormError message={error} />
        </div>
      ) : (
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void run(() => advocateAdminApi.linkAccount(advocate.id, email), "Account linked", "Couldn't link the account");
          }}
        >
          <div className="flex-1 min-w-[16rem]">
            <Field label="Advocate's account email" hint="The email they registered with. Nobody can appear online until they log in and switch on Available now.">
              <input
                className={INPUT}
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(null);
                }}
                placeholder="advocate@example.com"
              />
            </Field>
          </div>
          <button type="submit" className={`${BTN_PRIMARY} inline-flex items-center gap-1.5`} disabled={busy || !email.trim()}>
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />} Link account
          </button>
        </form>
      )}
      {!account && <FormError message={error} className="mt-3" />}
    </Section>
  );
}
