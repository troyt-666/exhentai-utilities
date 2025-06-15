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
            temperature: this.config.temperature
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

  async batchClassify(archives: ArchiveInfo[]): Promise<GeminiResponse[]> {
    // Log batch start
    if (this.logCallback) {
      this.logCallback(`AI_BATCH_START: Processing ${archives.length} archives with AI classification (single request)`);
    }
    
    const prompt = this.buildBatchPrompt(archives);
    
    // Log the prompt being sent
    if (this.logCallback) {
      this.logCallback(`AI_BATCH_PROMPT: Sending batch prompt with ${prompt.length} characters for ${archives.length} archives`);
      this.logCallback(`AI_BATCH_PROMPT_CONTENT: ${prompt.substring(0, 1000)}...`); // Log first 1000 chars
    }
    
    try {
      const requestPayload = {
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: this.config.temperature
          // No maxOutputTokens - let model use full context window
        }
      };
      
      // Log request details
      if (this.logCallback) {
        this.logCallback(`AI_BATCH_REQUEST: Model=${this.config.model}, MaxTokens=unlimited, Temperature=${this.config.temperature}`);
      }
      
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/${this.config.model}:generateContent?key=${this.apiKey}`,
        requestPayload,
        {
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );

      // Log the full response structure
      if (this.logCallback) {
        this.logCallback(`AI_BATCH_RESPONSE_STRUCTURE: ${JSON.stringify(response.data, null, 2)}`);
      }

      const generatedText = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!generatedText) {
        throw new Error('No response generated from Gemini API');
      }

      const results = this.parseBatchGeminiResponse(generatedText, archives);
      
      // Log batch completion
      if (this.logCallback) {
        this.logCallback(`AI_BATCH_COMPLETE: Finished processing ${archives.length} archives`);
      }
      
      return results;
    } catch (error) {
      console.error('Gemini batch API error:', error);
      
      // Log detailed error information
      if (this.logCallback) {
        this.logCallback(`AI_BATCH_ERROR: Failed to process ${archives.length} archives - ${error instanceof Error ? error.message : 'Unknown error'}`);
        
        // If it's an axios error, log the response data
        if (error && typeof error === 'object' && 'response' in error) {
          const axiosError = error as any;
          this.logCallback(`AI_BATCH_ERROR_RESPONSE: ${JSON.stringify(axiosError.response?.data, null, 2)}`);
          this.logCallback(`AI_BATCH_ERROR_STATUS: ${axiosError.response?.status} ${axiosError.response?.statusText}`);
        }
      }
      
      // Return fallback results for all archives
      return archives.map(() => ({
        category: '短篇',
        subdirectory: '未知作者',
        confidence: 0.1,
        reasoning: `Batch classification failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }));
    }
  }

  private buildBatchPrompt(archives: ArchiveInfo[]): string {
    const archiveList = archives.map((archive, index) => {
      return `${index + 1}. Filename: ${archive.filename}
   Tags: ${archive.tags.join(', ') || 'none'}
   Title: ${archive.metadata?.title || 'unknown'}`;
    }).join('\n\n');

    return `${this.config.systemPrompt}

Please classify the following ${archives.length} archives. For each archive, respond with a JSON object in the exact format shown below.

Archives to classify:
${archiveList}

Available categories:
- 杂志 (magazine): Collections/anthologies, usually with "other:anthology" tag and no "other:goudoushi" tag. Extract magazine name.
- 图集 (image set): Pixiv, Fanbox, Twitter, Patreon collections. Extract artist name.
- 单行本 (tankoubon): Full volume manga with "other:tankoubon" tag. Extract author/circle name.
- 短篇 (doujinshi): Individual doujin works. Extract author/circle name.
- 猎奇 (guro): Content with "female:guro" tag. Extract author/circle name.

Important filename patterns:
- [circle (author)] → use circle name as subdirectory
- (event)[circle (author)] → use circle name as subdirectory  
- [Fanbox] artist (~date) → use artist name as subdirectory
- [circle1、circle2 (author1、author2)] → collaboration, use "circle1 (合作)" as subdirectory
- Spaces before parentheses are common, extract the name before the space
- Japanese comma 、 or & indicates collaboration between multiple creators

Examples:
- COMIC BAVEL 2025年6月号 → {"category": "杂志", "subdirectory": "COMIC BAVEL", "confidence": 0.9, "reasoning": "Magazine format with date"}
- [Pixiv] たけえなわ (29985260) → {"category": "图集", "subdirectory": "たけえなわ", "confidence": 0.95, "reasoning": "Pixiv artist collection"}
- [蒼色彼方 (色谷あすか)] タイトル → {"category": "短篇", "subdirectory": "蒼色彼方", "confidence": 0.85, "reasoning": "Circle with author in parentheses, use circle name"}
- [CHRONOLOG、 ふるり。 (桜沢いづみ、ヒナユキウサ)] → {"category": "短篇", "subdirectory": "CHRONOLOG (合作)", "confidence": 0.9, "reasoning": "Collaboration between multiple circles"}

Respond with a JSON array containing one object for each archive in the same order:
[
  {"category": "杂志|图集|单行本|短篇|猎奇", "subdirectory": "extracted_name_here", "confidence": 0.0-1.0, "reasoning": "brief explanation"},
  {"category": "杂志|图集|单行本|短篇|猎奇", "subdirectory": "extracted_name_here", "confidence": 0.0-1.0, "reasoning": "brief explanation"},
  ...
]`;
  }

  private parseBatchGeminiResponse(response: string, archives: ArchiveInfo[]): GeminiResponse[] {
    try {
      // Extract JSON array from response
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No JSON array found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      if (!Array.isArray(parsed)) {
        throw new Error('Response is not a JSON array');
      }

      if (parsed.length !== archives.length) {
        throw new Error(`Response array length (${parsed.length}) doesn't match archives count (${archives.length})`);
      }

      return parsed.map((item, index) => {
        // Validate required fields
        if (!item.category || !item.subdirectory || typeof item.confidence !== 'number') {
          throw new Error(`Invalid response format for archive ${index + 1}`);
        }

        // Ensure confidence is between 0 and 1
        const confidence = Math.max(0, Math.min(1, item.confidence));

        // Log individual responses
        if (this.logCallback) {
          this.logCallback(`AI_RESPONSE: ${archives[index].filename} - Classified as ${item.category}/${item.subdirectory} (confidence: ${(confidence * 100).toFixed(1)}%)`);
        }

        return {
          category: item.category,
          subdirectory: item.subdirectory,
          confidence,
          reasoning: item.reasoning || 'No reasoning provided'
        };
      });
    } catch (error) {
      console.error('Failed to parse batch Gemini response:', response);
      throw new Error(`Invalid batch response format from Gemini API: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}