import { neon } from '@neondatabase/serverless';

export interface NewsArticle {
  id: string;
  slug: string;
  title: string;
  coverImage?: string;
  content: string;
  publishedAt: string;
  author?: string;
  featured: boolean;
  config?: any;
}

function getDb() {
  if (!process.env.POSTGRES_URL) {
    throw new Error('Missing POSTGRES_URL');
  }
  return neon(process.env.POSTGRES_URL);
}

export async function getAllNews(): Promise<NewsArticle[]> {
  try {
    const sql = getDb();
    const news = await sql`SELECT * FROM news ORDER BY "publishedAt" DESC`;
    return news as NewsArticle[];
  } catch (error) {
    console.error('Failed to get all news:', error);
    return [];
  }
}

export async function getNewsBySlug(slug: string): Promise<NewsArticle | undefined> {
  try {
    const sql = getDb();
    const news = await sql`SELECT * FROM news WHERE slug = ${slug} LIMIT 1`;
    return news.length > 0 ? (news[0] as NewsArticle) : undefined;
  } catch (error) {
    console.error('Failed to get news by slug:', error);
    return undefined;
  }
}
