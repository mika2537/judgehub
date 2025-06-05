import { NextApiRequest, NextApiResponse } from "next";
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI || "";
const client = new MongoClient(uri);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    await client.connect();
    const db = client.db("judgehub");
    const categories = await db.collection("ratingCategories").find({}).toArray();
    res.status(200).json(categories);
  } catch (error) {
    console.error("MongoDB error:", error);
    res.status(500).json({ error: "Failed to fetch rating categories" });
  } finally {
    await client.close();
  }
}