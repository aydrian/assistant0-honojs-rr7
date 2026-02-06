import { requireAuth, getUser } from "@auth0/auth0-react-router";
import type { Route } from "./+types/profile";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Profile - Assistant0" }];
}

export const middleware = [requireAuth];

export async function loader({ context }: Route.LoaderArgs) {
  const user = getUser(context);
  return { user };
}

export default function ProfilePage({ loaderData }: Route.ComponentProps) {
  const { user } = loaderData;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Profile</h1>

      <Card>
        <CardHeader>
          <CardTitle>User Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {user.picture && (
            <img
              src={user.picture}
              alt={user.name || "Profile"}
              className="w-24 h-24 rounded-full"
            />
          )}
          <div>
            <p className="text-sm font-medium">Name</p>
            <p className="text-muted-foreground">{user.name || "Not set"}</p>
          </div>
          <div>
            <p className="text-sm font-medium">Email</p>
            <p className="text-muted-foreground">{user.email || "Not set"}</p>
          </div>
          <div>
            <p className="text-sm font-medium">User ID</p>
            <p className="text-muted-foreground text-xs font-mono">{user.sub}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
