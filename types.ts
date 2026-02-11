export enum SessionType {
  QUIZ = 'QUIZ',
  POLL = 'POLL'
}

export enum Difficulty {
  EASY = 'Easy',
  MEDIUM = 'Medium',
  HARD = 'Hard',
  VERY_HARD = 'Very Hard'
}

export enum TimerMode {
  PER_QUESTION = 'PER_QUESTION',
  WHOLE_QUIZ = 'WHOLE_QUIZ',
  NONE = 'NONE'
}

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswerIndex?: number; // Optional for Polls
  imageUrl?: string; // Base64 string of the image
  usageCount?: number; // Tracks how many times a question has been used
}

export interface ParticipantResponse {
  participantName: string;
  answers: Record<string, number>; // questionId -> selectedOptionIndex
  score: number;
  submittedAt: string;
}

export interface SessionConfig {
  topic: string;
  questionCount: number;
  difficulty?: Difficulty;
  timerMode: TimerMode;
  timeValue: number; // Seconds (either per question or total)
  scheduledStartTime?: string; // ISO String
  scheduledEndTime?: string; // ISO String
}

export interface Session {
  id: string;
  hostId: string; // simulate ownership
  joinCode: string; // 6-character code
  title: string;
  type: SessionType;
  status: 'DRAFT' | 'ACTIVE' | 'ENDED' | 'SCHEDULED';
  hasStarted?: boolean; // True if the host has clicked "Start" from the lobby
  createdAt: string;
  config: SessionConfig;
  questions: Question[];
  responses: ParticipantResponse[];
}

export type ViewState = 
  | 'LANDING' 
  | 'DASHBOARD' 
  | 'CREATE_WIZARD' 
  | 'EDITOR' 
  | 'PREVIEW'       // Host preview mode
  | 'SESSION_LOBBY' // Host Waiting Room
  | 'SESSION_PLAY'  // Guest/Host playing
  | 'RESULTS';      // Shared results view