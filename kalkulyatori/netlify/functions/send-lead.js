const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST,OPTIONS"
};

function buildResponse(statusCode, body) {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: typeof body === "string" ? body : JSON.stringify(body)
  };
}

exports.handler = async function handler(event) {
  console.log("INCOMING_EVENT:", {
    httpMethod: event?.httpMethod,
    hasBody: Boolean(event?.body),
    isBase64Encoded: event?.isBase64Encoded
  });

  if (event.httpMethod === "OPTIONS") {
    return buildResponse(204, "");
  }

  if (event.httpMethod !== "POST") {
    return buildResponse(405, { error: "Method Not Allowed" });
  }

  let body;

  try {
    const rawBody = event.isBase64Encoded
      ? Buffer.from(event.body || "", "base64").toString("utf8")
      : event.body || "{}";

    body = JSON.parse(rawBody);
  } catch (error) {
    console.error("BODY_PARSE_ERROR:", error);
    return buildResponse(400, {
      success: false,
      error: "Invalid JSON body"
    });
  }

  console.log("INCOMING_BODY:", body);

  const {
    name = "",
    phone = "",
    email = "",
    comment = "",
    message = ""
  } = body;

  const token = process.env.TELEGRAM_TOKEN;
  const chatId = process.env.CHAT_ID;

  if (!token || !chatId) {
    console.error("ENV_ERROR: TELEGRAM_TOKEN or CHAT_ID is missing");
    return buildResponse(500, {
      success: false,
      error: "Missing TELEGRAM_TOKEN or CHAT_ID"
    });
  }

  const text =
    message ||
    `
🏊‍♂️ НОВАЯ ЗАЯВКА

👤 Имя: ${name || "не указано"}
📞 Телефон: ${phone || "не указано"}
📧 Email: ${email || "не указан"}
💬 Комментарий: ${comment || "нет"}
`;

  const telegramUrl = `https://api.telegram.org/bot${token}/sendMessage`;

  try {
    const telegramResponse = await fetch(telegramUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        chat_id: chatId,
        text
      })
    });

    const telegramData = await telegramResponse.json();

    console.log("TELEGRAM_RESPONSE:", {
      status: telegramResponse.status,
      ok: telegramResponse.ok,
      data: telegramData
    });

    if (!telegramResponse.ok || !telegramData.ok) {
      return buildResponse(500, {
        success: false,
        error: "Telegram API error",
        details: telegramData
      });
    }

    return buildResponse(200, { success: true });
  } catch (error) {
    console.error("SEND_TO_TELEGRAM_ERROR:", error);
    return buildResponse(500, {
      success: false,
      error: error.message
    });
  }
};