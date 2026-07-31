import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';

async function main() {
  try {
    const sql = neon(process.env.POSTGRES_URL);
    const result = await sql`SELECT content FROM pages_content WHERE slug = 'assaggia-e-passeggia' LIMIT 1`;
    if (result.length > 0) {
      const content = result[0].content;
      const pdfUrl = content.menu?.pdfUrl;
      if (pdfUrl) {
        console.log('Found PDF URL:', pdfUrl);
        const response = await fetch(pdfUrl);
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        const filePath = path.join(process.cwd(), 'public', 'A_and_P_menu_mail.pdf');
        fs.writeFileSync(filePath, buffer);
        console.log('Successfully downloaded and saved to', filePath);
      } else {
        console.log('No PDF URL found in the database content.');
      }
    } else {
      console.log('Page content not found.');
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

main();
