import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import mongoose, { Schema, Types, Document, models, model } from "mongoose";

// Define ScoreModel if not imported from elsewhere
const ScoreSchema = new Schema({
  judgeId: { type: String, required: true },
  competitionId: { type: String, required: true },
  participantId: { type: String, required: true },
});

const ScoreModel = models.Score || model("Score", ScoreSchema);
import { connectToDb } from "@/lib/mongodb";
import { MongoClient } from "mongodb";
const uri = process.env.MONGODB_URI!;
const client = new MongoClient(uri);

export async function GET(req: NextRequest) {
  try {
    type SessionUser = {
      id: string;
      role: string;
    };

    const session = (await getServerSession(authOptions)) as { user: SessionUser } | null;
    if (!session || !session.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { role, id: judgeId } = session.user;
    if (!["admin", "judge"].includes(role)) {
      return NextResponse.json({ message: "Forbidden: Insufficient permissions" }, { status: 403 });
    }

    await connectToDb();

    // const competitions = await CompetitionModel.find();

    await client.connect();
    const db = client.db("judgehub");
    const competitions = await db.collection("competitions").find({}).toArray();

    console.log('competitions',competitions);

    if (competitions.length <= 0) {
      return NextResponse.json([]);
    }

    const scores = await ScoreModel.find({ judgeId })
      .select("competitionId participantId -_id")
      .lean();

    const formattedCompetitions = competitions.map((comp) => {
      const scoredParticipantIds = scores
        .filter((score) => score.competitionId === comp._id.toString())
        .map((score) => score.participantId);

      return {
        _id: comp._id.toString(),
        name: comp.name,
        status: comp.status,
        participants: comp.participants.map((p) => ({
          id: p.id,
          name: p.name,
          performance: p.performance,
        })),
        criteria: comp.criteria.map((c) => ({
          id: c.id,
          name: c.name,
          weight: c.weight,
        })),
        scoredParticipantIds,
      };
    });

    return NextResponse.json(formattedCompetitions);
  } catch (error) {
    console.error("Error in /api/judge route:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}