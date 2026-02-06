import { requireAuth, getUser } from "@auth0/auth0-react-router";
import type { Route } from "./+types/documents";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Documents - Assistant0" }];
}

export const middleware = [requireAuth];

export async function loader({ context }: Route.LoaderArgs) {
  const user = getUser(context);

  // TODO Stage 5: Load documents from database
  return { user, documents: [] };
}

export default function DocumentsPage({ loaderData }: Route.ComponentProps) {
  const { user } = loaderData;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Documents</h1>
      <p className="text-muted-foreground">
        Document management will be implemented in Stage 5
      </p>
      <p className="text-sm text-muted-foreground mt-2">
        Logged in as: {user.email}
      </p>
    </div>
  );
}
