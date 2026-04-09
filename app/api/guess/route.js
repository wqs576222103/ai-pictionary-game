import { NextResponse } from "next/server";
import { guessDrawingWithAI } from "../../../lib/ai-use";

export async function POST(request) {
  try {
    const { imageDataUrl, description, model } = await request.json();

    if (!imageDataUrl || typeof imageDataUrl !== "string") {
      return NextResponse.json(
        { error: "请求缺少 imageDataUrl。" },
        { status: 400 }
      );
    }

    const detail = typeof description === "string" ? description.trim() : "";
    const selectedModel = typeof model === "string" ? model : "Qwen/Qwen3-VL-8B-Instruct";
    const result = await guessDrawingWithAI(imageDataUrl, detail, selectedModel);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "服务端猜测失败。" },
      { status: 500 }
    );
  }
}
