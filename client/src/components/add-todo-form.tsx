import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { InsertTodo } from "@shared/schema";

export default function AddTodoForm() {
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createTodoMutation = useMutation({
    mutationFn: async (todo: InsertTodo) => {
      const response = await apiRequest("POST", "/api/todos", todo);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/todos"] });
      setText("");
      setError("");
      toast({
        title: "Success",
        description: "Todo created successfully!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create todo",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedText = text.trim();
    
    if (!trimmedText) {
      setError("Please enter a valid todo item");
      return;
    }

    createTodoMutation.mutate({
      text: trimmedText,
      completed: false,
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
      <form onSubmit={handleSubmit} className="flex space-x-3">
        <div className="flex-1">
          <Input
            type="text"
            placeholder="What needs to be done?"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              if (error) setError("");
            }}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-colors duration-200 text-gray-900 placeholder-gray-500"
            disabled={createTodoMutation.isPending}
          />
        </div>
        <Button
          type="submit"
          disabled={createTodoMutation.isPending}
          className="px-6 py-3 bg-primary text-white font-medium rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors duration-200 flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Add</span>
        </Button>
      </form>

      {error && (
        <div className="mt-3 text-sm text-destructive flex items-center">
          <span className="mr-1">⚠️</span>
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
