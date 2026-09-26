import { dataResponse, route } from "@/lib/api";
import { getMarketStatus } from "@/services/market";

export const GET = route({}, async () => dataResponse(await getMarketStatus(), 15));
