import { Response, NextFunction } from "express";
import * as service from "./advocate.service";
import { availabilityFor } from "../human/human.service";

// Thin handlers: parse ids, call the service, wrap in the {success,data} envelope.
const id = (req: any, name = "id") => Number(req.params[name]);

const handler =
  (fn: (req: any) => Promise<{ status?: number; body: Record<string, unknown> }>) =>
  async (req: any, res: Response, next: NextFunction) => {
    try {
      const { status = 200, body } = await fn(req);
      res.status(status).json({ success: true, ...body });
    } catch (err) {
      next(err);
    }
  };

// ── Signed-in users ─────────────────────────────────────────────────────────
// Human advocates also carry whether they can be reached right now (AVAILABLE / BUSY / OFFLINE).
const withAvailability = async <T extends { id: number; kind: string }>(list: T[]) => {
  const humanIds = list.filter((a) => a.kind === "HUMAN").map((a) => a.id);
  const map = await availabilityFor(humanIds);
  return list.map((a) => ({ ...a, availability: a.kind === "HUMAN" ? (map.get(a.id) ?? "OFFLINE") : null }));
};

export const listAdvocates = handler(async () => ({
  body: { data: { advocates: await withAvailability(await service.listPublicAdvocates()) } },
}));

export const getAdvocate = handler(async (req) => ({
  body: {
    data: { advocate: (await withAvailability([await service.getPublicAdvocate(String(req.params.slug))]))[0] },
  },
}));

// ── Admin ───────────────────────────────────────────────────────────────────
export const adminList = handler(async () => ({ body: { data: { advocates: await service.listAdminAdvocates() } } }));

export const adminGet = handler(async (req) => ({ body: { data: { advocate: await service.getAdminAdvocate(id(req)) } } }));

export const adminCreate = handler(async (req) => ({
  status: 201,
  body: { data: { advocate: await service.createAdvocate(req.body ?? {}) } },
}));

export const adminUpdate = handler(async (req) => ({
  body: { data: { advocate: await service.updateAdvocate(id(req), req.body ?? {}, req.user.id) } },
}));

export const adminDelete = handler(async (req) => {
  await service.deleteAdvocate(id(req));
  return { body: { message: "Advocate deleted" } };
});

export const adminAddCredential = handler(async (req) => ({
  status: 201,
  body: { data: { advocate: await service.addCredential(id(req), req.body ?? {}) } },
}));

export const adminUpdateCredential = handler(async (req) => ({
  body: { data: { advocate: await service.updateCredential(id(req), id(req, "credentialId"), req.body ?? {}) } },
}));

export const adminDeleteCredential = handler(async (req) => ({
  body: { data: { advocate: await service.deleteCredential(id(req), id(req, "credentialId")) } },
}));

export const adminUpdateAiConfig = handler(async (req) => ({
  body: { data: { advocate: await service.updateAiConfig(id(req), req.body) } },
}));

export const adminSetPhoto = handler(async (req) => ({
  body: { data: { advocate: await service.setPhoto(id(req), req.file) } },
}));

export const adminRemovePhoto = handler(async (req) => ({
  body: { data: { advocate: await service.removePhoto(id(req)) } },
}));

export const adminLinkAccount = handler(async (req) => ({
  body: { data: { advocate: await service.linkAccount(id(req), req.body?.email) } },
}));

export const adminUnlinkAccount = handler(async (req) => ({
  body: { data: { advocate: await service.unlinkAccount(id(req)) } },
}));
