import inquirer from 'inquirer';
import chalk from 'chalk';
import { SortOperation, BatchOperation, ClassificationResult } from '../types/index.js';

export class InteractiveSorter {
  private operations: SortOperation[] = [];

  addOperation(operation: SortOperation): void {
    this.operations.push(operation);
  }

  addOperations(operations: SortOperation[]): void {
    this.operations.push(...operations);
  }

  groupIntoBatches(): BatchOperation[] {
    const batches = new Map<string, BatchOperation>();

    for (const operation of this.operations) {
      const { classification } = operation;
      let batchKey = '';
      let batchType: BatchOperation['type'] = 'category';

      // Group by category and subdirectory
      if (classification.category === '杂志') {
        batchKey = `magazine:${classification.subdirectory}`;
        batchType = 'magazine';
      } else if (classification.category === '图集') {
        batchKey = `artist:${classification.subdirectory}`;
        batchType = 'artist';
      } else {
        batchKey = `category:${classification.category}:${classification.subdirectory}`;
        batchType = 'category';
      }

      if (!batches.has(batchKey)) {
        batches.set(batchKey, {
          id: batchKey,
          type: batchType,
          pattern: this.getBatchDisplayPattern(classification),
          operations: [],
          confirmed: false
        });
      }

      batches.get(batchKey)!.operations.push(operation);
    }

    return Array.from(batches.values()).sort((a, b) => b.operations.length - a.operations.length);
  }

  private getBatchDisplayPattern(classification: ClassificationResult): string {
    switch (classification.category) {
      case '杂志':
        return `${classification.category}/${classification.subdirectory}`;
      case '图集':
        return `${classification.category}/${classification.subdirectory}`;
      default:
        return `${classification.category}/${classification.subdirectory}`;
    }
  }

  async interactiveConfirmation(): Promise<SortOperation[]> {
    const batches = this.groupIntoBatches();
    const confirmedOperations: SortOperation[] = [];

    console.log(chalk.cyan(`\n📊 Found ${this.operations.length} archives to sort in ${batches.length} groups\n`));

    for (const batch of batches) {
      await this.confirmBatch(batch);
      if (batch.confirmed) {
        confirmedOperations.push(...batch.operations);
      }
    }

    return confirmedOperations;
  }

  private async confirmBatch(batch: BatchOperation): Promise<void> {
    console.log(chalk.yellow(`\n📁 ${batch.pattern} (${batch.operations.length} files)`));
    
    // Show confidence levels
    const confidenceLevels = batch.operations.map(op => op.classification.confidence);
    const avgConfidence = confidenceLevels.reduce((a, b) => a + b, 0) / confidenceLevels.length;
    const minConfidence = Math.min(...confidenceLevels);

    console.log(chalk.gray(`   Confidence: avg ${(avgConfidence * 100).toFixed(1)}%, min ${(minConfidence * 100).toFixed(1)}%`));

    // Show sample files
    const sampleCount = Math.min(3, batch.operations.length);
    const samples = batch.operations.slice(0, sampleCount);
    
    for (const sample of samples) {
      const confidence = (sample.classification.confidence * 100).toFixed(0);
      const confidenceColor = sample.classification.confidence > 0.8 ? chalk.green : 
                              sample.classification.confidence > 0.5 ? chalk.yellow : chalk.red;
      console.log(`   ${confidenceColor(`${confidence}%`)} ${sample.archive.filename}`);
    }

    if (batch.operations.length > sampleCount) {
      console.log(chalk.gray(`   ... and ${batch.operations.length - sampleCount} more files`));
    }

    const choices = [
      { name: '✅ Confirm all files in this group', value: 'confirm' },
      { name: '👀 Review files individually', value: 'review' },
      { name: '❌ Skip this entire group', value: 'skip' }
    ];

    if (minConfidence < 0.6) {
      choices.splice(1, 0, { name: '🤖 Show AI reasoning for low confidence files', value: 'reasoning' });
    }

    const { action } = await inquirer.prompt([{
      type: 'list',
      name: 'action',
      message: 'What would you like to do with this group?',
      choices
    }]);

    switch (action) {
      case 'confirm':
        batch.confirmed = true;
        console.log(chalk.green(`✅ Confirmed ${batch.operations.length} files for ${batch.pattern}`));
        break;
      
      case 'review':
        await this.reviewBatchIndividually(batch);
        break;
      
      case 'reasoning':
        await this.showReasoningAndConfirm(batch);
        break;
      
      case 'skip':
        console.log(chalk.red(`❌ Skipped ${batch.operations.length} files from ${batch.pattern}`));
        break;
    }
  }

