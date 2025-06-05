"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Slider } from "@/app/components/ui/slider";
import { Textarea } from "@/app/components/ui/textarea";
import { Star, Send, Clock, User, ArrowLeft, CheckCircle } from "lucide-react";
import { useToast } from "@/app/components/ui/use-toast";
import { Competition, Criterion, Participant } from "@/lib/types";

declare module "next-auth" {
  interface User {
    id: string;
    name?: string;
    role?: string;
  }
  interface Session {
    user: {
      id: string;
      name?: string;
      role?: string;
    };
  }
}

const Judge = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [selectedCompetitionIndex, setSelectedCompetitionIndex] = useState(0);
  const [selectedParticipantIndex, setSelectedParticipantIndex] = useState(0);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log("Judge: Session status:", status, "Session data:", session);
    if (status === "unauthenticated") {
      router.push("/pages/login");
    } else if (
      status === "authenticated" &&
      !["admin", "judge"].includes(session?.user?.role ?? "")
    ) {
      router.push("/pages/dashboard");
    }
  }, [status, session, router]);

  useEffect(() => {
    const fetchCompetitions = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch("/api/judge", {
          method: "GET",
          credentials: "include",
        });
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.message || `Failed to fetch competitions: ${res.status}`);
        }
        const data = await res.json();
        console.log("Judge: Fetched competitions from /api/judge:", data);
        if (!Array.isArray(data)) {
          throw new Error("Invalid response format: Expected an array");
        }
        setCompetitions(data);
        if (!data.length) {
          setError("No competitions available. Please create a competition.");
        }
      } catch (err) {
        console.error("Judge: Fetch error:", err);
        setError(err instanceof Error ? err.message : "An unknown error occurred");
      } finally {
        setLoading(false);
      }
    };

    if (status === "authenticated") {
      fetchCompetitions();
    }
  }, [status]);

  useEffect(() => {
    if (!competitions.length) return;

    let compIndex = selectedCompetitionIndex;
    if (compIndex >= competitions.length) {
      compIndex = 0;
      setSelectedCompetitionIndex(0);
    }

    const comp = competitions[compIndex];
    if (!comp.participants || (Array.isArray(comp.participants) && !comp.participants.length)) {
      setError("Selected competition has no participants.");
      setSelectedParticipantIndex(0);
      return;
    }

    let participantIndex = selectedParticipantIndex;
    if (Array.isArray(comp.participants)) {
      const unscoredParticipants = comp.participants.filter(
        (p) => !comp.scoredParticipantIds?.includes(p.id)
      );
      if (
        !comp.participants[participantIndex] ||
        comp.scoredParticipantIds?.includes(comp.participants[participantIndex].id)
      ) {
        participantIndex = unscoredParticipants.length > 0
          ? comp.participants.findIndex((p) => p.id === unscoredParticipants[0].id)
          : 0;
        setSelectedParticipantIndex(participantIndex);
      }
    }
  }, [competitions, selectedCompetitionIndex]);

  const competition = competitions[selectedCompetitionIndex];
  const participant = Array.isArray(competition?.participants)
    ? competition.participants[selectedParticipantIndex]
    : null;

  const handleScoreChange = (criteriaId: string, value: number[]) => {
    if (!participant) return;
    setScores((prev) => ({
      ...prev,
      [`${participant.id}-${criteriaId}`]: value[0],
    }));
  };

  const handleCommentChange = (criteriaId: string, comment: string) => {
    if (!participant) return;
    setComments((prev) => ({
      ...prev,
      [`${participant.id}-${criteriaId}`]: comment,
    }));
  };

  const handleSubmitScores = async () => {
    if (!participant || !competition || !session?.user || !competition.criteria) return;

    const filled = competition.criteria.filter(
      (c) => scores[`${participant.id}-${c.id}`] !== undefined
    );
    if (filled.length !== competition.criteria.length) {
      toast({
        title: "Incomplete Scoring",
        description: "Please score all criteria before submitting.",
        variant: "destructive",
      });
      return;
    }

    const totalScore = competition.criteria.reduce((total, criteria) => {
      const score = scores[`${participant.id}-${criteria.id}`] || 0;
      return total + (score * criteria.weight) / 100;
    }, 0);

    try {
      const response = await fetch("/api/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          competitionId: competition._id,
          participantId: participant.id,
          scores: competition.criteria.map((c) => ({
            criterionId: c.id,
            score: scores[`${participant.id}-${c.id}`],
            comment: comments[`${participant.id}-${c.id}`] || "",
          })),
          totalScore,
          judgeId: session.user.id,
          createdAt: new Date(),
        }),
      });

      toast({
        title: "Scores Submitted!",
        description: `Scores for ${participant.name} submitted successfully.`,
      });

      setScores((prev) => {
        const newScores = { ...prev };
        competition.criteria?.forEach((c) => {
          delete newScores[`${participant.id}-${c.id}`];
        });
        return newScores;
      });

      setComments((prev) => {
        const newComments = { ...prev };
        competition.criteria?.forEach((c) => {
          delete newComments[`${participant.id}-${c.id}`];
        });
        return newComments;
      });

      setCompetitions((prev) =>
        prev.map((comp, idx) =>
          idx === selectedCompetitionIndex
            ? { ...comp, scoredParticipantIds: [...(comp.scoredParticipantIds || []), participant.id] }
            : comp
        )
      );

      const unscoredParticipants = (competition.participants as Participant[]).filter(
        (p) => !competition.scoredParticipantIds?.includes(p.id) && p.id !== participant.id
      );

      if (unscoredParticipants.length > 0) {
        const nextIndex = (competition.participants as Participant[]).findIndex(
          (p) => p.id === unscoredParticipants[0].id
        );
        setSelectedParticipantIndex(nextIndex);
      } else if (selectedCompetitionIndex < competitions.length - 1) {
        const nextComp = competitions[selectedCompetitionIndex + 1];
        const nextUnscored = Array.isArray(nextComp.participants)
          ? nextComp.participants.filter((p) => !nextComp.scoredParticipantIds?.includes(p.id))
          : [];
        if (nextUnscored.length > 0) {
          setSelectedCompetitionIndex(selectedCompetitionIndex + 1);
          setSelectedParticipantIndex(
            Array.isArray(nextComp.participants) 
              ? nextComp.participants.findIndex((p) => p.id === nextUnscored[0].id) 
              : -1
          );
        } else {
          toast({
            title: "Judging Complete",
            description: "All participants in all competitions have been judged.",
          });
        }
      } else {
        toast({
          title: "Judging Complete",
            description: "All participants in all competitions have been judged.",
          });
        }
      } catch (err) {
        toast({
          title: "Submission Failed",
          description: err instanceof Error ? err.message : "An error occurred while submitting scores.",
          variant: "destructive",
        });
      }
    };
  
    const getScoreColor = (score: number) => {
      if (score >= 8) return "text-green-600";
      if (score >= 6) return "text-yellow-600";
      if (score >= 4) return "text-orange-600";
      return "text-red-600";
    };
  
    if (status === "loading" || loading) {
      return (
        <div className="flex justify-center items-center h-screen">
          <div className="animate-spin rounded-full h-10 w-10 border-t-4 border-blue-600"></div>
        </div>
      );
    }
  
    if (error || !competitions.length) {
      return (
        <div className="flex flex-col items-center justify-center h-screen">
          <p className="text-red-600 text-lg font-semibold mb-4">
            {error || "No competitions available."}
          </p>
          <Button
            onClick={() => {
              setLoading(true);
              setError(null);
              fetch("/api/judge", { credentials: "include" })
                .then((res) => {
                  if (!res.ok) throw new Error(`Failed to fetch competitions: ${res.status}`);
                  return res.json();
                })
                .then((data) => {
                  console.log("Judge: Retry fetched competitions:", data);
                  setCompetitions(data);
                  if (!data.length) setError("No competitions available.");
                })
                .catch((err) => setError(err.message))
                .finally(() => setLoading(false));
            }}
            className="bg-blue-600 text-white hover:bg-blue-700"
          >
            Retry
          </Button>
          <Button
            onClick={() => router.push("/pages/dashboard")}
            className="mt-4 bg-gray-600 text-white hover:bg-gray-700"
          >
            Back to Dashboard
          </Button>
        </div>
      );
    }
  
    if (!competition || !participant || !Array.isArray(competition.participants) || !competition.criteria) {
      return (
        <div className="flex flex-col items-center justify-center h-screen">
          <p className="text-gray-600 dark:text-gray-400 text-lg mb-4">
            No valid competition, participant, or criteria found.
          </p>
          <Button
            onClick={() => router.push("/pages/dashboard")}
            className="bg-blue-600 text-white hover:bg-blue-700"
          >
            Back to Dashboard
          </Button>
        </div>
      );
    }
  
    const totalScore = competition.criteria.reduce((total, criteria) => {
      const score = scores[`${participant.id}-${criteria.id}`] || 0;
      return total + (score * criteria.weight) / 100;
    }, 0);
  
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8 animate-fade-in">
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
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  Judge Panel
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Welcome, Judge {session?.user?.name || "User"}. Submit your scores.
                </p>
              </div>
            </div>
          </div>
  
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-1">
              <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-xl mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Star className="h-5 w-5 text-purple-600" />
                    <span>Competition</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <select
                    value={selectedCompetitionIndex}
                    onChange={(e) => {
                      const newIndex = Number(e.target.value);
                      setSelectedCompetitionIndex(newIndex);
                      const nextComp = competitions[newIndex];
                      const unscored = Array.isArray(nextComp.participants)
                        ? nextComp.participants.filter((p) => !nextComp.scoredParticipantIds?.includes(p.id))
                        : [];
                      setSelectedParticipantIndex(
                        unscored.length > 0
                          ? Array.isArray(nextComp.participants) 
                            ? nextComp.participants.findIndex((p) => p.id === unscored[0].id) 
                            : -1
                          : 0
                      );
                      setScores({});
                      setComments({});
                    }}
                    className="w-full p-2 border rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    {competitions.map((comp, index) => (
                      <option key={comp._id} value={index}>
                        {comp.name}
                      </option>
                    ))}
                  </select>
                  <h3 className="font-semibold text-gray-900 dark:text-white mt-4 mb-2">
                    {competition.name}
                  </h3>
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    {competition.status}
                  </Badge>
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                      <User className="h-4 w-4" />
                      <span>{Array.isArray(competition.participants) ? competition.participants.length : competition.participants} Participants</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                      <Clock className="h-4 w-4" />
                      <span>{competition.endDate || "Time TBD"}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
  
              <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-xl">
                <CardHeader>
                  <CardTitle>Participants</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Array.isArray(competition.participants) && competition.participants.map((p, index) => {
                      const isScored = competition.scoredParticipantIds?.includes(p.id);
                      return (
                        <Button
                          key={p.id}
                          variant={selectedParticipantIndex === index ? "default" : "outline"}
                          className={`w-full justify-start text-left ${
                            isScored ? "opacity-50 cursor-not-allowed" : "hover:scale-[1.02]"
                          } transition-all duration-200`}
                          onClick={() => {
                            if (!isScored) {
                              setSelectedParticipantIndex(index);
                              setScores({});
                              setComments({});
                            }
                          }}
                          disabled={isScored}
                        >
                          <div className="flex items-center justify-between w-full">
                            <div>
                              <div className="font-medium">{p.name}</div>
                              <div className="text-xs opacity-70">{p.performance || "No performance specified"}</div>
                            </div>
                            {isScored && (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            )}
                          </div>
                        </Button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
  
            <div className="lg:col-span-3">
              <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Scoring: {participant.name}</span>
                    <div className="text-right">
                      <div className="text-sm text-gray-600 dark:text-gray-400">Total Score</div>
                      <div className={`text-2xl font-bold ${getScoreColor(totalScore)}`}>
                        {totalScore.toFixed(1)}/10
                      </div>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-8">
                    {competition.criteria.map((criteria, index) => {
                      const scoreKey = `${participant.id}-${criteria.id}`;
                      const currentScore = scores[scoreKey] || 5;
                      const currentComment = comments[scoreKey] || "";
                      const isScored = competition.scoredParticipantIds?.includes(participant.id);
  
                      return (
                        <div
                          key={criteria.id}
                          className="p-6 bg-gray-50 dark:bg-gray-700 rounded-lg space-y-4 animate-fade-in"
                          style={{ animationDelay: `${index * 0.1}s` }}
                        >
                          <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                              {criteria.name}
                            </h3>
                            <Badge variant="outline">Weight: {criteria.weight}%</Badge>
                          </div>
  
                          <div className="space-y-4">
                            <div>
                              <div className="flex items-center justify-between mb-3">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                  Score (1-10)
                                </label>
                                <span className={`text-lg font-bold ${getScoreColor(currentScore)}`}>
                                  {currentScore}/10
                                </span>
                              </div>
                              <Slider
                                value={[currentScore]}
                                onValueChange={(value) => handleScoreChange(criteria.id, value)}
                                max={10}
                                min={1}
                                step={0.1}
                                className="w-full"
                                disabled={isScored}
                              />
                              <div className="flex justify-between text-xs text-gray-500 mt-1">
                                <span>Poor (1)</span>
                                <span>Average (5)</span>
                                <span>Excellent (10)</span>
                              </div>
                            </div>
  
                            <div>
                              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                                Comments (Optional)
                              </label>
                              <Textarea
                                placeholder={`Add your feedback for ${criteria.name.toLowerCase()}...`}
                                value={currentComment}
                                onChange={(e) => handleCommentChange(criteria.id, e.target.value)}
                                className="resize-none transition-all duration-200 focus:scale-[1.01]"
                                rows={2}
                                disabled={isScored}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
  
                    <div className="flex justify-end space-x-4 pt-6">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setScores({});
                          setComments({});
                        }}
                        disabled={competition.scoredParticipantIds?.includes(participant.id)}
                      >
                        Clear Scores
                      </Button>
                      <Button
                        onClick={handleSubmitScores}
                        className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 transition-all duration-200 hover:scale-105"
                        disabled={competition.scoredParticipantIds?.includes(participant.id)}
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Submit Scores
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  export default Judge;