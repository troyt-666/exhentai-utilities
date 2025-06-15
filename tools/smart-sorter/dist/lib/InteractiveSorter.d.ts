import { SortOperation, BatchOperation } from '../types/index.js';
export declare class InteractiveSorter {
    private operations;
    addOperation(operation: SortOperation): void;
    addOperations(operations: SortOperation[]): void;
    groupIntoBatches(): BatchOperation[];
    private getBatchDisplayPattern;
    interactiveConfirmation(): Promise<SortOperation[]>;
    private confirmBatch;
    private reviewBatchIndividually;
    private showReasoningAndConfirm;
    quickConfirmationMode(): Promise<SortOperation[]>;
    displaySummary(operations: SortOperation[]): void;
}
//# sourceMappingURL=InteractiveSorter.d.ts.map