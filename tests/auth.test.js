const request = require('supertest');
const { hashPassword } = require('../src/utils/password');

// Test data
const testUser = {
  email: 'test@example.com',
  password: 'Test123!',
  name: 'Test User',
  role: 'admin'
};

// Before all tests in this file
beforeAll(async () => {
  // Clean up any existing test data
  await global.__DB__.query('DELETE FROM users WHERE email LIKE $1', ['%@example.com']);

  // Create test user with admin role
  const hashedPassword = await hashPassword(testUser.password);
  await global.__DB__.query(
    'INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4)',
    [testUser.email, hashedPassword, testUser.name, testUser.role]
  );
});

// After all tests, clean up
afterAll(async () => {
  await global.__DB__.query('DELETE FROM users WHERE email LIKE $1', ['%@example.com']);
});

describe('Auth API', () => {
  const server = global.__SERVER__;

  describe('POST /v1/auth/login', () => {
    it('should login a user with valid credentials', async () => {
      const res = await request(server)
        .post('/v1/auth/login')
        .send({
          username: testUser.email,
          password: testUser.password
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('user_id');
    });

    it('should return 401 with invalid credentials', async () => {
      const res = await request(server)
        .post('/v1/auth/login')
        .send({
          username: testUser.email,
          password: 'wrongpassword'
        });

      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty('message');
    });

    it('should validate the request body', async () => {
      const res = await request(server)
        .post('/v1/auth/login')
        .send({
          // Missing password
          username: testUser.email
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('errors');
    });
  });

  describe('POST /v1/auth/register', () => {
    const newUser = {
      email: 'new@example.com',
      password: 'NewPass123!',
      full_name: 'New User'
    };

    afterEach(async () => {
      // Clean up after each test
      await global.__DB__.query('DELETE FROM users WHERE email = $1', [newUser.email]);
    });

    it('should register a new user', async () => {
      const res = await request(server)
        .post('/v1/auth/register')
        .send(newUser);

      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('email', newUser.email);
      expect(res.body).toHaveProperty('name', newUser.full_name);
      expect(res.body).not.toHaveProperty('password');
      expect(res.body).not.toHaveProperty('password_hash');
    });

    it('should validate the request body', async () => {
      const res = await request(server)
        .post('/v1/auth/register')
        .send({
          email: 'invalid-email',
          password: '123', // Too short
          full_name: ''    // Empty
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('errors');
      expect(res.body.errors.length).toBeGreaterThan(0);
    });

    it('should not allow duplicate email registration', async () => {
      // First registration should succeed
      await request(server)
        .post('/v1/auth/register')
        .send(newUser);

      // Second registration with same email should fail
      const res = await request(server)
        .post('/v1/auth/register')
        .send(newUser);

      expect(res.statusCode).toEqual(409);
      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toContain('already registered');
    });
  });

  describe('GET /v1/auth/me', () => {
    let authToken;

    beforeAll(async () => {
      // Login to get token
      const res = await request(server)
        .post('/v1/auth/login')
        .send({
          username: testUser.email,
          password: testUser.password
        });

      authToken = res.body.token;
    });

    it('should return the current user profile', async () => {
      const res = await request(server)
        .get('/v1/auth/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('email', testUser.email);
      expect(res.body).toHaveProperty('name', testUser.name);
      expect(res.body).not.toHaveProperty('password');
      expect(res.body).not.toHaveProperty('password_hash');
    });

    it('should return 401 without authentication', async () => {
      const res = await request(server)
        .get('/v1/auth/me');

      expect(res.statusCode).toEqual(401);
    });

    it('should return 401 with invalid token', async () => {
      const res = await request(server)
        .get('/v1/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(res.statusCode).toEqual(401);
    });
  });
});
