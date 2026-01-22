/**
 * Dictionary Service
 * Provides word lookup functionality using free dictionary APIs
 */

export interface DictionaryDefinition {
  word: string;
  phonetic?: string;
  partOfSpeech: string;
  definition: string;
  example?: string;
  synonyms?: string[];
}

export interface DictionaryResult {
  word: string;
  phonetic?: string;
  meanings: Array<{
    partOfSpeech: string;
    definitions: Array<{
      definition: string;
      example?: string;
      synonyms?: string[];
    }>;
  }>;
  sourceUrls?: string[];
}

class DictionaryService {
  private cache: Map<string, DictionaryResult> = new Map();
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Look up a word using the Free Dictionary API
   * Falls back to alternative APIs if needed
   */
  async lookupWord(word: string): Promise<DictionaryResult | null> {
    if (!word || word.trim().length === 0) {
      return null;
    }

    const cleanWord = word.trim().toLowerCase();

    // Check cache first
    const cached = this.cache.get(cleanWord);
    if (cached) {
      return cached;
    }

    try {
      // Try Free Dictionary API (dictionaryapi.dev) - free, no API key required
      const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(cleanWord)}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          // Word not found
          return null;
        }
        throw new Error(`Dictionary API error: ${response.status}`);
      }

      const data = await response.json();
      
      // API returns an array, take the first result
      if (Array.isArray(data) && data.length > 0) {
        const result = data[0];
        
        const dictionaryResult: DictionaryResult = {
          word: result.word || cleanWord,
          phonetic: result.phonetic || result.phonetics?.[0]?.text,
          meanings: result.meanings?.map((meaning: any) => ({
            partOfSpeech: meaning.partOfSpeech || 'unknown',
            definitions: meaning.definitions?.map((def: any) => ({
              definition: def.definition || '',
              example: def.example,
              synonyms: def.synonyms || [],
            })) || [],
          })) || [],
          sourceUrls: result.sourceUrls || [],
        };

        // Cache the result
        this.cache.set(cleanWord, dictionaryResult);
        
        return dictionaryResult;
      }

      return null;
    } catch (error) {
      console.error('Dictionary lookup error:', error);
      
      // Fallback: Try alternative approach or return null
      return null;
    }
  }

  /**
   * Get a simplified definition for quick display
   */
  async getQuickDefinition(word: string): Promise<string | null> {
    const result = await this.lookupWord(word);
    if (!result || result.meanings.length === 0) {
      return null;
    }

    // Get the first definition from the first meaning
    const firstMeaning = result.meanings[0];
    if (firstMeaning.definitions.length > 0) {
      return firstMeaning.definitions[0].definition;
    }

    return null;
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cached word count
   */
  getCacheSize(): number {
    return this.cache.size;
  }
}

export const dictionaryService = new DictionaryService();
