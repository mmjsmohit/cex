import { NextResponse, type NextRequest } from "next/server";

const DEFAULT_MOCKER_URL = "http://localhost:6000";

function normalizeHttpBaseUrl(url: string) {
  if (url.startsWith("ws://")) {
    return `http://${url.slice("ws://".length)}`;
  }

  if (url.startsWith("wss://")) {
    return `https://${url.slice("wss://".length)}`;
  }

  return url;
}

function trimTrailingPath(url: string, pathSuffix: string) {
  return url.endsWith(pathSuffix) ? url.slice(0, -pathSuffix.length) : url;
}

function resolveMockerBaseUrl() {
  const configuredBaseUrl = process.env.EXCHANGE_PRICE_MOCKER_URL;

  if (configuredBaseUrl) {
    return normalizeHttpBaseUrl(configuredBaseUrl);
  }

  const healthUrl = process.env.MOCK_EXCHANGE_HEALTH_URL;

  if (healthUrl) {
    return trimTrailingPath(normalizeHttpBaseUrl(healthUrl), "/health");
  }

  const wsUrl = process.env.MOCK_EXCHANGE_WS_URL;

  if (wsUrl) {
    return normalizeHttpBaseUrl(wsUrl);
  }

  return DEFAULT_MOCKER_URL;
}

export async function POST(request: NextRequest) {
  const mockerBaseUrl = resolveMockerBaseUrl();

  try {
    const response = await fetch(`${mockerBaseUrl}/forward-price`, {
      method: "POST",
      headers: {
        "content-type": request.headers.get("content-type") ?? "application/json",
      },
      body: await request.text(),
      cache: "no-store",
    });

    const responseText = await response.text();
    const responseHeaders = new Headers();
    const contentType = response.headers.get("content-type");

    if (contentType) {
      responseHeaders.set("content-type", contentType);
    }

    return new NextResponse(responseText, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    return NextResponse.json(
      {
        message: "Failed to reach exchange-price-mocker",
        mockerUrl: `${mockerBaseUrl}/forward-price`,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 502 },
    );
  }
}
