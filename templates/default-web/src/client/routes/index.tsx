import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createRoute } from "@tanstack/react-router";

import { createTodo, listTodos } from "@/client/api";
import { TodoForm } from "@/client/components/todo-form";

import { rootRoute } from "./__root";

export const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: HomePage,
});

function HomePage() {
  const queryClient = useQueryClient();
  const todosQuery = useQuery({
    queryKey: ["todos"],
    queryFn: listTodos,
  });
  const createTodoMutation = useMutation({
    mutationFn: createTodo,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["todos"] });
    },
  });

  return (
    <div className="space-y-6">
      <TodoForm
        isPending={createTodoMutation.isPending}
        onSubmit={async (values) => {
          await createTodoMutation.mutateAsync(values);
        }}
      />
      {createTodoMutation.error ? (
        <p className="text-sm text-rose-600">{createTodoMutation.error.message}</p>
      ) : null}

      {todosQuery.isLoading ? <p className="text-sm">Loading…</p> : null}
      {todosQuery.error ? (
        <p className="text-sm text-rose-600">{todosQuery.error.message}</p>
      ) : null}
      <ul className="space-y-2">
        {todosQuery.data?.map((todo) => (
          <li key={todo.id}>{todo.title}</li>
        ))}
      </ul>
    </div>
  );
}