  private async reviewBatchIndividually(batch: BatchOperation): Promise<void> {
    console.log(chalk.cyan(`\n🔍 Reviewing ${batch.operations.length} files individually...\n`));
    
    let confirmedCount = 0;
    
    for (let i = 0; i < batch.operations.length; i++) {
      const operation = batch.operations[i];
      const { archive, classification } = operation;
      
      console.log(chalk.white(`\n[${i + 1}/${batch.operations.length}] ${archive.filename}`));
      console.log(chalk.gray(`   Category: ${classification.category}`));
      console.log(chalk.gray(`   Directory: ${classification.subdirectory}`));
      console.log(chalk.gray(`   Confidence: ${(classification.confidence * 100).toFixed(1)}%`));
      console.log(chalk.gray(`   Reason: ${classification.reason}`));
      
      if (archive.tags.length > 0) {
        console.log(chalk.gray(`   Tags: ${archive.tags.slice(0, 5).join(', ')}${archive.tags.length > 5 ? '...' : ''}`));
      }

      const { confirm } = await inquirer.prompt([{
        type: 'confirm',
        name: 'confirm',
        message: 'Move this file?',
        default: classification.confidence > 0.7
      }]);

      if (confirm) {
        operation.status = 'confirmed';
        confirmedCount++;
      } else {
        operation.status = 'skipped';
      }
    }

    batch.confirmed = confirmedCount > 0;
    console.log(chalk.green(`\n✅ Confirmed ${confirmedCount} out of ${batch.operations.length} files`));
  }

  private async showReasoningAndConfirm(batch: BatchOperation): Promise<void> {
    const lowConfidenceOps = batch.operations.filter(op => op.classification.confidence < 0.6);
    
    console.log(chalk.cyan(`\n🤖 AI Reasoning for ${lowConfidenceOps.length} low confidence files:\n`));
    
    for (const operation of lowConfidenceOps) {
      const { archive, classification } = operation;
      console.log(chalk.white(`📄 ${archive.filename}`));
      console.log(chalk.yellow(`   ${classification.reason}`));
      console.log('');
    }

    const { action } = await inquirer.prompt([{
      type: 'list',
      name: 'action',
      message: 'After reviewing the reasoning, what would you like to do?',
      choices: [
        { name: '✅ Confirm all files anyway', value: 'confirm' },
        { name: '👀 Review each file individually', value: 'review' },
        { name: '❌ Skip this group', value: 'skip' }
      ]
    }]);

    switch (action) {
      case 'confirm':
        batch.confirmed = true;
        break;
      case 'review':
        await this.reviewBatchIndividually(batch);
        break;
      case 'skip':
        batch.confirmed = false;
        break;
    }
  }

  async batchConfirmationMode(): Promise<SortOperation[]> {
    const batches = this.groupIntoBatches();
    
    console.log(chalk.cyan(`\n⚡ Batch Mode - Proposed file tree structure:\n`));
    
    // Display complete file tree structure
    this.displayFileTree(batches);
    
    // Show summary statistics
    const totalFiles = this.operations.length;
    const avgConfidence = this.operations.reduce((sum, op) => sum + op.classification.confidence, 0) / totalFiles;
    const highConfidenceFiles = this.operations.filter(op => op.classification.confidence > 0.8).length;
    const lowConfidenceFiles = this.operations.filter(op => op.classification.confidence < 0.6).length;
    
    console.log(chalk.cyan(`\n📊 Summary:`));
    console.log(chalk.white(`   Total files: ${totalFiles}`));
    console.log(chalk.white(`   Average confidence: ${(avgConfidence * 100).toFixed(1)}%`));
    console.log(chalk.green(`   High confidence (>80%): ${highConfidenceFiles} files`));
    if (lowConfidenceFiles > 0) {
      console.log(chalk.yellow(`   Low confidence (<60%): ${lowConfidenceFiles} files`));
    }
    
    // Batch confirmation options
    const choices = [
      { name: '✅ Accept all files', value: 'accept_all' },
      { name: '🎯 Accept only high confidence files (>80%)', value: 'accept_high_confidence' },
      { name: '👀 Review and select groups individually', value: 'review_groups' },
      { name: '❌ Reject all', value: 'reject_all' }
    ];
    
    if (lowConfidenceFiles > 0) {
      choices.splice(2, 0, { name: '🤖 Show AI reasoning for low confidence files', value: 'show_reasoning' });
    }
    
    const { action } = await inquirer.prompt([{
      type: 'list',
      name: 'action',
      message: 'What would you like to do with these files?',
      choices
    }]);
    
    switch (action) {
      case 'accept_all':
        return this.operations;
        
      case 'accept_high_confidence':
        return this.operations.filter(op => op.classification.confidence > 0.8);
        
      case 'show_reasoning':
        await this.showLowConfidenceReasoning();
        return this.batchConfirmationMode(); // Recurse to show options again
        
      case 'review_groups':
        return this.selectGroupsInteractively(batches);
        
      case 'reject_all':
      default:
        return [];
    }
  }
  
