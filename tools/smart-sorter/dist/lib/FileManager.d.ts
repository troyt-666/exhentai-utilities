import { SortOperation, FileOperation } from '../types/index.js';
export declare class FileManager {
    private operations;
    private logFile;
    private verboseMode;
    private operationsFile;
    constructor(logFile: string, verbose?: boolean);
    private loadOperations;
    private saveOperations;
    executeOperations(sortOperations: SortOperation[], dryRun?: boolean): Promise<{
        success: number;
        errors: number;
        skipped: number;
    }>;
    private simulateMove;
    private executeMove;
    rollback(operationCount?: number): Promise<{
        success: number;
        errors: number;
    }>;
    buildTargetPath(targetDir: string, category: string, subdirectory: string, filename: string): string;
    validatePaths(operations: SortOperation[]): Promise<{
        valid: SortOperation[];
        invalid: SortOperation[];
    }>;
    createDirectoryStructure(targetDir: string, categories: string[]): Promise<void>;
    private logError;
    private isFileLocked;
    private logSummary;
    getOperationHistory(): FileOperation[];
    cleanupEmptyDirectories(targetDir: string): Promise<void>;
}
//# sourceMappingURL=FileManager.d.ts.map