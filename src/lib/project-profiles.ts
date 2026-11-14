export type Profile = { label: string; url: string };

/** Parses one "Label | https://address" per line; returns null when any line is invalid or there are more than six. */
export function parseProfiles(value: string): Profile[] | null {
  const lines = value.split("\n").map((line) => line.trim()).filter(Boolean);
  if (lines.length > 6) return null;
  const profiles: Profile[] = [];
  for (const line of lines) {
    const separator = line.indexOf("|");
    if (separator < 1) return null;
    const label = line.slice(0, separator).trim();
    const url = line.slice(separator + 1).trim();
    if (!label || label.length > 40 || url.length > 300 || !/^https:\/\/\S+$/.test(url)) return null;
    profiles.push({ label, url });
  }
  return profiles;
}
