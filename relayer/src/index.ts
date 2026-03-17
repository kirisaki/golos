import { Hono } from "hono";
import { cors } from "hono/cors";
import comment from "./routes/comment.js";

export type Env = {
  RELAYER_PRIVATE_KEY: string;
  CONTRACT_ADDRESS: string;
  RPC_URL: string;
  ALLOWED_ORIGIN: string;
  ENS_RPC_URL?: string;
  RATE_LIMIT: KVNamespace;
};

const app = new Hono<{ Bindings: Env }>();

app.use(
  "*",
  cors({
    origin: (origin, c) => {
      const allowed = c.env.ALLOWED_ORIGIN;
      return origin === allowed ? origin : "";
    },
  }),
);

app.route("/", comment);

export default app;
