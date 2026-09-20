import type { Consultation } from "../../generated/prisma/client";
import { env } from "../../config/env";
import { INDIAN_STATES } from "./consultation.constants";

const limitSecOf = (c: Consultation): number | null => {
    const usage = c.usage as { limitSec?: number } | null;
    return typeof usage?.limitSec === "number" ? usage.limitSec : null;
};

// What the signed-in client may see about their own consultation, AI or human.
export const toPublic = (c: Consultation, withSummary = false) => ({
    id: c.id,
    advocate: { id: c.advocateId, name: c.advocateName },
    advocateKind: c.advocateKind,
    state: c.state,
    stateName: INDIAN_STATES[c.state] ?? c.state,
    language: c.language,
    status: c.status,
    startedAt: c.startedAt,
    endedAt: c.endedAt,
    durationSec: c.durationSec,
    endReason: c.endReason,
    limitSec: c.advocateKind === "HUMAN" ? env.HUMAN_CALL_MAX_MINUTES * 60 : limitSecOf(c),
    summaryStatus: c.summaryStatus,
    createdAt: c.createdAt,
    subject: c.subject,
    requestedAt: c.requestedAt,
    expiresAt:
        c.status === "REQUESTED" && c.requestedAt
            ? new Date(c.requestedAt.getTime() + env.HUMAN_REQUEST_TTL_SECONDS * 1000)
            : null,
    declineReason: c.declineReason,
    // The advocate's private notes are never included; the notes they chose to share appear once the call is over.
    sharedNotes: c.advocateKind === "HUMAN" && c.status === "ENDED" ? c.sharedNotes : null,
    ...(withSummary ? { summary: c.summary } : {}),
});
