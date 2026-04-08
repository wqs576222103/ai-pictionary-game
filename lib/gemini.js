const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_MODEL = "gemini-2.5-flash";

function extractBase64Payload(imageDataUrl) {
  const match = imageDataUrl.match(/^data:(.+);base64,(.+)$/);

  if (!match) {
    throw new Error("不支持的图片数据格式。");
  }

  return {
    mimeType: match[1],
    data: match[2]
  };
}

function extractTextResponse(payload) {
  const parts = payload?.candidates?.[0]?.content?.parts ?? [];
  const text = parts
    .map((part) => part?.text)
    .filter(Boolean)
    .join("\n")
    .trim();

  if (!text) {
    const blockReason = payload?.promptFeedback?.blockReason;
    if (blockReason) {
      throw new Error(`Gemini 拒绝处理该图片，原因: ${blockReason}`);
    }

    throw new Error("Gemini 没有返回可用文本结果。");
  }

  return text;
}

function parseModelOutput(rawText) {
  try {
    const parsed = JSON.parse(rawText);
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

export async function guessDrawingWithGemini(imageDataUrl) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("服务端未配置 GEMINI_API_KEY。");
  }

  const { mimeType, data } = extractBase64Payload(imageDataUrl);
  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;

  const response = await fetch(
    `${GEMINI_API_URL}/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: [
                  "你在玩“你画我猜”。",
                  "请根据这张用户手绘草图猜测画的是什么。",
                  "只根据图像内容回答，不要臆造背景故事。",
                  "输出 JSON，格式为 {\"guess\":\"...\",\"reasoning\":\"...\"}。",
                  "guess 要简短，尽量是一个词或短语。",
                  "reasoning 用简短中文说明你为什么这样猜。"
                ].join(" ")
              },
              {
                inline_data: {
                  mime_type: mimeType,
                  data
                }
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.4,
          responseMimeType: "application/json"
        }
      })
    }
  );

  if (!response.ok) {
    const errorPayload = await response.text();
    throw new Error(`Gemini API 请求失败: ${response.status} ${errorPayload}`);
  }

  const payload = await response.json();
  const rawText = extractTextResponse(payload);
  return parseModelOutput(rawText);
}
