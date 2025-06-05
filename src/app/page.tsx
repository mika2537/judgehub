"use client";

import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Trophy, Users, Star, BarChart3, Calendar, Clock } from "lucide-react";
import Link from "next/link";

// Extend Session type to include role
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      role?: string | null;
    };
  }
}

// Competition type
type Competition = {
  id: string;
  name: string;
  teamA?: string;
  teamB?: string;
  scoreA?: number | null;
  scoreB?: number | null;
  status: string;
  participants: number;
  judges: number;
  endDate: string;
};

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalJudges, setTotalJudges] = useState<number>(0);
  const [submissionsToday, setSubmissionsToday] = useState<number>(0);

  useEffect(() => {
    if (status === "unauthenticated") {
      const redirectTo = searchParams?.get("redirect") || "pages/dashboard";
      sessionStorage.setItem("loginRedirect", redirectTo);
      router.push("pages/login");
    } else if (status === "authenticated") {
      fetchCompetitions();
      fetchJudgeCount();
    }
  }, [status, router, searchParams]);

  const fetchCompetitions = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/competitions");
      if (!response.ok) {
        throw new Error(`Failed to fetch competitions: ${response.status}`);
      }
      const data = await response.json();
      const formattedData: Competition[] = data
        .map((item: any) => ({
          id: item._id?.toString() || Math.random().toString(36).substring(2, 9),
          name: item.name || (item.teamA && item.teamB ? `${item.teamA} vs ${item.teamB}` : "Unnamed Competition"),
          teamA: item.teamA,
          teamB: item.teamB,
          scoreA: item.scoreA ?? null,
          scoreB: item.scoreB ?? null,
          status: item.status || "Upcoming",
          participants: Array.isArray(item.participants) ? item.participants.length : 0,
          judges: Array.isArray(item.judges) ? item.judges.length : 0,
          endDate: item.endDate
            ? new Date(item.endDate).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })
            : "N/A",
        }))
        .filter((comp: Competition) => comp.participants >= 3 && comp.judges >= 3);
      setCompetitions(formattedData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  const fetchJudgeCount = async () => {
    try {
      const response = await fetch("/api/stats/judges");
      if (!response.ok) throw new Error("Failed to fetch judge count");
      const data = await response.json();
      setTotalJudges(data.totalJudges || 0);
    } catch (err) {
      console.error("Failed to fetch judge count:", err);
    }
  };


  const stats = [
    {
      title: "Active Competitions",
      value: competitions.length.toString(),
      icon: Trophy,
      color: "text-blue-600",
    },
    {
      title: "Total Judges",
      value: totalJudges.toString(),
      icon: Users,
      color: "text-green-600",
    },
    {
      title: "Submissions Today",
      value: submissionsToday.toString(),
      icon: Star,
      color: "text-purple-600",
    },
    {
      title: "Average Score",
      value: competitions.length
        ? (
            competitions
              .filter((c) => c.scoreA != null && c.scoreB != null)
              .reduce((sum, c) => sum + (c.scoreA! + c.scoreB!), 0) /
            (competitions.filter((c) => c.scoreA != null && c.scoreB != null).length * 2 || 1)
          ).toFixed(1)
        : "0.0",
      icon: BarChart3,
      color: "text-orange-600",
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Live":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "Scoring":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "Upcoming":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "Completed":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <p className="text-red-500 text-lg font-semibold mb-4">{error}</p>
        <Button
          onClick={fetchCompetitions}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 animate-fade-in">
          <h1 className="text-3xl font-semibold">
            Welcome back, {session?.user?.name || "User"}!
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Here's what's happening with your competitions today.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card
                key={index}
                className="hover:shadow-lg transition-all duration-300 hover:scale-105 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-xl"
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        {stat.title}
                      </p>
                      <p className="text-3xl font-bold text-gray-900 dark:text-white">
                        {stat.value}
                      </p>
                    </div>
                    <div
                      className={`p-3 rounded-lg bg-gray-50 dark:bg-gray-700 ${stat.color}`}
                    >
                      <Icon className="h-6 w-6" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Competitions */}
          <div className="lg:col-span-2">
            <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Trophy className="h-5 w-5 text-blue-600" />
                  <span>Recent Competitions</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {competitions.length > 0 ? (
                    competitions.map((competition) => (
                      <div
                        key={competition.id}
                        className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:shadow-md transition-all duration-200 hover:scale-[1.02]"
                      >
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {competition.name}
                          </h3>
                          <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
                            <span className="flex items-center space-x-1">
                              <Users className="h-4 w-4" />
                              <span>{competition.participants} participants</span>
                            </span>
                            <span className="flex items-center space-x-1">
                              <Star className="h-4 w-4" />
                              <span>{competition.judges} judges</span>
                            </span>
                            <span className="flex items-center space-x-1">
                              <Calendar className="h-4 w-4" />
                              <span>{competition.endDate}</span>
                            </span>
                            {competition.scoreA != null && competition.scoreB != null && (
                              <span className="flex items-center space-x-1">
                                <BarChart3 className="h-4 w-4" />
                                <span>
                                  Score: {competition.scoreA} - {competition.scoreB}
                                </span>
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                              competition.status
                            )}`}
                          >
                            {competition.status}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-600 text-center">
                      No competitions found.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions & Live Updates */}
          <div className="space-y-6">
            <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-xl">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {session?.user?.role === "admin" && (
                  <Link href="/competition">
                    <Button>Create Competition</Button>
                  </Link>
                )}
                {["admin", "judge"].includes(session?.user?.role ?? "") && (
                  <Link href="/pages/Judge">
                    <Button variant="outline" className="w-full">
                      <Star className="h-4 w-4 mr-2" />
                      Start Judging
                    </Button>
                  </Link>
                )}
                <Link href="/pages/Scoreboard">
                  <Button variant="outline" className="w-full">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    View Scoreboard
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-green-600" />
                  <span>Live Updates</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-gray-600 dark:text-gray-400">
                      Judge Smith submitted scores for Dance Round 1
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    <span className="text-gray-600 dark:text-gray-400">
                      New participant registered for Talent Show
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                    <span className="text-gray-600 dark:text-gray-400">
                      Competition deadline extended by 2 hours
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}