import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";

const ADMIN_USERNAME = "kodmajstora";
const ADMIN_PASSWORD = "prekobrdaprekobrega";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 dana
const encoder = new TextEncoder();

const toHex = (buffer: ArrayBuffer) =>
  Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

const randomHex = (size: number) => {
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  return toHex(bytes.buffer);
};

const hashPassword = async (password: string, salt: string) => {
  const data = encoder.encode(`${password}:${salt}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return toHex(digest);
};

const passwordsMatch = async (password: string, salt: string, hashed: string) => {
  const derived = await hashPassword(password, salt);
  return derived === hashed;
};

const normalizeUsername = (username: string) => username.trim().toLowerCase();

const canWrite = (ctx: QueryCtx | MutationCtx): ctx is MutationCtx =>
  typeof (ctx as MutationCtx).db.insert === "function";

async function ensureAdmin(ctx: MutationCtx): Promise<Doc<"users">> {
  const existing = await ctx.db
    .query("users")
    .withIndex("by_username", (q: any) => q.eq("username", ADMIN_USERNAME))
    .unique();
  if (existing) {
    const roleNeedsUpdate = existing.role !== "admin";
    const passwordUpToDate = await passwordsMatch(
      ADMIN_PASSWORD,
      existing.salt,
      existing.passwordHash,
    );
    if (!passwordUpToDate || roleNeedsUpdate) {
      const salt = randomHex(16);
      const passwordHash = await hashPassword(ADMIN_PASSWORD, salt);
      await ctx.db.patch(existing._id, { passwordHash, salt, role: "admin" });
      const updated = await ctx.db.get(existing._id);
      return updated ?? { ...existing, passwordHash, salt, role: "admin" };
    }
    return existing;
  }

  const salt = randomHex(16);
  const passwordHash = await hashPassword(ADMIN_PASSWORD, salt);
  const id = await ctx.db.insert("users", {
    username: ADMIN_USERNAME,
    passwordHash,
    salt,
    role: "admin",
    createdAt: Date.now(),
  });
  const created = await ctx.db.get(id);
  if (!created) {
    throw new Error("Neuspelo kreiranje admin naloga.");
  }
  return created;
}

async function findUserByUsername(ctx: QueryCtx | MutationCtx, username: string) {
  return await ctx.db
    .query("users")
    .withIndex("by_username", (q: any) => q.eq("username", username))
    .unique();
}

async function createSession(ctx: MutationCtx, userId: Id<"users">) {
  const token = randomHex(48);
  const now = Date.now();
  const expiresAt = now + SESSION_TTL_MS;
  await ctx.db.insert("sessions", { token, userId, createdAt: now, expiresAt });
  return { token, expiresAt };
}

export async function getSession(ctx: QueryCtx | MutationCtx, token?: string) {
  if (!token) return null;
  const session = await ctx.db
    .query("sessions")
    .withIndex("by_token", (q: any) => q.eq("token", token))
    .unique();
  if (!session) return null;
  if (session.expiresAt && session.expiresAt < Date.now()) {
    if (canWrite(ctx)) {
      await ctx.db.delete(session._id);
    }
    return null;
  }
  const user = await ctx.db.get(session.userId);
  if (!user) return null;
  return { session, user };
}

const compareUsersByCreation = (left: Doc<"users">, right: Doc<"users">) => {
  if (left.createdAt !== right.createdAt) {
    return left.createdAt - right.createdAt;
  }
  return String(left._id).localeCompare(String(right._id));
};

async function resolveWorkspaceUser(
  ctx: QueryCtx | MutationCtx,
  fallback: Doc<"users">,
): Promise<Doc<"users">> {
  const users = await ctx.db.query("users").collect();
  if (users.length === 0) {
    return fallback;
  }

  const sortedUsers = users.sort(compareUsersByCreation);
  const hasUserData = async (userId: Id<"users">) => {
    const latestOrder = await ctx.db
      .query("orders")
      .withIndex("by_user_kreiranoAt", (q: any) => q.eq("userId", userId))
      .first();
    if (latestOrder) {
      return true;
    }
    const latestProduct = await ctx.db
      .query("products")
      .withIndex("by_user_createdAt", (q: any) => q.eq("userId", userId))
      .first();
    return Boolean(latestProduct);
  };

  const adminUsers = sortedUsers.filter((entry) => entry.role === "admin");
  for (const admin of adminUsers) {
    if (await hasUserData(admin._id)) {
      return admin;
    }
  }

  for (const entry of sortedUsers) {
    if (await hasUserData(entry._id)) {
      return entry;
    }
  }

  return adminUsers[0] ?? sortedUsers[0] ?? fallback;
}

export async function requireUser(ctx: QueryCtx | MutationCtx, token?: string) {
  const active = await getSession(ctx, token);
  if (!active) throw new Error("Neautorizovan pristup.");
  const workspaceUser = await resolveWorkspaceUser(ctx, active.user);
  return {
    ...active,
    actor: active.user,
    user: workspaceUser,
  };
}

export async function requireAdmin(ctx: QueryCtx | MutationCtx, token?: string) {
  const active = await getSession(ctx, token);
  if (!active) throw new Error("Neautorizovan pristup.");
  if (active.user.role !== "admin") {
    throw new Error("Samo admin moze da izvrsi ovu radnju.");
  }
  const workspaceUser = await resolveWorkspaceUser(ctx, active.user);
  return {
    ...active,
    actor: active.user,
    user: workspaceUser,
  };
}

export const login = mutation({
  args: {
    username: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    await ensureAdmin(ctx);
    const username = normalizeUsername(args.username);
    const user = await findUserByUsername(ctx, username);
    if (!user) {
      throw new Error("Pogresno korisnicko ime ili sifra.");
    }
    const isValid = await passwordsMatch(args.password, user.salt, user.passwordHash);
    if (!isValid) {
      throw new Error("Pogresno korisnicko ime ili sifra.");
    }
    const session = await createSession(ctx, user._id);
    return {
      token: session.token,
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
      },
      expiresAt: session.expiresAt,
    };
  },
});

export const session = query({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const active = await getSession(ctx, args.token);
    if (!active) return null;
    return {
      user: {
        id: active.user._id,
        username: active.user.username,
        role: active.user.role,
      },
      expiresAt: active.session.expiresAt,
    };
  },
});

export const createUser = mutation({
  args: {
    token: v.string(),
    username: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    await requireUser(ctx, args.token);
    throw new Error("Dodavanje novih profila je iskljuceno. Koristi postojeci kodmajstora nalog.");
  },
});

export const listUsers = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const active = await getSession(ctx, args.token);
    if (!active) throw new Error("Neautorizovan pristup.");
    const user = active.user;
    return [
      {
        id: user._id,
        username: user.username,
        role: user.role,
        createdAt: user.createdAt ?? Date.now(),
        createdBy: user.createdBy,
      },
    ];
  },
});

export const logout = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const active = await getSession(ctx, args.token);
    if (active?.session) {
      await ctx.db.delete(active.session._id);
    }
  },
});
