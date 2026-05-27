import { TrashIcon } from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createRoute } from "@tanstack/react-router";

import { createTodo, deleteTodo, listTodos } from "@/client/api";
import { TodoForm } from "@/client/components/todo-form";
import { Button } from "@/client/components/ui/button";

import { rootRoute } from "./__root";

export const todosRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/todos",
  component: TodosPage,
});

function TodosPage() {
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
  const deleteTodoMutation = useMutation({
    mutationFn: deleteTodo,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["todos"] });
    },
  });

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-normal text-foreground">Todos</h1>
        <p className="text-sm leading-6 text-muted-foreground">
          A small database-backed example for forms, API routes, validation, and mutations.
        </p>
      </header>
      <TodoForm
        isPending={createTodoMutation.isPending}
        onSubmit={async (values) => {
          await createTodoMutation.mutateAsync(values);
        }}
      />
      {createTodoMutation.error ? (
        <p className="text-sm text-rose-600" role="alert">
          {createTodoMutation.error.message}
        </p>
      ) : null}
      {deleteTodoMutation.error ? (
        <p className="text-sm text-rose-600" role="alert">
          {deleteTodoMutation.error.message}
        </p>
      ) : null}

      {todosQuery.isLoading ? <output className="text-sm">Loading...</output> : null}
      {todosQuery.error ? (
        <p className="text-sm text-rose-600" role="alert">
          {todosQuery.error.message}
        </p>
      ) : null}
      {todosQuery.data?.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
          No todos yet.
        </p>
      ) : null}
      <ul className="space-y-2">
        {todosQuery.data?.map((todo) => {
          const isDeleting =
            deleteTodoMutation.isPending && deleteTodoMutation.variables === todo.id;

          return (
            <li
              className="flex items-center gap-3 rounded-lg border border-border px-3 py-2"
              key={todo.id}
            >
              <span className="min-w-0 flex-1 truncate">{todo.title}</span>
              <Button
                aria-busy={isDeleting}
                aria-label={isDeleting ? `Deleting ${todo.title}` : `Delete ${todo.title}`}
                disabled={isDeleting}
                onClick={() => deleteTodoMutation.mutate(todo.id)}
                size="icon-sm"
                type="button"
                variant="ghost"
              >
                <TrashIcon aria-hidden />
              </Button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
