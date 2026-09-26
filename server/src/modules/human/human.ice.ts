import crypto from "crypto";
import { env } from "../../config/env";

export interface IceServer {
    urls: string | string[];
    username?: string;
    credential?: string;
}

const TURN_TTL_SECONDS = 60 * 60;

// The ICE servers a browser needs to set up the call. STUN is always included.
// TURN (a relay for networks where a direct connection is impossible) is added
// when configured — either with coturn's time-limited credentials derived from a
// shared secret, or with fixed credentials from a managed provider.
export const iceServersFor = (userId: number): IceServer[] => {
    const servers: IceServer[] = [];
    if (env.STUN_URLS.length) servers.push({ urls: env.STUN_URLS });

    if (env.TURN_URLS.length) {
        if (env.TURN_SECRET) {
            const username = `${Math.floor(Date.now() / 1000) + TURN_TTL_SECONDS}:${userId}`;
            const credential = crypto.createHmac("sha1", env.TURN_SECRET).update(username).digest("base64");
            servers.push({ urls: env.TURN_URLS, username, credential });
        } else if (env.TURN_USERNAME && env.TURN_CREDENTIAL) {
            servers.push({ urls: env.TURN_URLS, username: env.TURN_USERNAME, credential: env.TURN_CREDENTIAL });
        }
    }
    return servers;
};
