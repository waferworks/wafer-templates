import { zodResolver } from "@hookform/resolvers/zod";
import { CircleNotch, Plus } from "@phosphor-icons/react";
import { useForm } from "react-hook-form";

import { type CreateTodoInput, createTodoInputSchema } from "@/shared/schemas";

import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

interface TodoFormProps {
  disabled?: boolean;
  isPending?: boolean;
  onSubmit: (input: CreateTodoInput) => Promise<boolean> | boolean;
}

export function TodoForm({ disabled = false, isPending = false, onSubmit }: TodoFormProps) {
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
        if (await onSubmit(values)) {
          form.reset();
        }
      })}
    >
      <div className="space-y-2">
        <Label htmlFor="todo-title">First todo</Label>
        <Input
          disabled={disabled || isPending}
          id="todo-title"
          placeholder="Call the server function, ship the fix, close the loop"
          {...form.register("title")}
        />
        {form.formState.errors.title ? (
          <p className="text-sm text-rose-600">{form.formState.errors.title.message}</p>
        ) : null}
      </div>
      <Button className="gap-2" disabled={disabled || isPending} type="submit">
        {isPending ? (
          <CircleNotch className="size-4 animate-spin" weight="bold" />
        ) : (
          <Plus className="size-4" weight="bold" />
        )}
        Add todo
      </Button>
    </form>
  );
}
