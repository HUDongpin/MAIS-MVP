import type { TeacherNoticeDeliveryStatus, WeComChannelSummary } from "@/types";

type WeComChannelConfig = {
  id: string;
  name: string;
  envKey: string;
  classIds?: string[];
};

type WeComSendResult = {
  status: TeacherNoticeDeliveryStatus;
  providerMessageId?: string;
  errorCode?: string;
  errorMessage?: string;
};

function wecomNotificationsEnabled() {
  return process.env.WECOM_NOTIFICATIONS_ENABLED?.trim().toLowerCase() === "true";
}

function parseWeComChannels(): WeComChannelConfig[] {
  const raw = process.env.WECOM_GROUP_CHANNELS_JSON?.trim();
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    const entries = Array.isArray(parsed)
      ? parsed
      : Object.entries(parsed as Record<string, unknown>).map(([id, value]) => ({
          id,
          ...(typeof value === "object" && value ? value : {})
        }));

    return entries
      .map((entry): WeComChannelConfig | null => {
        const value = entry as Record<string, unknown>;
        const id = typeof value.id === "string" ? value.id.trim() : "";
        const name = typeof value.name === "string" ? value.name.trim() : id;
        const envKey = typeof value.envKey === "string" ? value.envKey.trim() : "";
        const classIds = Array.isArray(value.classIds)
          ? value.classIds.filter((classId): classId is string => typeof classId === "string" && Boolean(classId.trim()))
          : undefined;

        if (!id || !name || !envKey) return null;
        return {
          id,
          name,
          envKey,
          classIds
        };
      })
      .filter((channel): channel is WeComChannelConfig => Boolean(channel));
  } catch {
    return [];
  }
}

export function getWeComNotificationSummary(classId?: string | null) {
  const enabled = wecomNotificationsEnabled();
  const configuredChannels = parseWeComChannels()
    .filter((channel) => !classId || !channel.classIds?.length || channel.classIds.includes(classId))
    .map((channel): WeComChannelSummary => ({
      id: channel.id,
      name: channel.name,
      envKey: channel.envKey,
      configured: Boolean(process.env[channel.envKey]?.trim())
    }));

  const channels = configuredChannels.length
    ? configuredChannels
    : [
        {
          id: "manual-wecom",
          name: "Manual / unconfigured WeCom group",
          envKey: "WECOM_WEBHOOK_UNCONFIGURED",
          configured: false
        }
      ];

  return {
    enabled,
    channels
  };
}

export async function sendWeComGroupNotification({
  channelId,
  markdown
}: {
  channelId: string;
  markdown: string;
}): Promise<WeComSendResult> {
  if (!wecomNotificationsEnabled()) {
    return {
      status: "disabled",
      errorCode: "wecom-disabled",
      errorMessage: "WeCom notifications are disabled."
    };
  }

  const channel = parseWeComChannels().find((candidate) => candidate.id === channelId);
  if (!channel) {
    return {
      status: "failed",
      errorCode: "channel-not-found",
      errorMessage: "The requested WeCom channel is not configured."
    };
  }

  const webhookUrl = process.env[channel.envKey]?.trim();
  if (!webhookUrl) {
    return {
      status: "failed",
      errorCode: "webhook-missing",
      errorMessage: "The WeCom channel webhook environment variable is not configured."
    };
  }

  const timeoutMs = Math.max(1000, Math.min(30000, Number(process.env.WECOM_REQUEST_TIMEOUT_MS) || 12000));
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        msgtype: "markdown",
        markdown: {
          content: markdown.slice(0, 4000)
        }
      }),
      signal: controller.signal
    });
    const body = (await response.json().catch(() => null)) as { errcode?: number; errmsg?: string } | null;

    if (response.ok && body?.errcode === 0) {
      return {
        status: "sent",
        providerMessageId: `wecom-${Date.now()}`
      };
    }

    return {
      status: "failed",
      errorCode: body?.errcode === undefined ? `http-${response.status}` : `wecom-${body.errcode}`,
      errorMessage: body?.errmsg || `WeCom webhook returned HTTP ${response.status}.`
    };
  } catch (error) {
    return {
      status: "failed",
      errorCode: error instanceof Error && error.name === "AbortError" ? "timeout" : "request-failed",
      errorMessage: error instanceof Error ? error.message : "WeCom webhook request failed."
    };
  } finally {
    clearTimeout(timeout);
  }
}
