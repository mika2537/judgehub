// pages/api/matches/[id].ts

import { connectToDatabase } from "@/utils/mongodb";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req, res) {
  const { id } = req.query;
  const { db } = await connectToDatabase();

  if (req.method === "POST") {
    const { ratings } = req.body;

    try {
      const voteRecord = {
        matchId: id,
        ratings, // { teamId: rating }
        createdAt: new Date(),
      };

      await db.collection("votes").insertOne(voteRecord);
      res.status(200).json({ message: "Vote submitted" });
    } catch (err) {
      console.error("Error saving vote:", err);
      res.status(500).json({ error: "Failed to save vote" });
    }
  } else if (req.method === "GET") {
    // You already handle GET for match details
  } else {
    res.setHeader("Allow", ["POST", "GET"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}