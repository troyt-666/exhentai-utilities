#!/usr/bin/env node

import { Command } from 'commander';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import dotenv from 'dotenv';

import { ArchiveAnalyzer } from './lib/ArchiveAnalyzer.js';
import { CategoryClassifier } from './lib/CategoryClassifier.js';
import { InteractiveSorter } from './lib/InteractiveSorter.js';
import { FileManager } from './lib/FileManager.js';
import { SortConfig, SortOptions, ArchiveInfo, SortOperation } from './types/index.js';

// Load environment variables
dotenv.config();

// Get directory of current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class SmartArchiveSorter {
  private config: SortConfig;
  private analyzer: ArchiveAnalyzer;
  private classifier: CategoryClassifier;
  private interactiveSorter: InteractiveSorter;
  private fileManager: FileManager;

  constructor(configPath: string, geminiApiKey?: string) {
    this.config = this.loadConfig(configPath);
    this.analyzer = new ArchiveAnalyzer();
    this.fileManager = new FileManager(this.config.options.logFile, false);
    
    // Create AI logging callback
    const aiLogCallback = (message: string) => {
      this.fileManager.logAIActivity(message);
    };
    
    this.classifier = new CategoryClassifier(this.config, geminiApiKey, aiLogCallback);
    this.interactiveSorter = new InteractiveSorter();
  }

  private loadConfig(configPath: string): SortConfig {
    try {
      const configData = fs.readFileSync(configPath, 'utf8');
      return JSON.parse(configData);
    } catch (error) {
      console.error(chalk.red(`Failed to load config from ${configPath}`));
      throw error;
    }
  }

  async run(options: SortOptions): Promise<void> {
    console.log(chalk.cyan('🚀 Smart Archive Sorter\n'));
    
    // Update file manager with verbose mode
    this.fileManager = new FileManager(this.config.options.logFile, options.logLevel === 'debug' || options.logLevel === 'info');

    try {
      // Validate directories
      await this.validateDirectories(options);

      // Scan for archives
      const archives = await this.scanArchives(options.sourceDir);
      if (archives.length === 0) {
        console.log(chalk.yellow('No archive files found in source directory'));
        return;
      }

      console.log(chalk.green(`Found ${archives.length} archive files\n`));

      // Analyze archives
      console.log(chalk.cyan('📖 Analyzing archives...'));
      const analyzedArchives = await this.analyzeArchives(archives);

      // Classify archives
      console.log(chalk.cyan('🤖 Classifying archives...'));
      const classifications = await this.classifier.batchClassify(analyzedArchives);

      // Build sort operations
      const sortOperations = this.buildSortOperations(analyzedArchives, classifications, options);

      // Interactive confirmation
      if (options.interactive) {
        this.interactiveSorter.addOperations(sortOperations);
        
        const confirmedOps = options.batchMode 
          ? await this.interactiveSorter.batchConfirmationMode()
          : await this.interactiveSorter.interactiveConfirmation();

        this.interactiveSorter.displaySummary(confirmedOps);
        
        if (confirmedOps.length === 0) {
          console.log(chalk.yellow('No operations confirmed. Exiting.'));
          return;
        }

        // Execute confirmed operations
        await this.executeOperations(confirmedOps, options);
      } else {
        // Non-interactive mode - execute all operations
        await this.executeOperations(sortOperations, options);
      }

      // Cleanup
      if (!options.dryRun) {
        await this.fileManager.cleanupEmptyDirectories(options.targetDir);
      }

      console.log(chalk.green('✨ Sorting completed successfully!'));

      // Cleanup resources
      this.fileManager.cleanup();

      // Force exit to prevent hanging
      setTimeout(() => {
        process.exit(0);
      }, 100);

    } catch (error) {
      console.error(chalk.red('💥 Error during sorting:'), error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  }

  private async validateDirectories(options: SortOptions): Promise<void> {
    if (!await fs.pathExists(options.sourceDir)) {
      throw new Error(`Source directory does not exist: ${options.sourceDir}`);
    }

    await fs.ensureDir(options.targetDir);

    // Create category directories
    const categories = Object.keys(this.config.categories);
    await this.fileManager.createDirectoryStructure(options.targetDir, categories);
  }

  private async scanArchives(sourceDir: string): Promise<string[]> {
    const files = await fs.readdir(sourceDir);
    return files
      .filter(file => file.toLowerCase().endsWith('.zip'))
      .map(file => path.join(sourceDir, file));
  }

  private async analyzeArchives(archivePaths: string[]): Promise<ArchiveInfo[]> {
    const results: ArchiveInfo[] = [];
    
    for (let i = 0; i < archivePaths.length; i++) {
      const archivePath = archivePaths[i];
      
      try {
        const archiveInfo = await this.analyzer.analyzeArchive(archivePath);
        results.push(archiveInfo);
        
        if ((i + 1) % 10 === 0 || i === archivePaths.length - 1) {
          console.log(chalk.gray(`   Analyzed ${i + 1}/${archivePaths.length} archives`));
        }
      } catch (error) {
        console.warn(chalk.yellow(`   Warning: Failed to analyze ${path.basename(archivePath)}`));
        // Add with minimal info
        results.push({
          filename: path.basename(archivePath),
          path: archivePath,
          tags: [],
          metadata: {}
        });
      }
    }

    return results;
  }

  private buildSortOperations(
    archives: ArchiveInfo[], 
    classifications: any[], 
    options: SortOptions
  ): SortOperation[] {
    return archives.map((archive, index) => {
      const classification = classifications[index];
      const targetPath = this.fileManager.buildTargetPath(
        options.targetDir,
        classification.category,
        classification.subdirectory,
        archive.filename
      );

      return {
        archive,
        classification,
        sourcePath: archive.path,
        targetPath,
        status: 'pending'
      };
    });
  }

  private async executeOperations(operations: SortOperation[], options: SortOptions): Promise<void> {
    // Validate operations
    const { valid, invalid } = await this.fileManager.validatePaths(operations);
    
    if (invalid.length > 0) {
      console.log(chalk.yellow(`\n⚠️  ${invalid.length} operations have validation errors:`));
      invalid.forEach(op => {
        console.log(chalk.red(`   ${op.archive.filename}: ${op.error}`));
      });
    }

    if (valid.length === 0) {
      console.log(chalk.yellow('No valid operations to execute.'));
      return;
    }

    // Execute operations
    const result = await this.fileManager.executeOperations(valid, options.dryRun);
    
    if (result.errors > 0) {
      console.log(chalk.yellow(`\n⚠️  ${result.errors} operations failed. Check log file for details.`));
    }
    
    // Show locked files hint if any were skipped
    if ('skipped' in result && result.skipped > 0) {
      console.log(chalk.yellow(`\n💡 Tip: ${result.skipped} files were skipped because they're locked by other programs.`));
      console.log(chalk.yellow(`   Close any programs that might be using these files and try again.`));
    }
  }

  async rollback(count?: number): Promise<void> {
    console.log(chalk.yellow('🔄 Starting rollback operation...'));
    const result = await this.fileManager.rollback(count);
    
    if (result.success > 0) {
      console.log(chalk.green(`✅ Successfully rolled back ${result.success} operations`));
    }
    
    if (result.errors > 0) {
      console.log(chalk.red(`❌ ${result.errors} rollback operations failed`));
    }

    // Cleanup and exit
    this.fileManager.cleanup();
    setTimeout(() => process.exit(0), 100);
  }

  listOperations(): void {
    const operations = this.fileManager.getOperationHistory();
    
    if (operations.length === 0) {
      console.log(chalk.yellow('No operations in history'));
    } else {
      console.log(chalk.cyan(`📋 Operation History (${operations.length} operations):\n`));
      
      operations.forEach((op, index) => {
        const timestamp = new Date(op.timestamp).toLocaleString();
        console.log(chalk.gray(`${index + 1}. ${timestamp}`));
        console.log(chalk.white(`   ${op.type}: ${path.basename(op.source)} → ${path.basename(op.target)}`));
      });
    }

    // Cleanup and exit
    this.fileManager.cleanup();
    setTimeout(() => process.exit(0), 100);
  }
}

// CLI setup
const program = new Command();

program
  .name('smart-sort')
  .description('AI-powered archive sorter for ExHentai/E-Hentai content')
  .version('1.0.0');

program
  .command('sort')
  .description('Sort archives from source to target directory')
  .argument('<source>', 'Source directory containing archives')
  .argument('<target>', 'Target directory for sorted archives')
  .option('-c, --config <path>', 'Path to configuration file', 
    path.join(__dirname, 'config', 'categories.json'))
  .option('-m, --mode <type>', 'Confirmation mode: batch, interactive, or auto', 'batch')
  .option('-d, --dry-run', 'Simulate operations without moving files', false)
  .option('-v, --verbose', 'Enable verbose logging', false)
  .action(async (source, target, opts) => {
    const geminiApiKey = process.env.GEMINI_API_KEY;
    
    if (!geminiApiKey) {
      console.log(chalk.yellow('⚠️  GEMINI_API_KEY not found. AI classification will be disabled.'));
    }

    const options: SortOptions = {
      sourceDir: path.resolve(source),
      targetDir: path.resolve(target),
      configPath: opts.config,
      interactive: opts.mode !== 'auto',
      dryRun: opts.dryRun,
      batchMode: opts.mode === 'batch',
      logLevel: opts.verbose ? 'debug' : 'info'
    };

    const sorter = new SmartArchiveSorter(opts.config, geminiApiKey);
    await sorter.run(options);
  });

program
  .command('rollback')
  .description('Rollback recent file operations')
  .option('-n, --count <number>', 'Number of operations to rollback (default: all)', 
    (value) => parseInt(value))
  .option('-c, --config <path>', 'Path to configuration file', 
    path.join(__dirname, 'config', 'categories.json'))
  .action(async (opts) => {
    const sorter = new SmartArchiveSorter(opts.config);
    await sorter.rollback(opts.count);
  });

program
  .command('history')
  .description('Show operation history')
  .option('-c, --config <path>', 'Path to configuration file', 
    path.join(__dirname, 'config', 'categories.json'))
  .action(async (opts) => {
    const sorter = new SmartArchiveSorter(opts.config);
    sorter.listOperations();
  });

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red('Unhandled Rejection at:'), promise, chalk.red('reason:'), reason);
  process.exit(1);
});

program.parse();