/**
 * Utility di validazione completa per codici IBAN nazionali (Italia) e internazionali (SEPA).
 * 
 * Esegue:
 * 1. Controllo strutturale di lunghezza e distinzione tra numeri e lettere.
 * 2. Verifica del CIN italiano (Carattere Interno Nazionale di Controllo).
 * 3. Verifica matematica ufficiale MOD-97-10 (ISO 7064 / ISO 13616).
 */

const ODD_TABLE: Record<string, number> = {
  '0': 1, '1': 0, '2': 5, '3': 7, '4': 9, '5': 13, '6': 15, '7': 17, '8': 19, '9': 21,
  'A': 1, 'B': 0, 'C': 5, 'D': 7, 'E': 9, 'F': 13, 'G': 15, 'H': 17, 'I': 19, 'J': 21,
  'K': 2, 'L': 4, 'M': 18, 'N': 20, 'O': 11, 'P': 3, 'Q': 6, 'R': 8, 'S': 12, 'T': 14,
  'U': 16, 'V': 10, 'W': 22, 'X': 25, 'Y': 24, 'Z': 23
};

const EVEN_TABLE: Record<string, number> = {
  '0': 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
  'A': 0, 'B': 1, 'C': 2, 'D': 3, 'E': 4, 'F': 5, 'G': 6, 'H': 7, 'I': 8, 'J': 9,
  'K': 10, 'L': 11, 'M': 12, 'N': 13, 'O': 14, 'P': 15, 'Q': 16, 'R': 17, 'S': 18, 'T': 19,
  'U': 20, 'V': 21, 'W': 22, 'X': 23, 'Y': 24, 'Z': 25
};

export interface IbanValidationResult {
  valid: boolean;
  cleanIban: string;
  formattedIban: string;
  error?: string;
  country?: string;
  details?: {
    countryCode?: string;
    checkDigits?: string;
    cin?: string;
    abi?: string;
    cab?: string;
    accountNumber?: string;
  };
}

/**
 * Calcola il resto della divisione per 97 (MOD-97-10) su stringhe numeriche arbitrarie.
 */
function mod97(numericString: string): number {
  let checksum = 0;
  for (let i = 0; i < numericString.length; i++) {
    checksum = (checksum * 10 + parseInt(numericString[i], 10)) % 97;
  }
  return checksum;
}

/**
 * Calcola il CIN italiano (lettera alfabetica) partendo dai 22 caratteri di ABI (5) + CAB (5) + Conto (12).
 */
export function calculateItalianCin(bban22: string): string {
  if (!bban22 || bban22.length !== 22) return '';
  let sum = 0;
  for (let i = 0; i < 22; i++) {
    const ch = bban22[i].toUpperCase();
    if (i % 2 === 0) {
      sum += ODD_TABLE[ch] ?? 0;
    } else {
      sum += EVEN_TABLE[ch] ?? 0;
    }
  }
  const remainder = sum % 26;
  return String.fromCharCode(65 + remainder);
}

/**
 * Formatta l'IBAN inserendo uno spazio ogni 4 caratteri per una migliore leggibilità.
 */
export function formatIban(iban: string): string {
  const clean = (iban || '').replace(/[\s-]/g, '').toUpperCase();
  return clean.replace(/(.{4})/g, '$1 ').trim();
}

/**
 * Esegue la validazione approfondita dell'IBAN, controllando lettere, cifre e checksum.
 */
