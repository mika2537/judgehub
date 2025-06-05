// src/app/api/scores/route.ts
import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error("MONGODB_URI is not defined in environment variables");
}
const client = new MongoClient(uri);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    await client.connect();
    const db = client.db("judgehub");
    await db.collection("scoreboard").insertOne(body);
    return NextResponse.json({ message: "Score submitted" });
  } catch (err) {
    console.error("Submit error:", err);
    return NextResponse.json({ error: "Submit failed" }, { status: 500 });
  } finally {
    await client.close();
  }
}