import { SortOperation, FileOperation } from '../types/index.js';
export declare class FileManager {
    private operations;
    private logFile;
    constructor(logFile: string);
    executeOperations(sortOperations: SortOperation[], dryRun?: boolean): Promise<{
        success: number;
        errors: number;
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
    private logSummary;
    getOperationHistory(): FileOperation[];
    cleanupEmptyDirectories(targetDir: string): Promise<void>;
}
//# sourceMappingURL=FileManager.d.ts.map