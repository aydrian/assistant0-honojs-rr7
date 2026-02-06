import { Link, useRouteLoaderData } from "react-router";
import { Button } from "~/components/ui/button";
import type { Route } from "~/+types/root";

export function Header() {
  // Access root loader data (will include auth context)
  const data = useRouteLoaderData<typeof Route>("root");
  const user = data?.user;

  return (
    <header className="border-b">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link to="/" className="text-xl font-bold">
            Assistant0
          </Link>
          {user && (
            <nav className="flex gap-4">
              <Link to="/" className="text-sm hover:underline">
                Chat
              </Link>
              <Link to="/documents" className="text-sm hover:underline">
                Documents
              </Link>
            </nav>
          )}
        </div>

        <div className="flex items-center gap-4">
          {user ? (
            <>
              <Link to="/profile" className="text-sm hover:underline">
                {user.name || user.email}
              </Link>
              <Button asChild variant="outline" size="sm">
                <a href="/auth/logout">Logout</a>
              </Button>
            </>
          ) : (
            <Button asChild size="sm">
              <a href="/auth/login">Login</a>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
