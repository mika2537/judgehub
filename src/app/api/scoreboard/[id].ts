import { NextRequest, NextResponse } from "next/server";
import { MongoClient, ObjectId } from "mongodb";

const uri = process.env.MONGODB_URI || "";
const client = new MongoClient(uri);

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;

  if (!id) {
    return NextResponse.json({ error: "Competition ID is required" }, { status: 400 });
  }

  try {
    await client.connect();
    const db = client.db("judgehub");
    // Find scoreboard entries with competitionId matching the ObjectId of id param
    const scoreboard = await db
      .collection("scoreboard")
      
      .find({ competitionId: new ObjectId(id) })
      .toArray();

    return NextResponse.json(scoreboard, { status: 200 });
  } catch (error) {
    console.error("MongoDB error:", error);
    return NextResponse.json({ error: "Failed to fetch scoreboard" }, { status: 500 });
  } finally {
    await client.close();
  }
}