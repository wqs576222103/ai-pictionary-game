import { NextResponse } from "next/server";
import { guessDrawingWithAI } from "../../../lib/ai-use";

export async function POST(request) {
  try {
    const { imageDataUrl, description } = await request.json();

    if (!imageDataUrl || typeof imageDataUrl !== "string") {
      return NextResponse.json(
        { error: "请求缺少 imageDataUrl。" },
        { status: 400 }
      );
    }

    const detail = typeof description === "string" ? description.trim() : "";
    const result = await guessDrawingWithAI(imageDataUrl, detail);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "服务端猜测失败。" },
      { status: 500 }
    );
  }
}
