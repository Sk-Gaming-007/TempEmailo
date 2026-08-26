/**
 * Multi-Engine Temporary Mail Provider (Mail.tm + 1secmail Dual Engine)
 * 
 * Why this exists:
 * 1secmail.com MX server (178.32.61.35) occasionally experiences connection refused (error 111)
 * from Gmail/Google SES because of port 25 throttling.
 * 
 * Mail.tm provides ultra-reliable Cloud MX servers that Gmail, Microsoft, and Facebook
 * always accept with 100% deliverability.
 */

export interface UnifiedMessage {
  id: string | number;
  from: string;
  subject: string;
  date: string;
  intro?: string;
  isSeen?: boolean;
}

export interface UnifiedMessageDetail extends UnifiedMessage {
  body: string;
  textBody: string;
  htmlBody: string;
  attachments: Array<{
    id?: string;
    filename: string;
    contentType: string;
    size: number;
    downloadUrl?: string;
  }>;
}

export interface MailboxSession {
  provider: "mailtm" | "onesecmail";
  email: string;
  username: string;
  domain: string;
  token?: string;
  password?: string;
  createdAt: number;
}

// Mail.tm API Base URL
const MAILTM_API = "https://api.mail.tm";

export class MailEngine {
  /**
   * Fetch active domains from both Mail.tm and 1secmail
   */
  static async getAvailableDomains(): Promise<{ domain: string; provider: "mailtm" | "onesecmail" }[]> {
    const list: { domain: string; provider: "mailtm" | "onesecmail" }[] = [];

    // Try Mail.tm domains first (Super reliable MX servers)
    try {
      const res = await fetch(`${MAILTM_API}/domains?page=1`);
      if (res.ok) {
        const data = await res.json();
        const memberList = data["hydra:member"] || [];
        for (const item of memberList) {
          if (item.isActive && item.domain) {
            list.push({ domain: item.domain, provider: "mailtm" });
          }
        }
      }
    } catch (e) {
      console.warn("Mail.tm domains fetch fallback", e);
    }

    // Also fetch 1secmail domains
    try {
      const res = await fetch("https://www.1secmail.com/api/v1/?action=getDomainList");
      if (res.ok) {
        const onesecDomains: string[] = await res.json();
        for (const d of onesecDomains) {
          if (!list.some((x) => x.domain === d)) {
            list.push({ domain: d, provider: "onesecmail" });
          }
        }
      }
    } catch (e) {
      console.warn("1secmail domains fetch fallback", e);
    }

    // Default fallbacks if both APIs are slow
    if (list.length === 0) {
      list.push(
        { domain: "bugfoo.com", provider: "mailtm" },
        { domain: "vmani.com", provider: "mailtm" },
        { domain: "1secmail.net", provider: "onesecmail" },
        { domain: "wwjmp.com", provider: "onesecmail" },
        { domain: "esiix.com", provider: "onesecmail" }
      );
    }

    return list;
  }

