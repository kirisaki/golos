import { describe, it, expect } from "vitest";
import { GoogleOAuthProvider } from "../src/lib/oauth.js";

describe("GoogleOAuthProvider", () => {
  const provider = new GoogleOAuthProvider(
    "test-client-id",
    "test-client-secret",
    "https://example.com/auth/google/callback",
  );

  it("generates a valid authorization URL", () => {
    const url = provider.getAuthorizationUrl("test-state");
    const parsed = new URL(url);

    expect(parsed.origin).toBe("https://accounts.google.com");
    expect(parsed.pathname).toBe("/o/oauth2/v2/auth");
    expect(parsed.searchParams.get("client_id")).toBe("test-client-id");
    expect(parsed.searchParams.get("redirect_uri")).toBe(
      "https://example.com/auth/google/callback",
    );
    expect(parsed.searchParams.get("state")).toBe("test-state");
    expect(parsed.searchParams.get("scope")).toContain("openid");
    expect(parsed.searchParams.get("response_type")).toBe("code");
  });
});
