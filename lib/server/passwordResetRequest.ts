import {
  buildPasswordResetUrl,
  type PasswordResetDeliveryChannel,
  type PasswordResetDeliveryResult,
  type PasswordResetDeliveryStatus
} from "./passwordResetDelivery";

export type PasswordResetRequestRecord = {
  token: string;
  expiresAt: string;
  email?: string | null;
};

export type PasswordResetRequestBody =
  | {
      ok: true;
      message: string;
      resetUrl?: string;
      expiresAt?: string;
      delivery?: PasswordResetDeliveryStatus;
      deliveryChannel?: PasswordResetDeliveryChannel;
    }
  | {
      error: string;
    };

export type PasswordResetRequestResult = {
  status: number;
  body: PasswordResetRequestBody;
};

type PasswordResetRequestEnv = Record<string, string | undefined>;

type PasswordResetRequestDependencies = {
  createResetRequest: (identifier: string) => Promise<PasswordResetRequestRecord | null>;
  sendResetLink: (input: { to: string; resetUrl: string; expiresAt: string }) => Promise<PasswordResetDeliveryResult>;
  warn?: (message: string, metadata: Record<string, unknown>) => void;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function handlePasswordResetRequest({
  body,
  deliveryConfigured,
  env = process.env,
  exposeLocalResetLinks,
  requestUrl,
  createResetRequest,
  sendResetLink,
  warn = console.warn
}: {
  body: unknown;
  deliveryConfigured: boolean;
  env?: PasswordResetRequestEnv;
  exposeLocalResetLinks: boolean;
  requestUrl: string;
} & PasswordResetRequestDependencies): Promise<PasswordResetRequestResult> {
  if (!isRecord(body)) {
    return {
      status: 400,
      body: { error: "Request body must be an object." }
    };
  }

  const identifier = typeof body.identifier === "string" ? body.identifier.trim() : "";
  if (!identifier) {
    return {
      status: 400,
      body: { error: "Email or username is required." }
    };
  }

  if (!exposeLocalResetLinks && !deliveryConfigured) {
    return {
      status: 503,
      body: { error: "Password reset delivery is not configured." }
    };
  }

  const reset = await createResetRequest(identifier);
  const response: PasswordResetRequestBody = {
    ok: true,
    message: "If an account exists, password reset instructions will be available."
  };

  if (reset?.email) {
    const resetUrl = buildPasswordResetUrl({ requestUrl, token: reset.token, env });
    const delivery = await sendResetLink({
      to: reset.email,
      resetUrl,
      expiresAt: reset.expiresAt
    });
    response.delivery = delivery.status;
    response.deliveryChannel = delivery.channel;
    if (delivery.status === "failed") {
      warn("Password reset delivery failed", {
        channel: delivery.channel,
        errorCode: delivery.errorCode,
        httpStatus: delivery.httpStatus
      });
    }
  }

  if (exposeLocalResetLinks && reset) {
    response.resetUrl = buildPasswordResetUrl({ requestUrl, token: reset.token, env });
    response.expiresAt = reset.expiresAt;
  }

  return {
    status: 200,
    body: response
  };
}
