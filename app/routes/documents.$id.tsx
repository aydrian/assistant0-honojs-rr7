import { requireAuth, getUser } from "@auth0/auth0-react-router";
import { redirect, Link } from "react-router";
import type { Route } from "./+types/documents.$id";
import { getDb } from "~/.server/db/client";
import {
  getDocumentById,
  deleteDocument,
  documentBelongsToUser,
} from "~/.server/db/documents";
import { deleteVector } from "~/.server/embeddings";
import { cloudflareContext } from "../../workers/app";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

export function meta({ data }: Route.MetaArgs) {
  const title = data?.document?.title || "Document";
  return [{ title: `${title} - Assistant0` }];
}

export const middleware = [requireAuth];

export async function loader({ context, params }: Route.LoaderArgs) {
  const user = getUser(context);
  const db = getDb(context);

  const document = await getDocumentById(db, params.id);

  if (!document) {
    throw new Response("Document not found", { status: 404 });
  }

  // Check ownership
  if (document.user_id !== user.sub) {
    throw new Response("Not authorized", { status: 403 });
  }

  return { document };
}

export async function action({ context, params, request }: Route.ActionArgs) {
  const user = getUser(context);
  const db = getDb(context);
  const cloudflare = context.get(cloudflareContext);

  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "delete") {
    // Verify ownership
    const belongsToUser = await documentBelongsToUser(db, params.id, user.sub);
    if (!belongsToUser) {
      throw new Response("Not authorized", { status: 403 });
    }

    // Delete from Vectorize first (if configured)
    if (cloudflare.env.VECTORIZE) {
      try {
        await deleteVector(cloudflare.env.VECTORIZE, params.id);
      } catch (e) {
        console.error("Failed to delete vector:", e);
      }
    }

    // Delete from D1
    await deleteDocument(db, params.id);

    return redirect("/documents");
  }

  return null;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function DocumentDetailPage({
  loaderData,
}: Route.ComponentProps) {
  const { document } = loaderData;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <Link
          to="/documents"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          &larr; Back to Documents
        </Link>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-2xl">{document.title}</CardTitle>
          <CardDescription>
            {formatFileSize(document.file_size)} &middot;{" "}
            {document.file_type.replace("text/", "").replace("application/", "")}
            &middot; Uploaded {formatDate(document.created_at)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-lg overflow-auto max-h-[60vh]">
              {document.content}
            </pre>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <form method="post">
          <input type="hidden" name="intent" value="delete" />
          <Button
            type="submit"
            variant="destructive"
            onClick={(e) => {
              if (!confirm("Are you sure you want to delete this document?")) {
                e.preventDefault();
              }
            }}
          >
            Delete Document
          </Button>
        </form>
      </div>
    </div>
  );
}
