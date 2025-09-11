export interface SearchResultUser {
  id: string;
  type: 'user';
  title: string;
  excerpt?: string;
  avatar?: string;
  createdAt: Date;
}

export interface SearchResultPost {
  id: string;
  type: 'post';
  title: string;
  excerpt?: string;
  image?: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
  };
  createdAt: Date;
  likes: number;
  views: number;
}

export type SearchResult = SearchResultUser | SearchResultPost;

export interface SearchSuggestion {
  id: string;
  type: 'user' | 'post';
  title: string;
  avatar?: string;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  query: string;
}
