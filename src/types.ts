export interface MatchupRow {
  deck1: string;
  deck2: string;
  wins: string | number;
  losses: string | number;
  ties?: string | number;
  total?: string | number;
  true_win_rate?: number;
}

export interface Player {
  id: number;
  deck: string;
  matchPoints: number;
  opponents: number[]; // IDs of opponents faced
}

export interface DeckCount {
  [deck: string]: number;
}

export interface SimulationResults {
  day1Players: DeckCount;
  day2Players: DeckCount;
  top8: DeckCount;
  top16?: DeckCount;
  top32?: DeckCount;
}

export interface AggregatedResults {
  numSimulations: number;
  day1Counts: DeckCount;
  day2Avg: DeckCount;
  top8Avg: DeckCount;
  top16Avg?: DeckCount;
  top32Avg?: DeckCount;
  day2ConversionRate: DeckCount;
  top8ConversionRate: DeckCount;
}
