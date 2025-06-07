import { useQuery } from "@tanstack/react-query";
import type { Todo } from "@shared/schema";

export default function TodoStats() {
  const { data: todos = [] } = useQuery<Todo[]>({
    queryKey: ["/api/todos"],
  });

  const totalCount = todos.length;
  const activeCount = todos.filter(todo => !todo.completed).length;
  const completedCount = todos.filter(todo => todo.completed).length;
  const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="grid grid-cols-3 gap-6">
        <div className="text-center">
          <div className="text-2xl font-semibold text-gray-900">{totalCount}</div>
          <div className="text-sm text-gray-500">Total Tasks</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-semibold text-primary">{activeCount}</div>
          <div className="text-sm text-gray-500">Active</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-semibold text-success">{completedCount}</div>
          <div className="text-sm text-gray-500">Completed</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-4">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Progress</span>
          <span>{completionPercentage}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-success h-2 rounded-full transition-all duration-300"
            style={{ width: `${completionPercentage}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
}
