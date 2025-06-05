import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { MongoClient } from "mongodb";
import bcrypt from "bcrypt";
import { create } from "domain";
import { createHash } from "crypto";

// MongoDB connection with global caching for Next.js hot reload
let client;
let clientPromise;

if (!global._mongoClientPromise) {
  client = new MongoClient(process.env.MONGODB_URI);
  global._mongoClientPromise = client.connect();
}

clientPromise = global._mongoClientPromise;

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: {
          label: "Email",
          type: "email",
          placeholder: "email@example.com",
        },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const { email, password } = credentials;

        // Connect to MongoDB
        const client = await clientPromise;
        const db = client.db(process.env.MONGODB_DB || "judgehub");
        const usersCollection = db.collection("users");

        // Find the user by email
        const user = await usersCollection.findOne({ email });
        const hashedPassword = await bcrypt.hash(password, 10);
        console.log("Hashed password:", hashedPassword);

        if (user && (await bcrypt.compare(password, user.password))) {
          // Return all necessary user data
          return {
            id: user._id.toString(),
            email: user.email,
            role: user.role || "",
            name: user.name || "",
          };
        } else {
          throw new Error("Invalid email or password");
        }
      },
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/auth/error",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.name = user.name;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      session.user.name = token.name;
      return session;
    },
  },
  debug: process.env.NODE_ENV === "development",
  secret: process.env.NEXTAUTH_SECRET,
};

export const dynamic = "force-dynamic"; // Ensure this route is always dynamic
const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
