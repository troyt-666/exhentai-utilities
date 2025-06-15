export interface ArchiveInfo {
    filename: string;
    path: string;
    tags: string[];
    metadata?: {
        title?: string;
        author?: string;
        circle?: string;
        uploader?: string;
        category?: string;
        language?: string;
    };
}
export interface CategoryRule {
    tags?: string[];
    excludeTags?: string[];
    patterns?: string[];
    priority: number;
    description: string;
    useAuthorDir: boolean;
    subdirectoryPattern?: string;
    default?: boolean;
}
export interface ClassificationResult {
    category: string;
    confidence: number;
    reason: string;
    subdirectory: string;
    authorOrCircle?: string;
    isAmbiguous: boolean;
}
export interface GeminiResponse {
    category: string;
    subdirectory: string;
    confidence: number;
    reasoning: string;
}
export interface SortOperation {
    archive: ArchiveInfo;
    classification: ClassificationResult;
    sourcePath: string;
    targetPath: string;
    status: 'pending' | 'confirmed' | 'skipped' | 'completed' | 'error' | 'locked';
    error?: string;
}
export interface BatchOperation {
    id: string;
    type: 'category' | 'magazine' | 'artist';
    pattern: string;
    operations: SortOperation[];
    confirmed: boolean;
}
export interface SortConfig {
    categories: Record<string, CategoryRule>;
    patterns: Record<string, string>;
    gemini: {
        model: string;
        temperature: number;
        maxTokens: number;
        systemPrompt: string;
    };
    options: {
        createAuthorDirs: boolean;
        skipExisting: boolean;
        logFile: string;
        tempDir: string;
        sanitizeNames: boolean;
        batchSize: number;
        confirmationThreshold: number;
    };
}
export interface SortOptions {
    sourceDir: string;
    targetDir: string;
    configPath?: string;
    interactive: boolean;
    dryRun: boolean;
    batchMode: boolean;
    logLevel: 'error' | 'warn' | 'info' | 'debug';
}
export interface FileOperation {
    type: 'move' | 'copy';
    source: string;
    target: string;
    completed: boolean;
    timestamp: number;
}
//# sourceMappingURL=index.d.ts.map