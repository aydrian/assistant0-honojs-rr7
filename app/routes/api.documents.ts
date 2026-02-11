import { getUser } from "@auth0/auth0-react-router";
import type { Route } from "./+types/api.documents";
import { cloudflareContext } from "../../workers/app";
import { getDb } from "~/.server/db/client";
import {
  createDocument,
  deleteDocument,
  documentBelongsToUser,
} from "~/.server/db/documents";
import {
  generateEmbedding,
  truncateForEmbedding,
  insertVector,
  deleteVector,
} from "~/.server/embeddings";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_EXTENSIONS = [".txt", ".md", ".pdf"];

/**
 * Extract text content from uploaded file
 */
async function extractTextContent(
  file: File,
  fileType: string
): Promise<string> {
  if (fileType === "application/pdf") {
    // For PDF files, we need to extract text
    // unpdf or pdf-parse could be used here, but may not work in Workers
    // For now, we'll throw an error for PDFs - can be implemented later
    throw new Error(
      "PDF parsing is not yet supported. Please upload TXT or MD files."
    );
  }

  // For text files, read directly
  return await file.text();
}

/**
 * Get file extension from filename
 */
function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  if (lastDot === -1) return "";
  return filename.slice(lastDot).toLowerCase();
}

/**
 * Validate uploaded file
 */
function validateFile(file: File): { valid: boolean; error?: string } {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`,
    };
  }

  // Check file type
  const extension = getFileExtension(file.name);
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed types: ${ALLOWED_EXTENSIONS.join(", ")}`,
    };
  }

  return { valid: true };
}

/**
 * POST /api/documents - Upload a new document
 */
export async function action({ request, context }: Route.ActionArgs) {
  // Check authentication
  const user = getUser(context);
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cloudflare = context.get(cloudflareContext);

  // Handle different HTTP methods
  if (request.method === "DELETE") {
    // Delete document
    const url = new URL(request.url);
    const documentId = url.searchParams.get("id");

    if (!documentId) {
      return Response.json(
        { error: "Document ID is required" },
        { status: 400 }
      );
    }

    const db = getDb(context);

    // Verify ownership
    const belongsToUser = await documentBelongsToUser(db, documentId, user.sub);
    if (!belongsToUser) {
      return Response.json({ error: "Document not found" }, { status: 404 });
    }

    // Delete from Vectorize first (if configured)
    if (cloudflare.env.VECTORIZE) {
      try {
        await deleteVector(cloudflare.env.VECTORIZE, documentId);
      } catch (e) {
        console.error("Failed to delete vector:", e);
        // Continue with D1 deletion even if Vectorize fails
      }
    }

    // Delete from D1
    await deleteDocument(db, documentId);

    return Response.json({ success: true });
  }

  // Handle file upload (POST)
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return Response.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
      return Response.json({ error: validation.error }, { status: 400 });
    }

    // Get file type for storage
    const extension = getFileExtension(file.name);
    const fileType =
      extension === ".pdf"
        ? "application/pdf"
        : extension === ".md"
          ? "text/markdown"
          : "text/plain";

    // Extract text content
    let content: string;
    try {
      content = await extractTextContent(file, fileType);
    } catch (e) {
      return Response.json(
        { error: e instanceof Error ? e.message : "Failed to extract content" },
        { status: 400 }
      );
    }

    if (!content.trim()) {
      return Response.json({ error: "File appears to be empty" }, { status: 400 });
    }

    // Generate document ID
    const documentId = crypto.randomUUID();

    // Get title from filename (without extension)
    const title = file.name.replace(/\.[^/.]+$/, "");

    const db = getDb(context);

    // Create document in D1
    const document = await createDocument(db, {
      id: documentId,
      user_id: user.sub,
      title,
      content,
      file_type: fileType,
      file_size: file.size,
    });

    // Generate embedding and store in Vectorize (if configured)
    if (cloudflare.env.VECTORIZE) {
      try {
        const textForEmbedding = truncateForEmbedding(content);
        const embedding = await generateEmbedding(
          textForEmbedding,
          cloudflare.env
        );
        await insertVector(
          cloudflare.env.VECTORIZE,
          documentId,
          user.sub,
          embedding,
          title
        );
      } catch (e) {
        console.error("Failed to generate/store embedding:", e);
        // Document is still created in D1, just not searchable
      }
    }

    return Response.json({
      success: true,
      document: {
        id: document.id,
        title: document.title,
        file_type: document.file_type,
        file_size: document.file_size,
        created_at: document.created_at,
      },
    });
  } catch (e) {
    console.error("Document upload error:", e);
    return Response.json(
      { error: "Failed to upload document" },
      { status: 500 }
    );
  }
}
