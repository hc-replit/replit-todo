import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import type { Todo } from "@shared/schema";

type FilterType = "all" | "active" | "completed";

interface FilterTabsProps {
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
}

export default function FilterTabs({ activeFilter, onFilterChange }: FilterTabsProps) {
  const { data: todos = [] } = useQuery<Todo[]>({
    queryKey: ["/api/todos"],
  });

  const totalCount = todos.length;
  const activeCount = todos.filter(todo => !todo.completed).length;
  const completedCount = todos.filter(todo => todo.completed).length;

  const filters = [
    { key: "all" as const, label: "All", count: totalCount },
    { key: "active" as const, label: "Active", count: activeCount },
    { key: "completed" as const, label: "Completed", count: completedCount },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-1 mb-6">
      <div className="flex space-x-1">
        {filters.map((filter) => (
          <Button
            key={filter.key}
            onClick={() => onFilterChange(filter.key)}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
              activeFilter === filter.key
                ? "bg-primary text-white"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-50 bg-transparent"
            }`}
          >
            {filter.label}
            <span
              className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                activeFilter === filter.key
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-700"
              }`}
            >
              {filter.count}
            </span>
          </Button>
        ))}
      </div>
    </div>
  );
}
