import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { StoresController } from './stores.controller.js';
import { StoresService } from './stores.service.js';
import { StoreAccessService } from './store-access/store-access.service.js';

@Module({
  imports: [AuthModule],
  controllers: [StoresController],
  providers: [StoresService, StoreAccessService],
  exports: [StoreAccessService],
})
export class StoresModule {}
