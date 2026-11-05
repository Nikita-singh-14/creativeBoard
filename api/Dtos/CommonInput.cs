using System.Globalization;

namespace CreativeBoard.Api.Dtos;

internal static class InputRules
{
    public static string Clean(string? value) => value?.Trim() ?? "";

    public static string? CleanOptionalUrl(string? value)
    {
        var clean = value?.Trim();
        return string.IsNullOrEmpty(clean) ? null : clean;
    }

    public static bool IsHttpUrl(string? value) =>
        string.IsNullOrEmpty(value) ||
        (Uri.TryCreate(value, UriKind.Absolute, out var uri) &&
         (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps) &&
         !string.IsNullOrEmpty(uri.Host) &&
         !value.Any(char.IsWhiteSpace));

    public static bool TryDueDate(string? value, out DateOnly? result)
    {
        result = null;
        if (string.IsNullOrWhiteSpace(value)) return true;

        DateOnly date;
        if (DateOnly.TryParseExact(value, "yyyy-MM-dd", out date))
        {
            result = date;
        }
        else if (value.Length >= 19 &&
                 value[10] == 'T' &&
                 DateOnly.TryParseExact(value[..10], "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out _) &&
                 DateTimeOffset.TryParse(value, CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind, out var timestamp))
        {
            result = DateOnly.FromDateTime(timestamp.UtcDateTime);
        }
        else
        {
            return false;
        }

        return result.Value.Year is >= 2000 and <= 2100;
    }
}
