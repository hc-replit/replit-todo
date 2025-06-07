import { users, todos, passwordResets, type User, type InsertUser, type Todo, type InsertTodo, type UpdateTodo } from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";
import bcrypt from "bcryptjs";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  authenticateUser(email: string, password: string): Promise<User | null>;
  
  createPasswordReset(email: string, token: string): Promise<void>;
  getPasswordReset(token: string): Promise<any | undefined>;
  markPasswordResetUsed(token: string): Promise<void>;
  updateUserPassword(email: string, password: string): Promise<void>;
  
  getAllTodos(userId: number): Promise<Todo[]>;
  getTodo(id: number, userId: number): Promise<Todo | undefined>;
  createTodo(todo: InsertTodo, userId: number): Promise<Todo>;
  updateTodo(id: number, updates: UpdateTodo, userId: number): Promise<Todo | undefined>;
  deleteTodo(id: number, userId: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const hashedPassword = await bcrypt.hash(insertUser.password, 10);
    const [user] = await db
      .insert(users)
      .values({
        email: insertUser.email,
        password: hashedPassword,
        firstName: insertUser.firstName,
        lastName: insertUser.lastName,
      })
      .returning();
    return user;
  }

  async authenticateUser(email: string, password: string): Promise<User | null> {
    const user = await this.getUserByEmail(email);
    if (!user) return null;

    const isValid = await bcrypt.compare(password, user.password);
    return isValid ? user : null;
  }

  async createPasswordReset(email: string, token: string): Promise<void> {
    await db.insert(passwordResets).values({
      email,
      token,
      expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
    });
  }

  async getPasswordReset(token: string): Promise<any | undefined> {
    const [reset] = await db
      .select()
      .from(passwordResets)
      .where(and(eq(passwordResets.token, token), eq(passwordResets.used, false)));
    return reset || undefined;
  }

  async markPasswordResetUsed(token: string): Promise<void> {
    await db
      .update(passwordResets)
      .set({ used: true })
      .where(eq(passwordResets.token, token));
  }

  async updateUserPassword(email: string, password: string): Promise<void> {
    const hashedPassword = await bcrypt.hash(password, 10);
    await db
      .update(users)
      .set({ password: hashedPassword })
      .where(eq(users.email, email));
  }

  async getAllTodos(userId: number): Promise<Todo[]> {
    return await db
      .select()
      .from(todos)
      .where(eq(todos.userId, userId))
      .orderBy(todos.createdAt);
  }

  async getTodo(id: number, userId: number): Promise<Todo | undefined> {
    const [todo] = await db
      .select()
      .from(todos)
      .where(and(eq(todos.id, id), eq(todos.userId, userId)));
    return todo || undefined;
  }

  async createTodo(insertTodo: InsertTodo, userId: number): Promise<Todo> {
    const [todo] = await db
      .insert(todos)
      .values({
        text: insertTodo.text,
        completed: insertTodo.completed,
        userId,
      })
      .returning();
    return todo;
  }

  async updateTodo(id: number, updates: UpdateTodo, userId: number): Promise<Todo | undefined> {
    const updateData: any = { ...updates };
    
    if (updates.completed !== undefined) {
      updateData.completedAt = updates.completed ? new Date() : null;
    }

    const [updatedTodo] = await db
      .update(todos)
      .set(updateData)
      .where(and(eq(todos.id, id), eq(todos.userId, userId)))
      .returning();
    
    return updatedTodo || undefined;
  }

  async deleteTodo(id: number, userId: number): Promise<boolean> {
    const result = await db
      .delete(todos)
      .where(and(eq(todos.id, id), eq(todos.userId, userId)));
    return (result.rowCount || 0) > 0;
  }
}

export const storage = new DatabaseStorage();
