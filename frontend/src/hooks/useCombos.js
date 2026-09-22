import { useQuery, useMutation, useQueryClient, useIsMutating } from '@tanstack/react-query'
import { useLocation as useActiveLocation } from '@/context/LocationContext'
import {
  createCombo,
  updateCombo,
  updateComboStatus,
  deleteCombo,
} from '@/services/comboService'
import {
  comboSummaryOptions,
  comboListOptions,
  comboOptions,
} from '@/query/options/combos'

function useQueryWrapper(options) {
  const { data, isLoading, error, refetch } = useQuery(options)
  return { data, loading: isLoading, error, refetch }
}

export const useComboSummary = () => {
  const { activeLocationId } = useActiveLocation()
  return useQueryWrapper(comboSummaryOptions(activeLocationId))
}

export function useComboList(params) {
  return useQueryWrapper(comboListOptions(params))
}

export function useCombo(id) {
  return useQueryWrapper(comboOptions(id))
}

export function useComboMutations(onSuccess) {
  const queryClient = useQueryClient()
  const comboMutating = useIsMutating({ mutationKey: ['combos'] })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['combos'] })
    onSuccess?.()
  }

  const createMutation = useMutation({
    mutationKey: ['combos', 'create'],
    mutationFn: createCombo,
    onSuccess: invalidate,
  })

  const updateMutation = useMutation({
    mutationKey: ['combos', 'update'],
    mutationFn: ({ id, data }) => updateCombo(id, data),
    onSuccess: invalidate,
  })

  const statusMutation = useMutation({
    mutationKey: ['combos', 'status'],
    mutationFn: ({ id, status }) => updateComboStatus(id, status),
    onSuccess: invalidate,
  })

  const deleteMutation = useMutation({
    mutationKey: ['combos', 'delete'],
    mutationFn: deleteCombo,
    onSuccess: invalidate,
  })

  const getError = () =>
    createMutation.error || updateMutation.error || statusMutation.error || deleteMutation.error

  return {
    busy: comboMutating > 0,
    mutError: getError(),
    create: (data) => createMutation.mutateAsync(data),
    update: (id, data) => updateMutation.mutateAsync({ id, data }),
    updateStatus: (id, status) => statusMutation.mutateAsync({ id, status }),
    remove: (id) => deleteMutation.mutateAsync(id),
  }
}
