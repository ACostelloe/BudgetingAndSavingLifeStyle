import pdfParse from 'pdf-parse';

export interface ParsedTransaction {
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
}

export interface PDFSummary {
  openingBalance: number | null;
  closingBalance: number | null;
  totalCredits: number | null;
  totalDebits: number | null;
}

export interface ParsedPDFResult {
  transactions: ParsedTransaction[];
  summary: PDFSummary;
  validation: {
    isValid: boolean;
    calculatedCredits: number;
    calculatedDebits: number;
    calculatedClosingBalance: number | null;
    differences: {
      creditsDiff: number;
      debitsDiff: number;
      closingBalanceDiff: number | null;
    };
  };
}

export async function parsePDF(buffer: Buffer): Promise<ParsedPDFResult> {
  const data = await pdfParse(buffer);
  const text = data.text;
  
  const transactions: ParsedTransaction[] = [];
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  // Extract summary information (Opening Balance, Closing Balance, Total Credits, Total Debits)
  const summary: PDFSummary = {
    openingBalance: null,
    closingBalance: null,
    totalCredits: null,
    totalDebits: null
  };
  
  // Look for summary lines
  for (const line of lines) {
    const lineLower = line.toLowerCase();
    
    // Opening Balance pattern: "Opening Balance" or "Statement Opening Balance" followed by amount
    if (/opening\s+balance/i.test(lineLower)) {
      const amountMatch = line.match(/[+\-]?\s*\$?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2}))/);
      if (amountMatch) {
        summary.openingBalance = parseFloat(amountMatch[1].replace(/,/g, ''));
        // Check if it's negative
        if (line.includes('-') || line.match(/^[+\-]/)?.includes('-')) {
          summary.openingBalance = -summary.openingBalance;
        }
      }
    }
    
    // Closing Balance pattern: "Closing Balance" followed by amount
    if (/closing\s+balance/i.test(lineLower)) {
      const amountMatch = line.match(/[+\-]?\s*\$?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2}))/);
      if (amountMatch) {
        summary.closingBalance = parseFloat(amountMatch[1].replace(/,/g, ''));
        // Check if it's negative
        if (line.includes('-') || line.match(/^[+\-]/)?.includes('-')) {
          summary.closingBalance = -summary.closingBalance;
        }
      }
    }
    
    // Total Credits pattern: "Total Credits" followed by amount
    if (/total\s+credits/i.test(lineLower)) {
      const amountMatch = line.match(/[+\-]?\s*\$?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2}))/);
      if (amountMatch) {
        summary.totalCredits = parseFloat(amountMatch[1].replace(/,/g, ''));
      }
    }
    
    // Total Debits pattern: "Total Debits" followed by amount
    if (/total\s+debits/i.test(lineLower)) {
      const amountMatch = line.match(/[+\-]?\s*\$?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2}))/);
      if (amountMatch) {
        summary.totalDebits = parseFloat(amountMatch[1].replace(/,/g, ''));
      }
    }
  }

  // Patterns to exclude (headers, footers, summaries, addresses)
  const excludePatterns = [
    /^statement\s+no\.?\s*\d+\s+page\s+\d+/i,
    /^page\s+\d+\s+of\s+\d+/i,
    /^opening\s+balance/i,
    /^closing\s+balance/i,
    /^statement\s+opening\s+balance/i,
    /^total\s+(credits|debits|deposits|withdrawals)/i,
    /^balance\s+brought\s+forward/i,
    /^balance\s+carried\s+forward/i,
    /^\d+\s+NSW\s+\d+/i,
    /^[A-Z]+\s+ST\s*$/i,
    /^[A-Z]+\s+[A-Z]+\s+NSW/i,
    /^account\s+name/i,
    /^account\s+number/i,
    /^customer\s+id/i,
    /^bsb/i,
    /^transaction\s+history/i,
    /^date\s+transaction\s+description/i,
    /^date\s+description/i,
    /^debit\s+credit\s+balance/i,
    /^---+/i,
    /^westpac\s+banking/i,
    /^thank\s+you/i,
    /^convenience/i,
    /^more\s+information/i,
    /^understanding/i,
    /^complaints/i,
    /^interest\s+rates/i,
    /^tax\s+file/i,
    /^please\s+check/i,
    /^\s*$/
  ];

  const shouldExclude = (line: string): boolean => {
    const lineLower = line.toLowerCase().trim();
    if (lineLower.length < 3) return true;
    
    for (const pattern of excludePatterns) {
      if (pattern.test(line)) return true;
    }
    
    // Exclude addresses
    if (/^[A-Z\s]{2,30}\s+\d+$/.test(line) && !/\d{1,2}[\/\-]\d{1,2}/.test(line)) {
      return true;
    }
    
    // Exclude lines that are just numbers
    if (/^[\d\s\.,$+-]+$/.test(line) && line.length < 20) {
      return true;
    }
    
    return false;
  };

  const isValidDescription = (desc: string): boolean => {
    if (!desc || desc.length < 3) return false;
    if (!/[a-zA-Z]/.test(desc)) return false;
    
    const invalidPatterns = [
      /^statement\s+no/i,
      /^page\s+\d+/i,
      /^opening\s+balance/i,
      /^closing\s+balance/i,
      /^total\s+/i,
      /^\d+\s+NSW/i,
      /^[A-Z]+\s+ST$/i,
      /^[A-Z]+\s+[A-Z]+\s+NSW/i,
    ];
    
    for (const pattern of invalidPatterns) {
      if (pattern.test(desc)) return false;
    }
    
    return true;
  };

  // Parse Westpac table: DATE | DESCRIPTION | DEBIT | CREDIT | BALANCE
  let i = 0;
  
  while (i < lines.length) {
    const line = lines[i];
    
    if (shouldExclude(line)) {
      i++;
      continue;
    }
    
    // Look for date at start: DD/MM/YY or DD/MM/YYYY
    const dateMatch = line.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
    if (!dateMatch) {
      i++;
      continue;
    }
    
    // Parse date (Westpac uses DD/MM/YYYY format)
    const [, day, month, year] = dateMatch;
    
    // Validate day and month are reasonable
    const dayNum = parseInt(day);
    const monthNum = parseInt(month);
    if (dayNum < 1 || dayNum > 31 || monthNum < 1 || monthNum > 12) {
      console.warn(`Invalid date components: ${day}/${month}/${year}, skipping`);
      i++;
      continue;
    }
    
    // Convert 2-digit year to 4-digit (assume 2000-2099)
    let fullYear: string;
    if (year.length === 2) {
      const yearNum = parseInt(year);
      // If year is > 50, assume 1900s, otherwise 2000s
      fullYear = yearNum > 50 ? `19${year}` : `20${year}`;
    } else {
      fullYear = year;
    }
    
    // Validate year is reasonable (2000-2099)
    const yearNum = parseInt(fullYear);
    if (yearNum < 2000 || yearNum > 2099) {
      console.warn(`Year out of range: ${fullYear}, skipping`);
      i++;
      continue;
    }
    
    // Format as YYYY-MM-DD (ISO format)
    const date = `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    
    // Validate the final date string
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime()) || 
        dateObj.getDate() !== dayNum || 
        dateObj.getMonth() + 1 !== monthNum || 
        dateObj.getFullYear() !== yearNum) {
      console.warn(`Invalid date: ${date} (from ${day}/${month}/${year}), skipping`);
      i++;
      continue;
    }
    
    // Get rest of line after date
    let restOfLine = line.substring(dateMatch[0].length).trim();
    
    // Handle multi-line descriptions
    let description = restOfLine;
    let descriptionLines = 1;
    
    // Check if next line is continuation of description (has text, no date, no amounts)
    while (i + descriptionLines < lines.length) {
      const nextLine = lines[i + descriptionLines];
      if (shouldExclude(nextLine)) break;
      
      // If next line starts with date, it's a new transaction
      if (nextLine.match(/^\d{1,2}\/\d{1,2}\/\d{2,4}/)) break;
      
      // If next line has amounts in DEBIT/CREDIT position, it's the amount line
      const hasAmountInColumn = /\|\s*\d{1,3}(?:,\d{3})*(?:\.\d{2})/.test(nextLine) ||
                                /\s{5,}\d{1,3}(?:,\d{3})*(?:\.\d{2})/.test(nextLine);
      
      if (hasAmountInColumn) {
        // This is the amount line, combine with description
        restOfLine += ' ' + nextLine;
        descriptionLines++;
        break;
      }
      
      // If it's just text continuation, add it
      if (/[a-zA-Z]{3,}/.test(nextLine) && !/\d{1,3}(?:,\d{3})*(?:\.\d{2})/.test(nextLine)) {
        description += ' ' + nextLine;
        restOfLine += ' ' + nextLine;
        descriptionLines++;
      } else {
        break;
      }
    }
    
    // Now parse the combined line for DEBIT/CREDIT amounts
    // Pattern: description | DEBIT | CREDIT | BALANCE
    // Or: description DEBIT CREDIT BALANCE (space-separated)
    
    // Find all amounts in the line
    const amountPattern = /(\d{1,3}(?:,\d{3})*(?:\.\d{2}))/g;
    const amounts: Array<{ value: number; index: number }> = [];
    let match;
    
    while ((match = amountPattern.exec(restOfLine)) !== null) {
      const value = parseFloat(match[1].replace(/,/g, ''));
      if (value >= 0.01 && value <= 10000000) {
        amounts.push({ value, index: match.index });
      }
    }
    
    if (amounts.length === 0) {
      i += descriptionLines;
      continue;
    }
    
    // Determine transaction type based on keywords and amount position
    const lineLower = description.toLowerCase();
    const isDebitTransaction = lineLower.includes('debit card purchase') ||
                               lineLower.includes('withdrawal') ||
                               lineLower.includes('eftpos debit') ||
                               lineLower.includes('payment by authority') ||
                               lineLower.includes('purchase') ||
                               lineLower.includes('payment');
    
    const isCreditTransaction = lineLower.includes('deposit') ||
                               lineLower.includes('salary') ||
                               lineLower.includes('transfer') ||
                               lineLower.includes('tfr') ||
                               lineLower.includes('osko payment');
    
    let amount: number | null = null;
    let type: 'income' | 'expense' | null = null;
    let finalDescription = description;
    
    // Check for pipe-separated table format: | DEBIT | CREDIT |
    const pipeFormat = restOfLine.includes('|');
    
    if (pipeFormat) {
      // Table format: split by pipes
      // Format: DATE | DESCRIPTION | DEBIT | CREDIT | BALANCE
      const parts = restOfLine.split('|').map(p => p.trim());
      
      // Find description (first part with text)
      let descPart = '';
      let debitPart = '';
      let creditPart = '';
      
      // Description is usually first, then DEBIT, then CREDIT, then BALANCE
      for (let j = 0; j < parts.length; j++) {
        const part = parts[j];
        if (!part) continue;
        
        // Check if it's an amount
        const isAmount = /^\d{1,3}(?:,\d{3})*(?:\.\d{2})$/.test(part);
        
        if (!isAmount && !descPart && /[a-zA-Z]/.test(part)) {
          descPart = part;
        } else if (isAmount && !debitPart) {
          debitPart = part;
        } else if (isAmount && debitPart && !creditPart) {
          creditPart = part;
        }
      }
      
      // If we found amounts, determine type
      const debitAmount = debitPart ? parseFloat(debitPart.replace(/,/g, '')) : null;
      const creditAmount = creditPart ? parseFloat(creditPart.replace(/,/g, '')) : null;
      
      // DEBIT column comes before CREDIT column
      // If DEBIT has amount and CREDIT is empty → expense
      // If DEBIT is empty and CREDIT has amount → income
      if (debitAmount && debitAmount >= 0.01 && (!creditAmount || creditAmount === 0)) {
        amount = debitAmount;
        type = 'expense';
        finalDescription = descPart || restOfLine.split('|')[0].trim();
      } else if (creditAmount && creditAmount >= 0.01 && (!debitAmount || debitAmount === 0)) {
        amount = creditAmount;
        type = 'income';
        finalDescription = descPart || restOfLine.split('|')[0].trim();
      } else if (debitAmount && debitAmount >= 0.01) {
        // If both exist, DEBIT takes precedence (it's an expense)
        amount = debitAmount;
        type = 'expense';
        finalDescription = descPart || restOfLine.split('|')[0].trim();
      }
    } else {
      // Space-separated format - need to infer column positions
      // Typically: description DEBIT CREDIT BALANCE
      // Or: description | | CREDIT (empty DEBIT column)
      
      // Check for empty DEBIT column pattern (two spaces or | | before amount)
      const emptyDebitPattern = /\|\s*\|\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2}))/;
      const emptyDebitMatch = restOfLine.match(emptyDebitPattern);
      
      if (emptyDebitMatch) {
        // CREDIT transaction (income)
        amount = parseFloat(emptyDebitMatch[1].replace(/,/g, ''));
        type = 'income';
        finalDescription = restOfLine.substring(0, restOfLine.indexOf(emptyDebitMatch[0])).trim();
      } else if (isDebitTransaction && amounts.length > 0) {
        // DEBIT transaction (expense) - first amount is usually the DEBIT
        amount = amounts[0].value;
        type = 'expense';
        finalDescription = restOfLine.substring(0, amounts[0].index).trim();
      } else if (isCreditTransaction && amounts.length > 0) {
        // CREDIT transaction (income) - last amount before balance
        // Usually the second-to-last amount (last is balance)
        const creditIndex = amounts.length > 1 ? amounts.length - 2 : amounts.length - 1;
        amount = amounts[creditIndex].value;
        type = 'income';
        finalDescription = restOfLine.substring(0, amounts[creditIndex].index).trim();
      } else if (amounts.length === 1) {
        // Only one amount - infer from description
        if (isDebitTransaction) {
          amount = amounts[0].value;
          type = 'expense';
          finalDescription = restOfLine.substring(0, amounts[0].index).trim();
        } else if (isCreditTransaction) {
          amount = amounts[0].value;
          type = 'income';
          finalDescription = restOfLine.substring(0, amounts[0].index).trim();
        }
      }
    }
    
    // Clean up description and validate date
    if (amount && type && finalDescription && date) {
      // Validate date format (YYYY-MM-DD)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(date)) {
        console.warn(`Invalid date format: ${date}, skipping transaction`);
        i += descriptionLines;
        continue;
      }
      
      // Validate date is reasonable (not in future, not too old - within 10 years)
      const transactionDate = new Date(date);
      const today = new Date();
      today.setHours(23, 59, 59, 999); // Allow today's date
      const tenYearsAgo = new Date();
      tenYearsAgo.setFullYear(today.getFullYear() - 10);
      
      if (isNaN(transactionDate.getTime()) || transactionDate > today || transactionDate < tenYearsAgo) {
        console.warn(`Date out of range or invalid: ${date}, skipping transaction`);
        i += descriptionLines;
        continue;
      }
      
      // Remove date if present in description
      finalDescription = finalDescription.replace(/^\d{1,2}\/\d{1,2}\/\d{2,4}\s*/, '');
      // Remove transaction type prefixes
      finalDescription = finalDescription
        .replace(/^(debit\s+card\s+purchase|deposit|withdrawal|eftpos\s+debit|payment\s+by\s+authority)\s+/i, '')
        .replace(/^(deposit\s*-\s*osko\s+payment|deposit\s+online)\s+/i, '')
        .replace(/^deposit\s+/i, '')
        .trim();
      // Clean whitespace and remove pipes
      finalDescription = finalDescription.replace(/\|/g, '').replace(/\s+/g, ' ').trim();
      
      // Validate description
      if (isValidDescription(finalDescription) && finalDescription.length <= 200) {
        transactions.push({
          date, // Use date from PDF
          description: finalDescription.substring(0, 200),
          amount,
          type
        });
      }
    }
    
    i += descriptionLines;
  }

  // Remove duplicates and validate dates
  const uniqueTransactions = transactions
    .filter((txn, index, self) => {
      // Check for duplicates
      const isDuplicate = index !== self.findIndex(t => 
        t.date === txn.date && 
        t.description === txn.description && 
        Math.abs(t.amount - txn.amount) < 0.01 &&
        t.type === txn.type
      );
      
      // Validate date exists and is in correct format
      const hasValidDate = txn.date && /^\d{4}-\d{2}-\d{2}$/.test(txn.date);
      
      return !isDuplicate && hasValidDate;
    })
    .sort((a, b) => {
      // Sort by date (oldest first)
      return a.date.localeCompare(b.date);
    });

  console.log(`Parsed ${uniqueTransactions.length} transactions from PDF`);
  if (uniqueTransactions.length > 0) {
    console.log(`Date range: ${uniqueTransactions[0].date} to ${uniqueTransactions[uniqueTransactions.length - 1].date}`);
  }
  
  // Calculate totals from parsed transactions
  const calculatedCredits = uniqueTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const calculatedDebits = uniqueTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  
  // Calculate closing balance if opening balance is available
  let calculatedClosingBalance: number | null = null;
  if (summary.openingBalance !== null) {
    calculatedClosingBalance = summary.openingBalance + calculatedCredits - calculatedDebits;
  }
  
  // Validate against PDF summary
  const creditsDiff = summary.totalCredits !== null 
    ? Math.abs(calculatedCredits - summary.totalCredits) 
    : 0;
  const debitsDiff = summary.totalDebits !== null 
    ? Math.abs(calculatedDebits - summary.totalDebits) 
    : 0;
  const closingBalanceDiff = summary.closingBalance !== null && calculatedClosingBalance !== null
    ? Math.abs(calculatedClosingBalance - summary.closingBalance)
    : null;
  
  // Allow small differences due to rounding (within $0.10)
  const isValid = creditsDiff <= 0.10 && debitsDiff <= 0.10 && 
                  (closingBalanceDiff === null || closingBalanceDiff <= 0.10);
  
  // Log validation results
  console.log('\n=== PDF Summary Validation ===');
  console.log(`Opening Balance: ${summary.openingBalance !== null ? `$${summary.openingBalance.toFixed(2)}` : 'Not found'}`);
  console.log(`Closing Balance: ${summary.closingBalance !== null ? `$${summary.closingBalance.toFixed(2)}` : 'Not found'}`);
  console.log(`Total Credits (PDF): ${summary.totalCredits !== null ? `$${summary.totalCredits.toFixed(2)}` : 'Not found'}`);
  console.log(`Total Credits (Calculated): $${calculatedCredits.toFixed(2)}`);
  console.log(`Total Debits (PDF): ${summary.totalDebits !== null ? `$${summary.totalDebits.toFixed(2)}` : 'Not found'}`);
  console.log(`Total Debits (Calculated): $${calculatedDebits.toFixed(2)}`);
  if (calculatedClosingBalance !== null) {
    console.log(`Closing Balance (Calculated): $${calculatedClosingBalance.toFixed(2)}`);
  }
  console.log(`Validation: ${isValid ? '✓ PASSED' : '✗ FAILED'}`);
  if (!isValid) {
    if (creditsDiff > 0.10) console.log(`  ⚠ Credits difference: $${creditsDiff.toFixed(2)}`);
    if (debitsDiff > 0.10) console.log(`  ⚠ Debits difference: $${debitsDiff.toFixed(2)}`);
    if (closingBalanceDiff !== null && closingBalanceDiff > 0.10) {
      console.log(`  ⚠ Closing balance difference: $${closingBalanceDiff.toFixed(2)}`);
    }
  }
  console.log('=============================\n');

  return {
    transactions: uniqueTransactions,
    summary,
    validation: {
      isValid,
      calculatedCredits,
      calculatedDebits,
      calculatedClosingBalance,
      differences: {
        creditsDiff,
        debitsDiff,
        closingBalanceDiff
      }
    }
  };
}
