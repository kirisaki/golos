import { Hono } from "hono";
import { cors } from "hono/cors";
import comment from "./routes/comment.js";
import commentSocial from "./routes/comment-social.js";
import auth from "./routes/auth.js";

export type Env = {
  RELAYER_PRIVATE_KEY: string;
  CONTRACT_ADDRESS: string;
  RPC_URL: string;
  ALLOWED_ORIGIN: string;
  ENS_RPC_URL?: string;
  RATE_LIMIT: KVNamespace;
  DB: D1Database;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GOOGLE_REDIRECT_URI: string;
  JWT_SECRET: string;
  WALLET_ENCRYPTION_KEY: string;
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
app.route("/", commentSocial);
app.route("/", auth);

export default app;
