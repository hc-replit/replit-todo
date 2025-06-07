import { CheckCircle, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth, useLogout } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import AddTodoForm from "@/components/add-todo-form";
import TodoList from "@/components/todo-list";
import FilterTabs from "@/components/filter-tabs";
import TodoStats from "@/components/todo-stats";
import { useState } from "react";

type FilterType = "all" | "active" | "completed";

export default function Home() {
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const { user } = useAuth();
  const { toast } = useToast();
  const logoutMutation = useLogout();

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
      toast({
        title: "Success",
        description: "Logged out successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Logout failed",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <CheckCircle className="text-white text-sm h-4 w-4" />
              </div>
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">TodoList</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                <User className="h-4 w-4" />
                <span>{user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user?.email}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                disabled={logoutMutation.isPending}
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 py-8">
        <AddTodoForm />
        <FilterTabs activeFilter={activeFilter} onFilterChange={setActiveFilter} />
        <TodoList filter={activeFilter} />
        <TodoStats />
      </main>
    </div>
  );
}
