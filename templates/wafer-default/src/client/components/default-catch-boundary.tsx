import { type ErrorComponentProps, Link, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";

import { Badge } from "@/client/components/ui/badge";
import { Button, buttonVariants } from "@/client/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/client/components/ui/card";

export function DefaultCatchBoundary({ error }: ErrorComponentProps) {
  const router = useRouter();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Card>
      <CardHeader>
        <Badge className="mb-2" variant="secondary">
          Route error
        </Badge>
        <CardTitle>Something went wrong.</CardTitle>
        <CardDescription>
          Retry this route first. If the problem persists, inspect the server logs.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-3">
        <Button
          onClick={() => {
            router.invalidate();
          }}
          type="button"
        >
          Try again
        </Button>
        <Link className={buttonVariants({ variant: "outline" })} to="/">
          Home
        </Link>
      </CardContent>
    </Card>
  );
}
