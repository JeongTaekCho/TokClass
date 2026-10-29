import { roomHandler } from "@/lib/api/handler";
import { buildReport } from "@/lib/data/report";

export const GET = roomHandler({ roles: ["instructor"], allowEnded: true }, async ({ roomId }) => ({ report: await buildReport(roomId) }));
