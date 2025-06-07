import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Check, Trash2, AlertTriangle, RefreshCw, ClipboardList } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import type { Todo } from "@shared/schema";

type FilterType = "all" | "active" | "completed";

interface TodoListProps {
  filter: FilterType;
}

export default function TodoList({ filter }: TodoListProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: todos = [], isLoading, error, refetch } = useQuery<Todo[]>({
    queryKey: ["/api/todos"],
  });

  const updateTodoMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<Todo> }) => {
      const response = await apiRequest("PATCH", `/api/todos/${id}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/todos"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update todo",
        variant: "destructive",
      });
    },
  });

  const deleteTodoMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/todos/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/todos"] });
      toast({
        title: "Success",
        description: "Todo deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete todo",
        variant: "destructive",
      });
    },
  });

  const handleToggleTodo = (todo: Todo) => {
    updateTodoMutation.mutate({
      id: todo.id,
      updates: { completed: !todo.completed },
    });
  };

  const handleDeleteTodo = (id: number) => {
    deleteTodoMutation.mutate(id);
  };

  const filteredTodos = todos.filter((todo) => {
    if (filter === "active") return !todo.completed;
    if (filter === "completed") return todo.completed;
    return true;
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-8 text-center">
          <div className="inline-flex items-center space-x-2 text-gray-500">
            <RefreshCw className="animate-spin h-5 w-5" />
            <span>Loading todos...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-8 text-center">
          <div className="text-destructive mb-3">
            <AlertTriangle className="h-8 w-8 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to load todos</h3>
          <p className="text-gray-500 mb-4">There was a problem connecting to the server.</p>
          <Button
            onClick={() => refetch()}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-600 transition-colors duration-200"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (filteredTodos.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-12 text-center">
          <div className="text-gray-400 mb-4">
            <ClipboardList className="h-16 w-16 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {filter === "active" && "No active todos"}
            {filter === "completed" && "No completed todos"}
            {filter === "all" && "No todos yet"}
          </h3>
          <p className="text-gray-500">
            {filter === "all" && "Add your first todo item to get started!"}
            {filter === "active" && "All your todos are completed! Great job!"}
            {filter === "completed" && "Complete some todos to see them here."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
      {filteredTodos.map((todo) => (
        <div key={todo.id} className="border-b border-gray-100 last:border-b-0">
          <div className="flex items-center p-4 hover:bg-gray-50 transition-colors duration-200 group">
            <Button
              onClick={() => handleToggleTodo(todo)}
              disabled={updateTodoMutation.isPending}
              className={`w-5 h-5 border-2 rounded hover:border-primary transition-colors duration-200 flex items-center justify-center mr-4 p-0 min-w-[20px] ${
                todo.completed
                  ? "bg-success border-success hover:border-green-600"
                  : "border-gray-300 bg-transparent hover:bg-transparent"
              }`}
            >
              {todo.completed && <Check className="h-3 w-3 text-white" />}
            </Button>
            
            <div className="flex-1">
              <p
                className={`font-medium ${
                  todo.completed
                    ? "text-gray-500 line-through"
                    : "text-gray-900"
                }`}
              >
                {todo.text}
              </p>
              <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                <span>
                  {todo.completed && todo.completedAt
                    ? `Completed ${formatDistanceToNow(new Date(todo.completedAt))} ago`
                    : `Created ${formatDistanceToNow(new Date(todo.createdAt))} ago`}
                </span>
                <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                <span
                  className={`px-2 py-0.5 rounded-full font-medium ${
                    todo.completed
                      ? "bg-success text-white"
                      : "bg-blue-100 text-blue-700"
                  }`}
                >
                  {todo.completed ? "Done" : "Active"}
                </span>
              </div>
            </div>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="opacity-0 group-hover:opacity-100 p-2 text-gray-400 hover:text-destructive transition-all duration-200"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                    </div>
                    <div>
                      <div className="text-lg font-semibold text-gray-900">Delete Todo</div>
                      <div className="text-sm text-gray-500">This action cannot be undone.</div>
                    </div>
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this todo item?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => handleDeleteTodo(todo.id)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      ))}
    </div>
  );
}
