using System.Collections.Concurrent;
using System.Text.Json;

namespace CommandRunner.Data.Repositories;

public abstract class BaseJsonRepository<T> where T : class
{
    private readonly string _filePath;
    private readonly ConcurrentDictionary<string, T> _cache = new();
    private readonly SemaphoreSlim _fileLock = new(1, 1);
    private DateTime _lastModified = DateTime.MinValue;

    protected BaseJsonRepository(string fileName)
    {
        try
        {
            var appDataPath = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
                "CommandRunner"
            );

            Console.WriteLine($"Creating data directory: {appDataPath}");
            Directory.CreateDirectory(appDataPath);
            _filePath = Path.Combine(appDataPath, fileName);
            Console.WriteLine($"Data file path: {_filePath}");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error creating data directory: {ex.Message}");
            // Fallback to current directory if AppData is not accessible
            var fallbackPath = Path.Combine(Directory.GetCurrentDirectory(), "CommandRunner");
            Console.WriteLine($"Using fallback directory: {fallbackPath}");
            Directory.CreateDirectory(fallbackPath);
            _filePath = Path.Combine(fallbackPath, fileName);
        }
    }

    public virtual async Task<IEnumerable<T>> GetAllAsync()
    {
        await LoadDataIfNeededAsync();
        return _cache.Values;
    }

    public virtual async Task<T?> GetByIdAsync(string id)
    {
        await LoadDataIfNeededAsync();
        return _cache.TryGetValue(id, out var item) ? item : null;
    }

    protected async Task AddOrUpdateAsync(T item)
    {
        var id = GetId(item);
        _cache[id] = item;

        await SaveDataAsync();
    }

    public virtual async Task<bool> DeleteAsync(string id)
    {
        if (_cache.TryRemove(id, out _))
        {
            await SaveDataAsync();
            return true;
        }
        return false;
    }

    private async Task LoadDataIfNeededAsync()
    {
        if (File.Exists(_filePath))
        {
            var fileInfo = new FileInfo(_filePath);
            if (fileInfo.LastWriteTime > _lastModified)
            {
                await LoadDataAsync();
                _lastModified = fileInfo.LastWriteTime;
            }
        }
        else
        {
            // Create empty file if it doesn't exist
            await SaveDataAsync();
        }
    }

    private async Task LoadDataAsync()
    {
        await _fileLock.WaitAsync();
        try
        {
            var json = await File.ReadAllTextAsync(_filePath);
            var items = JsonSerializer.Deserialize<List<T>>(json) ?? new List<T>();

            _cache.Clear();
            foreach (var item in items)
            {
                var id = GetId(item);
                _cache[id] = item;
            }
        }
        finally
        {
            _fileLock.Release();
        }
    }

    private async Task SaveDataAsync()
    {
        await _fileLock.WaitAsync();
        try
        {
            var items = _cache.Values.ToList();
            var json = JsonSerializer.Serialize(items, new JsonSerializerOptions
            {
                WriteIndented = true
            });

            await File.WriteAllTextAsync(_filePath, json);
            _lastModified = DateTime.Now;
        }
        finally
        {
            _fileLock.Release();
        }
    }

    protected abstract string GetId(T item);
}