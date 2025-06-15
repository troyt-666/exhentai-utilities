import axios from 'axios';
import { ArchiveInfo, GeminiResponse, SortConfig } from '../types/index.js';

export class GeminiClient {
  private apiKey: string;
  private config: SortConfig['gemini'];

  constructor(apiKey: string, config: SortConfig['gemini']) {
    this.apiKey = apiKey;
    this.config = config;
  }

  async classifyArchive(archive: ArchiveInfo): Promise<GeminiResponse> {
    const prompt = this.buildPrompt(archive);
    
    try {
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/${this.config.model}:generateContent?key=${this.apiKey}`,
        {
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: this.config.temperature,
            maxOutputTokens: this.config.maxTokens,
          }
        },
        {
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );

      const generatedText = response.data.candidates[0]?.content?.parts[0]?.text;
      if (!generatedText) {
        throw new Error('No response generated from Gemini API');
      }

      return this.parseGeminiResponse(generatedText);
    } catch (error) {
      console.error('Gemini API error:', error);
      throw new Error(`Failed to classify archive with AI: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private buildPrompt(archive: ArchiveInfo): string {
    const { filename, tags, metadata } = archive;

    return `${this.config.systemPrompt}

Filename: ${filename}
Tags: ${tags.join(', ') || 'none'}
Title: ${metadata?.title || 'unknown'}
Category: ${metadata?.category || 'unknown'}
Language: ${metadata?.language || 'unknown'}
Uploader: ${metadata?.uploader || 'unknown'}

Available categories:
- 杂志 (magazine): Collections/anthologies, usually with "other:anthology" tag and no "other:goudoushi" tag. Extract magazine name.
- 图集 (image set): Pixiv, Fanbox, Twitter, Patreon collections. Extract artist name.
- 单行本 (tankoubon): Full volume manga with "other:tankoubon" tag. Extract author/circle name.
- 短篇 (doujinshi): Individual doujin works. Extract author/circle name.
- 猎奇 (guro): Content with "female:guro" tag. Extract author/circle name.

Respond ONLY with a JSON object in this exact format:
{
  "category": "杂志|图集|单行本|短篇|猎奇",
  "subdirectory": "extracted_name_here",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation of classification decision"
}

Examples:
- COMIC BAVEL 2025年6月号 → {"category": "杂志", "subdirectory": "COMIC BAVEL", "confidence": 0.9, "reasoning": "Magazine format with date"}
- [Pixiv] たけえなわ (29985260) → {"category": "图集", "subdirectory": "たけえなわ", "confidence": 0.95, "reasoning": "Pixiv artist collection"}
- [アンソロジー] LQ -Little Queen- Vol.63 → {"category": "杂志", "subdirectory": "LQ -Little Queen-", "confidence": 0.9, "reasoning": "Anthology magazine"}`;
  }

  private parseGeminiResponse(response: string): GeminiResponse {
    try {
      // Extract JSON from response (in case there's extra text)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate required fields
      if (!parsed.category || !parsed.subdirectory || typeof parsed.confidence !== 'number') {
        throw new Error('Invalid response format from Gemini');
      }

      // Ensure confidence is between 0 and 1
      const confidence = Math.max(0, Math.min(1, parsed.confidence));

      return {
        category: parsed.category,
        subdirectory: parsed.subdirectory,
        confidence,
        reasoning: parsed.reasoning || 'No reasoning provided'
      };
    } catch (error) {
      console.error('Failed to parse Gemini response:', response);
      throw new Error(`Invalid response format from Gemini API: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async batchClassify(archives: ArchiveInfo[], batchSize: number = 5): Promise<GeminiResponse[]> {
    const results: GeminiResponse[] = [];
    
    for (let i = 0; i < archives.length; i += batchSize) {
      const batch = archives.slice(i, i + batchSize);
      const batchPromises = batch.map(archive => 
        this.classifyArchive(archive).catch(error => {
          console.error(`Failed to classify ${archive.filename}:`, error);
          return {
            category: '短篇',
            subdirectory: '未知作者',
            confidence: 0.1,
            reasoning: `Error during classification: ${error.message}`
          };
        })
      );

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Add small delay between batches to avoid rate limiting
      if (i + batchSize < archives.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return results;
  }
}