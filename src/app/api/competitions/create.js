import { NextApiRequest, NextApiResponse } from "next";
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI || "";
const client = new MongoClient(uri);

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    await client.connect();
    const db = client.db("judgehub");
    const competitions = await db.collection("competitions").find({}).toArray();
    res.status(200).json(competitions);
  } catch (error) {
    console.error("MongoDB error:", error);
    res.status(500).json({ error: "Failed to fetch competitions" });
  } finally {
    await client.close();
  }
}
