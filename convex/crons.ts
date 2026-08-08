import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Proverava na svakih 15 minuta da li je stiglo 11:59 (Beograd) narednog dana od slanja
// (AKS/BEX) i, ako jeste, automatski oznacava porudzbinu kao "kasni".
crons.interval(
  "flag delayed shipments",
  { minutes: 15 },
  internal.orders.flagDelayedOrders,
  {},
);

export default crons;
