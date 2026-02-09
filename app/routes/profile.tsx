import { requireAuth, getUser } from "@auth0/auth0-react-router";
import type { Route } from "./+types/profile";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { getDb } from "~/.server/db/client";
import { getUserByAuth0Id, createUser } from "~/.server/db/users";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Profile - Assistant0" }];
}

export const middleware = [requireAuth];

export async function loader({ context }: Route.LoaderArgs) {
  const auth0User = getUser(context);
  const db = getDb(context);

  // Get or create user in database
  let dbUser = await getUserByAuth0Id(db, auth0User.sub);

  if (!dbUser) {
    // Create user on first login
    dbUser = await createUser(db, {
      id: crypto.randomUUID(),
      auth0_id: auth0User.sub,
      email: auth0User.email!,
      name: auth0User.name,
      picture: auth0User.picture,
    });
  }

  return { user: auth0User, dbUser };
}

export default function ProfilePage({ loaderData }: Route.ComponentProps) {
  const { user, dbUser } = loaderData;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Profile</h1>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Auth0 User Information</CardTitle>
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
              <p className="text-sm font-medium">Auth0 User ID</p>
              <p className="text-muted-foreground text-xs font-mono">
                {user.sub}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Database User Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium">Database ID</p>
              <p className="text-muted-foreground text-xs font-mono">
                {dbUser.id}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium">Created At</p>
              <p className="text-muted-foreground">
                {new Date(dbUser.created_at * 1000).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium">Updated At</p>
              <p className="text-muted-foreground">
                {new Date(dbUser.updated_at * 1000).toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
