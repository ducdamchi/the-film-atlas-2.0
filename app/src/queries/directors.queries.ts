import { queryOptions } from "@tanstack/react-query"
import { fetchDirectorsFn } from "@/server/directors"

export const directorsQueryOptions = queryOptions({
  queryKey: ["directors"],
  queryFn: () => fetchDirectorsFn(),
  staleTime: 1000 * 60,
})
