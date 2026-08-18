/**
 * A file the centre hosts itself, as the API describes it.
 *
 * There is deliberately no `url` field. The bytes are behind an authorised
 * endpoint, so a plain `<a href>` would arrive without the bearer token and be
 * rejected — downloads go through `FileService.download()` instead.
 */
export interface StoredFileInfo {
  /** The id used on the wire. The numeric database id is never exposed. */
  publicId: string;
  originalName: string;
  contentType: string;
  sizeBytes: number;
  createdAt?: string;
}

/** What `POST /api/files` returns: the description above plus the numeric id
 * that owning records (resource, assignment, submission) are saved with. */
export interface UploadedFile extends StoredFileInfo {
  id: number;
}
