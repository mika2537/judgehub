'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Badge } from '@/app/components/ui/badge';
import { PlusCircle, Trash2, ArrowLeft, Calendar, List, Percent, Award, User, Clock, CheckCircle } from 'lucide-react';
import { useToast } from '@/app/components/ui/use-toast';
import { Textarea } from '@/app/components/ui/textarea';

interface Participant {
  id: string;
  name: string;
}

interface Judge {
  id: string;
  name: string;
  email: string;
}

interface Criterion {
  id: string;
  name: string;
  weight: number;
}

interface Competition {
  _id?: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  status: 'Upcoming' | 'Ongoing' | 'Completed';
  participants: Participant[];
  judges: Judge[];
  criteria: Criterion[];
}

export default function CompetitionPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'list' | 'create'>('list');

  const [newCompetition, setNewCompetition] = useState<Omit<Competition, '_id'>>({
    name: '',
    description: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'Upcoming',
    participants: [],
    judges: [],
    criteria: [{ id: crypto.randomUUID(), name: '', weight: 0 }],
  });

  const [newParticipant, setNewParticipant] = useState({ name: '' });
  const [newJudge, setNewJudge] = useState({ name: '', email: '' });

  const fetchCompetitions = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/competitions');

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to fetch competitions: ${res.status}`);
      }

      const data = await res.json();
      console.log('Raw competition data:', data);

      if (!Array.isArray(data)) {
        throw new Error('Invalid response format: Expected an array');
      }

      const formattedData: Competition[] = data.map((item: any) => ({
        _id: item._id?.toString(),
        name: item.name || 'Unnamed Competition',
        description: item.description || '',
        startDate: item.startDate
          ? new Date(item.startDate).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0],
        endDate: item.endDate
          ? new Date(item.endDate).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0],
        status: item.status || 'Upcoming',
        participants: Array.isArray(item.participants)
          ? item.participants.map((p: any) => ({
              id: p.id || crypto.randomUUID(),
              name: p.name || 'Unnamed Participant',
            }))
          : [],
        judges: Array.isArray(item.judges)
          ? item.judges.map((j: any) => ({
              id: j.id || crypto.randomUUID(),
              name: j.name || 'Unnamed Judge',
              email: j.email || '',
            }))
          : [],
        criteria: Array.isArray(item.criteria)
          ? item.criteria.map((c: any) => ({
              id: c.id || crypto.randomUUID(),
              name: c.name || '',
              weight: Number(c.weight) || 0,
            }))
          : [],
      }));

      setCompetitions(formattedData);
    } catch (err) {
      console.error('Fetch error:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?redirect=/competition');
    } else if (status === 'authenticated' && session?.user?.role !== 'admin') {
      toast({
        title: 'Access Denied',
        description: 'Only admins can access this page.',
        variant: 'destructive',
      });
      router.push('/dashboard');
    } else if (status === 'authenticated') {
      fetchCompetitions();
    }
  }, [status, session, router, toast]);

  const handleCreateCompetition = async () => {
    // Validate inputs
    if (!newCompetition.name.trim()) {
      toast({
        title: 'Invalid Input',
        description: 'Competition name is required.',
        variant: 'destructive',
      });
      return;
    }

    const hasEmptyCriteria = newCompetition.criteria.some(
      criterion => !criterion.name.trim() || Number(criterion.weight) <= 0
    );

    if (hasEmptyCriteria) {
      toast({
        title: 'Invalid Criteria',
        description: 'Each criterion must have a name and a weight greater than 0.',
        variant: 'destructive',
      });
      return;
    }

    const totalWeight = newCompetition.criteria.reduce((sum, c) => sum + Number(c.weight), 0);
    if (totalWeight !== 100) {
      toast({
        title: 'Invalid Criteria',
        description: 'Total weight of criteria must be 100%.',
        variant: 'destructive',
      });
      return;
    }

    // Validate dates
    if (!newCompetition.startDate || !newCompetition.endDate) {
      toast({
        title: 'Invalid Dates',
        description: 'Start date and end date are required.',
        variant: 'destructive',
      });
      return;
    }

    const startDate = new Date(newCompetition.startDate);
    const endDate = new Date(newCompetition.endDate);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      toast({
        title: 'Invalid Dates',
        description: 'Please provide valid start and end dates.',
        variant: 'destructive',
      });
      return;
    }

    if (startDate > endDate) {
      toast({
        title: 'Invalid Dates',
        description: 'Start date must be before end date.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const res = await fetch('/api/competitions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...newCompetition,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to create competition');
      }

      const createdCompetition = await res.json();

      setCompetitions([...competitions, {
        ...createdCompetition,
        startDate: new Date(createdCompetition.startDate).toISOString().split('T')[0],
        endDate: new Date(createdCompetition.endDate).toISOString().split('T')[0],
      }]);
      setActiveTab('list');

      toast({
        title: 'Success',
        description: 'Competition created successfully!',
      });

      // Reset form
      setNewCompetition({
        name: '',
        description: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'Upcoming',
        participants: [],
        judges: [],
        criteria: [{ id: crypto.randomUUID(), name: '', weight: 0 }],
      });
      setNewParticipant({ name: '' });
      setNewJudge({ name: '', email: '' });
    } catch (err) {
      console.error('Create error:', err);
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Could not create competition',
        variant: 'destructive',
      });
    }
  };

  const handleCriteriaChange = (id: string, field: keyof Criterion, value: string | number) => {
    setNewCompetition(prev => ({
      ...prev,
      criteria: prev.criteria.map(criterion =>
        criterion.id === id ? { ...criterion, [field]: field === 'weight' ? Number(value) : String(value) } : criterion
      ),
    }));
  };

  const addCriteriaField = () => {
    setNewCompetition(prev => ({
      ...prev,
      criteria: [...prev.criteria, { id: crypto.randomUUID(), name: '', weight: 0 }],
    }));
  };

  const removeCriteriaField = (id: string) => {
    if (newCompetition.criteria.length <= 1) {
      toast({
        title: 'Cannot Remove',
        description: 'At least one criterion is required.',
        variant: 'destructive',
      });
      return;
    }

    setNewCompetition(prev => ({
      ...prev,
      criteria: prev.criteria.filter(criterion => criterion.id !== id),
    }));
  };

  const addParticipant = () => {
    if (!newParticipant.name.trim()) {
      toast({
        title: 'Invalid Input',
        description: 'Participant name is required.',
        variant: 'destructive',
      });
      return;
    }

    setNewCompetition(prev => ({
      ...prev,
      participants: [
        ...prev.participants,
        { id: crypto.randomUUID(), name: newParticipant.name },
      ],
    }));
    setNewParticipant({ name: '' });
  };

  const removeParticipant = (id: string) => {
    setNewCompetition(prev => ({
      ...prev,
      participants: prev.participants.filter(p => p.id !== id),
    }));
  };

  const addJudge = () => {
    if (!newJudge.name.trim() || !newJudge.email.trim()) {
      toast({
        title: 'Invalid Input',
        description: 'Judge name and email are required.',
        variant: 'destructive',
      });
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newJudge.email)) {
      toast({
        title: 'Invalid Input',
        description: 'Please enter a valid email address.',
        variant: 'destructive',
      });
      return;
    }

    setNewCompetition(prev => ({
      ...prev,
      judges: [
        ...prev.judges,
        { id: crypto.randomUUID(), name: newJudge.name, email: newJudge.email },
      ],
    }));
    setNewJudge({ name: '', email: '' });
  };

  const removeJudge = (id: string) => {
    setNewCompetition(prev => ({
      ...prev,
      judges: prev.judges.filter(j => j.id !== id),
    }));
  };

  const getStatusBadge = (status: Competition['status']) => {
    switch (status) {
      case 'Upcoming':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3 mr-1" /> Upcoming</Badge>;
      case 'Ongoing':
        return <Badge variant="secondary" className="bg-green-100 text-green-800"><Award className="h-3 w-3 mr-1" /> Ongoing</Badge>;
      case 'Completed':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800"><CheckCircle className="h-3 w-3 mr-1" /> Completed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (status === 'loading' || loading) {
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
        <div className="flex space-x-4">
          <Button
            onClick={fetchCompetitions}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Retry
          </Button>
          <Button
            onClick={() => router.push('/dashboard')}
            variant="outline"
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Competition Management</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              {activeTab === 'list' ? 'Manage existing competitions' : 'Create a new competition'}
            </p>
          </div>

          {activeTab === 'create' && (
            <Button
              variant="outline"
              onClick={() => setActiveTab('list')}
              className="hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to List
            </Button>
          )}
        </div>

        {activeTab === 'list' ? (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">All Competitions</h2>
              <Button onClick={() => setActiveTab('create')}>
                <PlusCircle className="h-4 w-4 mr-2" />
                Create Competition
              </Button>
            </div>

            {competitions.length === 0 ? (
              <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-lg">
                <CardContent className="p-8 text-center">
                  <div className="mx-auto flex flex-col items-center justify-center">
                    <List className="h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">No competitions yet</h3>
                    <p className="text-gray-500 dark:text-gray-400 mt-2">
                      Get started by creating a new competition.
                    </p>
                    <Button className="mt-6" onClick={() => setActiveTab('create')}>
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Create Competition
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {competitions.map((competition) => (
                  <Card
                    key={competition._id}
                    className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-shadow duration-300"
                  >
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">{competition.name}</CardTitle>
                        {getStatusBadge(competition.status)}
                      </div>
                      <CardDescription className="line-clamp-2">
                        {competition.description || 'No description provided'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                          <Calendar className="h-4 w-4 mr-2" />
                          <span>
                            {new Date(competition.startDate).toLocaleDateString()} -{' '}
                            {new Date(competition.endDate).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex space-x-4 text-sm">
                          <div className="flex items-center">
                            <User className="h-4 w-4 mr-2" />
                            <span>{Array.isArray(competition.participants) ? competition.participants.length : 0} participants</span>
                          </div>
                          <div className="flex items-center">
                            <Award className="h-4 w-4 mr-2" />
                            <span>{Array.isArray(competition.judges) ? competition.judges.length : 0} judges</span>
                          </div>
                        </div>
                        <div className="pt-2">
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => router.push(`/competition/${competition._id}`)}
                          >
                            View Details
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Create New Competition</h2>

            <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-lg">
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Competition Name
                    </label>
                    <Input
                      placeholder="Enter competition name"
                      value={newCompetition.name}
                      onChange={(e) => setNewCompetition({ ...newCompetition, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Status
                    </label>
                    <select
                      value={newCompetition.status}
                      onChange={(e) => setNewCompetition({ ...newCompetition, status: e.target.value as Competition['status'] })}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      required
                    >
                      <option value="Upcoming">Upcoming</option>
                      <option value="Ongoing">Ongoing</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Description
                  </label>
                  <Textarea
                    placeholder="Enter competition description"
                    value={newCompetition.description}
                    onChange={(e) => setNewCompetition({ ...newCompetition, description: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Start Date
                    </label>
                    <Input
                      type="date"
                      value={newCompetition.startDate}
                      onChange={(e) => setNewCompetition({ ...newCompetition, startDate: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      End Date
                    </label>
                    <Input
                      type="date"
                      value={newCompetition.endDate}
                      onChange={(e) => setNewCompetition({ ...newCompetition, endDate: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">Participants</h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={addParticipant}
                    >
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Add Participant
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Input
                      placeholder="Enter participant name"
                      value={newParticipant.name}
                      onChange={(e) => setNewParticipant({ name: e.target.value })}
                    />
                    {newCompetition.participants.length > 0 && (
                      <div className="space-y-2">
                        {newCompetition.participants.map((p) => (
                          <div key={p.id} className="flex items-center justify-between bg-gray-100 dark:bg-gray-700 p-2 rounded">
                            <span className="text-sm">{p.name}</span>
                            <Button
                              variant="destructive"
                              size="icon"
                              onClick={() => removeParticipant(p.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">Judges</h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={addJudge}
                    >
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Add Judge
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      placeholder="Enter judge name"
                      value={newJudge.name}
                      onChange={(e) => setNewJudge({ ...newJudge, name: e.target.value })}
                    />
                    <Input
                      placeholder="Enter judge email"
                      value={newJudge.email}
                      onChange={(e) => setNewJudge({ ...newJudge, email: e.target.value })}
                    />
                  </div>

                  {newCompetition.judges.length > 0 && (
                    <div className="space-y-2">
                      {newCompetition.judges.map((j) => (
                        <div key={j.id} className="flex items-center justify-between bg-gray-100 dark:bg-gray-700 p-2 rounded">
                          <span className="text-sm">{j.name} ({j.email})</span>
                          <Button
                            variant="destructive"
                            size="icon"
                            onClick={() => removeJudge(j.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">Judging Criteria</h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={addCriteriaField}
                    >
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Add Criteria
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {newCompetition.criteria.map((criterion) => (
                      <div key={criterion.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                        <div className="md:col-span-5 space-y-2">
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Criterion Name
                          </label>
                          <Input
                            placeholder="Enter criterion name"
                            value={criterion.name}
                            onChange={(e) => handleCriteriaChange(criterion.id, 'name', e.target.value)}
                            required
                          />
                        </div>

                        <div className="md:col-span-5 space-y-2">
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Weight (%)
                          </label>
                          <div className="flex items-center space-x-2">
                            <Input
                              type="number"
                              min="1"
                              max="100"
                              placeholder="0-100"
                              value={criterion.weight}
                              onChange={(e) => handleCriteriaChange(criterion.id, 'weight', e.target.value)}
                              required
                            />
                            <Percent className="h-4 w-4 text-gray-500" />
                          </div>
                        </div>

                        <div className="md:col-span-2 flex justify-end">
                          <Button
                            variant="destructive"
                            size="icon"
                            onClick={() => removeCriteriaField(criterion.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Total Weight: {newCompetition.criteria.reduce((sum, c) => sum + Number(c.weight), 0)}%
                      </span>
                      {newCompetition.criteria.reduce((sum, c) => sum + Number(c.weight), 0) !== 100 && (
                        <span className="text-sm text-red-600">Total must be 100%</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <Button
                    onClick={handleCreateCompetition}
                    disabled={
                      !newCompetition.name ||
                      !newCompetition.startDate ||
                      !newCompetition.endDate ||
                      newCompetition.criteria.some(c => !c.name || c.weight <= 0) ||
                      newCompetition.criteria.reduce((sum, c) => sum + Number(c.weight), 0) !== 100
                    }
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                  >
                    Create Competition
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}