using System.ComponentModel.DataAnnotations;

namespace TFrench.API.Models;

/// <summary>
/// A file held in the centre's own storage rather than on Google Drive.
///
/// The bytes live outside the web root and are never served as static content:
/// the only way to read one is <c>GET /api/files/{publicId}</c>, which checks
/// what the file is attached to before streaming it. That is what keeps course
/// material from leaking — a URL on its own grants nothing.
/// </summary>
public class StoredFile
{
    [Key]
    public int Id { get; set; }

    /// <summary>
    /// The identifier used in URLs. A GUID rather than <see cref="Id"/> so the
    /// store cannot be walked by incrementing a number in the address bar.
    /// </summary>
    public Guid PublicId { get; set; } = Guid.NewGuid();

    /// <summary>Name the uploader's machine gave the file; shown in the UI and
    /// sent back as the download filename. Never used to build a path.</summary>
    [Required, MaxLength(260)]
    public string OriginalName { get; set; } = string.Empty;

    /// <summary>Path relative to the storage root, e.g. <c>2026/08/{guid}.pdf</c>.
    /// Relative so the whole store can be moved or backed up as one folder.</summary>
    [Required, MaxLength(400)]
    public string StoredPath { get; set; } = string.Empty;

    [Required, MaxLength(150)]
    public string ContentType { get; set; } = "application/octet-stream";

    public long SizeBytes { get; set; }

    public int UploadedById { get; set; }
    public User? UploadedBy { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
