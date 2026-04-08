import { NextResponse } from "next/server";
import { guessDrawingWithGemini } from "../../../lib/gemini";

export async function POST(request) {
  try {
    const { imageDataUrl } = await request.json();

    if (!imageDataUrl || typeof imageDataUrl !== "string") {
      return NextResponse.json(
        { error: "请求缺少 imageDataUrl。" },
        { status: 400 }
      );
    }

    const result = await guessDrawingWithGemini(imageDataUrl);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "服务端猜测失败。" },
      { status: 500 }
    );
  }
}
