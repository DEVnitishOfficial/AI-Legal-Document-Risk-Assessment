import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { humanApi, type AdvocateAccount } from "./humanApi";

// Whether the signed-in account is linked to an advocate profile. Cached per user for
// the life of the page, so the sidebar doesn't ask again on every screen.
const cache = new Map<number, AdvocateAccount | null>();

export function useAdvocateAccount(): { advocate: AdvocateAccount | null; loading: boolean } {
  const userId: number | undefined = useSelector((s: any) => s.auth.user?.id);
  const [advocate, setAdvocate] = useState<AdvocateAccount | null>(userId !== undefined ? (cache.get(userId) ?? null) : null);
  const [loading, setLoading] = useState(userId === undefined || !cache.has(userId));

  useEffect(() => {
    if (userId === undefined) return;
    if (cache.has(userId)) {
      setAdvocate(cache.get(userId) ?? null);
      setLoading(false);
      return;
    }
    let live = true;
    humanApi
      .whoami()
      .then((a) => {
        cache.set(userId, a);
        if (live) setAdvocate(a);
      })
      .catch(() => cache.set(userId, null))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [userId]);

  return { advocate, loading };
}
