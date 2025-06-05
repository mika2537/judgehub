export interface Criterion {
  id: string;
  name: string;
  weight: number;
}

export interface Participant {
  id: string;
  name: string;
  performance?: string; // Made optional to match MongoDB data
}

export interface Competition {
  _id: string;
  name: string;
  status: string;
  participants: Participant[] | number;
  criteria?: Criterion[];
  scoredParticipantIds?: string[];
  teamA?: string;
  teamB?: string;
  scoreA?: number;
  scoreB?: number;
  judges?: number;
  endDate?: string;
}