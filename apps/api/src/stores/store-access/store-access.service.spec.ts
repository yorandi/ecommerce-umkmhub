import { Test, TestingModule } from '@nestjs/testing';
import { StoreAccessService } from './store-access.service.js';

describe('StoreAccessService', () => {
  let service: StoreAccessService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StoreAccessService],
    }).compile();

    service = module.get<StoreAccessService>(StoreAccessService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