export function validateIban(rawIban: string): IbanValidationResult {
  const clean = (rawIban || '').replace(/[\s-]/g, '').toUpperCase();
  const formatted = formatIban(clean);

  if (!clean) {
    return {
      valid: false,
      cleanIban: '',
      formattedIban: '',
      error: 'L\'IBAN è obbligatorio.'
    };
  }

  // Controllo caratteri validi generali (solo lettere e numeri)
  if (!/^[A-Z0-9]+$/.test(clean)) {
    return {
      valid: false,
      cleanIban: clean,
      formattedIban: formatted,
      error: 'L\'IBAN può contenere esclusivamente lettere maiuscole e cifre numeriche.'
    };
  }

  const countryCode = clean.slice(0, 2);

  // ─────────────────────────────────────────────────────────────
  // 1. SPECIFICA RIGOROSA PER IBAN ITALIANO (IT...)
  // ─────────────────────────────────────────────────────────────
  if (countryCode === 'IT') {
    // Controllo Lunghezza
    if (clean.length !== 27) {
      return {
        valid: false,
        cleanIban: clean,
        formattedIban: formatted,
        country: 'IT',
        error: `L'IBAN italiano deve essere composto da esattamente 27 caratteri (attualmente inseriti: ${clean.length}).`
      };
    }

    const checkDigits = clean.slice(2, 4);
    const cin = clean.slice(4, 5);
    const abi = clean.slice(5, 10);
    const cab = clean.slice(10, 15);
    const accountNumber = clean.slice(15, 27);

    // Controllo posizione 3-4: 2 cifre numeriche (cifre di controllo)
    if (!/^\d{2}$/.test(checkDigits)) {
      return {
        valid: false,
        cleanIban: clean,
        formattedIban: formatted,
        country: 'IT',
        error: `I caratteri 3 e 4 ("${checkDigits}") devono essere esclusivamente numerici (cifre di controllo europee, es. "IT02").`
      };
    }

    // Controllo posizione 5: 1 lettera alfabetica (CIN)
    if (!/^[A-Z]$/.test(cin)) {
      return {
        valid: false,
        cleanIban: clean,
        formattedIban: formatted,
        country: 'IT',
        error: `Il 5° carattere ("${cin}") deve essere una lettera maiuscola (codice CIN nazionale, non un numero).`
      };
    }

    // Controllo posizione 6-10: 5 cifre numeriche (ABI)
    if (!/^\d{5}$/.test(abi)) {
      return {
        valid: false,
        cleanIban: clean,
        formattedIban: formatted,
        country: 'IT',
        error: `I caratteri dal 6° al 10° ("${abi}") rappresentano il codice ABI della banca e devono essere esattamente 5 numeri.`
      };
    }

    // Controllo posizione 11-15: 5 cifre numeriche (CAB)
    if (!/^\d{5}$/.test(cab)) {
      return {
        valid: false,
        cleanIban: clean,
        formattedIban: formatted,
        country: 'IT',
        error: `I caratteri dall'11° al 15° ("${cab}") rappresentano il codice CAB dello sportello e devono essere esattamente 5 numeri.`
      };
    }

    // Controllo posizione 16-27: 12 caratteri alfanumerici (Numero di Conto)
    if (!/^[A-Z0-9]{12}$/.test(accountNumber)) {
      return {
        valid: false,
        cleanIban: clean,
        formattedIban: formatted,
        country: 'IT',
        error: `Gli ultimi 12 caratteri ("${accountNumber}") rappresentano il numero di conto corrente e possono contenere solo numeri o lettere.`
      };
    }

    // Verifica del CIN domestico italiano (matematica Luhn-variant)
    const bban22 = abi + cab + accountNumber;
    const expectedCin = calculateItalianCin(bban22);
    if (cin !== expectedCin) {
      return {
        valid: false,
        cleanIban: clean,
        formattedIban: formatted,
        country: 'IT',
        error: `Il carattere di controllo CIN ("${cin}") non corrisponde al codice ABI/CAB/Conto indicato (atteso: "${expectedCin}"). Verifica i dati inseriti.`
      };
    }

    // ─────────────────────────────────────────────────────────────
    // 2. VERIFICA MATEMATICA MOD-97-10 (ISO 7064)
    // ─────────────────────────────────────────────────────────────
    const rearranged = clean.slice(4) + clean.slice(0, 4);
    const numericStr = rearranged.split('').map(ch => {
      const code = ch.charCodeAt(0);
      return code >= 65 && code <= 90 ? (code - 55).toString() : ch;
    }).join('');

    const mod = mod97(numericStr);
    if (mod !== 1) {
      return {
        valid: false,
        cleanIban: clean,
        formattedIban: formatted,
        country: 'IT',
        error: 'Le cifre di controllo dell\'IBAN non risultano matematicamente valide. Verifica di non aver invertito cifre o lettere.'
      };
    }

    return {
      valid: true,
      cleanIban: clean,
      formattedIban: formatted,
      country: 'IT',
      details: {
        countryCode: 'IT',
        checkDigits,
        cin,
        abi,
        cab,
        accountNumber
      }
    };
  }

  // ─────────────────────────────────────────────────────────────
  // 3. IBAN INTERNAZIONALE (SEPA FUORI ITALIA)
  // ─────────────────────────────────────────────────────────────
  if (!/^[A-Z]{2}/.test(clean)) {
    return {
      valid: false,
      cleanIban: clean,
      formattedIban: formatted,
      error: 'I primi due caratteri devono essere le lettere identificative del Paese (es. IT, SM, DE, FR).'
    };
  }

  if (clean.length < 15 || clean.length > 34) {
    return {
      valid: false,
      cleanIban: clean,
      formattedIban: formatted,
      country: countryCode,
      error: `La lunghezza dell'IBAN deve essere compresa tra 15 e 34 caratteri (attualmente inseriti: ${clean.length}).`
    };
  }

  // Verifica MOD-97 per IBAN internazionale
  const rearranged = clean.slice(4) + clean.slice(0, 4);
  const numericStr = rearranged.split('').map(ch => {
    const code = ch.charCodeAt(0);
    return code >= 65 && code <= 90 ? (code - 55).toString() : ch;
  }).join('');

  const mod = mod97(numericStr);
  if (mod !== 1) {
    return {
      valid: false,
      cleanIban: clean,
      formattedIban: formatted,
      country: countryCode,
      error: 'Le cifre di controllo dell\'IBAN internazionale non sono valide.'
    };
  }

  return {
    valid: true,
    cleanIban: clean,
    formattedIban: formatted,
    country: countryCode
  };
}

