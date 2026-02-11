import { DocumentCard } from "./DocumentCard";
import type { Document } from "~/.server/db/documents";

interface DocumentListProps {
  documents: Document[];
  onDocumentDeleted?: () => void;
}

export function DocumentList({
  documents,
  onDocumentDeleted,
}: DocumentListProps) {
  if (documents.length === 0) {
    return (
      <div className="text-center py-12">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mx-auto text-muted-foreground/50 mb-4"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
        <p className="text-muted-foreground">No documents uploaded yet</p>
        <p className="text-sm text-muted-foreground mt-1">
          Upload a document to get started
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {documents.map((doc) => (
        <DocumentCard
          key={doc.id}
          id={doc.id}
          title={doc.title}
          fileType={doc.file_type}
          fileSize={doc.file_size}
          createdAt={doc.created_at}
          onDelete={onDocumentDeleted}
        />
      ))}
    </div>
  );
}
