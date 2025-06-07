import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { registerRoutes } from '../server/routes';
import { db } from '../server/db';
import { users, todos } from '@shared/schema';

describe('API Routes', () => {
  let app: express.Application;
  let server: any;

  beforeEach(async () => {
    app = express();
    app.use(express.json());
    server = await registerRoutes(app);
  });

  afterEach(async () => {
    // Clean up test data
    await db.delete(todos);
    await db.delete(users);
    if (server) {
      server.close();
    }
  });

  describe('Authentication', () => {
    it('should register a new user', async () => {
      const userData = {
        username: 'testuser',
        password: 'password123',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.message).toBe('User created successfully');
      expect(response.body.user.username).toBe('testuser');
      expect(response.body.user.id).toBeDefined();
    });

    it('should not register user with existing username', async () => {
      const userData = {
        username: 'testuser',
        password: 'password123',
      };

      // First registration
      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      // Second registration with same username
      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.message).toBe('Username already exists');
    });

    it('should reject registration with invalid data', async () => {
      const userData = {
        username: 'ab', // Too short
        password: '123', // Too short
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.message).toBe('Invalid user data');
      expect(response.body.errors).toBeDefined();
    });

    it('should login with valid credentials', async () => {
      const userData = {
        username: 'testuser',
        password: 'password123',
      };

      // Register user first
      await request(app)
        .post('/api/auth/register')
        .send(userData);

      // Login
      const response = await request(app)
        .post('/api/auth/login')
        .send(userData)
        .expect(200);

      expect(response.body.message).toBe('Login successful');
      expect(response.body.user.username).toBe('testuser');
    });

    it('should not login with invalid credentials', async () => {
      const userData = {
        username: 'testuser',
        password: 'password123',
      };

      // Register user first
      await request(app)
        .post('/api/auth/register')
        .send(userData);

      // Try login with wrong password
      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'testuser', password: 'wrongpassword' })
        .expect(401);

      expect(response.body.message).toContain('Invalid');
    });
  });

  describe('Todo operations', () => {
    let agent: request.SuperAgentTest;

    beforeEach(async () => {
      agent = request.agent(app);
      
      // Register and login user
      const userData = {
        username: 'testuser',
        password: 'password123',
      };

      await agent
        .post('/api/auth/register')
        .send(userData);

      await agent
        .post('/api/auth/login')
        .send(userData);
    });

    it('should require authentication for todos', async () => {
      const response = await request(app)
        .get('/api/todos')
        .expect(401);

      expect(response.body.message).toBe('Authentication required');
    });

    it('should create a todo when authenticated', async () => {
      const todoData = {
        text: 'Test todo',
        completed: false,
      };

      const response = await agent
        .post('/api/todos')
        .send(todoData)
        .expect(201);

      expect(response.body.text).toBe('Test todo');
      expect(response.body.completed).toBe(false);
      expect(response.body.id).toBeDefined();
      expect(response.body.userId).toBeDefined();
    });

    it('should get todos for authenticated user', async () => {
      const todoData = {
        text: 'Test todo',
        completed: false,
      };

      // Create a todo
      await agent
        .post('/api/todos')
        .send(todoData);

      // Get todos
      const response = await agent
        .get('/api/todos')
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].text).toBe('Test todo');
    });

    it('should update a todo', async () => {
      const todoData = {
        text: 'Test todo',
        completed: false,
      };

      // Create a todo
      const createResponse = await agent
        .post('/api/todos')
        .send(todoData);

      const todoId = createResponse.body.id;

      // Update the todo
      const updateResponse = await agent
        .patch(`/api/todos/${todoId}`)
        .send({ completed: true })
        .expect(200);

      expect(updateResponse.body.completed).toBe(true);
      expect(updateResponse.body.completedAt).toBeDefined();
    });

    it('should delete a todo', async () => {
      const todoData = {
        text: 'Test todo',
        completed: false,
      };

      // Create a todo
      const createResponse = await agent
        .post('/api/todos')
        .send(todoData);

      const todoId = createResponse.body.id;

      // Delete the todo
      const deleteResponse = await agent
        .delete(`/api/todos/${todoId}`)
        .expect(200);

      expect(deleteResponse.body.message).toBe('Todo deleted successfully');

      // Verify todo is deleted
      await agent
        .get(`/api/todos/${todoId}`)
        .expect(404);
    });

    it('should not access other users todos', async () => {
      // Create todo as first user
      const todoData = {
        text: 'Test todo',
        completed: false,
      };

      const createResponse = await agent
        .post('/api/todos')
        .send(todoData);

      const todoId = createResponse.body.id;

      // Create second user and login
      const secondAgent = request.agent(app);
      const secondUserData = {
        username: 'seconduser',
        password: 'password123',
      };

      await secondAgent
        .post('/api/auth/register')
        .send(secondUserData);

      await secondAgent
        .post('/api/auth/login')
        .send(secondUserData);

      // Try to access first user's todo
      await secondAgent
        .get(`/api/todos/${todoId}`)
        .expect(404);

      // Try to update first user's todo
      await secondAgent
        .patch(`/api/todos/${todoId}`)
        .send({ completed: true })
        .expect(404);

      // Try to delete first user's todo
      await secondAgent
        .delete(`/api/todos/${todoId}`)
        .expect(404);
    });
  });
});