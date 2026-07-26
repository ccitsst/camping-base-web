import type { Product } from '../types';

/**
 * Standard CSV parser supporting double quotes and embedded commas/newlines.
 */
export function parseCSV(text: string): string[][] {
  const lines: string[][] = [];
  let row: string[] = [];
  let inQuotes = false;
  let currentValue = '';

  // Normalize line endings
  const cleanText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  let i = 0;
  while (i < cleanText.length) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote: "" inside quotes means a literal double quote
          currentValue += '"';
          i += 2;
        } else {
          // Closing quote
          inQuotes = false;
          i++;
        }
      } else {
        currentValue += char;
        i++;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
        i++;
      } else if (char === ',') {
        row.push(currentValue);
        currentValue = '';
        i++;
      } else if (char === '\n') {
        row.push(currentValue);
        lines.push(row);
        row = [];
        currentValue = '';
        i++;
      } else {
        currentValue += char;
        i++;
      }
    }
  }

  // Handle final row/value if not terminated by newline
  if (currentValue || row.length > 0) {
    row.push(currentValue);
    lines.push(row);
  }

  return lines;
}

/**
 * Convert raw CSV lines to typed Product objects, aligning headers dynamically.
 */
export function csvToProducts(csvText: string): Product[] {
  let parsedLines = parseCSV(csvText);
  if (parsedLines.length === 0) return [];

  // Filter out Google Sheets summary rows (e.g., '商品資料彙總清單 (Camping Gear List),,,,,,')
  if (parsedLines[0] && parsedLines[0][0] && parsedLines[0][0].includes('商品資料彙總清單')) {
    parsedLines = parsedLines.slice(1);
  }

  if (parsedLines.length < 2) return [];

  // Parse header row
  const headers = parsedLines[0].map(h => h.trim());

  // Dynamically look up column indices by their names
  const categoryIdx = headers.indexOf('商品類別');
  const idIdx = headers.indexOf('商品編號');
  const brandIdx = headers.indexOf('品牌');
  const nameIdx = headers.indexOf('品名');
  const weightIdx = headers.indexOf('重量');
  const rent1Idx = headers.indexOf('兩天一夜租金');
  const rent2Idx = headers.indexOf('續租日租金');
  const depositIdx = headers.indexOf('押金');
  const statusIdx = headers.indexOf('上架狀態');
  const rentStatusIdx = headers.indexOf('出租中 / 歸還日');
  const reservationIdx = headers.indexOf('預約');

  const coreIndices = [
    categoryIdx, idIdx, brandIdx, nameIdx, weightIdx,
    rent1Idx, rent2Idx, depositIdx, statusIdx, rentStatusIdx, reservationIdx
  ];

  const products: Product[] = [];

  for (let j = 1; j < parsedLines.length; j++) {
    const row = parsedLines[j];
    
    // Skip empty lines
    if (row.length === 0 || (row.length === 1 && !row[0].trim())) {
      continue;
    }

    const getValue = (idx: number) => {
      return idx !== -1 && idx < row.length ? row[idx].trim() : '';
    };

    const product: Product = {
      category: getValue(categoryIdx),
      id: getValue(idIdx),
      brand: getValue(brandIdx),
      name: getValue(nameIdx),
      weight: getValue(weightIdx),
      rent1: getValue(rent1Idx),
      rent2: getValue(rent2Idx),
      deposit: getValue(depositIdx),
      status: getValue(statusIdx),
      rentStatus: getValue(rentStatusIdx),
      reservation: getValue(reservationIdx),
      details: {}
    };

    // Gather other special spec fields into the details dictionary
    headers.forEach((header, idx) => {
      if (!coreIndices.includes(idx) && idx < row.length && header) {
        const val = row[idx].trim();
        if (val) {
          product.details[header] = val;
        }
      }
    });

    // Ensure we skip header repetitions or completely empty records
    if ((product.id && product.id !== '商品編號') || product.name) {
      products.push(product);
    }
  }

  return products;
}

/**
 * Downloads the Google Sheet CSV from URL and parses it to a Product list.
 */
export async function fetchAndParseProducts(csvUrl: string): Promise<Product[]> {
  const cleanUrl = csvUrl.trim();
  if (!cleanUrl) {
    throw new Error('CSV 網址不能為空。');
  }

  const response = await fetch(cleanUrl);
  if (!response.ok) {
    throw new Error(`無法下載商品資料，HTTP 錯誤狀態：${response.status}`);
  }

  const text = await response.text();
  return csvToProducts(text);
}
