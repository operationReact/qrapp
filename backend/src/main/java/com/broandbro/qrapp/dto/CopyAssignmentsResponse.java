package com.broandbro.qrapp.dto;

/**
 * @param copied            products newly added to the target location
 * @param alreadyAtTarget   products skipped because the target location already sells them
 * @param inactive          products skipped because they are inactive in the catalogue
 */
public record CopyAssignmentsResponse(int copied, int alreadyAtTarget, int inactive) {
    public int skipped() {
        return alreadyAtTarget + inactive;
    }
}
