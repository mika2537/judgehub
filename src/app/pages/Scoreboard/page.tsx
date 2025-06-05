"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Trophy, Medal, Star, TrendingUp, Users, RefreshCw, ArrowLeft } from "lucide-react";

interface Criterion {
  id: string;
  name: string;
  weight: number;
}

type Participant = {
  id: string;
  name: string;
  criteria: Criterion[];
};

type Competition = {
  _id: string;
  name: string;
  teamA?: string;
  teamB?: string;
  scoreA?: number;
  scoreB?: number;
  status: string;
  participants: Participant[];
  judges: number;
  endDate: string;
  criteria: Criterion[];
};

interface ScoreboardEntry {
  _id: string;
  participantId: string;
  scores: { criterionId: string; score: number }[];
  totalScore: number;
  rank?: number;
}

export default function Scoreboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [selectedCompetition, setSelectedCompetition] = useState<string | null>(null);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [leaderboard, setLeaderboard] = useState<ScoreboardEntry[]>([]);
  const [isLive, setIsLive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Redirect unauthenticated users
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/pages/login");
    } else if (status === "authenticated") {
      fetchCompetitions();
    }
  }, [status, router]);

  // Fetch competitions
  const fetchCompetitions = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/events", { credentials: "include" });
      if (!response.ok) {
        throw new Error(`Failed to fetch competitions: ${response.status}`);
      }
      const data = await response.json();
      setCompetitions(data);
      if (data.length > 0) {
        setSelectedCompetition(data[0]._id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Fetch scoreboard
  const fetchScoreboard = async () => {
    if (!selectedCompetition) return;
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/scoreboard/${selectedCompetition}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch scoreboard: ${response.status}`);
      }
      const data = await response.json();
      const sortedData = data
        .sort((a: ScoreboardEntry, b: ScoreboardEntry) => b.totalScore - a.totalScore)
        .map((entry: ScoreboardEntry, index: number) => ({
          ...entry,
          rank: index + 1,
        }));
      setLeaderboard(sortedData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Fetch scoreboard when selectedCompetition changes
  useEffect(() => {
    fetchScoreboard();
  }, [selectedCompetition]);

  // Live updates
  useEffect(() => {
    if (!isLive || !selectedCompetition) return;
    const interval = setInterval(fetchScoreboard, 5000);
    return () => clearInterval(interval);
  }, [isLive, selectedCompetition]);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Medal className="h-5 w-5 text-amber-600" />;
      default:
        return (
          <span className="w-5 h-5 flex items-center justify-center text-sm font-bold text-gray-500">
            #{rank}
          </span>
        );
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return "bg-gradient-to-r from-yellow-400 to-yellow-600";
      case 2:
        return "bg-gradient-to-r from-gray-300 to-gray-500";
      case 3:
        return "bg-gradient-to-r from-amber-400 to-amber-600";
      default:
        return "bg-gradient-to-r from-blue-500 to-purple-600";
    }
  };

  const getChangeIcon = () => {
    return <div className="w-4 h-4 bg-gray-300 rounded-full"></div>;
  };

  const selectedComp = competitions.find((comp) => comp._id === selectedCompetition);
  const judgedParticipants = leaderboard.length;
  const totalParticipants = selectedComp?.participants || 0;

  if (status === "loading" || loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-t-4 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <p className="text-red-600 text-lg font-semibold mb-4">{error}</p>
        <Button
          onClick={() => {
            fetchCompetitions();
            fetchScoreboard();
          }}
          className="bg-blue-600 text-white hover:bg-blue-700"
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 transition-colors">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-4">
        {/* Header */}
        <div className="mb-8 animate-fade">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.back()}
                className="hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-3xl font-semibold text-gray-900 dark:text-white mb-2">
                  Leaderboard
                </h1>
                <p className="text-gray-500 dark:text-gray-400">
                  Real-time competition results
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {isLive && (
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse"></div>
                  <span className="text-sm text-red-600 dark:text-red-400 font-semibold">LIVE</span>
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={fetchScoreboard}
                className="hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* Competition Selector */}
        <div className="mb-8">
          <Card className="bg-white/90 dark:bg-gray-800/90 shadow-xl">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Select Event</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {competitions.map((comp) => (
                  <Button
                    key={comp._id}
                    variant={selectedCompetition === comp._id ? "default" : "outline"}
                    className={`p-4 h-auto text-left justify-start items-start transition-all duration-200 ${
                      selectedCompetition === comp._id ? getRankColor(1) : "hover:bg-gray-100 dark:hover:bg-gray-700"
                    }`}
                    onClick={() => setSelectedCompetition(comp._id)}
                  >
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white">{comp.name}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        Progress: {judgedParticipants}/{comp.participants.length}
                      </div>
                      <Badge variant="outline" className="mt-2 border-gray-300 dark:border-gray-600">
                        {comp.status}
                      </Badge>
                    </div>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Competition Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-white/90 dark:bg-gray-800/90 shadow-xl">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Teams</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {Array.isArray(totalParticipants) ? totalParticipants.length : totalParticipants}
                </p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </CardContent>
          </Card>

          <Card className="bg-white/90 dark:bg-gray-800/90 shadow-xl">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Judged</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{judgedParticipants}</p>
              </div>
              <Star className="h-8 w-8 text-yellow-600" />
            </CardContent>
          </Card>

          <Card className="bg-white/90 dark:bg-gray-800/90 shadow-xl">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Progress</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {typeof totalParticipants === "number" && totalParticipants > 0
                    ? Math.round((judgedParticipants / totalParticipants) * 100)
                    : 0}%
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </CardContent>
          </Card>
        </div>

        {/* Leaderboard */}
        {selectedComp && (
          <Card className="bg-white/90 dark:bg-gray-800/90 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-lg font-semibold">
                <Trophy className="h-6 w-6 text-yellow-600" />
                <span>{selectedComp.name} Rankings</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {leaderboard.map((entry, index) => (
                  <div
                    key={entry._id}
                    className={`p-6 rounded-lg border transition-all duration-300 hover:shadow-md ${
                      entry.rank! <= 3
                        ? "bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/10 dark:to-amber-900/10 border-yellow-200 dark:border-yellow-800"
                        : "bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600"
                    }`}
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          {getRankIcon(entry.rank!)}
                          {getChangeIcon()}
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Team {selectedComp?.participants.find((p) => p.id === entry.participantId)?.name || "Unknown"}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Performance</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-gray-900 dark:text-white">
                          {entry.totalScore.toFixed(1)}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">Total Score</div>
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4">
                      {selectedComp.criteria.map((criterion) => {
                        const scoreEntry = entry.scores.find((s) => s.criterionId === criterion.id);
                        return (
                          <div key={criterion.id} className="text-center">
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {criterion.name}
                            </div>
                            <div className="text-lg font-semibold text-gray-900 dark:text-white">
                              {scoreEntry ? scoreEntry.score.toFixed(1) : "N/A"}
                            </div>
                            <div className="text-xs text-gray-400">({criterion.weight}%)</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              {typeof totalParticipants === "number" && judgedParticipants < totalParticipants && (
                <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-blue-600 rounded-full animate-pulse"></div>
                    <span className="text-sm text-blue-700 dark:text-blue-300">
                      Waiting for {totalParticipants - judgedParticipants} more teams to be judged...
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}