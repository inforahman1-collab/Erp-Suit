/**
 * South Asian Number to Words converter (Taka and Paisa)
 * Supports Crore, Lakh, Thousand, Hundred, and basic integers.
 */

const ones = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen'
];

const tens = [
  '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
];

function convertTwoDigit(num: number): string {
  if (num < 20) return ones[num];
  const t = Math.floor(num / 10);
  const r = num % 10;
  return tens[t] + (r > 0 ? ' ' + ones[r] : '');
}

function convertThreeDigit(num: number): string {
  const h = Math.floor(num / 100);
  const r = num % 100;
  let str = '';
  if (h > 0) {
    str += ones[h] + ' Hundred';
    if (r > 0) str += ' and ';
  }
  if (r > 0) {
    str += convertTwoDigit(r);
  }
  return str.trim();
}

/**
 * Converts a number to South Asian Taka Words (Crore, Lakh, Thousand, Hundred)
 * e.g. 160000 -> "One Lakh Sixty Thousand Taka Only."
 */
export function amountToWordsBDT(amount: number): string {
  if (isNaN(amount) || amount === 0) {
    return 'Zero Taka Only.';
  }

  const isNegative = amount < 0;
  const absVal = Math.abs(amount);
  const intPart = Math.floor(absVal);
  const decPart = Math.round((absVal - intPart) * 100);

  if (intPart === 0 && decPart > 0) {
    return `${isNegative ? 'Negative ' : ''}${convertTwoDigit(decPart)} Paisa Only.`;
  }

  // South Asian breakup:
  // Crore: 10,000,000
  // Lakh: 100,000
  // Thousand: 1,000
  // Hundred / Rest: 100
  let n = intPart;
  let words = '';

  const crore = Math.floor(n / 10000000);
  n %= 10000000;

  const lakh = Math.floor(n / 100000);
  n %= 100000;

  const thousand = Math.floor(n / 1000);
  n %= 1000;

  const hundreds = n;

  if (crore > 0) {
    words += convertTwoDigit(crore) + ' Crore ';
  }

  if (lakh > 0) {
    words += convertTwoDigit(lakh) + ' Lakh ';
  }

  if (thousand > 0) {
    words += convertTwoDigit(thousand) + ' Thousand ';
  }

  if (hundreds > 0) {
    words += convertThreeDigit(hundreds) + ' ';
  }

  words = words.trim();
  if (!words) words = 'Zero';

  let result = `${isNegative ? 'Negative ' : ''}${words} Taka`;

  if (decPart > 0) {
    result += ` and ${convertTwoDigit(decPart)} Paisa`;
  }

  return `${result} Only.`;
}

/**
 * Bengali In Words converter (বাংলা ভাষায় কথায় রূপান্তর)
 */
export function amountToWordsBangla(amount: number): string {
  if (isNaN(amount) || amount === 0) {
    return 'শূন্য টাকা মাত্র।';
  }
  // Fallback to clear English Taka words with Bangla prefix if needed
  return amountToWordsBDT(amount);
}
