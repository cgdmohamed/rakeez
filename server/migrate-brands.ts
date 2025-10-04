import { db } from './db';
import { brands, spareParts } from '@shared/schema';
import { eq } from 'drizzle-orm';

async function migrateBrands() {
  console.log('Starting brand migration...');
  
  try {
    const allSpareParts = await db.select().from(spareParts);
    console.log(`Found ${allSpareParts.length} spare parts`);
    
    const uniqueBrandNames = new Set<string>();
    allSpareParts.forEach(part => {
      if (part.brand && typeof part.brand === 'string') {
        uniqueBrandNames.add(part.brand);
      }
    });
    
    console.log(`Found ${uniqueBrandNames.size} unique brand names`);
    
    const createdBrands = new Map<string, string>();
    
    for (const brandName of uniqueBrandNames) {
      const [existingBrand] = await db.select().from(brands).where(eq(brands.name, brandName));
      
      if (existingBrand) {
        createdBrands.set(brandName, existingBrand.id);
        console.log(`Brand "${brandName}" already exists`);
      } else {
        const [newBrand] = await db.insert(brands).values({
          name: brandName,
          isActive: true,
        }).returning();
        createdBrands.set(brandName, newBrand.id);
        console.log(`Created brand "${brandName}" with ID ${newBrand.id}`);
      }
    }
    
    let updatedCount = 0;
    for (const part of allSpareParts) {
      if (part.brand && typeof part.brand === 'string') {
        const brandId = createdBrands.get(part.brand);
        if (brandId) {
          await db.update(spareParts)
            .set({ brandId })
            .where(eq(spareParts.id, part.id));
          updatedCount++;
        }
      }
    }
    
    console.log(`Migration complete! Updated ${updatedCount} spare parts`);
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    process.exit(0);
  }
}

migrateBrands();
