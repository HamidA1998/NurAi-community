import AsyncStorage from "@react-native-async-storage/async-storage";

import { getBookById } from "@/services/libraryService";
import type { Book } from "@/types/library";

const OFFLINE_BOOKS_KEY = "nurai_offline_library_books_v1";

export type OfflineBookEntry = {
  bookId: string;
  title: string;
  subtitle: string;
  chapterCount: number;
  estimatedMinutes: number;
  requiredPlan: Book["requiredPlan"];
  category: Book["category"];
  fileSize: number;
  savedAt: number;
};

function buildOfflineBookEntry(
  book: Book,
  savedAt = Date.now(),
): OfflineBookEntry {
  return {
    bookId: book.id,
    title: book.title,
    subtitle: book.subtitle,
    chapterCount: book.chapters.length,
    estimatedMinutes: book.estimatedMinutes,
    requiredPlan: book.requiredPlan,
    category: book.category,
    fileSize: estimateBookSize(book),
    savedAt,
  };
}

function estimateBookSize(book: Book): number {
  return encodeURIComponent(JSON.stringify(book)).replace(/%[0-9A-F]{2}/g, "x")
    .length;
}

async function readOfflineBooks(): Promise<Record<string, OfflineBookEntry>> {
  try {
    const raw = await AsyncStorage.getItem(OFFLINE_BOOKS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    return Object.fromEntries(
      Object.entries(parsed).flatMap(([bookId, entry]) => {
        const book = getBookById(bookId);
        if (
          !book ||
          !entry ||
          typeof entry !== "object" ||
          typeof (entry as OfflineBookEntry).savedAt !== "number"
        ) {
          return [];
        }
        return [
          [
            bookId,
            buildOfflineBookEntry(book, (entry as OfflineBookEntry).savedAt),
          ],
        ];
      }),
    );
  } catch {
    return {};
  }
}

async function writeOfflineBooks(
  entries: Record<string, OfflineBookEntry>,
): Promise<void> {
  await AsyncStorage.setItem(OFFLINE_BOOKS_KEY, JSON.stringify(entries));
}

export async function saveOfflineBook(book: Book): Promise<OfflineBookEntry> {
  const entries = await readOfflineBooks();
  const entry = buildOfflineBookEntry(book);
  entries[book.id] = entry;
  await writeOfflineBooks(entries);
  return entry;
}

export async function removeOfflineBook(bookId: string): Promise<void> {
  const entries = await readOfflineBooks();
  delete entries[bookId];
  await writeOfflineBooks(entries);
}

export async function isOfflineBookSaved(bookId: string): Promise<boolean> {
  const entries = await readOfflineBooks();
  return Boolean(entries[bookId]);
}

export async function listOfflineBooks(): Promise<OfflineBookEntry[]> {
  const entries = await readOfflineBooks();
  return Object.values(entries).sort((a, b) => b.savedAt - a.savedAt);
}

export async function clearOfflineBooks(): Promise<void> {
  await AsyncStorage.removeItem(OFFLINE_BOOKS_KEY);
}

export async function getOfflineBookStorageSummary(): Promise<{
  bookCount: number;
  fileSize: number;
}> {
  const entries = await listOfflineBooks();
  return {
    bookCount: entries.length,
    fileSize: entries.reduce((sum, entry) => sum + entry.fileSize, 0),
  };
}
