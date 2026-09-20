// Who can be reached right now.
//
// An advocate is "online" only when BOTH hold: they switched "Available now" on
// themselves, and their Advocate Desk is open in a browser (a live connection).
// Closing the desk for more than a short grace period switches availability off
// again, so nobody stays listed as reachable after they walk away. Nothing is
// persisted on purpose: after a server restart every advocate is offline until
// they choose to be available again.
//
// State lives in this process; running several server instances would need it
// moved to a shared store.

const OFFLINE_GRACE_MS = 30_000;

const wantsAvailable = new Set<number>();
const deskConnections = new Map<number, number>();
const offTimers = new Map<number, NodeJS.Timeout>();

const cancelOffTimer = (advocateId: number) => {
    const t = offTimers.get(advocateId);
    if (t) clearTimeout(t);
    offTimers.delete(advocateId);
};

export const deskOpened = (advocateId: number) => {
    cancelOffTimer(advocateId);
    deskConnections.set(advocateId, (deskConnections.get(advocateId) ?? 0) + 1);
};

export const deskClosed = (advocateId: number) => {
    const left = (deskConnections.get(advocateId) ?? 1) - 1;
    if (left > 0) {
        deskConnections.set(advocateId, left);
        return;
    }
    deskConnections.delete(advocateId);
    cancelOffTimer(advocateId);
    const t = setTimeout(() => {
        wantsAvailable.delete(advocateId);
        offTimers.delete(advocateId);
    }, OFFLINE_GRACE_MS);
    t.unref();
    offTimers.set(advocateId, t);
};

export const hasOpenDesk = (advocateId: number) => (deskConnections.get(advocateId) ?? 0) > 0;

// Returns false (and changes nothing) if "available" is requested with no desk open.
export const setAvailable = (advocateId: number, available: boolean): boolean => {
    if (available && !hasOpenDesk(advocateId)) return false;
    if (available) wantsAvailable.add(advocateId);
    else wantsAvailable.delete(advocateId);
    return true;
};

export const isOnline = (advocateId: number) => wantsAvailable.has(advocateId) && hasOpenDesk(advocateId);
export const wantsToBeAvailable = (advocateId: number) => wantsAvailable.has(advocateId);
