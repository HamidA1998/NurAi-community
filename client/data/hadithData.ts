import bukhariData from "./bukhari.json";
import muslimData from "./muslim.json";
import abuDawudData from "./abu_dawud.json";
import tirmidhiData from "./tirmidhi.json";
import nasaiData from "./nasai.json";
import ibnMajahData from "./ibn_majah.json";

export interface Hadith {
  id: number;
  originalReference: string;
  sourceReference: string;
  sourceCollectionId: string;
  sourceCollectionName: string;
  sourceUrl: string;
  sourceReviewStatus: "source_link_verified";
}

export interface Chapter {
  name: string;
  arabicName?: string;
  hadiths: Hadith[];
}

export interface Collection {
  id: string;
  name: string;
  arabicName: string;
  totalCount: number;
  includedCount: number;
  originalLocalRows: number;
  omittedUnverifiedRows: number;
  sourcePolicy: "source_index_only_no_local_hadith_text";
  compiler: string;
  description: string;
  chapters: Chapter[];
}

function mapCollection(data: any): Collection {
  const chapters: Chapter[] = data.chapters.map((ch: any) => ({
    name: ch.name,
    arabicName: ch.arabicName,
    hadiths: ch.hadiths.map((h: any) => ({
      id: h.id,
      originalReference: h.originalReference,
      sourceReference: h.sourceReference,
      sourceCollectionId: h.sourceCollectionId,
      sourceCollectionName: h.sourceCollectionName,
      sourceUrl: h.sourceUrl,
      sourceReviewStatus: h.sourceReviewStatus,
    })),
  }));

  const includedCount = chapters.reduce(
    (sum, ch) => sum + ch.hadiths.length,
    0,
  );

  return {
    id: data.id,
    name: data.name,
    arabicName: data.arabicName,
    totalCount: data.totalHadiths,
    includedCount,
    originalLocalRows: data.originalLocalRows,
    omittedUnverifiedRows: data.omittedUnverifiedRows,
    sourcePolicy: data.sourcePolicy,
    compiler: data.compiler,
    description: data.description,
    chapters,
  };
}

const bukhari: Collection = mapCollection(bukhariData);
const muslim: Collection = mapCollection(muslimData);
const abuDawud: Collection = mapCollection(abuDawudData);
const tirmidhi: Collection = mapCollection(tirmidhiData);
const nasai: Collection = mapCollection(nasaiData);
const ibnMajah: Collection = mapCollection(ibnMajahData);

export { bukhari, muslim, abuDawud, tirmidhi, nasai, ibnMajah };

export const HADITH_COLLECTIONS: Collection[] = [
  bukhari,
  muslim,
  abuDawud,
  tirmidhi,
  nasai,
  ibnMajah,
];

export function getTotalIncludedHadiths(): number {
  return HADITH_COLLECTIONS.reduce((sum, c) => sum + c.includedCount, 0);
}
