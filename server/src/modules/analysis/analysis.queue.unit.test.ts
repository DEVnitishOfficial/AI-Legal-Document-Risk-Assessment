import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockAdd } = vi.hoisted(() => ({ mockAdd: vi.fn() }));

vi.mock("bullmq", () => ({
  Queue: vi.fn().mockImplementation(function QueueMock() {
    return { add: mockAdd };
  }),
}));

import { enqueueAnalysis } from "./analysis.queue";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("enqueueAnalysis", () => {
  it("adds a job carrying the document id", async () => {
    mockAdd.mockResolvedValue({ id: "analysis-42" });

    await enqueueAnalysis(42);

    expect(mockAdd).toHaveBeenCalledTimes(1);
    const [, data] = mockAdd.mock.calls[0];
    expect(data).toEqual({ documentId: 42 });
  });

  it("uses a deterministic, per-document jobId so a duplicate enqueue can't run twice", async () => {
    mockAdd.mockResolvedValue({ id: "analysis-42" });

    await enqueueAnalysis(42);

    const [, , opts] = mockAdd.mock.calls[0];
    expect(opts.jobId).toBe("analysis-42");
  });

  it("uses a different jobId per document", async () => {
    mockAdd.mockResolvedValue({});
    await enqueueAnalysis(1);
    await enqueueAnalysis(2);

    expect(mockAdd.mock.calls[0][2].jobId).not.toBe(mockAdd.mock.calls[1][2].jobId);
  });
});