  /**
   * Create a new Mail.tm account
   */
  static async createMailtmAccount(customUser?: string, targetDomain?: string): Promise<MailboxSession | null> {
    try {
      // 1. Get domain
      let domain = targetDomain;
      if (!domain) {
        const domRes = await fetch(`${MAILTM_API}/domains?page=1`);
        if (domRes.ok) {
          const domData = await domRes.json();
          domain = domData["hydra:member"]?.[0]?.domain;
        }
      }
      if (!domain) domain = "bugfoo.com";

      // 2. Username & Password
      const username = customUser || "user_" + Math.random().toString(36).substr(2, 8);
      const password = "TempPassword_" + Math.random().toString(36).substr(2, 9) + "!9";
      const fullAddress = `${username.toLowerCase()}@${domain}`;

      // 3. Create Account
      const createRes = await fetch(`${MAILTM_API}/accounts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: fullAddress, password }),
      });

      if (!createRes.ok && createRes.status !== 422) {
        throw new Error("Failed to create Mail.tm account");
      }

      // 4. Get Bearer Token
      const tokenRes = await fetch(`${MAILTM_API}/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: fullAddress, password }),
      });

      if (tokenRes.ok) {
        const tokenData = await tokenRes.json();
        return {
          provider: "mailtm",
          email: fullAddress,
          username,
          domain,
          token: tokenData.token,
          password,
          createdAt: Date.now(),
        };
      }
    } catch (err) {
      console.warn("Mail.tm creation error, falling back to 1secmail", err);
    }
    return null;
  }

  /**
   * Create a 1secmail Account
   */
  static async createOneSecMailAccount(customUser?: string, targetDomain?: string): Promise<MailboxSession> {
    let user = customUser;
    let dom = targetDomain || "1secmail.net";

    if (!user) {
      try {
        const res = await fetch("https://www.1secmail.com/api/v1/?action=genRandomMailbox&count=1");
        if (res.ok) {
          const data: string[] = await res.json();
          if (data && data[0]) {
            const parts = data[0].split("@");
            user = parts[0];
            dom = targetDomain || parts[1];
          }
        }
      } catch (e) {
        user = "user_" + Math.random().toString(36).substr(2, 8);
      }
    }
    if (!user) user = "user_" + Math.random().toString(36).substr(2, 8);

    return {
      provider: "onesecmail",
      email: `${user}@${dom}`,
      username: user,
      domain: dom,
      createdAt: Date.now(),
    };
  }

  /**
   * Fetch messages list for a session
   */
  static async fetchMessages(session: MailboxSession): Promise<UnifiedMessage[]> {
    if (session.provider === "mailtm" && session.token) {
      try {
        const res = await fetch(`${MAILTM_API}/messages`, {
          headers: { Authorization: `Bearer ${session.token}` },
        });
        if (res.ok) {
          const data = await res.json();
          const list = data["hydra:member"] || [];
          return list.map((item: any) => ({
            id: item.id,
            from: item.from?.address ? `${item.from.name || ""} <${item.from.address}>`.trim() : "Unknown",
            subject: item.subject || "(No Subject)",
            date: new Date(item.createdAt).toLocaleString(),
            intro: item.intro,
            isSeen: item.seen,
          }));
        }
      } catch (e) {
        console.warn("Mail.tm fetch messages error", e);
      }
    }

    // 1secmail provider
    try {
      const res = await fetch(
        `https://www.1secmail.com/api/v1/?action=getMessages&login=${session.username}&domain=${session.domain}`
      );
      if (res.ok) {
        const data: any[] = await res.json();
        return data.map((item) => ({
          id: item.id,
          from: item.from,
          subject: item.subject || "(No Subject)",
          date: item.date,
          isSeen: true,
        }));
      }
    } catch (e) {
      console.warn("1secmail fetch messages error", e);
    }

    return [];
  }

  /**
   * Read single message details
   */
  static async readMessage(session: MailboxSession, messageId: string | number): Promise<UnifiedMessageDetail | null> {
    // Mail.tm
    if (session.provider === "mailtm" && session.token) {
      try {
        const res = await fetch(`${MAILTM_API}/messages/${messageId}`, {
          headers: { Authorization: `Bearer ${session.token}` },
        });
        if (res.ok) {
          const data = await res.json();
          const attachments = (data.attachments || []).map((att: any) => ({
            id: att.id,
            filename: att.filename,
            contentType: att.contentType,
            size: att.size,
            downloadUrl: `${MAILTM_API}${att.downloadUrl}`,
          }));

          return {
            id: data.id,
            from: data.from?.address ? `${data.from.name || ""} <${data.from.address}>`.trim() : "Unknown",
            subject: data.subject || "(No Subject)",
            date: new Date(data.createdAt).toLocaleString(),
            body: data.text || "",
            textBody: data.text || "",
            htmlBody: Array.isArray(data.html) ? data.html.join("") : data.html || "",
            attachments,
          };
        }
      } catch (e) {
        console.error("Mail.tm read error", e);
      }
    }

    // 1secmail
    try {
      const res = await fetch(
        `https://www.1secmail.com/api/v1/?action=readMessage&login=${session.username}&domain=${session.domain}&id=${messageId}`
      );
      if (res.ok) {
        const data = await res.json();
        const attachments = (data.attachments || []).map((att: any) => ({
          filename: att.filename,
          contentType: att.contentType,
          size: att.size,
          downloadUrl: `https://www.1secmail.com/api/v1/?action=download&login=${session.username}&domain=${session.domain}&id=${messageId}&file=${encodeURIComponent(
            att.filename
          )}`,
        }));

        return {
          id: data.id,
          from: data.from,
          subject: data.subject || "(No Subject)",
          date: data.date,
          body: data.body || "",
          textBody: data.textBody || data.body || "",
          htmlBody: data.htmlBody || "",
          attachments,
        };
      }
    } catch (e) {
      console.error("1secmail read error", e);
    }

    return null;
  }
}
