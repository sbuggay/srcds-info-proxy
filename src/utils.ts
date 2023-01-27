
import * as readline from "readline";
import { existsSync, createReadStream } from 'fs';
import { Type } from 'gamedig';
import { IServer } from "./main";

export async function parseServers(file: string) {
    console.log(`loading ${file}`);

    if (!existsSync(file)) return null;

    try {
        const fileStream = createReadStream(file);

        const rl = readline.createInterface({
            input: fileStream,
            crlfDelay: Infinity
        });

        const servers: IServer[] = [];

        for await (const line of rl) {
            if (!line) continue;

            const parts = line.split(" ");
            const [host, port] = parts[1]?.split(":");

            servers.push({
                type: parts[0] as Type,
                host: host,
                port: port && parseInt(port)
            });
        }

        return servers;
    }
    catch (e) {
        console.error(e);
        return null;
    }
}