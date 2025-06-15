import { ArchiveInfo, GeminiResponse, SortConfig } from '../types/index.js';
export declare class GeminiClient {
    private apiKey;
    private config;
    constructor(apiKey: string, config: SortConfig['gemini']);
    classifyArchive(archive: ArchiveInfo): Promise<GeminiResponse>;
    private buildPrompt;
    private parseGeminiResponse;
    batchClassify(archives: ArchiveInfo[], batchSize?: number): Promise<GeminiResponse[]>;
}
//# sourceMappingURL=GeminiClient.d.ts.map