
import { loadTimeEntries, clearCache } from './personametryService';

// Mock global fetch
global.fetch = jest.fn();

describe('personametryService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearCache();
  });

  it('should parse valid JSON normally', async () => {
    const mockData = { entries: [], metadata: { generatedAt: '2026-01-01' } };
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify(mockData),
    });

    const result = await loadTimeEntries('harvest');
    expect(result).toEqual(mockData);
  });

  it('should recover from NaN in JSON response', async () => {
    // Malformed JSON with NaN (which is valid JS but invalid JSON)
    const malformedJson = `{
      "entries": [
        { "id": 1, "value": NaN, "meta": { "score": NaN } }
      ],
      "metadata": { "generatedAt": "2026-01-01" }
    }`;
    
    // Expected result with nulls
    const expectedData = {
      entries: [
        { id: 1, value: null, meta: { score: null } }
      ],
      metadata: { generatedAt: "2026-01-01" }
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      text: async () => malformedJson,
    });

    const result = await loadTimeEntries('harvest');
    expect(result).toEqual(expectedData);
  });
  
  it('should throw error for other malformed JSON', async () => {
    const reallyBadJson = '{ "id": 1, "value": }'; // Syntax error
    
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      text: async () => reallyBadJson,
    });

    await expect(loadTimeEntries('harvest')).rejects.toThrow();
  });
});
