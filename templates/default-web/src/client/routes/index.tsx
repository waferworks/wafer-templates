import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createRoute } from "@tanstack/react-router";
import { Database, Sparkles } from "lucide-react";

import { createTodo, listTodos } from "@/client/api";
import { TodoForm } from "@/client/components/todo-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/client/components/ui/card";

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
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 text-sm uppercase tracking-[0.24em] text-amber-700">
            <Sparkles className="size-4" />
            Shared schema flow
          </div>
          <CardTitle>Postgres-backed todos</CardTitle>
          <CardDescription>
            This form uses Zod on both sides, React Hook Form in the browser, Hono for the route,
            and Drizzle for persistence.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <TodoForm
            isPending={createTodoMutation.isPending}
            onSubmit={async (values) => {
              await createTodoMutation.mutateAsync(values);
            }}
          />
          {createTodoMutation.error ? (
            <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {createTodoMutation.error.message}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card className="bg-stone-950 text-stone-50">
        <CardHeader>
          <div className="flex items-center gap-2 text-sm uppercase tracking-[0.24em] text-emerald-300">
            <Database className="size-4" />
            Example query
          </div>
          <CardTitle className="text-stone-50">What the starter proves</CardTitle>
          <CardDescription className="text-stone-300">
            A healthy wafer app can create records, read them back, and expose a health endpoint
            without any extra Docker or supervisor setup.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {todosQuery.isLoading ? <p className="text-stone-300">Loading todos…</p> : null}
          {todosQuery.error ? (
            <p className="rounded-2xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
              {todosQuery.error.message}
            </p>
          ) : null}
          <ul className="space-y-3">
            {todosQuery.data?.map((todo) => (
              <li
                className="rounded-2xl border border-stone-800 bg-stone-900/70 px-4 py-4"
                key={todo.id}
              >
                <p className="text-base text-stone-50">{todo.title}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.22em] text-stone-400">
                  {new Date(todo.createdAt).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
          {todosQuery.data?.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-stone-700 px-4 py-6 text-sm text-stone-300">
              Add your first todo to verify the whole stack.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
