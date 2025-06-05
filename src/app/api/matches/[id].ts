
import { NextApiRequest, NextApiResponse } from "next";
import { MongoClient, ObjectId } from "mongodb";

const uri = process.env.MONGODB_URI || "";
const client = new MongoClient(uri);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (req.method === "GET") {
    try {
      await client.connect();
      const db = client.db("judgehub");
      const match = await db.collection("competitions").findOne({ _id: new ObjectId(id as string) });
      if (!match) {
        return res.status(404).json({ error: "Match not found" });
      }
      res.status(200).json(match);
    } catch (error) {
      console.error("MongoDB error:", error);
      res.status(500).json({ error: "Failed to fetch match" });
    } finally {
      await client.close();
    }
  } else if (req.method === "POST") {
    try {
      await client.connect();
      const db = client.db("judgehub");
      const { ratings, userId } = req.body;
      for (const rating of ratings) {
        const { teamId, categories } = rating;
        let totalScore = 0;
        const criteria = await db.collection("ratingCategories").find({}).toArray();
        for (const cat of categories) {
          const criterion = criteria.find((c: any) => c.id === cat.categoryId);
          if (criterion) {
            totalScore += cat.rating * (criterion.weight / 100);
          }
        }
        await db.collection("scoreboard").updateOne(
          { competitionId: new ObjectId(id as string), participantId: teamId },
          {
            $set: {
              scores: categories,
              totalScore,
              updatedAt: new Date(),
            },
            $setOnInsert: { createdAt: new Date() },
          },
          { upsert: true }
        );
      }
      res.status(200).json({ message: "Ratings submitted" });
    } catch (error) {
      console.error("MongoDB error:", error);
      res.status(500).json({ error: "Failed to submit ratings" });
    } finally {
      await client.close();
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}