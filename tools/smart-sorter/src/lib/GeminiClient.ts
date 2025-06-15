import axios from 'axios';
import { ArchiveInfo, GeminiResponse, SortConfig } from '../types/index.js';

export class GeminiClient {
  private apiKey: string;
  private config: SortConfig['gemini'];
  private logCallback?: (message: string) => void;

  constructor(apiKey: string, config: SortConfig['gemini'], logCallback?: (message: string) => void) {
    this.apiKey = apiKey;
    this.config = config;
    if (logCallback) {
      this.logCallback = logCallback;
    }
  }

  async classifyArchive(archive: ArchiveInfo): Promise<GeminiResponse> {
    const prompt = this.buildPrompt(archive);
    
    // Log the AI query
    if (this.logCallback) {
      this.logCallback(`AI_QUERY: ${archive.filename} - Sent to Gemini for classification`);
    }
    
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

      const result = this.parseGeminiResponse(generatedText);
      
      // Log the AI response
      if (this.logCallback) {
        this.logCallback(`AI_RESPONSE: ${archive.filename} - Classified as ${result.category}/${result.subdirectory} (confidence: ${(result.confidence * 100).toFixed(1)}%)`);
      }
      
      return result;
    } catch (error) {
      console.error('Gemini API error:', error);
      
      // Log the AI error
      if (this.logCallback) {
        this.logCallback(`AI_ERROR: ${archive.filename} - ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      
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
- [アンソロジー] LQ -Little Queen- Vol.63 → {"category": "杂志", "subdirectory": "LQ -Little Queen-", "confidence": 0.9, "reasoning": "Anthology magazine"}
- [蒼色彼方 (色谷あすか)] タイトル → {"category": "短篇", "subdirectory": "蒼色彼方", "confidence": 0.85, "reasoning": "Circle with author in parentheses, use circle name"}
- (C87) [りとる☆はむれっと (きぃら～☆)] はじめての入渠 → {"category": "短篇", "subdirectory": "りとる☆はむれっと", "confidence": 0.85, "reasoning": "Event doujin with circle name"}
- [Fanbox] そなお (~2025.06.15) → {"category": "图集", "subdirectory": "そなお", "confidence": 0.9, "reasoning": "Fanbox artist collection"}
- [CHRONOLOG、 ふるり。 (桜沢いづみ、ヒナユキウサ)] → {"category": "短篇", "subdirectory": "CHRONOLOG (合作)", "confidence": 0.9, "reasoning": "Collaboration between multiple circles, use primary circle with collaboration marker"}
- [D・N・A.Lab.、CHRONOLOG (ミヤスリサ、桜沢いづみ)] → {"category": "短篇", "subdirectory": "D・N・A.Lab (合作)", "confidence": 0.9, "reasoning": "Collaboration work, use first circle name with collaboration marker"}

Important filename patterns:
- [circle (author)] → use circle name as subdirectory
- (event)[circle (author)] → use circle name as subdirectory  
- [Fanbox] artist (~date) → use artist name as subdirectory
- [circle1、circle2 (author1、author2)] → collaboration, use "circle1 (合作)" as subdirectory
- Spaces before parentheses are common, extract the name before the space
- Japanese comma 、 or & indicates collaboration between multiple creators`;
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
    
    // Log batch start
    if (this.logCallback) {
      this.logCallback(`AI_BATCH_START: Processing ${archives.length} archives with AI classification`);
    }
    
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
    
    // Log batch completion
    if (this.logCallback) {
      this.logCallback(`AI_BATCH_COMPLETE: Finished processing ${archives.length} archives`);
    }

    return results;
  }
}