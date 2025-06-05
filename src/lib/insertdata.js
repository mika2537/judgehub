require("dotenv").config();
const { MongoClient, ObjectId } = require("mongodb");

const uri = process.env.MONGODB_URI || "mongodb://localhost:27017";
const dbName = process.env.MONGODB_DB || "judgehub";
const client = new MongoClient(uri);

async function setupDatabase() {
  try {
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db(dbName);

    // Drop all relevant collections
    const collections = [
      "competitions",
      "participants",
      "judges",
      "ratingCategories",
      "users",
      "scoreboard",
      "matches",
    ];

    await Promise.all(
      collections.map((col) =>
        db
          .collection(col)
          .drop()
          .catch(() => console.log(`No ${col} collection to drop`))
      )
    );
    console.log("Existing collections dropped");

    // Rating criteria
    const ratingCategories = [
      {
        _id: new ObjectId(),
        id: "criteria1",
        name: "Innovation",
        description: "Creativity and originality of the solution",
        maxScore: 100,
        weight: 30,
      },
      {
        _id: new ObjectId(),
        id: "criteria2",
        name: "Execution",
        description: "Quality and completeness of the implementation",
        maxScore: 100,
        weight: 40,
      },
      {
        _id: new ObjectId(),
        id: "criteria3",
        name: "Impact",
        description: "Potential usefulness and impact",
        maxScore: 100,
        weight: 30,
      },
    ];
    await db.collection("ratingCategories").insertMany(ratingCategories);
    console.log("Inserted rating categories");

    // Judges
    const judges = [
      {
        _id: new ObjectId(),
        id: "judge1",
        name: "John Doe",
        email: "john@example.com",
      },
      {
        _id: new ObjectId(),
        id: "judge2",
        name: "Jane Smith",
        email: "jane@example.com",
      },
      {
        _id: new ObjectId(),
        id: "judge3",
        name: "Carlos Ruiz",
        email: "carlos@example.com",
      },
    ];
    await db.collection("judges").insertMany(judges);
    console.log("Inserted judges");

    // Participants
    const participants = [
      {
        _id: new ObjectId(),
        id: "team1",
        name: "Team Alpha",
        members: ["Alice", "Bob"],
      },
      {
        _id: new ObjectId(),
        id: "team2",
        name: "Team Beta",
        members: ["Charlie", "David"],
      },
      {
        _id: new ObjectId(),
        id: "team3",
        name: "Team Gamma",
        members: ["Ella", "Frank"],
      },
      {
        _id: new ObjectId(),
        id: "team4",
        name: "Team Delta",
        members: ["Grace", "Henry"],
      },
      {
        _id: new ObjectId(),
        id: "team5",
        name: "Team Epsilon",
        members: ["Ivan", "Julia"],
      },
      {
        _id: new ObjectId(),
        id: "team6",
        name: "Team Zeta",
        members: ["Kevin", "Laura"],
      },
      {
        _id: new ObjectId(),
        id: "team7",
        name: "Team Theta",
        members: ["Mona", "Nate"],
      },
      {
        _id: new ObjectId(),
        id: "team8",
        name: "Team Sigma",
        members: ["Oscar", "Paula"],
      },
      {
        _id: new ObjectId(),
        id: "team9",
        name: "Team Omega",
        members: ["Quinn", "Rita"],
      },
    ];
    await db.collection("participants").insertMany(participants);
    console.log("Inserted participants");

    // Competitions (3)
    const competitions = [
      {
        _id: new ObjectId(),
        name: "Hackathon 2023",
        description: "Annual coding competition",
        startDate: new Date("2023-11-01"),
        endDate: new Date("2023-11-03"),
        status: "Upcoming",
        participants: [
          { id: "team1", name: "Team Alpha" },
          { id: "team2", name: "Team Beta" },
          { id: "team3", name: "Team Gamma" },
        ],
        criteria: ratingCategories.map((c) => ({
          id: c.id,
          name: c.name,
          weight: c.weight,
        })),
        judges: judges.map((j) => ({
          id: j.id,
          name: j.name,
          email: j.email,
        })),
        createdAt: new Date(),
      },
      {
        _id: new ObjectId(),
        name: "AI Challenge 2024",
        description: "Build innovative AI models",
        startDate: new Date("2024-02-10"),
        endDate: new Date("2024-02-12"),
        status: "Live",
        participants: [
          { id: "team4", name: "Team Delta" },
          { id: "team5", name: "Team Epsilon" },
          { id: "team6", name: "Team Zeta" },
        ],
        criteria: ratingCategories.map((c) => ({
          id: c.id,
          name: c.name,
          weight: c.weight,
        })),
        judges: judges.map((j) => ({
          id: j.id,
          name: j.name,
          email: j.email,
        })),
        createdAt: new Date(),
      },
      {
        _id: new ObjectId(),
        name: "DevSprint 2025",
        description: "24-hour rapid software dev contest",
        startDate: new Date("2025-05-15"),
        endDate: new Date("2025-05-16"),
        status: "Completed",
        participants: [
          { id: "team7", name: "Team Theta" },
          { id: "team8", name: "Team Sigma" },
          { id: "team9", name: "Team Omega" },
        ],
        criteria: ratingCategories.map((c) => ({
          id: c.id,
          name: c.name,
          weight: c.weight,
        })),
        judges: judges.map((j) => ({
          id: j.id,
          name: j.name,
          email: j.email,
        })),
        createdAt: new Date(),
      },
    ];
    await db.collection("competitions").insertMany(competitions);
    console.log("Inserted competitions");

    // Users for auth
    const users = [
      {
        _id: new ObjectId(),
        email: "admin@judgehub.com",
        password: "hashed_password_1",
        name: "Admin",
        role: "admin",
      },
      ...judges.map((j, index) => ({
        _id: new ObjectId(),
        email: j.email,
        password: `hashed_password_${index + 2}`,
        name: j.name,
        role: "judge",
      })),
    ];
    await db.collection("users").insertMany(users);
    console.log("Inserted users");

    console.log("✅ Database fully initialized with 3+ of each collection!");
  } catch (error) {
    console.error("❌ Error setting up database:", error);
  } finally {
    await client.close();
    console.log("MongoDB connection closed");
  }
}

setupDatabase();
