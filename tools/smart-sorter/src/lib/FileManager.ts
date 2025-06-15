import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { SortOperation, FileOperation } from '../types/index.js';

// Helper function to add timeout to promises
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, operation: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms: ${operation}`)), timeoutMs)
    )
  ]);
}

export class FileManager {
  private operations: FileOperation[] = [];
  private logFile: string;
  private verboseMode: boolean = false;
  private operationsFile: string;

  constructor(logFile: string, verbose: boolean = false) {
    this.logFile = logFile;
    this.verboseMode = verbose;
    this.operationsFile = logFile.replace('.txt', '_operations.json');
    this.loadOperations();
  }
  
  private loadOperations(): void {
    try {
      if (fs.existsSync(this.operationsFile)) {
        const data = fs.readFileSync(this.operationsFile, 'utf8');
        this.operations = JSON.parse(data);
      }
    } catch (error) {
      console.warn('Could not load previous operations, starting fresh');
      this.operations = [];
    }
  }
  
  private saveOperations(): void {
    try {
      fs.writeFileSync(this.operationsFile, JSON.stringify(this.operations, null, 2));
    } catch (error) {
      console.error('Failed to save operations:', error);
    }
  }

  async executeOperations(sortOperations: SortOperation[], dryRun: boolean = false): Promise<{ success: number; errors: number; skipped: number }> {
    let success = 0;
    let errors = 0;
    let skipped = 0;

    console.log(chalk.cyan(`\n🔄 ${dryRun ? 'Simulating' : 'Executing'} ${sortOperations.length} file operations...\n`));

    for (let i = 0; i < sortOperations.length; i++) {
      const operation = sortOperations[i];
      const progress = `[${i + 1}/${sortOperations.length}]`;
      
      if (this.verboseMode) {
        console.log(chalk.gray(`${progress} Processing: ${operation.archive.filename}`));
      }
      
      try {
        // Check if file is locked before attempting operation
        if (!dryRun && await this.isFileLocked(operation.sourcePath)) {
          operation.status = 'skipped';
          operation.error = 'File is locked by another process';
          skipped++;
          console.log(chalk.yellow(`⚠️  ${progress} Skipped (locked): ${operation.archive.filename}`));
          await this.logError(operation, new Error('File locked'));
          continue;
        }
        
        if (dryRun) {
          await this.simulateMove(operation);
        } else {
          await this.executeMove(operation);
        }
        
        operation.status = 'completed';
        success++;
        
        console.log(chalk.green(`✅ ${progress} ${operation.archive.filename}`));
      } catch (error) {
        operation.status = 'error';
        operation.error = error instanceof Error ? error.message : 'Unknown error';
        
        // Check if error is due to file being locked
        if (error instanceof Error && (error.message.includes('EBUSY') || error.message.includes('locked'))) {
          skipped++;
          console.log(chalk.yellow(`⚠️  ${progress} Skipped (locked): ${operation.archive.filename}`));
        } else {
          errors++;
          console.log(chalk.red(`❌ ${progress} Failed: ${operation.archive.filename}`));
          if (this.verboseMode) {
            console.error(chalk.red(`   Reason: ${operation.error}`));
          }
        }
        
        await this.logError(operation, error);
      }
    }

    await this.logSummary(sortOperations, success, errors, dryRun, skipped);
    return { success, errors, skipped };
  }

  private async simulateMove(operation: SortOperation): Promise<void> {
    const { sourcePath, targetPath, archive } = operation;
    
    // Check if source exists
    if (!await fs.pathExists(sourcePath)) {
      throw new Error(`Source file does not exist: ${sourcePath}`);
    }

    // Check if target directory exists (create if needed)
    const targetDir = path.dirname(targetPath);
    if (!await fs.pathExists(targetDir)) {
      console.log(chalk.blue(`   Would create directory: ${targetDir}`));
    }

    // Check if target file already exists
    if (await fs.pathExists(targetPath)) {
      throw new Error(`Target file already exists: ${targetPath}`);
    }

    console.log(chalk.gray(`   ${archive.filename} → ${path.relative(process.cwd(), targetPath)}`));
  }

  private async executeMove(operation: SortOperation): Promise<void> {
    const { sourcePath, targetPath } = operation;
    
    if (this.verboseMode) {
      console.log(chalk.gray(`   Creating directory: ${path.dirname(targetPath)}`));
    }
    
    // Ensure target directory exists
    const targetDir = path.dirname(targetPath);
    await fs.ensureDir(targetDir);

    // Check if target file already exists
    if (await fs.pathExists(targetPath)) {
      throw new Error(`Target file already exists: ${targetPath}`);
    }

    if (this.verboseMode) {
      console.log(chalk.gray(`   Moving file...`));
    }
    
    // Move the file with timeout
    try {
      await withTimeout(fs.move(sourcePath, targetPath), 30000, 'move');
      if (this.verboseMode) {
        console.log(chalk.green(`   Direct move successful`));
      }
    } catch (error: any) {
      // If move fails due to cross-device link or permissions, try copy + delete
      if (error.code === 'EXDEV' || error.code === 'EACCES' || error.code === 'EPERM' || error.message.includes('timed out')) {
        if (this.verboseMode) {
          console.log(chalk.yellow(`   Move failed (${error.code || 'timeout'}), trying copy+delete...`));
          console.log(chalk.gray(`   Copying file...`));
        }
        
        await withTimeout(fs.copy(sourcePath, targetPath), 60000, 'copy');
        
        if (this.verboseMode) {
          console.log(chalk.gray(`   Removing source file...`));
        }
        
        await withTimeout(fs.remove(sourcePath), 10000, 'remove');
        
        if (this.verboseMode) {
          console.log(chalk.green(`   Copy+delete successful`));
        }
      } else {
        throw error;
      }
    }
    
    // Record the operation for potential rollback
    this.operations.push({
      type: 'move',
      source: sourcePath,
      target: targetPath,
      completed: true,
      timestamp: Date.now()
    });
    
    // Save operations to file
    this.saveOperations();
  }

  async rollback(operationCount?: number): Promise<{ success: number; errors: number }> {
    const opsToRollback = operationCount 
      ? this.operations.slice(-operationCount)
      : this.operations;

    console.log(chalk.yellow(`\n🔄 Rolling back ${opsToRollback.length} operations...\n`));

    let success = 0;
    let errors = 0;

    // Rollback in reverse order
    for (const operation of opsToRollback.reverse()) {
      try {
        if (operation.type === 'move' && operation.completed) {
          // Move file back to original location
          if (await fs.pathExists(operation.target)) {
            // Ensure source directory exists
            await fs.ensureDir(path.dirname(operation.source));
            await fs.move(operation.target, operation.source);
            console.log(chalk.green(`   Restored: ${path.basename(operation.source)}`));
            success++;
          } else {
            console.log(chalk.yellow(`   Target file no longer exists: ${operation.target}`));
          }
        }
      } catch (error) {
        errors++;
        console.error(chalk.red(`   Error rolling back ${operation.source}: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    }

    // Remove rolled back operations from history
    if (operationCount) {
      this.operations.splice(-operationCount, operationCount);
    } else {
      this.operations.length = 0;
    }
    
    // Save updated operations
    this.saveOperations();

    console.log(chalk.cyan(`\n📊 Rollback complete: ${success} restored, ${errors} errors\n`));
    return { success, errors };
  }

  buildTargetPath(targetDir: string, category: string, subdirectory: string, filename: string): string {
    return path.join(targetDir, category, subdirectory, filename);
  }

  async validatePaths(operations: SortOperation[]): Promise<{ valid: SortOperation[]; invalid: SortOperation[] }> {
    const valid: SortOperation[] = [];
    const invalid: SortOperation[] = [];

    for (const operation of operations) {
      try {
        // Check source exists
        if (!await fs.pathExists(operation.sourcePath)) {
          throw new Error('Source file does not exist');
        }

        // Check target doesn't exist
        if (await fs.pathExists(operation.targetPath)) {
          throw new Error('Target file already exists');
        }

        // Validate paths are not the same
        if (path.resolve(operation.sourcePath) === path.resolve(operation.targetPath)) {
          throw new Error('Source and target paths are identical');
        }

        valid.push(operation);
      } catch (error) {
        operation.error = error instanceof Error ? error.message : 'Unknown validation error';
        invalid.push(operation);
      }
    }

    return { valid, invalid };
  }

  async createDirectoryStructure(targetDir: string, categories: string[]): Promise<void> {
    console.log(chalk.blue(`\n📁 Creating directory structure in ${targetDir}...\n`));

    for (const category of categories) {
      const categoryPath = path.join(targetDir, category);
      await fs.ensureDir(categoryPath);
      console.log(chalk.green(`   Created: ${category}/`));
    }
  }

  private async logError(operation: SortOperation, error: unknown): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const logEntry = `${new Date().toISOString()} ERROR: ${operation.archive.filename} - ${errorMessage}\n`;
    
    try {
      await fs.appendFile(this.logFile, logEntry);
    } catch (logError) {
      console.error('Failed to write to log file:', logError);
    }
  }

  private async isFileLocked(filePath: string): Promise<boolean> {
    try {
      // Try to check if file is writable
      await fs.access(filePath, fs.constants.W_OK);
      
      // Try to rename the file to itself (this will fail if locked)
      const tempPath = filePath + '.lock-test';
      await fs.rename(filePath, tempPath);
      await fs.rename(tempPath, filePath);
      
      return false;
    } catch (error: any) {
      // EBUSY, EACCES, or EPERM typically means file is locked
      if (error.code === 'EBUSY' || error.code === 'EACCES' || error.code === 'EPERM') {
        return true;
      }
      // For other errors, assume file is accessible
      return false;
    }
  }

  private async logSummary(operations: SortOperation[], success: number, errors: number, dryRun: boolean, skipped: number = 0): Promise<void> {
    const summary = `
${new Date().toISOString()} ${dryRun ? 'DRY RUN' : 'EXECUTION'} SUMMARY:
Total operations: ${operations.length}
Successful: ${success}
Errors: ${errors}
Skipped (locked): ${skipped}
${dryRun ? 'Note: This was a dry run - no files were actually moved' : ''}
----------------------------------------
`;

    try {
      await fs.appendFile(this.logFile, summary);
    } catch (logError) {
      console.error('Failed to write summary to log file:', logError);
    }

    // Display summary
    console.log(chalk.cyan(`\n📊 ${dryRun ? 'Dry run' : 'Execution'} Summary:`));
    console.log(chalk.green(`   ✅ Successful: ${success}`));
    if (skipped > 0) {
      console.log(chalk.yellow(`   ⚠️  Skipped (locked): ${skipped}`));
    }
    if (errors > 0) {
      console.log(chalk.red(`   ❌ Errors: ${errors}`));
    }
    console.log(chalk.gray(`   📝 Log file: ${this.logFile}\n`));
  }

  getOperationHistory(): FileOperation[] {
    return [...this.operations];
  }

  async cleanupEmptyDirectories(targetDir: string): Promise<void> {
    console.log(chalk.blue(`\n🧹 Cleaning up empty directories in ${targetDir}...`));

    const categories = await fs.readdir(targetDir);
    
    for (const category of categories) {
      const categoryPath = path.join(targetDir, category);
      const stat = await fs.stat(categoryPath);
      
      if (stat.isDirectory()) {
        const subdirs = await fs.readdir(categoryPath);
        
        for (const subdir of subdirs) {
          const subdirPath = path.join(categoryPath, subdir);
          const subdirStat = await fs.stat(subdirPath);
          
          if (subdirStat.isDirectory()) {
            const files = await fs.readdir(subdirPath);
            if (files.length === 0) {
              await fs.rmdir(subdirPath);
              console.log(chalk.yellow(`   Removed empty directory: ${category}/${subdir}`));
            }
          }
        }
      }
    }
  }
}