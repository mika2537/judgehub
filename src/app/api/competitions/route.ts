import { NextResponse } from 'next/server';
import { MongoClient, ObjectId } from 'mongodb';

const uri = process.env.MONGODB_URI || '';
const client = new MongoClient(uri);

export async function GET() {
  try {
    await client.connect();
    const db = client.db('judgehub');
    const competitions = await db.collection('competitions').find().toArray();
    return NextResponse.json(competitions, { status: 200 });
  } catch (error) {
    console.error('Error fetching competitions:', error);
    return NextResponse.json({ error: 'Failed to fetch competitions' }, { status: 500 });
  } finally {
    await client.close();
  }
}

export async function POST(request: Request) {
  try {
    const competition = await request.json();
    await client.connect();
    const db = client.db('judgehub');
    const result = await db.collection('competitions').insertOne(competition);
    return NextResponse.json({ insertedId: result.insertedId.toString() }, { status: 201 });
  } catch (error) {
    console.error('Error creating competition:', error);
    return NextResponse.json({ error: 'Failed to create competition' }, { status: 500 });
  } finally {
    await client.close();
  }
}