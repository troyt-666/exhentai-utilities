import { ArchiveInfo, CategoryRule, ClassificationResult, SortConfig } from '../types/index.js';
export declare class CategoryClassifier {
    private config;
    private analyzer;
    private geminiClient?;
    constructor(config: SortConfig, geminiApiKey?: string);
    classifyArchive(archive: ArchiveInfo): Promise<ClassificationResult>;
    private classifyByRules;
    private matchesRule;
    private extractSubdirectory;
    private extractMagazineDirectory;
    private extractArtistDirectory;
    private extractAuthorDirectory;
    private convertGeminiResult;
    batchClassify(archives: ArchiveInfo[]): Promise<ClassificationResult[]>;
    getCategories(): string[];
    getCategoryRule(categoryName: string): CategoryRule | undefined;
}
//# sourceMappingURL=CategoryClassifier.d.ts.map