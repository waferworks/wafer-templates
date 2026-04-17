import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, Plus } from "lucide-react";
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
        <Label htmlFor="todo-title">First todo</Label>
        <Input
          id="todo-title"
          placeholder="Call the route, push the schema, ship the feature"
          {...form.register("title")}
        />
        {form.formState.errors.title ? (
          <p className="text-sm text-rose-600">{form.formState.errors.title.message}</p>
        ) : null}
      </div>
      <Button className="gap-2" disabled={isPending} type="submit">
        {isPending ? <LoaderCircle className="size-4 animate-spin" /> : <Plus className="size-4" />}
        Add todo
      </Button>
    </form>
  );
}
