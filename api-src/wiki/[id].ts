import type { ApiHandler } from "../../src/lib/server/http";
import {
  getErrorMessage,
  getRequestUrl,
  sendJson,
  sendMethodNotAllowed,
} from "../../src/lib/server/http";
import { getWikiById } from "../../src/lib/server/db/wikis";

const getWikiId = (requestPathname: string) =>
  requestPathname.split("/").filter(Boolean).at(-1) ?? "";

const handler: ApiHandler = async (request, response) => {
  if (request.method !== "GET") {
    sendMethodNotAllowed(response, ["GET"]);
    return;
  }

  const requestUrl = getRequestUrl(request);
  const wikiId = getWikiId(requestUrl.pathname);

  try {
    const wiki = await getWikiById(wikiId);

    if (!wiki) {
      sendJson(response, 404, { error: "Wiki not found", wikiId });
      return;
    }

    sendJson(response, 200, { wiki: wiki.structure });
  } catch (error) {
    sendJson(response, 500, {
      error: getErrorMessage(error),
      wikiId,
    });
  }
};

export default handler;
