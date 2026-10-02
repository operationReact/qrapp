import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import {
  generateCampaignImagePreview,
  applyCampaignImage,
} from "@/services/campaignImageService";

/**
 * Modal for AI-generated campaign hero billboard image preview and application.
 *
 * Flow:
 * 1. Admin opens modal, optionally enters creative direction
 * 2. Admin clicks "Generate Preview" to fetch AI image options
 * 3. Admin reviews the generated image
 * 4. Admin either "Regenerate" for a different image or "Use This Image" to apply
 * 5. Modal closes, campaign is updated with new image URL
 *
 * Props:
 *   open: boolean - Modal visibility
 *   campaignId: number - Campaign being edited
 *   campaignName: string - Display name
 *   locationId: number - Authorization scope
 *   currentImageUrl: string - Current campaign image (for display)
 *   onClose: () => void - Called when modal closes
 *   onImageApplied: (data) => void - Called after image successfully applied
 */
export default function CampaignImageGenerationModal({
  open,
  campaignId,
  campaignName,
  locationId,
  currentImageUrl,
  onClose,
  onImageApplied,
}) {
  const [creativeDirection, setCreativeDirection] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState(null);
  const [generatedPrompt, setGeneratedPrompt] = useState(null);
  const [previousGeneratedUrl, setPreviousGeneratedUrl] = useState(null);
  const [error, setError] = useState(null);
  const [isApplying, setIsApplying] = useState(false);

  const handleGenerate = async () => {
    setError(null);
    setIsGenerating(true);

    try {
      const result = await generateCampaignImagePreview(
        campaignId,
        locationId,
        creativeDirection || null,
        generatedImageUrl ? [generatedImageUrl] : [],
      );

      // Store previous URL for cleanup on regenerate
      if (generatedImageUrl) {
        setPreviousGeneratedUrl(generatedImageUrl);
      }

      setGeneratedImageUrl(result.imageUrls[0]);
      setGeneratedPrompt(result.imagePrompt);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate image. Please try again.');
      console.error('Campaign image generation error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApplyImage = async () => {
    if (!generatedImageUrl) {
      setError('No generated image to apply.');
      return;
    }

    setError(null);
    setIsApplying(true);

    try {
      const result = await applyCampaignImage(
        campaignId,
        locationId,
        generatedImageUrl,
        previousGeneratedUrl,
      );

      onImageApplied(result);
      handleClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to apply image. Please try again.');
      console.error('Campaign image application error:', err);
    } finally {
      setIsApplying(false);
    }
  };

  const handleClose = () => {
    setCreativeDirection('');
    setGeneratedImageUrl(null);
    setGeneratedPrompt(null);
    setPreviousGeneratedUrl(null);
    setError(null);
    setIsGenerating(false);
    setIsApplying(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] w-[calc(100%-1rem)] max-w-lg overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>Generate Campaign Hero Image</DialogTitle>
          <DialogDescription>
            Create an AI-generated hero billboard image for "{campaignName}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Current image display */}
          {currentImageUrl && !generatedImageUrl && (
            <div className="rounded-lg border bg-muted p-3">
              <Label className="text-xs font-semibold">Current Image</Label>
              <div
                className="w-full h-32 bg-muted rounded-lg mt-2"
                style={{
                  backgroundImage: `url(${currentImageUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              />
            </div>
          )}

          {/* Creative direction input */}
          <div className="space-y-2">
            <Label htmlFor="creative-direction">Creative Direction (Optional)</Label>
            <Textarea
              id="creative-direction"
              placeholder="e.g., warm lighting, vibrant colors, appetizing food"
              value={creativeDirection}
              onChange={(e) => setCreativeDirection(e.target.value)}
              disabled={isGenerating || isApplying}
              maxLength={300}
              className="min-h-20 resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Keep it short. AI creates the artwork only; campaign text stays in the UI.
            </p>
          </div>

          {/* Generated image preview */}
          {generatedImageUrl && (
            <div className="rounded-lg border bg-muted p-3">
              <Label className="text-xs font-semibold">Generated Preview</Label>
              <div
                className="mt-2 aspect-video w-full overflow-hidden rounded-lg bg-muted"
                style={{
                  backgroundImage: `url(${generatedImageUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              />
              {generatedPrompt && (
                <details className="mt-2 text-xs">
                  <summary className="cursor-pointer font-semibold text-muted-foreground">
                    View prompt
                  </summary>
                  <p className="mt-2 p-2 bg-background rounded text-muted-foreground">
                    {generatedPrompt}
                  </p>
                </details>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isGenerating || isApplying}>
            Cancel
          </Button>

          {!generatedImageUrl && (
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || isApplying}
            >
              {isGenerating && <Loader2 className="size-4 mr-2 animate-spin" />}
              {isGenerating ? 'Generating...' : 'Generate Preview'}
            </Button>
          )}

          {generatedImageUrl && (
            <>
              <Button
                variant="outline"
                onClick={handleGenerate}
                disabled={isGenerating || isApplying}
              >
                {isGenerating && <Loader2 className="size-4 mr-2 animate-spin" />}
                {isGenerating ? 'Regenerating...' : 'Regenerate'}
              </Button>
              <Button
                onClick={handleApplyImage}
                disabled={isGenerating || isApplying}
              >
                {isApplying && <Loader2 className="size-4 mr-2 animate-spin" />}
                {isApplying ? 'Applying...' : 'Use Image'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
