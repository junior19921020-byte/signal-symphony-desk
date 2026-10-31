import { createServerFn } from "@tanstack/react-start";

type In = { system: string; role: string; question: string; context: string; action: string };

export const agentChat = createServerFn({ method: "POST" })
  .inputValidator((d: In) => ({
    system: String(d.system || "").slice(0, 2000),
    role: String(d.role || "").slice(0, 100),
    question: String(d.question || "").slice(0, 1000),
    context: String(d.context || "").slice(0, 6000),
    action: String(d.action || "").slice(0, 1000),
  }))
  .handler(async ({ data }) => {
    const { askAgent } = await import("./agent.server");
    return askAgent(data);
  });
