import {connectToDb } from "@/lib/mongodb";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const { db } = await connectToDb();
    const matches: { _id: any; [key: string]: any }[] = await db.collection("competitions").find().toArray();

    // Convert MongoDB _id to string for serialization
    const serializedMatches = matches.map((match) => ({
      ...match,
      _id: match._id.toString(),
      id: match._id.toString(), // Add both _id and id for compatibility
    }));

    return NextResponse.json(serializedMatches);
  } catch (error) {
    console.error("Error fetching matches:", error);
    return NextResponse.json(
      { error: "Failed to fetch matches" },
      { status: 500 }
    );
  }
}