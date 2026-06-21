export interface Work {
  id: string;
  title: string;
  description: string;
  category: string;
  image?: string;
  link?: string;
  tags: string[];
}

export interface Config {
  siteName: string;
  tagline: string;
  socialLinks: {
    github?: string;
    email?: string;
    weixin?: string;
  };
  previewMode: boolean;
  activeStyle: string | null;
}
