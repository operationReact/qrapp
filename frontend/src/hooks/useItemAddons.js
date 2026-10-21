import { useQuery } from '@tanstack/react-query'
import { useLocation as useActiveLocation } from '@/context/LocationContext'
import { fetchItemAddons, fetchItemIdsWithAddons } from '@/services/addon-service'

export function useItemAddons(itemId) {
  const { activeLocationId } = useActiveLocation()
  return useQuery({
    queryKey: ['item-addons', activeLocationId, itemId],
    queryFn: () => fetchItemAddons(activeLocationId, itemId),
    enabled: !!activeLocationId && itemId != null,
    staleTime: 60_000,
  })
}

export function useAddonItemIds() {
  const { activeLocationId } = useActiveLocation()
  return useQuery({
    queryKey: ['addon-item-ids', activeLocationId],
    queryFn: () => fetchItemIdsWithAddons(activeLocationId),
    enabled: !!activeLocationId,
    staleTime: 60_000,
  })
}
