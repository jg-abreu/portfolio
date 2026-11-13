export function bookInfoUrl(volumeId: string): string {
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(volumeId)) throw new Error('Invalid book identifier');
  return `https://books.google.com/books?id=${volumeId}`;
}
export function bookCoverUrl(volumeId: string): string {
  bookInfoUrl(volumeId);
  return `https://books.google.com/books/content?id=${volumeId}&printsec=frontcover&img=1&zoom=1&source=gbs_api`;
}
export type BookResult = { volumeId: string; title: string; authors: string[]; publisher: string; publishedDate: string; hasCover: boolean };
export function parseBookResults(value: unknown): BookResult[] {
  if (!Array.isArray(value) || value.length > 12) throw new Error('Invalid book results');
  return value.map(item => {
    if (!item || typeof item !== 'object' || typeof item.volumeId !== 'string'
      || typeof item.title !== 'string' || !item.title.trim() || item.title.length > 300
      || !Array.isArray(item.authors) || item.authors.length > 30 || !item.authors.every((author: unknown) => typeof author === 'string' && author.length <= 200)
      || typeof item.publisher !== 'string' || item.publisher.length > 300
      || typeof item.publishedDate !== 'string' || item.publishedDate.length > 30 || typeof item.hasCover !== 'boolean') throw new Error('Invalid book result');
    bookInfoUrl(item.volumeId);
    return { volumeId: item.volumeId, title: item.title, authors: item.authors, publisher: item.publisher, publishedDate: item.publishedDate, hasCover: item.hasCover };
  });
}
