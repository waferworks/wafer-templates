import { Link } from "@tanstack/react-router";

import { Badge } from "@/client/components/ui/badge";
import { Button, buttonVariants } from "@/client/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/client/components/ui/card";

export function DefaultNotFound() {
  return (
    <Card>
      <CardHeader>
        <Badge className="mb-2" variant="secondary">
          404
        </Badge>
        <CardTitle>This page does not exist.</CardTitle>
        <CardDescription>
          The route may have moved, or this app has not added it yet.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-3">
        <Button
          onClick={() => {
            window.history.back();
          }}
          type="button"
        >
          Go back
        </Button>
        <Link className={buttonVariants({ variant: "outline" })} to="/">
          Home
        </Link>
      </CardContent>
    </Card>
  );
}
