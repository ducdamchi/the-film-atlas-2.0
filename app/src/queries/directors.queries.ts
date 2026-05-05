import { queryOptions } from "@tanstack/react-query"
import { fetchDirectorListByParams } from "@/utils/apiCalls"

export const directorsQueryOptions = queryOptions({
  queryKey: ["directors"],
  queryFn: () => fetchDirectorListByParams(),
  staleTime: 1000 * 60,
})
