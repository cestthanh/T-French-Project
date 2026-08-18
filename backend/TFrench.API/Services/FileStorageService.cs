using Microsoft.Extensions.Options;
using TFrench.API.Models;

namespace TFrench.API.Services;

/// <summary>Bound from the <c>FileStorage</c> section of appsettings.json.</summary>
public class FileStorageOptions
{
    /// <summary>Where the bytes go. Relative paths resolve against the content
    /// root. Deliberately NOT under wwwroot — nothing here is static content.</summary>
    public string RootPath { get; set; } = "storage/uploads";

    public long MaxSizeBytes { get; set; } = 25 * 1024 * 1024; // 25 MB

    /// <summary>
    /// Extension whitelist, mapped to the content type we will serve the file
    /// back as. A whitelist rather than a blacklist: a blacklist has to predict
    /// every dangerous extension, and it only takes one miss.
    ///
    /// The mapping matters as much as the list. Echoing the browser's own
    /// Content-Type back on download would let an uploader pick text/html and
    /// turn a "document" into a stored XSS against anyone who opens it.
    /// </summary>
    public Dictionary<string, string> AllowedTypes { get; set; } = new(StringComparer.OrdinalIgnoreCase)
    {
        [".pdf"]  = "application/pdf",
        [".doc"]  = "application/msword",
        [".docx"] = "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        [".ppt"]  = "application/vnd.ms-powerpoint",
        [".pptx"] = "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        [".xls"]  = "application/vnd.ms-excel",
        [".xlsx"] = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        [".txt"]  = "text/plain",
        [".zip"]  = "application/zip",
        [".jpg"]  = "image/jpeg",
        [".jpeg"] = "image/jpeg",
        [".png"]  = "image/png",
        [".webp"] = "image/webp",
    };
}

/// <summary>Thrown when an upload fails validation; the controller turns it
/// into a 400 with the message shown to the user.</summary>
public class FileValidationException(string message) : Exception(message);

/// <summary>
/// Writes uploads to disk and reads them back. Knows nothing about who may see
/// a file — that decision belongs to <c>FilesController</c>, which can see what
/// the file is attached to.
/// </summary>
public class FileStorageService
{
    private readonly FileStorageOptions _options;
    private readonly string _root;

    public FileStorageService(IOptions<FileStorageOptions> options, IWebHostEnvironment env)
    {
        _options = options.Value;
        _root = Path.IsPathRooted(_options.RootPath)
            ? _options.RootPath
            : Path.Combine(env.ContentRootPath, _options.RootPath);
    }

    public long MaxSizeBytes => _options.MaxSizeBytes;

    public IEnumerable<string> AllowedExtensions => _options.AllowedTypes.Keys;

    /// <summary>
    /// Validates and stores <paramref name="file"/>, returning an unsaved
    /// <see cref="StoredFile"/> for the caller to add to the database.
    /// </summary>
    /// <exception cref="FileValidationException">The file is empty, too large,
    /// or not an allowed type.</exception>
    public async Task<StoredFile> SaveAsync(IFormFile file, int uploadedById, CancellationToken ct = default)
    {
        if (file.Length == 0)
            throw new FileValidationException("File rỗng.");

        if (file.Length > _options.MaxSizeBytes)
            throw new FileValidationException(
                $"File vượt quá giới hạn {_options.MaxSizeBytes / (1024 * 1024)} MB.");

        var extension = Path.GetExtension(file.FileName);
        if (string.IsNullOrEmpty(extension) || !_options.AllowedTypes.TryGetValue(extension, out var contentType))
            throw new FileValidationException(
                $"Định dạng không được hỗ trợ. Cho phép: {string.Join(", ", _options.AllowedTypes.Keys)}.");

        // Date folders keep any single directory small enough to list; a GUID
        // name means two uploads called "bai-tap.pdf" cannot collide, and the
        // uploader's filename never reaches the filesystem.
        var relativeDir = Path.Combine(DateTime.UtcNow.ToString("yyyy"), DateTime.UtcNow.ToString("MM"));
        var storedName = Guid.NewGuid().ToString("N") + extension.ToLowerInvariant();
        var relativePath = Path.Combine(relativeDir, storedName);

        var absoluteDir = Path.Combine(_root, relativeDir);
        Directory.CreateDirectory(absoluteDir);

        var absolutePath = Path.Combine(absoluteDir, storedName);
        await using (var stream = new FileStream(absolutePath, FileMode.CreateNew, FileAccess.Write, FileShare.None))
        {
            await file.CopyToAsync(stream, ct);
        }

        return new StoredFile
        {
            OriginalName = SanitiseName(file.FileName),
            StoredPath = relativePath.Replace('\\', '/'),
            ContentType = contentType,
            SizeBytes = file.Length,
            UploadedById = uploadedById,
        };
    }

    /// <summary>Absolute path of a stored file, or null if the row survived but
    /// the bytes did not (a restore that missed the storage folder, say).</summary>
    public string? ResolvePath(StoredFile file)
    {
        var absolute = Path.GetFullPath(Path.Combine(_root, file.StoredPath));

        // StoredPath is ours, not user input — but a traversal here would read
        // arbitrary files off the server, so it is worth one comparison.
        if (!absolute.StartsWith(Path.GetFullPath(_root), StringComparison.OrdinalIgnoreCase))
            return null;

        return File.Exists(absolute) ? absolute : null;
    }

    /// <summary>Deletes the bytes. Missing files are ignored: the caller's real
    /// goal is that the file is gone, and it already is.</summary>
    public void Delete(StoredFile file)
    {
        var absolute = ResolvePath(file);
        if (absolute != null) File.Delete(absolute);
    }

    /// <summary>Strips any directory part the browser may have sent, so the
    /// stored display name is a bare filename.</summary>
    private static string SanitiseName(string fileName)
    {
        var name = Path.GetFileName(fileName);
        return string.IsNullOrWhiteSpace(name) ? "file" : name;
    }
}
