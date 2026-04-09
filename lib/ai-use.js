const DEFAULT_API_URL = "https://api-inference.modelscope.cn/v1/chat/completions";
const DEFAULT_MODEL = "Qwen/Qwen3-VL-8B-Instruct";

function resolveApiUrl() {
  const rawUrl = DEFAULT_API_URL
  const trimmedUrl = rawUrl.trim().replace(/\/+$/, "");

  if (trimmedUrl.endsWith("/chat/completions")) {
    return trimmedUrl;
  }

  if (trimmedUrl.endsWith("/v1")) {
    return `${trimmedUrl}/chat/completions`;
  }

  return `${trimmedUrl}/v1/chat/completions`;
}

function extractTextResponse(payload) {
  console.log("ModelScope API 原始响应:", JSON.stringify(payload, null, 2));

  const content = payload?.choices?.[0]?.message?.content;
  if (Array.isArray(content)) {
    const text = content
      .map((part) => {
        if (typeof part === "string") {
          return part;
        }

        if (part?.type === "text") {
          return part.text;
        }

        return "";
      })
      .filter(Boolean)
      .join("\n")
      .trim();

    if (text) {
      return text;
    }
  }

  if (typeof content === "string" && content.trim()) {
    return content.trim();
  }

  const fallbackText =
    payload?.output?.text ||
    payload?.output?.choices?.[0]?.message?.content ||
    payload?.data?.text;

  if (typeof fallbackText === "string" && fallbackText.trim()) {
    return fallbackText.trim();
  }

  throw new Error("ModelScope 没有返回可用文本结果。");
}

function ensureVisionCompatibleModel(model, imageDataUrl) {
  if (!imageDataUrl) {
    return;
  }

  const normalizedModel = model.toLowerCase();
  const supportsVision =
    normalizedModel.includes("vl") ||
    normalizedModel.includes("vision") ||
    normalizedModel.includes("gpt-4o") ||
    normalizedModel.includes("qvq");

  if (!supportsVision) {
    throw new Error(
      `当前配置的模型 "${model}" 不支持图片输入。` +
        " 你请求的是看图猜画功能，请改用视觉模型。"
    );
  }
}

function extractJsonText(rawText) {
  const trimmed = rawText.trim();
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  return fencedMatch?.[1]?.trim() || trimmed;
}

function parseModelOutput(rawText) {
  const jsonText = extractJsonText(rawText);

  try {
    const parsed = JSON.parse(jsonText);
    return {
      guess: parsed.guess || "无法判断",
      reasoning: parsed.reasoning || "模型没有给出解释。"
    };
  } catch {
    return {
      guess: rawText,
      reasoning: "模型返回了非 JSON 文本，已直接展示结果。"
    };
  }
}

export async function guessDrawingWithAI(imageDataUrl, description = "") {
  const apiKey =  process.env.QWEN_API_KEY;

  if (!apiKey) {
    throw new Error("服务端未配置 MODELSCOPE_API_KEY 或 QWEN_API_KEY。");
  }

  const model = DEFAULT_MODEL;
  // ensureVisionCompatibleModel(model, imageDataUrl);

  const descriptionText = String(description || "").trim();
  const userMessage = [
    {
      type: "text",
      text: "请根据这张用户手绘草图猜测画的是什么。"
    },
    {
      type: "image_url",
      image_url: {
        url: imageDataUrl
      }
    }
  ];

  if (descriptionText) {
    userMessage.push({
      type: "text",
      text: `用户补充说明：${descriptionText}`
    });
  }

  const response = await fetch(resolveApiUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      messages: [
        {
          role: "system",
          content:
            "你在玩你画我猜。你只能根据用户提供的草图内容判断，不要臆造背景故事。若用户提供了补充说明，请结合说明与草图一并判断。请直接输出 JSON，格式为 {\"guess\":\"...\",\"reasoning\":\"...\"}。guess 要简短，尽量是一个词或短语。reasoning 用简短中文说明原因。"
        },
        {
          role: "user",
          content: userMessage
        }
      ]
    })
  });

  if (!response.ok) {
    const errorPayload = await response.text();
    throw new Error(
      `ModelScope API 请求失败: ${response.status} ${errorPayload}`
    );
  }

  const payload = await response.json();
  const rawText = extractTextResponse(payload);
  return parseModelOutput(rawText);
}
