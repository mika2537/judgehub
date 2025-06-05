import { NextResponse } from "next/server";
import { MongoClient, ObjectId } from "mongodb";

const uri = process.env.MONGODB_URI!;
const client = new MongoClient(uri);

export async function GET(
  req: Request,
  context: { params: { id: string } }
) {
  try {
    const id = context.params?.id;
    await client.connect();
    const db = client.db("judgehub");

    const scoreboard = await db
      .collection("scoreboard")
      .find({ competitionId:id })
      .toArray();
    return NextResponse.json(scoreboard);
  } catch (error) {
    console.error("MongoDB error:", error);
    return NextResponse.json(
      { error: "Failed to fetch scoreboard" },
      { status: 500 }
    );
  } finally {
    await client.close();
  }
}