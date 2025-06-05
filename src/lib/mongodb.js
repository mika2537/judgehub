// /app/api/judge/route.ts

import { MongoClient } from "mongodb"; // FIXED: from 'mongodb', NOT 'mongoose'

const uri = process.env.MONGODB_URI;
const options = {};

if (!uri) {
  throw new Error("Please add your Mongo URI to .env.local");
}

let client;
let clientPromise;

// eslint-disable-next-line no-var
global._mongoClientPromise = global._mongoClientPromise || null;

if (process.env.NODE_ENV === "development") {
  // In dev, use global var to preserve connection across reloads
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  // In production, create a new client
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

export async function connectToDb() {
  const client = await clientPromise;
  const db = client.db("judgehub");
  return { client, db };
}

export default clientPromise;