  private displayFileTree(batches: BatchOperation[]): void {
    // Group batches by category for better organization
    const categoryGroups = new Map<string, BatchOperation[]>();
    
    for (const batch of batches) {
      const category = batch.operations[0].classification.category;
      if (!categoryGroups.has(category)) {
        categoryGroups.set(category, []);
      }
      categoryGroups.get(category)!.push(batch);
    }
    
    // Display tree structure
    for (const [category, categoryBatches] of categoryGroups.entries()) {
      console.log(chalk.yellow(`📁 ${category}/`));
      
      for (const batch of categoryBatches) {
        const subdirectory = batch.operations[0].classification.subdirectory;
        const avgConfidence = batch.operations.reduce((sum, op) => sum + op.classification.confidence, 0) / batch.operations.length;
        const confidenceColor = avgConfidence > 0.8 ? chalk.green : avgConfidence > 0.6 ? chalk.yellow : chalk.red;
        
        console.log(chalk.gray(`  ├── ${subdirectory}/ ${confidenceColor(`(${batch.operations.length} files, ${(avgConfidence * 100).toFixed(1)}% avg confidence)`)}`));
        
        // Show first few files as samples
        const sampleCount = Math.min(3, batch.operations.length);
        for (let i = 0; i < sampleCount; i++) {
          const op = batch.operations[i];
          const confidence = (op.classification.confidence * 100).toFixed(0);
          const prefix = i === sampleCount - 1 && batch.operations.length <= sampleCount ? '      └──' : '      ├──';
          console.log(chalk.gray(`${prefix} ${confidence}% ${op.archive.filename}`));
        }
        
        if (batch.operations.length > sampleCount) {
          console.log(chalk.gray(`      └── ... and ${batch.operations.length - sampleCount} more files`));
        }
      }
    }
  }
  
  private async showLowConfidenceReasoning(): Promise<void> {
    const lowConfidenceOps = this.operations.filter(op => op.classification.confidence < 0.6);
    
    console.log(chalk.cyan(`\n🤖 AI Reasoning for ${lowConfidenceOps.length} low confidence files:\n`));
    
    for (const operation of lowConfidenceOps) {
      const { archive, classification } = operation;
      console.log(chalk.white(`📄 ${archive.filename}`));
      console.log(chalk.gray(`   → ${classification.category}/${classification.subdirectory}`));
      console.log(chalk.yellow(`   ${classification.reason}`));
      console.log('');
    }
    
    console.log(chalk.cyan('Press Enter to continue...'));
    await inquirer.prompt([{ type: 'input', name: 'continue', message: '' }]);
  }
  
  private async selectGroupsInteractively(batches: BatchOperation[]): Promise<SortOperation[]> {
    const confirmedOperations: SortOperation[] = [];
    
    console.log(chalk.cyan(`\n👀 Interactive group selection:\n`));
    
    for (const batch of batches) {
      const avgConfidence = batch.operations.reduce((sum, op) => sum + op.classification.confidence, 0) / batch.operations.length;
      
      console.log(chalk.yellow(`\n📁 ${batch.pattern}`));
      console.log(chalk.gray(`   ${batch.operations.length} files, ${(avgConfidence * 100).toFixed(1)}% average confidence`));
      
      // Show sample files
      const sampleCount = Math.min(3, batch.operations.length);
      for (let i = 0; i < sampleCount; i++) {
        const op = batch.operations[i];
        const confidence = (op.classification.confidence * 100).toFixed(0);
        console.log(chalk.gray(`   ${confidence}% ${op.archive.filename}`));
      }
      
      if (batch.operations.length > sampleCount) {
        console.log(chalk.gray(`   ... and ${batch.operations.length - sampleCount} more files`));
      }
      
      const { action } = await inquirer.prompt([{
        type: 'list',
        name: 'action',
        message: 'Action for this group:',
        choices: [
          { name: '✅ Accept this group', value: 'accept' },
          { name: '❌ Skip this group', value: 'skip' },
          { name: '👀 Review files individually', value: 'review' }
        ]
      }]);
      
      switch (action) {
        case 'accept':
          confirmedOperations.push(...batch.operations);
          console.log(chalk.green(`✅ Accepted ${batch.operations.length} files`));
          break;
          
        case 'review':
          await this.reviewBatchIndividually(batch);
          const confirmedInBatch = batch.operations.filter(op => op.status === 'confirmed');
          confirmedOperations.push(...confirmedInBatch);
          break;
          
        case 'skip':
          console.log(chalk.red(`❌ Skipped ${batch.operations.length} files`));
          break;
      }
    }
    
    return confirmedOperations;
  }

  displaySummary(operations: SortOperation[]): void {
    if (operations.length === 0) {
      console.log(chalk.yellow('\n⚠️  No operations confirmed'));
      return;
    }

    console.log(chalk.cyan(`\n📋 Summary: ${operations.length} files ready to sort\n`));

    const categoryCounts = new Map<string, number>();
    operations.forEach(op => {
      const category = op.classification.category;
      categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
    });

    for (const [category, count] of categoryCounts.entries()) {
      console.log(chalk.white(`   ${category}: ${count} files`));
    }

    console.log('');
  }
}