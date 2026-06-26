export interface Work {
  id: string;
  title: string;
  description?: string;
  cover?: string;
  tech?: string[];
  category?: string;
  content?: string;
  demo?: string;
  repo?: string;
  source?: string;
  githubPath?: string;
  featured?: boolean;
}

export interface Post {
  id: string;
  title: string;
  excerpt?: string;
  cover?: string;
  category?: string;
  content?: string;
  date?: string;
  readTime?: string;
  source?: string;
  githubPath?: string;
  featured?: boolean;
}
