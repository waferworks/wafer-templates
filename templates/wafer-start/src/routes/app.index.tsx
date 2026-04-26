import { Database, Sparkle } from "@phosphor-icons/react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";

import { buildTitle } from "@/app/site";
import { TodoForm } from "@/components/todo-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createTodoAction, loadTodoPage } from "@/server/functions/todos";

export const Route = createFileRoute("/app/")({
  head: () => ({
    meta: [{ title: buildTitle("App") }],
  }),
  loader: async () => loadTodoPage(),
  component: AppIndexPage,
});

const todoTimeFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

function AppIndexPage() {
  const loaderData = Route.useLoaderData();
  const router = useRouter();
  const [mutationMessage, setMutationMessage] = useState("");
  const [isPending, setIsPending] = useState(false);
  const message = mutationMessage || loaderData.message || "";

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 text-sm uppercase tracking-[0.24em] text-amber-700">
            <Sparkle className="size-4" weight="fill" />
            Mutation path
          </div>
          <CardTitle>Server functions over a plain service layer</CardTitle>
          <CardDescription>
            Reads arrive through the route loader. Mutations go through a Start server function and
            the same shared Zod schema the form uses.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <TodoForm
            disabled={loaderData.databaseStatus !== "ok"}
            isPending={isPending}
            onSubmit={async (values) => {
              setIsPending(true);

              try {
                await createTodoAction({ data: values });
                setMutationMessage("");
                await router.invalidate();
                return true;
              } catch (error) {
                console.error(error);
                setMutationMessage(
                  "Could not add the todo. Try again after checking the server logs."
                );
                return false;
              } finally {
                setIsPending(false);
              }
            }}
          />
          {message ? (
            <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {message}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card className="bg-stone-950 text-stone-50">
        <CardHeader>
          <div className="flex items-center gap-2 text-sm uppercase tracking-[0.24em] text-emerald-300">
            <Database className="size-4" weight="duotone" />
            Loader read
          </div>
          <CardTitle className="text-stone-50">The app surface</CardTitle>
          <CardDescription className="text-stone-300">
            This route keeps the landing page and product surface in one Start app while still
            making the data path explicit.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {loaderData.databaseStatus !== "ok" ? (
            <p className="rounded-2xl border border-dashed border-white/20 px-4 py-6 text-sm text-stone-300">
              The database is not ready yet. Configure `DATABASE_URL` or the Wafer bootstrap vars,
              then restart the app.
            </p>
          ) : null}
          <ul className="space-y-3">
            {loaderData.todos.map((todo) => (
              <li
                className="rounded-2xl border border-stone-800 bg-stone-900/70 px-4 py-4"
                key={todo.id}
              >
                <p className="text-base text-stone-50">{todo.title}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.22em] text-stone-400">
                  {todoTimeFormatter.format(new Date(todo.createdAt))} UTC
                </p>
              </li>
            ))}
          </ul>
          {loaderData.databaseStatus === "ok" && loaderData.todos.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-stone-700 px-4 py-6 text-sm text-stone-300">
              Add your first todo to verify the whole Start + Postgres flow.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
