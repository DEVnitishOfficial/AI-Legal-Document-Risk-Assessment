import { useEffect, useState } from "react";
import { Hub } from "./hub";

// One realtime connection for the lifetime of a page. Null until it exists (and
// when nobody is signed in), so callers can simply wait for it.
export function useHub(): Hub | null {
  const [hub, setHub] = useState<Hub | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    const h = new Hub(token);
    setHub(h);
    return () => {
      h.close();
      setHub(null);
    };
  }, []);

  return hub;
}
