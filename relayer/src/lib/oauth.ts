// Provider-agnostic OAuth interface

export interface OAuthUserInfo {
  providerAccountId: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
}

export interface OAuthProvider {
  getAuthorizationUrl(state: string): string;
  exchangeCode(code: string): Promise<OAuthUserInfo>;
}

// --- Google OAuth ---

export class GoogleOAuthProvider implements OAuthProvider {
  constructor(
    private clientId: string,
    private clientSecret: string,
    private redirectUri: string,
  ) {}

  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: "code",
      scope: "openid email profile",
      state,
      access_type: "online",
      prompt: "select_account",
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  }

  async exchangeCode(code: string): Promise<OAuthUserInfo> {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: this.redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      const text = await tokenRes.text();
      throw new Error(`Google token exchange failed: ${text}`);
    }

    const tokenData = (await tokenRes.json()) as { id_token?: string };
    if (!tokenData.id_token) throw new Error("No id_token in Google response");

    // Decode JWT payload (no verification needed, we just got it from Google over HTTPS)
    // Google uses base64url encoding; atob doesn't handle multibyte UTF-8
    const base64url = tokenData.id_token.split(".")[1];
    const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(base64);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    const payload = JSON.parse(new TextDecoder().decode(bytes));

    return {
      providerAccountId: payload.sub,
      email: payload.email ?? "",
      displayName: payload.name ?? payload.email ?? "Anonymous",
      avatarUrl: payload.picture,
    };
  }
}
