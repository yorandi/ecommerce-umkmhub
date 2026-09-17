import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuthService } from './auth.service.js';

describe('AuthService', () => {
  const dto = {
    name: 'Tester',
    email: 'test@example.com',
    password: 'password123',
  };
  const profile = {
    id: 'user-1',
    name: dto.name,
    email: dto.email,
    role: 'USER',
    createdAt: new Date(),
  };
  let service: AuthService;
  let prisma: {
    user: {
      findUnique: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
    };
  };
  let jwt: { signAsync: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    prisma = { user: { findUnique: vi.fn(), create: vi.fn() } };
    jwt = { signAsync: vi.fn().mockResolvedValue('test-token') };
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwt },
      ],
    }).compile();
    service = module.get(AuthService);
  });

  it('hashes the password and returns a public profile on registration', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue(profile);
    expect((await service.register(dto)).user).toEqual(profile);
    const data = prisma.user.create.mock.calls[0][0].data;
    expect(data.password).not.toBe(dto.password);
    expect(await bcrypt.compare(dto.password, data.password)).toBe(true);
  });

  it('rejects an existing email without creating a user', async () => {
    prisma.user.findUnique.mockResolvedValue(profile);
    await expect(service.register(dto)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('returns the same conflict when a concurrent registration wins', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('duplicate', {
        code: 'P2002',
        clientVersion: '7.10.0',
        meta: { target: ['email'] },
      }),
    );
    await expect(service.register(dto)).rejects.toThrow(
      'Email already registered',
    );
    await expect(service.register(dto)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('does not disguise unrelated database failures as a conflict', async () => {
    const failure = new Error('database unavailable');
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockRejectedValue(failure);
    await expect(service.register(dto)).rejects.toBe(failure);
  });

  it('returns a token and the same public profile on login', async () => {
    prisma.user.findUnique.mockResolvedValue({
      ...profile,
      password: await bcrypt.hash(dto.password, 4),
    });
    expect(await service.login(dto)).toEqual({
      accessToken: 'test-token',
      user: profile,
    });
    expect(jwt.signAsync).toHaveBeenCalledWith({
      sub: profile.id,
      email: profile.email,
      role: profile.role,
    });
  });

  it.each(['missing', 'wrong password'])(
    'rejects %s credentials without issuing a token',
    async (scenario) => {
      prisma.user.findUnique.mockResolvedValue(
        scenario === 'missing'
          ? null
          : {
              ...profile,
              password: await bcrypt.hash('other-password', 4),
            },
      );
      await expect(service.login(dto)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(jwt.signAsync).not.toHaveBeenCalled();
    },
  );
});
