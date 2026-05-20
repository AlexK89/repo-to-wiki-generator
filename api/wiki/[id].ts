import type { ApiHandler } from "../../src/lib/server/http";
import {
  getRequestUrl,
  sendJson,
  sendMethodNotAllowed,
} from "../../src/lib/server/http";

const getWikiId = (requestPathname: string) =>
  requestPathname.split("/").filter(Boolean).at(-1) ?? "";

const handler: ApiHandler = (request, response) => {
  if (request.method !== "GET") {
    sendMethodNotAllowed(response, ["GET"]);
    return;
  }

  const requestUrl = getRequestUrl(request);
  const wikiId = getWikiId(requestUrl.pathname);

  sendJson(response, 501, {
    error: "Wiki persistence lands in Step 10.",
    wikiId,
    databaseConfigured: Boolean(process.env.DATABASE_URL),
  });
};

export default handler;
