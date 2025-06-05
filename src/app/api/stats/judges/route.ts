// src/app/api/stats/judges/route.ts
import { connectToDb } from "@/lib/mongodb";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const connection = await connectToDb();
    const db = connection?.db ?? null;
    if (!db) {
      throw new Error("Database connection failed or 'db' property is missing.");
    }
    const judgeCount = await db.collection("users").countDocuments({ role: "judge" });

    return NextResponse.json({ totalJudges: judgeCount });
  } catch (error) {
    console.error("Failed to count judges:", error);
    return NextResponse.json({ error: "Failed to count judges" }, { status: 500 });
  }
}