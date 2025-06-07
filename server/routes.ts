import type { Express } from "express";
import { createServer, type Server } from "http";
import passport from "passport";
import crypto from "crypto";
import { storage } from "./storage";
import { setupAuth, requireAuth, getCurrentUser } from "./auth";
import { sendPasswordResetEmail } from "./email";
import { insertTodoSchema, updateTodoSchema, loginSchema, registerSchema, forgotPasswordSchema, resetPasswordSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication
  setupAuth(app);

  // Auth routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const validatedData = registerSchema.parse(req.body);
      
      // Check if user exists
      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already registered" });
      }

      const user = await storage.createUser(validatedData);
      res.status(201).json({ 
        message: "User created successfully",
        user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid user data", 
          errors: error.errors 
        });
      }
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.post("/api/auth/login", (req, res, next) => {
    try {
      const validatedData = loginSchema.parse(req.body);
      
      passport.authenticate("local", (err: any, user: any, info: any) => {
        if (err) {
          console.error("Authentication error:", err);
          return res.status(500).json({ message: "Authentication failed" });
        }
        if (!user) {
          return res.status(401).json({ message: info?.message || "Invalid credentials" });
        }
        
        req.logIn(user, (err) => {
          if (err) {
            console.error("Login error:", err);
            return res.status(500).json({ message: "Login failed" });
          }
          res.json({ 
            message: "Login successful",
            user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName }
          });
        });
      })(req, res, next);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid login data", 
          errors: error.errors 
        });
      }
      res.status(400).json({ message: "Invalid request" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logout successful" });
    });
  });

  app.get("/api/auth/me", requireAuth, (req, res) => {
    const user = getCurrentUser(req);
    if (user) {
      res.json({ id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName });
    } else {
      res.status(401).json({ message: "Not authenticated" });
    }
  });

  // Password reset routes
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const validatedData = forgotPasswordSchema.parse(req.body);
      
      // Check if user exists
      const user = await storage.getUserByEmail(validatedData.email);
      if (!user) {
        // Don't reveal if email exists or not for security
        return res.json({ message: "If an account with this email exists, a password reset link has been sent." });
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      
      // Store reset token
      await storage.createPasswordReset(validatedData.email, resetToken);
      
      // Send reset email
      try {
        const emailSent = await sendPasswordResetEmail(validatedData.email, resetToken);
        
        if (emailSent) {
          res.json({ message: "If an account with this email exists, a password reset link has been sent." });
        } else {
          // For development/demo purposes, provide the reset token in the response when email fails
          console.log(`Password reset token for ${validatedData.email}: ${resetToken}`);
          res.status(200).json({ 
            message: "Email service is currently unavailable. For demo purposes, use the reset token provided.",
            resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined
          });
        }
      } catch (emailError) {
        // Email service failed completely
        console.log(`Password reset token for ${validatedData.email}: ${resetToken}`);
        console.error('Email service error:', emailError);
        res.status(200).json({ 
          message: "Email service is currently unavailable. For demo purposes, use the reset token provided.",
          resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined
        });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid email", 
          errors: error.errors 
        });
      }
      console.error("Error sending password reset:", error);
      res.status(500).json({ message: "Failed to process password reset request" });
    }
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const validatedData = resetPasswordSchema.parse(req.body);
      
      // Validate reset token
      const resetRequest = await storage.getPasswordReset(validatedData.token);
      if (!resetRequest) {
        return res.status(400).json({ message: "Invalid or expired reset token" });
      }

      // Check if token is expired
      if (new Date() > resetRequest.expiresAt) {
        return res.status(400).json({ message: "Reset token has expired" });
      }

      // Update user password
      await storage.updateUserPassword(resetRequest.email, validatedData.password);
      
      // Mark token as used
      await storage.markPasswordResetUsed(validatedData.token);
      
      res.json({ message: "Password reset successfully" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid reset data", 
          errors: error.errors 
        });
      }
      console.error("Error resetting password:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  // Todo routes (all require authentication)
  app.get("/api/todos", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const todos = await storage.getAllTodos(user.id);
      res.json(todos);
    } catch (error) {
      console.error("Error fetching todos:", error);
      res.status(500).json({ message: "Failed to fetch todos" });
    }
  });

  app.get("/api/todos/:id", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid todo ID" });
      }

      const todo = await storage.getTodo(id, user.id);
      if (!todo) {
        return res.status(404).json({ message: "Todo not found" });
      }

      res.json(todo);
    } catch (error) {
      console.error("Error fetching todo:", error);
      res.status(500).json({ message: "Failed to fetch todo" });
    }
  });

  app.post("/api/todos", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const validatedData = insertTodoSchema.parse(req.body);
      const todo = await storage.createTodo(validatedData, user.id);
      res.status(201).json(todo);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid todo data", 
          errors: error.errors 
        });
      }
      console.error("Error creating todo:", error);
      res.status(500).json({ message: "Failed to create todo" });
    }
  });

  app.patch("/api/todos/:id", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid todo ID" });
      }

      const validatedData = updateTodoSchema.parse(req.body);
      const updatedTodo = await storage.updateTodo(id, validatedData, user.id);
      
      if (!updatedTodo) {
        return res.status(404).json({ message: "Todo not found" });
      }

      res.json(updatedTodo);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid todo data", 
          errors: error.errors 
        });
      }
      console.error("Error updating todo:", error);
      res.status(500).json({ message: "Failed to update todo" });
    }
  });

  app.delete("/api/todos/:id", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid todo ID" });
      }

      const deleted = await storage.deleteTodo(id, user.id);
      if (!deleted) {
        return res.status(404).json({ message: "Todo not found" });
      }

      res.json({ message: "Todo deleted successfully" });
    } catch (error) {
      console.error("Error deleting todo:", error);
      res.status(500).json({ message: "Failed to delete todo" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
