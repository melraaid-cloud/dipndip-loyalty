import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { WalletService } from '../modules/wallet/wallet.service';

@Processor('wallet')
export class WalletProcessor {
  private readonly logger = new Logger(WalletProcessor.name);

  constructor(private readonly walletService: WalletService) {}

  @Process('update-pass')
  async handleUpdatePass(job: Job<{ customerId: string }>) {
    try {
      await this.walletService.updatePass(job.data.customerId);
      this.logger.log(`Wallet pass updated for customer ${job.data.customerId}`);
    } catch (err) {
      this.logger.error(`Failed to update wallet pass for ${job.data.customerId}`, err);
    }
  }
}
