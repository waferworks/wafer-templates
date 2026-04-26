import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { type CreateTodoInput, createTodoInputSchema } from "@/shared/schemas";

import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

interface TodoFormProps {
  isPending?: boolean;
  onSubmit: (input: CreateTodoInput) => Promise<void> | void;
}

export function TodoForm({ isPending = false, onSubmit }: TodoFormProps) {
  const form = useForm<CreateTodoInput>({
    resolver: zodResolver(createTodoInputSchema),
    defaultValues: {
      title: "",
    },
  });

  return (
    <form
      className="space-y-4"
      onSubmit={form.handleSubmit(async (values) => {
        await onSubmit(values);
        form.reset();
      })}
    >
      <div className="space-y-2">
        <Label htmlFor="todo-title">Title</Label>
        <Input id="todo-title" {...form.register("title")} />
        {form.formState.errors.title ? (
          <p className="text-sm text-rose-600">{form.formState.errors.title.message}</p>
        ) : null}
      </div>
      <Button disabled={isPending} type="submit">
        {isPending ? "Adding…" : "Add todo"}
      </Button>
    </form>
  );
}
