import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/configure-app.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { Prisma } from '../src/generated/prisma/client.js';

describe('Auth HTTP flow', () => {
  let app: INestApplication<App>;
  let jwt: JwtService;
  const secret = 'local-auth-test-secret-only';
  type User = {
    id: string;
    name: string;
    email: string;
    password: string;
    role: string;
    createdAt: Date;
  };
  let users: Map<string, User>;
  let forceConflict: boolean;
  const createMembership = vi.fn();
  const credentials = {
    name: 'Tester',
    email: 'test@example.com',
    password: 'password123',
  };

  beforeEach(async () => {
    users = new Map();
    forceConflict = false;
    createMembership.mockReset();
    createMembership.mockImplementation(async ({ data }) => {
      if (!data.userId) throw new Error('Store membership requires a user ID');
      return { id: 'member-0', ...data };
    });
    const prisma = {
      store: { findUnique: vi.fn().mockResolvedValue(null) },
      $transaction: vi.fn(async (callback) =>
        callback({
          store: {
            create: vi.fn(async ({ data }) => ({ id: 'store-0', ...data })),
          },
          storeMember: { create: createMembership },
        }),
      ),
      user: {
        findUnique: vi.fn(async ({ where, select }) => {
          const user = [...users.values()].find((u) =>
            where.id ? u.id === where.id : u.email === where.email,
          );
          return user ? project(user, select) : null;
        }),
        create: vi.fn(async ({ data, select }) => {
          if (forceConflict || users.has(data.email)) {
            throw new Prisma.PrismaClientKnownRequestError('duplicate', {
              code: 'P2002',
              clientVersion: '7.10.0',
            });
          }
          const user = {
            ...data,
            id: 'user-' + users.size,
            role: 'USER',
            createdAt: new Date(),
          };
          users.set(data.email, user);
          return project(user, select);
        }),
      },
    };
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .overrideProvider(ConfigService)
      .useValue({ getOrThrow: () => secret })
      .compile();
    jwt = module.get(JwtService);
    app = module.createNestApplication({ logger: false });
    configureApp(app);
    await app.init();
  });

  afterEach(async () => {
    await app?.close();
  });

  function project(user: User, select: Record<string, boolean>) {
    return Object.fromEntries(
      Object.entries(user).filter(([key]) => select[key]),
    );
  }

  it('registers, logs in, and returns the same safe profile', async () => {
    const registered = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send(credentials)
      .expect(201);
    expect(registered.body.user.password).toBeUndefined();
    const loggedIn = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send(credentialsOnly())
      .expect(200);
    expect(loggedIn.body.user).toEqual(registered.body.user);
    const me = await request(app.getHttpServer())
      .get('/api/auth/me')
      .auth(loggedIn.body.accessToken, { type: 'bearer' })
      .expect(200);
    expect(me.body).toEqual({
      ...registered.body.user,
      userId: registered.body.user.id,
    });
    expect(
      jwt.verify(loggedIn.body.accessToken).exp -
        jwt.verify(loggedIn.body.accessToken).iat,
    ).toBe(900);
  });

  function credentialsOnly() {
    return { email: credentials.email, password: credentials.password };
  }

  it('creates a store owned by the user authenticated by a login token', async () => {
    const registered = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send(credentials)
      .expect(201);
    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send(credentialsOnly())
      .expect(200);
    const store = await request(app.getHttpServer())
      .post('/api/stores')
      .auth(login.body.accessToken, { type: 'bearer' })
      .send({ name: 'Toko Baru' })
      .expect(201);
    expect(createMembership).toHaveBeenCalledWith({
      data: {
        userId: registered.body.user.id,
        storeId: store.body.id,
        role: 'OWNER',
      },
    });
  });

  it('rejects missing, invalid, expired tokens and deleted users before creating a store', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send(credentials)
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/stores')
      .send({ name: 'Toko Baru' })
      .expect(401);
    const tokens = [
      'invalid',
      jwt.sign({ sub: 'user-0' }, { secret: 'wrong-secret' }),
      jwt.sign({ sub: 'user-0' }, { expiresIn: -1 }),
      jwt.sign({ sub: 123 }),
      jwt.sign({ sub: 'deleted-user' }),
    ];
    for (const token of tokens) {
      await request(app.getHttpServer())
        .post('/api/stores')
        .auth(token, { type: 'bearer' })
        .send({ name: 'Toko Baru' })
        .expect(401);
    }
    expect(createMembership).not.toHaveBeenCalled();
  });

  it.each(['/api/auth/register', '/api/auth/login'])(
    'validates credentials at %s',
    async (url) => {
      const valid = url.endsWith('register') ? credentials : credentialsOnly();
      for (const password of ['', 'short', 'a'.repeat(73), '😀'.repeat(19)]) {
        await request(app.getHttpServer())
          .post(url)
          .send({ ...valid, password })
          .expect(400);
      }
      await request(app.getHttpServer())
        .post(url)
        .send({ ...valid, email: 'invalid' })
        .expect(400);
      await request(app.getHttpServer())
        .post(url)
        .send({ ...valid, role: 'ADMIN' })
        .expect(400);
    },
  );

  it('accepts a 72-byte password and rejects a whitespace-only name', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ ...credentials, name: '   ' })
      .expect(400);
    const password = '😀'.repeat(18);
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ ...credentials, password })
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ ...credentialsOnly(), password })
      .expect(200);
  });

  it('returns 401 for missing, forged, expired, or malformed tokens', async () => {
    await request(app.getHttpServer()).get('/api/auth/me').expect(401);
    const tokens = [
      'invalid',
      jwt.sign({ sub: 'user-0' }, { secret: 'wrong-secret' }),
      jwt.sign({ sub: 'user-0' }, { expiresIn: -1 }),
      jwt.sign({ sub: 123 }),
    ];
    for (const token of tokens) {
      await request(app.getHttpServer())
        .get('/api/auth/me')
        .auth(token, { type: 'bearer' })
        .expect(401);
    }
  });

  it('reads the latest role and rejects a deleted user', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send(credentials)
      .expect(201);
    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send(credentialsOnly())
      .expect(200);
    users.get(credentials.email)!.role = 'ADMIN';
    const me = await request(app.getHttpServer())
      .get('/api/auth/me')
      .auth(login.body.accessToken, { type: 'bearer' })
      .expect(200);
    expect(me.body.role).toBe('ADMIN');
    users.clear();
    await request(app.getHttpServer())
      .get('/api/auth/me')
      .auth(login.body.accessToken, { type: 'bearer' })
      .expect(401);
  });

  it('returns 409 for both existing and concurrently registered emails', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send(credentials)
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send(credentials)
      .expect(409);
    users.clear();
    forceConflict = true;
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send(credentials)
      .expect(409);
  });

  it('returns the same 401 for an unknown email and a wrong password', async () => {
    const missing = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send(credentialsOnly())
      .expect(401);
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send(credentials)
      .expect(201);
    const wrong = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ ...credentialsOnly(), password: 'wrong-password' })
      .expect(401);
    expect(wrong.body).toEqual(missing.body);
  });

  it.each(['/api/auth/login', '/api/auth/register'])(
    'limits requests at %s',
    async (url) => {
      for (let i = 0; i < 10; i++) {
        await request(app.getHttpServer()).post(url).send({}).expect(400);
      }
      await request(app.getHttpServer()).post(url).send({}).expect(429);
    },
  );
});
