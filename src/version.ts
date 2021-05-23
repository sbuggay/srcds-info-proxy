export async function upToDate(appid: number, version: string) {
    const url = `http://api.steampowered.com/ISteamApps/UpToDateCheck/v0001/?appid=${appid}&version=${version}&format=json`;
    return await fetch(url);
}