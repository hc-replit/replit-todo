import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseStorage } from '../server/storage';
import { db } from '../server/db';
import { users, todos } from '../shared/schema';

describe('DatabaseStorage', () => {
  let storage: DatabaseStorage;
  let testUserCounter = 0;

  beforeEach(async () => {
    storage = new DatabaseStorage();
    // Clean up test data before each test
    await db.delete(todos);
    await db.delete(users);
    testUserCounter = 0;
  });

  afterEach(async () => {
    // Clean up test data after each test
    await db.delete(todos);
    await db.delete(users);
  });

  const createUniqueUser = () => {
    testUserCounter++;
    return {
      username: `testuser${testUserCounter}`,
      password: 'password123',
    };
  };

  describe('User operations', () => {
    it('should create a user with hashed password', async () => {
      const userData = createUniqueUser();

      const user = await storage.createUser(userData);

      expect(user.id).toBeDefined();
      expect(user.username).toBe('testuser');
      expect(user.password).not.toBe('password123'); // Should be hashed
      expect(user.createdAt).toBeDefined();
    });

    it('should retrieve user by id', async () => {
      const userData = {
        username: 'testuser',
        password: 'password123',
      };

      const createdUser = await storage.createUser(userData);
      const retrievedUser = await storage.getUser(createdUser.id);

      expect(retrievedUser).toBeDefined();
      expect(retrievedUser?.username).toBe('testuser');
    });

    it('should retrieve user by username', async () => {
      const userData = {
        username: 'testuser',
        password: 'password123',
      };

      await storage.createUser(userData);
      const retrievedUser = await storage.getUserByUsername('testuser');

      expect(retrievedUser).toBeDefined();
      expect(retrievedUser?.username).toBe('testuser');
    });

    it('should authenticate user with correct credentials', async () => {
      const userData = {
        username: 'testuser',
        password: 'password123',
      };

      await storage.createUser(userData);
      const authenticatedUser = await storage.authenticateUser('testuser', 'password123');

      expect(authenticatedUser).toBeDefined();
      expect(authenticatedUser?.username).toBe('testuser');
    });

    it('should not authenticate user with incorrect password', async () => {
      const userData = {
        username: 'testuser',
        password: 'password123',
      };

      await storage.createUser(userData);
      const authenticatedUser = await storage.authenticateUser('testuser', 'wrongpassword');

      expect(authenticatedUser).toBeNull();
    });

    it('should not authenticate non-existent user', async () => {
      const authenticatedUser = await storage.authenticateUser('nonexistent', 'password123');

      expect(authenticatedUser).toBeNull();
    });
  });

  describe('Todo operations', () => {
    let userId: number;

    beforeEach(async () => {
      const userData = {
        username: 'testuser',
        password: 'password123',
      };
      const user = await storage.createUser(userData);
      userId = user.id;
    });

    it('should create a todo for a user', async () => {
      const todoData = {
        text: 'Test todo',
        completed: false,
      };

      const todo = await storage.createTodo(todoData, userId);

      expect(todo.id).toBeDefined();
      expect(todo.text).toBe('Test todo');
      expect(todo.completed).toBe(false);
      expect(todo.userId).toBe(userId);
      expect(todo.createdAt).toBeDefined();
      expect(todo.completedAt).toBeNull();
    });

    it('should retrieve all todos for a user', async () => {
      const todoData1 = { text: 'Todo 1', completed: false };
      const todoData2 = { text: 'Todo 2', completed: true };

      await storage.createTodo(todoData1, userId);
      await storage.createTodo(todoData2, userId);

      const todos = await storage.getAllTodos(userId);

      expect(todos).toHaveLength(2);
      expect(todos.map(t => t.text)).toContain('Todo 1');
      expect(todos.map(t => t.text)).toContain('Todo 2');
    });

    it('should retrieve a specific todo for a user', async () => {
      const todoData = { text: 'Test todo', completed: false };
      const createdTodo = await storage.createTodo(todoData, userId);

      const retrievedTodo = await storage.getTodo(createdTodo.id, userId);

      expect(retrievedTodo).toBeDefined();
      expect(retrievedTodo?.text).toBe('Test todo');
    });

    it('should not retrieve todo for different user', async () => {
      // Create another user
      const otherUserData = { username: 'otheruser', password: 'password123' };
      const otherUser = await storage.createUser(otherUserData);

      const todoData = { text: 'Test todo', completed: false };
      const createdTodo = await storage.createTodo(todoData, userId);

      const retrievedTodo = await storage.getTodo(createdTodo.id, otherUser.id);

      expect(retrievedTodo).toBeUndefined();
    });

    it('should update a todo', async () => {
      const todoData = { text: 'Test todo', completed: false };
      const createdTodo = await storage.createTodo(todoData, userId);

      const updates = { completed: true };
      const updatedTodo = await storage.updateTodo(createdTodo.id, updates, userId);

      expect(updatedTodo).toBeDefined();
      expect(updatedTodo?.completed).toBe(true);
      expect(updatedTodo?.completedAt).toBeDefined();
    });

    it('should not update todo for different user', async () => {
      // Create another user
      const otherUserData = { username: 'otheruser', password: 'password123' };
      const otherUser = await storage.createUser(otherUserData);

      const todoData = { text: 'Test todo', completed: false };
      const createdTodo = await storage.createTodo(todoData, userId);

      const updates = { completed: true };
      const updatedTodo = await storage.updateTodo(createdTodo.id, updates, otherUser.id);

      expect(updatedTodo).toBeUndefined();
    });

    it('should delete a todo', async () => {
      const todoData = { text: 'Test todo', completed: false };
      const createdTodo = await storage.createTodo(todoData, userId);

      const deleted = await storage.deleteTodo(createdTodo.id, userId);

      expect(deleted).toBe(true);

      const retrievedTodo = await storage.getTodo(createdTodo.id, userId);
      expect(retrievedTodo).toBeUndefined();
    });

    it('should not delete todo for different user', async () => {
      // Create another user
      const otherUserData = { username: 'otheruser', password: 'password123' };
      const otherUser = await storage.createUser(otherUserData);

      const todoData = { text: 'Test todo', completed: false };
      const createdTodo = await storage.createTodo(todoData, userId);

      const deleted = await storage.deleteTodo(createdTodo.id, otherUser.id);

      expect(deleted).toBe(false);

      // Todo should still exist for original user
      const retrievedTodo = await storage.getTodo(createdTodo.id, userId);
      expect(retrievedTodo).toBeDefined();
    });
  });
});