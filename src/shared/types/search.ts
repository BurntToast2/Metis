export interface SearchResultPage {
  page: number;
  snippet: string;
}

export interface ManualSearchResult {
  cmmId: number;
  cmmNumber: string | null;
  title: string;
  matches: SearchResultPage[];
}