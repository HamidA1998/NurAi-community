import AsyncStorage from "@react-native-async-storage/async-storage";
import { syncedSetItem } from "./progress-sync";

export interface Bookmark {
  id: string;
  type:
    | "ayah"
    | "dua"
    | "hadith"
    | "name_of_allah"
    | "adhkar"
    | "library_chapter";
  title: string;
  arabic: string;
  translation: string;
  reference?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  collectionId?: string;
}

export interface BookmarkCollection {
  id: string;
  name: string;
  icon: string;
  color: string;
  createdAt: string;
}

const BOOKMARKS_KEY = "bookmarks_data";
const COLLECTIONS_KEY = "bookmark_collections";

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export async function getBookmarks(): Promise<Bookmark[]> {
  try {
    const raw = await AsyncStorage.getItem(BOOKMARKS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function saveBookmarks(bookmarks: Bookmark[]): Promise<void> {
  const json = JSON.stringify(bookmarks);
  await syncedSetItem(BOOKMARKS_KEY, json);
}

export async function addBookmark(
  bookmark: Omit<Bookmark, "id" | "createdAt">,
): Promise<void> {
  const bookmarks = await getBookmarks();
  const newBookmark: Bookmark = {
    ...bookmark,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };
  bookmarks.unshift(newBookmark);
  await saveBookmarks(bookmarks);
}

function metadataMatches(
  bookmark: Bookmark,
  metadata: Record<string, unknown>,
): boolean {
  return Object.entries(metadata).every(
    ([key, value]) => bookmark.metadata?.[key] === value,
  );
}

export async function upsertBookmark(
  bookmark: Omit<Bookmark, "id" | "createdAt">,
  matchMetadata?: Record<string, unknown>,
): Promise<void> {
  const bookmarks = await getBookmarks();
  const filtered = matchMetadata
    ? bookmarks.filter((item) => !metadataMatches(item, matchMetadata))
    : bookmarks.filter(
        (item) =>
          !(item.type === bookmark.type && item.title === bookmark.title),
      );
  const newBookmark: Bookmark = {
    ...bookmark,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };
  await saveBookmarks([newBookmark, ...filtered]);
}

export async function removeBookmark(id: string): Promise<void> {
  const bookmarks = await getBookmarks();
  const filtered = bookmarks.filter((b) => b.id !== id);
  await saveBookmarks(filtered);
}

export async function removeBookmarkByMetadata(
  metadata: Record<string, unknown>,
): Promise<void> {
  const bookmarks = await getBookmarks();
  await saveBookmarks(
    bookmarks.filter((bookmark) => !metadataMatches(bookmark, metadata)),
  );
}

export async function isBookmarked(
  type: string,
  title: string,
): Promise<boolean> {
  const bookmarks = await getBookmarks();
  return bookmarks.some((b) => b.type === type && b.title === title);
}

export async function toggleBookmark(
  bookmark: Omit<Bookmark, "id" | "createdAt">,
): Promise<boolean> {
  const bookmarks = await getBookmarks();
  const existing = bookmarks.find(
    (b) => b.type === bookmark.type && b.title === bookmark.title,
  );
  if (existing) {
    await removeBookmark(existing.id);
    return false;
  } else {
    await addBookmark(bookmark);
    return true;
  }
}

export async function getCollections(): Promise<BookmarkCollection[]> {
  try {
    const raw = await AsyncStorage.getItem(COLLECTIONS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function saveCollections(
  collections: BookmarkCollection[],
): Promise<void> {
  const json = JSON.stringify(collections);
  await syncedSetItem(COLLECTIONS_KEY, json);
}

export async function addCollection(
  collection: Omit<BookmarkCollection, "id" | "createdAt">,
): Promise<void> {
  const collections = await getCollections();
  const newCollection: BookmarkCollection = {
    ...collection,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };
  collections.push(newCollection);
  await saveCollections(collections);
}

export async function removeCollection(id: string): Promise<void> {
  const collections = await getCollections();
  const filtered = collections.filter((c) => c.id !== id);
  await saveCollections(filtered);
}
