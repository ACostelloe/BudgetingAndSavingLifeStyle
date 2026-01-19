import db from '../database.js';
import { v4 as uuidv4 } from 'uuid';

export interface CategoryMatch {
  category: string;
  confidence: number;
}

export function categorizeTransaction(description: string, amount: number, type: 'income' | 'expense'): string {
  const descLower = description.toLowerCase().trim();
  
  // If it's income, return Income category
  if (type === 'income') {
    return 'Income';
  }

  // Check learned patterns first (exact or partial match)
  const learnedPatterns = db.prepare(`
    SELECT category, confidence, description_pattern
    FROM category_learning
    WHERE description_pattern LIKE ? OR ? LIKE '%' || description_pattern || '%'
    ORDER BY confidence DESC, usage_count DESC
    LIMIT 1
  `).all(`%${descLower}%`, descLower) as Array<{ category: string; confidence: number; description_pattern: string }>;

  if (learnedPatterns.length > 0 && learnedPatterns[0].confidence > 0.6) {
    return learnedPatterns[0].category;
  }

  // Check predefined categories with improved matching
  const categories = db.prepare('SELECT name, keywords FROM categories WHERE name != ? AND name != ?').all('Income', 'Other') as Array<{ name: string; keywords: string }>;
  
  let bestMatch: CategoryMatch | null = null;
  
  for (const cat of categories) {
    if (!cat.keywords) continue;
    
    const keywords = cat.keywords.toLowerCase().split(',').map(k => k.trim()).filter(k => k.length > 0);
    let matches = 0;
    let exactMatches = 0;
    
    // Check for keyword matches (word boundaries for better accuracy)
    for (const keyword of keywords) {
      // Exact word match (better confidence)
      const wordBoundaryRegex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (wordBoundaryRegex.test(descLower)) {
        exactMatches++;
        matches++;
      }
      // Partial match (lower confidence)
      else if (descLower.includes(keyword)) {
        matches++;
      }
    }
    
    if (matches > 0) {
      // Higher confidence for exact matches
      // Use a more lenient confidence calculation
      const confidence = exactMatches > 0 
        ? Math.min(1.0, (exactMatches * 0.9 + matches * 0.3) / Math.max(1, keywords.length * 0.5))
        : Math.min(1.0, matches / Math.max(1, keywords.length * 0.5));
      
      if (!bestMatch || confidence > bestMatch.confidence) {
        bestMatch = { category: cat.name, confidence };
      }
    }
  }

  // Lower threshold significantly to catch more transactions
  if (bestMatch && bestMatch.confidence > 0.05) {
    return bestMatch.category;
  }

  // Try to infer from common patterns if no match found
  // Use case-insensitive matching on original description for better coverage
  
  // Rent & Utilities patterns (high amounts often indicate rent)
  if ((/mgm|martin|management|property|real.?estate|realestate|payment.?by.?authority|rent|lease/i.test(description) && amount > 500) ||
      /electricity|electric|power|water|gas|internet|wifi|broadband|nbn|telstra|optus|vodafone|strata|body.?corporate|council.?rates|rates|utility|utilities/i.test(description)) {
    return 'Rent & Utilities';
  }
  
  // Food patterns (comprehensive matching - check for common food-related words)
  if (/coles|woolworths|iga|aldi|supermarket|grocery|groceries|food|restaurant|cafe|café|dining|meal|takeaway|uber.?eats|doordash|menulog|mcdonalds|kfc|hungry|pizza|sushi|bakery|butcher|fishmonger|deli|bistro|kitchen|grill|burger|chicken|seafood|fruit|vegetable/i.test(description)) {
    return 'Food & Dining';
  }
  
  // Transport patterns (comprehensive)
  if (/uber|taxi|transport|transportfornsw|opal|train|bus|tram|ferry|parking|toll|fuel|petrol|gas.?station|bp|shell|caltex|mobil|7.?eleven|car|vehicle|flight|airline|qantas|virgin|jetstar|hotel|accommodation|travel|holiday|vacation|metro|subway/i.test(description)) {
    return 'Travel & Transport';
  }
  
  // Entertainment patterns
  if (/sportsbet|betting|gambling|lottery|movie|cinema|theater|theatre|concert|music|spotify|netflix|disney|streaming|game|gaming|playstation|xbox|nintendo|pub|bar|club|drinks|alcohol|beer|wine|spirits|hotel/i.test(description)) {
    return 'Entertainment';
  }
  
  // Shopping patterns
  if (/amazon|ebay|kogan|target|kmart|big.?w|myer|david.?jones|shopping|shop|store|purchase|retail|clothing|clothes|shoes|electronics|appliances|furniture|homewares|decor|market/i.test(description)) {
    return 'Shopping & Retail';
  }
  
  // Healthcare patterns
  if (/doctor|dentist|pharmacy|chemist|hospital|clinic|medical|health|gym|fitness|yoga|pilates|trainer|sports|physio|therapy/i.test(description)) {
    return 'Healthcare & Fitness';
  }
  
  // Subscriptions patterns
  if (/adobe|apple|audible|mailchimp|intuit|subscription|membership|prime|amznprimeau|software|app|cloud|saas|onlyfans|service/i.test(description)) {
    return 'Subscriptions & Services';
  }
  
  // Bills patterns
  if (/bpay|bankwest|direct.?debit|automatic|recurring|monthly.?payment|annual.?fee|service.?fee|processing.?fee|aussie.?broadband|bill|payment/i.test(description)) {
    return 'Bills & Payments';
  }
  
  // Personal Care patterns
  if (/haircut|hairdresser|barber|salon|beauty|spa|cosmetics|toiletries|personal.?care|grooming/i.test(description)) {
    return 'Personal Care';
  }
  
  // Charity patterns
  if (/st.?vin|salvos|red.?cross|donation|charity|giving|fundraiser|cause/i.test(description)) {
    return 'Charity & Donations';
  }

  // Log transactions that fall into Other for debugging
  console.log(`[Categorization] No match found for: "${description}" (amount: $${amount.toFixed(2)})`);
  
  // Default to Other only as last resort
  return 'Other';
}

export function learnCategory(description: string, category: string): void {
  const descLower = description.toLowerCase();
  
  // Check if pattern already exists
  const existing = db.prepare(`
    SELECT id, confidence, usage_count
    FROM category_learning
    WHERE description_pattern = ?
  `).get(descLower) as { id: string; confidence: number; usage_count: number } | undefined;

  if (existing) {
    // Update confidence and usage count
    const newConfidence = Math.min(1.0, existing.confidence + 0.1);
    const newUsageCount = existing.usage_count + 1;
    
    db.prepare(`
      UPDATE category_learning
      SET confidence = ?, usage_count = ?, last_used = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(newConfidence, newUsageCount, existing.id);
  } else {
    // Create new pattern
    db.prepare(`
      INSERT INTO category_learning (id, description_pattern, category, confidence, usage_count)
      VALUES (?, ?, ?, ?, ?)
    `).run(uuidv4(), descLower, category, 0.8, 1);
  }
}

