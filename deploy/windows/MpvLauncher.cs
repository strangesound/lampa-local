using System;
using System.Diagnostics;
using System.IO;

public static class MpvLauncher
{
    [STAThread]
    public static int Main(string[] args)
    {
        try
        {
            if (args.Length != 1) throw new ArgumentException("Expected one Lampa URL");
            var envelope = new Uri(args[0]);
            if (envelope.Scheme != "mpv" || envelope.Host != "play" || envelope.AbsolutePath != "/" || !envelope.Query.StartsWith("?url=") || envelope.Fragment != "")
                throw new ArgumentException("Invalid Lampa URL");
            string payload = envelope.Query.Substring(5);
            if (payload.Contains("&")) throw new ArgumentException("Unexpected URL parameters");
            string value = Uri.UnescapeDataString(payload);
            if (value.IndexOfAny(new char[] {'\r', '\n', '\0', '"'}) >= 0) throw new ArgumentException("Invalid stream URL");
            var stream = new Uri(value);
            if (stream.Scheme != "http" && stream.Scheme != "https") throw new ArgumentException("Expected HTTP video");
            string player = File.ReadAllText(Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "player-path.txt")).Trim();
            if (!File.Exists(player)) throw new FileNotFoundException("Player missing", player);
            var start = new ProcessStartInfo(player, "-- \"" + stream.AbsoluteUri + "\"");
            start.UseShellExecute = false;
            Process.Start(start);
            return 0;
        }
        catch (Exception ex)
        {
            File.WriteAllText(Path.Combine(Path.GetTempPath(), "lampa-mpv-launch-error.txt"), ex.Message);
            return 1;
        }
    }
}
