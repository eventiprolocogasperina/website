import { Pool } from '@neondatabase/serverless';

const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

export type ZuccalandPhoto = {
  id: number;
  cloudinary_public_id: string;
  frame_name: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: Date;
};

export async function addPhoto(cloudinaryPublicId: string, frameName: string) {
  const result = await pool.query(
    `INSERT INTO zuccaland_photos (cloudinary_public_id, frame_name) 
     VALUES ($1, $2) RETURNING *`,
    [cloudinaryPublicId, frameName]
  );
  return result.rows[0] as ZuccalandPhoto;
}

export async function getPhotosByStatus(status: string) {
  const result = await pool.query(
    `SELECT * FROM zuccaland_photos WHERE status = $1 ORDER BY created_at DESC`,
    [status]
  );
  return result.rows as ZuccalandPhoto[];
}

export async function getAllPhotos() {
  const result = await pool.query(
    `SELECT * FROM zuccaland_photos ORDER BY created_at DESC`
  );
  return result.rows as ZuccalandPhoto[];
}

export async function updatePhotoStatus(id: number, status: 'approved' | 'rejected' | 'pending') {
  const result = await pool.query(
    `UPDATE zuccaland_photos SET status = $1 WHERE id = $2 RETURNING *`,
    [status, id]
  );
  return result.rows[0] as ZuccalandPhoto;
}
