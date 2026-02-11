import { requireAuth, getUser } from "@auth0/auth0-react-router";
import { useRevalidator } from "react-router";
import type { Route } from "./+types/documents";
import { getDb } from "~/.server/db/client";
import { listDocumentsByUser } from "~/.server/db/documents";
import { DocumentUpload, DocumentList } from "~/components/documents";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Documents - Assistant0" }];
}

export const middleware = [requireAuth];

export async function loader({ context }: Route.LoaderArgs) {
  const user = getUser(context);
  const db = getDb(context);

  const documents = await listDocumentsByUser(db, user.sub);

  return { user, documents };
}

export default function DocumentsPage({ loaderData }: Route.ComponentProps) {
  const { documents } = loaderData;
  const revalidator = useRevalidator();

  const handleChange = () => {
    revalidator.revalidate();
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Documents</h1>
        <p className="text-muted-foreground">
          Upload documents to make them searchable by the AI assistant
        </p>
      </div>

      <div className="mb-8">
        <DocumentUpload onUploadComplete={handleChange} />
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Your Documents</h2>
        <DocumentList documents={documents} onDocumentDeleted={handleChange} />
      </div>
    </div>
  );
}
